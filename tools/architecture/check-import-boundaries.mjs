import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourceRoots = [resolve(repositoryRoot, 'apps'), resolve(repositoryRoot, 'packages')]
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'])
const skippedDirectories = new Set(['.next', 'coverage', 'dist', 'generated', 'node_modules'])
const importPattern = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        return skippedDirectories.has(entry.name) ? [] : collectSourceFiles(path)
      }
      const extension = entry.name.slice(entry.name.lastIndexOf('.'))
      return sourceExtensions.has(extension) ? [path] : []
    }),
  )
  return nested.flat()
}

function applicationFor(path) {
  const applicationRoot = resolve(repositoryRoot, 'apps') + sep
  if (!path.startsWith(applicationRoot)) return undefined
  return relative(applicationRoot, path).split(sep)[0]
}

function isPersistencePath(path) {
  const normalized = path.split(sep).join('/')
  return normalized.includes('/infrastructure/') || normalized.includes('/persistence/')
}

function inspectImport(file, specifier) {
  const violations = []
  const normalizedFile = file.split(sep).join('/')
  const sourceApp = applicationFor(file)

  if (
    (specifier.startsWith('@prisma/') || specifier.includes('generated/prisma')) &&
    !normalizedFile.includes('/packages/database/')
  ) {
    violations.push('Prisma imports are restricted to packages/database')
  }

  if (specifier === '@blog/database' || specifier.startsWith('@blog/database/')) {
    if (!isPersistencePath(file)) {
      violations.push('@blog/database is allowed only in persistence/infrastructure paths')
    }
  }

  if (
    (sourceApp === 'web' || sourceApp === 'admin') &&
    ['@blog/database', '@blog/event-contracts', '@blog/internal-api-client'].some(
      (blocked) => specifier === blocked || specifier.startsWith(`${blocked}/`),
    )
  ) {
    violations.push(`${sourceApp} cannot depend on backend-only packages`)
  }

  if (sourceApp === 'worker' && (specifier.includes('apps/api') || specifier === '@blog/api')) {
    violations.push('worker cannot import API application implementation')
  }

  if (specifier.startsWith('.')) {
    const target = resolve(dirname(file), specifier)
    const targetApp = applicationFor(target)
    if (sourceApp && targetApp && sourceApp !== targetApp) {
      violations.push(`cross-application relative import from ${sourceApp} to ${targetApp}`)
    }
    if (normalizedFile.includes('/packages/') && target.includes(`${sep}apps${sep}`)) {
      violations.push('shared packages cannot import deployable applications')
    }
  }

  return violations
}

const files = (await Promise.all(sourceRoots.map(collectSourceFiles))).flat()
const failures = []

for (const file of files) {
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    if (!specifier) continue
    for (const message of inspectImport(file, specifier)) {
      failures.push(`${relative(repositoryRoot, file)} -> ${specifier}: ${message}`)
    }
  }
}

if (failures.length > 0) {
  console.error(
    ['Architecture boundary violations:', ...failures.map((item) => `- ${item}`)].join('\n'),
  )
  process.exitCode = 1
} else {
  console.log(`Architecture boundaries verified across ${files.length} source files.`)
}
