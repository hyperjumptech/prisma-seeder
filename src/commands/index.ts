import { Command, Flags } from '@oclif/core'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import { updateEnv } from '../scripts/env-edit'
import { v4 as uuidv4 } from 'uuid'

let prisma: any
const results: any[] = []

export default class PrismaSeeder extends Command {
  static description =
    'Start seeding by providing path_to_schema_prisma_file and url_of_the_database'

  static examples = [
    `$ oex --schema <path_to_schema_prisma_file> --database-url <url_of_the_database>
Start seeding...
Finish seeding.
`,
  ]

  static flags = {
    schema: Flags.string({
      char: 's',
      description: 'path to schema prisma file',
      required: true,
    }),
    'database-url': Flags.string({
      char: 'd',
      description: 'url of the database',
      required: true,
    }),
    reset: Flags.string({
      char: 'r',
      description: 'need reset db or not',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(PrismaSeeder)

    this.log('Start seeding...')
    this.log(
      `The schema path: ${flags.schema} \nand the DB url: ${flags['database-url']}`
    )

    // update env DB
    this.log('Updating env...')
    updateEnv('./.env', 'DATABASE_URL', flags['database-url'])

    // copy prisma schema file
    this.log('Copying schema file...')
    execSync('rm -rf prisma-seeder-temp')
    execSync('mkdir prisma-seeder-temp')
    execSync(`cp ${flags.schema} ./prisma-seeder-temp/schema.prisma`)

    // insert json schema generator config
    this.log('Inserting json generator config...')
    const generatorConfig = `\r\r
generator jsonSchema {
  provider = "prisma-json-schema-generator"
  keepRelationScalarFields = "true"
  includeRequiredFields = "true"
}`
    fs.appendFileSync('./prisma-seeder-temp/schema.prisma', generatorConfig)

    const prismaTempLocation = '--schema=./prisma-seeder-temp/schema.prisma'

    // generate json file and prisma client
    this.log('Generating prisma schema...')
    execSync(`npx prisma generate ${prismaTempLocation}`)

    if (flags.reset === 'true') {
      // reset DB
      this.log('Resetting DB...')
      execSync('rm -rf migrations')
      execSync(`npx prisma migrate reset --force --skip-generate ${prismaTempLocation}`)

      // migrate DB
      this.log('Migrating DB...')
      console.time('Migration finish in')
      execSync(`npx prisma db push ${prismaTempLocation}`)
      console.timeEnd('Migration finish in')
    }

    // get new generated prisma client
    this.log('Getting new Prisma Client...')
    // eslint-disable-next-line unicorn/prefer-module
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()

    // read from json file
    this.log('Reading json schema...')
    const text = fs.readFileSync('prisma-seeder-temp/json-schema/json-schema.json', 'utf8')
    const jsonFile = JSON.parse(text)
    const models = Object.keys(jsonFile.definitions)

    // iterate models, for each models.properties, insert to results array
    this.log('Generating fake data...')
    const generatedUUID = uuidv4()
    for (const model of models) {
      const propertiesObj = jsonFile.definitions[model].properties
      const propertiesArr = Object.keys(propertiesObj)

      const fakeData = Object.assign(
        {},
        ...propertiesArr
          .filter(
            (key) =>
              key !== 'createdAt' &&
              key !== 'updatedAt' &&
              (propertiesObj[key].type === 'integer' ||
                propertiesObj[key].type === 'string' ||
                propertiesObj[key].type === 'boolean')
          )
          .map((key) => ({
            [key]:
              propertiesObj[key].type === 'integer'
                ? 1
                : propertiesObj[key].type === 'boolean'
                ? true
                : propertiesObj[key].enum
                ? propertiesObj[key].enum[0]
                : propertiesObj[key].format === 'date-time'
                ? '2022-01-20T12:01:30.543Z'
                : generatedUUID,
          }))
      )

      results.push({
        ...fakeData,
        $model: model,
      })
    }

    // iterate insert data
    let i = 0
    while (results.findIndex((val) => val !== null) !== -1) {
      const item = results[i]
      if (item) {
        // eslint-disable-next-line no-await-in-loop
        await insertData(i, item)
      }

      i += 1
    }

    await prisma.$disconnect()
    this.log('Finish seeding.')
  }
}

async function insertData(index: number, data: any) {
  const { $model, ...cleanData } = data

  try {
    console.log('Seeding model ' + $model + '...')

    // Seed using prisma client
    const key = $model[0].toLowerCase() + $model.slice(1)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prisma[key].create({ data: cleanData })

    results[index] = null
  } catch (error: any) {
    if (error.code === 'P2003') {
      console.log(
        'Failed seeding model ' +
          $model +
          ' due to [FKey Constarint]. Will be retried'
      )
      results.push(data)
    } else {
      console.log(error)
    }

    results[index] = null
  }
}
