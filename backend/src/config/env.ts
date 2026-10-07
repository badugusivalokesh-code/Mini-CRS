import dotenv from 'dotenv'

dotenv.config()

interface EnvConfig {
  nodeEnv: string
  port: number
  mongoUri: string
  mongoDnsServers: string[]
  jwtSecret: string
  clientUrl: string
}

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Centralised, validated access to environment variables.
 * There are no fallback secrets — the app refuses to start without them,
 * on purpose.
 */
export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGO_URI'),
  mongoDnsServers: (process.env.MONGO_DNS_SERVERS ?? '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),
  jwtSecret: required('JWT_SECRET'),
  clientUrl: required('CLIENT_URL'),
}
