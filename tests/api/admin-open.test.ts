import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { adminIsOpen } from '@/server/admin-auth'
import { GET as getChallenges, POST as postChallenge } from '@/app/api/admin/challenges/route'

const PASSWORD = 'test-password'

function unauthed(body?: unknown, method = 'POST'): Request {
  return new Request('http://test/', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('the ADMIN_OPEN switch', () => {
  beforeEach(async () => {
    process.env.ADMIN_PASSWORD = PASSWORD
    delete process.env.ADMIN_OPEN
    await resetDatabase()
  })
  afterEach(() => {
    delete process.env.ADMIN_OPEN
  })

  it('defaults to closed when the variable is absent', () => {
    expect(adminIsOpen()).toBe(false)
  })

  it('stays closed for values that are not exactly "true"', () => {
    for (const value of ['false', 'TRUE', 'True', '1', 'yes', '', ' true']) {
      process.env.ADMIN_OPEN = value
      expect(adminIsOpen(), `ADMIN_OPEN=${JSON.stringify(value)}`).toBe(false)
    }
  })

  it('opens only for exactly "true"', () => {
    process.env.ADMIN_OPEN = 'true'
    expect(adminIsOpen()).toBe(true)
  })

  it('still 401s an unauthenticated read while closed', async () => {
    expect((await getChallenges(unauthed(undefined, 'GET'))).status).toBe(401)
  })

  it('allows an unauthenticated read when open', async () => {
    process.env.ADMIN_OPEN = 'true'
    const response = await getChallenges(unauthed(undefined, 'GET'))
    expect(response.status).toBe(200)
  })

  it('allows an unauthenticated write when open', async () => {
    process.env.ADMIN_OPEN = 'true'
    const response = await postChallenge(
      unauthed({ name: 'Open game', points: [1], scope: 'per_hole', allowTies: false }),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).name).toBe('Open game')
  })

  it('still validates the body when open', async () => {
    process.env.ADMIN_OPEN = 'true'
    const response = await postChallenge(unauthed({ name: 'Bad', points: 'nope' }))
    expect(response.status).toBe(400)
  })
})
