import 'reflect-metadata'
import './environment.js'

import { createApplication } from './bootstrap.js'

async function bootstrap() {
  const app = await createApplication()
  const port = Number.parseInt(process.env.API_PORT ?? '3001', 10)
  await app.listen(port, '0.0.0.0')
}

void bootstrap()
