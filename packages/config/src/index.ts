export class MissingEnvironmentVariableError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`)
    this.name = 'MissingEnvironmentVariableError'
  }
}

export function getRequiredEnvironmentVariable(
  name: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = environment[name]?.trim()
  if (!value) throw new MissingEnvironmentVariableError(name)
  return value
}
