import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'

const ALGORITHM = 'scrypt'
const COST = 131_072
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16
const MAX_MEMORY = 256 * 1024 * 1024

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const derivedKey = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION)
  return [
    ALGORITHM,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parsed = parseHash(encodedHash)
  if (!parsed) return false

  const actual = await derive(
    password,
    parsed.salt,
    parsed.cost,
    parsed.blockSize,
    parsed.parallelization,
  )
  return actual.length === parsed.expected.length && timingSafeEqual(actual, parsed.expected)
}

function parseHash(encodedHash: string):
  | {
      blockSize: number
      cost: number
      expected: Buffer
      parallelization: number
      salt: Buffer
    }
  | undefined {
  const [algorithm, rawCost, rawBlockSize, rawParallelization, rawSalt, rawExpected, ...rest] =
    encodedHash.split('$')
  if (
    algorithm !== ALGORITHM ||
    rest.length > 0 ||
    !rawCost ||
    !rawBlockSize ||
    !rawParallelization ||
    !rawSalt ||
    !rawExpected
  ) {
    return undefined
  }

  const cost = Number(rawCost)
  const blockSize = Number(rawBlockSize)
  const parallelization = Number(rawParallelization)
  if (cost !== COST || blockSize !== BLOCK_SIZE || parallelization !== PARALLELIZATION) {
    return undefined
  }

  const salt = Buffer.from(rawSalt, 'base64url')
  const expected = Buffer.from(rawExpected, 'base64url')
  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return undefined
  return { blockSize, cost, expected, parallelization, salt }
}

function derive(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: cost, maxmem: MAX_MEMORY, p: parallelization, r: blockSize },
      (error, derivedKey) => {
        if (error) reject(error)
        else resolve(derivedKey)
      },
    )
  })
}
