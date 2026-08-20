import { Module } from '@nestjs/common'

import { STORAGE_PROVIDER } from './storage-provider.js'
import { S3StorageProvider } from './s3-storage.provider.js'

@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: S3StorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageInfrastructureModule {}
