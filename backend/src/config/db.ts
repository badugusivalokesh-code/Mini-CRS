import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env'

mongoose.set('strictQuery', true)

export async function connectDB(): Promise<void> {
  try {
    if (env.mongoDnsServers.length > 0) {
      dns.setServers(env.mongoDnsServers)
    } else if (env.nodeEnv === 'development') {
      dns.setServers(['8.8.8.8'])
    }
    await mongoose.connect(env.mongoUri)
    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
}
