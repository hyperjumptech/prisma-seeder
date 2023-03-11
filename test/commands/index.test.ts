import { expect, test } from '@oclif/test'
import { PrismaClient } from '@prisma/client'
import PrismaSeeder from '../../src/commands/index'

const prismaClient = new PrismaClient({
  log: ['info', 'warn', 'error'],
  errorFormat: 'minimal',
})

async function truncateAllTables() {
  const result: any = await prismaClient.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `
  const tableNames = result
    .map((row: any) => row.table_name)
    .filter((table: string) => table[0] !== '_')
  for (const tableName of tableNames) {
    await prismaClient.$executeRawUnsafe(
      `TRUNCATE TABLE "${tableName}" CASCADE`
    )
  }
}

describe('prisma-seeder', () => {
  beforeEach(async () => {
    await truncateAllTables()
  })
  test.it('seeds the database', async () => {
    console.log('HERE???')
    await PrismaSeeder.run([
      '-s',
      'schema.example.prisma',
      '-d',
      'postgres://prisma:password@localhost:5432/prisma',
    ])
    const users = await prismaClient.user.findMany()
    const posts = await prismaClient.post.findMany()

    console.dir({ users, posts }, { depth: null })
    expect(users.length).greaterThan(0)
    expect(posts.length).greaterThan(0)
  })
})
