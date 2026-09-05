import { test, expect, request } from '@playwright/test'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password'

test('a flight plays a round from two devices', async ({ page, browser }) => {
  const api = await request.newContext({ baseURL: 'http://localhost:3000' })
  const headers = { 'x-admin-password': ADMIN_PASSWORD, 'content-type': 'application/json' }

  const domi = await (await api.post('/api/admin/players', { headers, data: { name: 'Domi' } })).json()
  const res = await (await api.post('/api/admin/players', { headers, data: { name: 'Res' } })).json()
  const ntp = await (
    await api.post('/api/admin/challenges', {
      headers,
      data: { name: 'Nearest to the pin', points: [3, 2, 1], scope: 'per_hole', allowTies: false },
    })
  ).json()

  const round = await (
    await api.post('/api/rounds', {
      headers,
      data: {
        name: 'E2E Breitenloo',
        playerIds: [domi.id, res.id],
        challenges: [{ challengeId: ntp.id, holes: null }],
      },
    })
  ).json()

  // Device one: the phone in the flight.
  await page.goto(`/r/${round.code}`)
  await expect(page.getByText('E2E Breitenloo')).toBeVisible()

  await page.getByTestId(`cell-${(await roundChallengeId(api, round.code))}-${domi.id}`).click()
  await page.getByTestId(`save-${await roundChallengeId(api, round.code)}`).click()
  await expect(page.getByText('3').first()).toBeVisible()

  // Device two: the watch, posting through the compact API.
  const watchResponse = await api.post(`/api/w/${round.code}/result`, {
    data: { rc: await roundChallengeId(api, round.code), hole: 2, ranks: [res.id, domi.id] },
  })
  expect(watchResponse.ok()).toBe(true)

  // Device one sees the watch's entry after a reload.
  const second = await browser.newPage()
  await second.goto(`/r/${round.code}`)
  await expect(second.getByText('E2E Breitenloo')).toBeVisible()

  const state = await (await api.get(`/api/rounds/${round.code}`)).json()
  const totals = Object.fromEntries(
    state.standings.map((s: { playerId: string; points: number }) => [s.playerId, s.points]),
  )
  expect(totals[domi.id]).toBe(5)
  expect(totals[res.id]).toBe(3)

  // A finished round stops accepting entries.
  await api.post(`/api/rounds/${round.code}/finish`)
  const rejected = await api.post(`/api/w/${round.code}/result`, {
    data: { rc: await roundChallengeId(api, round.code), hole: 3, ranks: [domi.id] },
  })
  expect(rejected.status()).toBe(409)
})

async function roundChallengeId(
  api: Awaited<ReturnType<typeof request.newContext>>,
  code: string,
): Promise<string> {
  const state = await (await api.get(`/api/rounds/${code}`)).json()
  return state.challenges[0].id
}
