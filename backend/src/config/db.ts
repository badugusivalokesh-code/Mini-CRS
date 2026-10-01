import mongoose from 'mongoose'
import { env } from './env'

mongoose.set('strictQuery', true)

export async function connectDB(): Promise<void> {
  try {
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
