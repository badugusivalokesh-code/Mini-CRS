import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import type { UserRecord, UserRepository } from '../src/models/User'

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mini-crm-test'
process.env.JWT_SECRET = 'test-only-secret-for-auth-api-tests'
process.env.CLIENT_URL = 'http://localhost:5173'
process.env.NODE_ENV = 'test'

class MemoryUserRepository implements UserRepository {
  private records: UserRecord[] = []

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.records.find((record) => record.email === email) ?? null
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.records.find((record) => record.id === id) ?? null
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    if (await this.findByEmail(input.email)) {
      throw Object.assign(new Error('Duplicate email'), { code: 11000 })
    }
    const record = { id: `test-user-${this.records.length + 1}`, ...input }
    this.records.push(record)
    return record
  }
}

let createApp: (options?: { userRepository?: UserRepository }) => Application
let authCookieOptions: typeof import('../src/utils/authToken').authCookieOptions
let envConfig: typeof import('../src/config/env').env
let app: Application
let users: MemoryUserRepository

before(async () => {
  ;({ createApp } = await import('../src/app'))
  ;({ authCookieOptions } = await import('../src/utils/authToken'))
  ;({ env: envConfig } = await import('../src/config/env'))
})

beforeEach(() => {
  users = new MemoryUserRepository()
  app = createApp({ userRepository: users })
})

test('registration creates a bcrypt hash and returns only a safe user', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: '  USER@example.com ', password: 'correct horse battery' })

  assert.equal(response.status, 201)
  assert.deepEqual(response.body.user, { id: 'test-user-1', email: 'user@example.com' })
  assert.equal(response.body.token, undefined)
  const storedUser = await users.findByEmail('user@example.com')
  assert.ok(storedUser?.passwordHash)
  assert.notEqual(storedUser.passwordHash, 'correct horse battery')
  assert.equal(await bcrypt.compare('correct horse battery', storedUser.passwordHash), true)
})

test('duplicate registration returns 409', async () => {
  const credentials = { email: 'user@example.com', password: 'correct horse battery' }
  assert.equal((await request(app).post('/api/auth/register').send(credentials)).status, 201)
  const response = await request(app).post('/api/auth/register').send(credentials)

  assert.equal(response.status, 409)
  assert.equal(response.body.user, undefined)
})

test('invalid registration input returns 400', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'short' })

  assert.equal(response.status, 400)
  assert.equal(typeof response.body.message, 'string')
})

test('login and registration endpoints enforce their independent rate limits', async () => {
  for (const [path, payload] of [
    ['/api/auth/register', { email: 'invalid', password: 'short' }],
    ['/api/auth/login', { email: 'invalid', password: 'short' }],
  ] as const) {
    const responses = []
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(await request(app).post(path).send(payload))
    }
    assert.ok(responses.slice(0, 10).every((response) => response.status === 400))
    assert.equal(responses[10].status, 429)
    assert.match(responses[10].body.message, /too many attempts/i)
  }
})

test('login returns a safe user and sets an httpOnly cookie, not a token response', async () => {
  await request(app).post('/api/auth/register')
    .send({ email: 'user@example.com', password: 'correct horse battery' })

  const response = await request(app).post('/api/auth/login')
    .send({ email: 'USER@example.com', password: 'correct horse battery' })
  const cookie = response.headers['set-cookie']?.[0]

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.user, { id: 'test-user-1', email: 'user@example.com' })
  assert.equal(response.body.token, undefined)
  assert.equal(response.body.passwordHash, undefined)
  assert.ok(cookie)
  assert.match(cookie, /^mini_crm_auth=/)
  assert.match(cookie, /; HttpOnly/i)
  assert.match(cookie, /; SameSite=Lax/i)
  assert.doesNotMatch(JSON.stringify(response.body), /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)
})

test('invalid credentials return a generic 401 response', async () => {
  const response = await request(app).post('/api/auth/login')
    .send({ email: 'unknown@example.com', password: 'incorrect password' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Email or password is incorrect.')
})

test('expired authentication tokens return 401', async () => {
  const secret = process.env.JWT_SECRET
  assert.ok(secret)
  const expiredToken = jwt.sign({ sub: 'test-user-1' }, secret, { expiresIn: -1 })
  const response = await request(app).get('/api/auth/me').set('Cookie', `mini_crm_auth=${expiredToken}`)

  assert.equal(response.status, 401)
})

test('GET /me rejects requests without an authentication cookie', async () => {
  const response = await request(app).get('/api/auth/me')

  assert.equal(response.status, 401)
  assert.equal(response.body.user, undefined)
})

test('GET /me returns the safe authenticated profile', async () => {
  await request(app).post('/api/auth/register')
    .send({ email: 'user@example.com', password: 'correct horse battery' })
  const login = await request(app).post('/api/auth/login')
    .send({ email: 'user@example.com', password: 'correct horse battery' })
  const cookie = login.headers['set-cookie']?.[0]?.split(';')[0]
  assert.ok(cookie)

  const response = await request(app).get('/api/auth/me').set('Cookie', cookie)

  assert.equal(response.status, 200)
  assert.deepEqual(response.body.user, { id: 'test-user-1', email: 'user@example.com' })
  assert.equal(response.body.passwordHash, undefined)
})

test('logout clears the authentication cookie', async () => {
  await request(app).post('/api/auth/register')
    .send({ email: 'user@example.com', password: 'correct horse battery' })
  const login = await request(app).post('/api/auth/login')
    .send({ email: 'user@example.com', password: 'correct horse battery' })
  const cookie = login.headers['set-cookie']?.[0]?.split(';')[0]
  assert.ok(cookie)

  const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie)

  assert.equal(logout.status, 200)
  assert.match(logout.headers['set-cookie']?.[0] ?? '', /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i)
})

test('malformed JSON requests return 400', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":')

  assert.equal(response.status, 400)
  assert.equal(response.body.message, 'Invalid JSON request body.')
})

test('disallowed CORS origins receive 403', async () => {
  const response = await request(app).get('/api/health').set('Origin', 'https://untrusted.example')

  assert.equal(response.status, 403)
})

test('production auth cookies are secure and cross-site compatible', () => {
  const previousEnvironment = envConfig.nodeEnv
  envConfig.nodeEnv = 'production'
  try {
    const options = authCookieOptions()
    assert.equal(options.httpOnly, true)
    assert.equal(options.secure, true)
    assert.equal(options.sameSite, 'none')
    assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000)
  } finally {
    envConfig.nodeEnv = previousEnvironment
  }
})