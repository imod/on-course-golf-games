import { test, expect, request } from '@playwright/test'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test-password'
const headers = { 'x-admin-password': ADMIN_PASSWORD, 'content-type': 'application/json' }

// Players and the challenge created by this spec are real, permanent rows in
// the target database (there is no delete endpoint, only archive). Track
// their ids so afterAll can archive them regardless of whether the test
// passes, and give them names that are unmistakably test data in case
// archiving itself is ever skipped (a failed run before ids are captured).
let createdPlayerIds: string[] = []
let createdChallengeId: string | null = null

test.afterAll(async () => {
  if (createdPlayerIds.length === 0 && createdChallengeId === null) return

  const api = await request.newContext({ baseURL: 'http://localhost:3000' })
  try {
    for (const id of createdPlayerIds) {
      await api.patch('/api/admin/players', { headers, data: { id, archived: true } })
    }
    if (createdChallengeId !== null) {
      await api.patch('/api/admin/challenges', {
        headers,
        data: { id: createdChallengeId, archived: true },
      })
    }
  } finally {
    await api.dispose()
  }
})

test('a flight plays a round from two devices', async ({ page, browser }) => {
  const api = await request.newContext({ baseURL: 'http://localhost:3000' })

  const domi = await (
    await api.post('/api/admin/players', { headers, data: { name: 'Domi E2E' } })
  ).json()
  const res = await (
    await api.post('/api/admin/players', { headers, data: { name: 'Res E2E' } })
  ).json()
  createdPlayerIds = [domi.id, res.id]

  const ntp = await (
    await api.post('/api/admin/challenges', {
      headers,
      data: { name: 'Nearest to the pin E2E', points: [3, 2, 1], scope: 'per_hole', allowTies: false },
    })
  ).json()
  createdChallengeId = ntp.id

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

  const rcId: string = (await (await api.get(`/api/rounds/${round.code}`)).json()).challenges[0].id

  // Device one: the phone in the flight. Domi wins hole 1 (3 pts).
  await page.goto(`/r/${round.code}`)
  await expect(page.getByText('E2E Breitenloo')).toBeVisible()

  const domiCellHole1 = page.getByTestId(`cell-${rcId}-${domi.id}`)
  await domiCellHole1.click()
  await page.getByTestId(`save-${rcId}`).click()
  // Assert on the cell itself, not on the page-wide legend "3 · 2 · 1" that
  // is in the DOM (and earlier in DOM order) whether or not the save landed.
  await expect(domiCellHole1).toContainText('3')

  // Device two: the watch, posting through the compact API. Res wins hole 2
  // (3 pts), Domi is second (2 pts).
  const watchResponse = await api.post(`/api/w/${round.code}/result`, {
    data: { rc: rcId, hole: 2, ranks: [res.id, domi.id] },
  })
  expect(watchResponse.ok()).toBe(true)

  // Device one sees the watch's entry after a reload: navigate a second
  // device to the round, move to hole 2, and check the rendered cells and
  // standings actually reflect what the watch wrote (not just that the API
  // agrees with itself).
  const second = await browser.newPage()
  await second.goto(`/r/${round.code}`)
  await expect(second.getByText('E2E Breitenloo')).toBeVisible()

  await second.getByRole('button', { name: 'Next hole' }).click()
  await expect(second.getByTestId('hole-number')).toHaveText('2')

  await expect(second.getByTestId(`cell-${rcId}-${res.id}`)).toContainText('3')
  await expect(second.getByTestId(`cell-${rcId}-${domi.id}`)).toContainText('2')

  await expect(second.getByTestId(`column-${domi.id}`)).toContainText('5')
  await expect(second.getByTestId(`column-${res.id}`)).toContainText('3')

  const state = await (await api.get(`/api/rounds/${round.code}`)).json()
  const totals = Object.fromEntries(
    state.standings.map((s: { playerId: string; points: number }) => [s.playerId, s.points]),
  )
  expect(totals[domi.id]).toBe(5)
  expect(totals[res.id]).toBe(3)

  // A finished round stops accepting entries.
  await api.post(`/api/rounds/${round.code}/finish`)
  const rejected = await api.post(`/api/w/${round.code}/result`, {
    data: { rc: rcId, hole: 3, ranks: [domi.id] },
  })
  expect(rejected.status()).toBe(409)
})
