/**
 * This script can be used to update an environment variable in the given environment file (e.g., .env)
 */
 import * as fs from 'node:fs'
 import * as path from 'node:path'
import * as dotenv from 'dotenv'

const envString = (envObj: Record<string, string>): string => {
  return Object.keys(envObj)
    .filter((key) => key.length > 0)
    .reduce((prev, curr) => {
      return `${prev}\n${curr}=${envObj[curr]}`
    }, '')
}

export const updateEnv = (
  envPath: string,
  varToChange: string,
  varValue: string
) => {
  const envPathResolved = path.resolve(envPath)
  const envContent = fs.readFileSync(envPathResolved).toString()
  const env = dotenv.parse(envContent)

  env[varToChange] = varValue

  fs.writeFileSync(envPath, envString(env))
}

if (require.main === module) {
  const envPath = './.env'
  if (process.argv[2] && process.argv[3]) {
    updateEnv(envPath, process.argv[2], process.argv[3])
  }
}
