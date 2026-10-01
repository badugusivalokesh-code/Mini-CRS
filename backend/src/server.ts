import { createApp } from './app'
import { env } from './config/env'
import { connectDB } from './config/db'

async function start(): Promise<void> {
  await connectDB()

  const app = createApp()

  app.listen(env.port, () => {
    console.log(`Mini CRM API listening on port ${env.port} (${env.nodeEnv})`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
