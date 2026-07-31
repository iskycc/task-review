import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

function prisma(...args) {
  const result = spawnSync('npx', ['prisma', ...args], { stdio: 'inherit', env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const client = new PrismaClient()
let tables = []
try {
  tables = await client.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table'")
} finally {
  await client.$disconnect()
}

const names = new Set(tables.map((table) => table.name))
if (names.has('Project') && !names.has('_prisma_migrations')) {
  prisma('migrate', 'resolve', '--applied', '202607290001_initial')
  if (names.has('User')) prisma('migrate', 'resolve', '--applied', '202608010001_multi_user_review')
}
prisma('migrate', 'deploy')
