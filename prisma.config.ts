import path from 'node:path'
import { defineConfig } from '@prisma/config'
import dotenv from 'dotenv'

// Load environment variables in correct order: .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export default defineConfig({
  schema: './prisma/schema.prisma',
})
