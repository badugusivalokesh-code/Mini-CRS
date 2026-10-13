import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signOutAndNavigate } from '../src/lib/signOut'

test('signing out clears the session before replacing the route with the public landing page', async () => {
  const calls: string[] = []

  await signOutAndNavigate(
    async () => { calls.push('logout') },
    (to, options) => { calls.push(`navigate:${to}:${options.replace}`) },
  )

  assert.deepEqual(calls, ['logout', 'navigate:/:true'])
})

test('a failed sign-out does not navigate away from the protected page', async () => {
  let navigated = false

  await assert.rejects(
    signOutAndNavigate(
      async () => { throw new Error('Logout failed') },
      () => { navigated = true },
    ),
  )

  assert.equal(navigated, false)
})
