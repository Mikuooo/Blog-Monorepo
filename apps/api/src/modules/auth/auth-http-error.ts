import { HttpException } from '@nestjs/common'

export function authHttpError(statusCode: 401 | 403, code: string, message: string): HttpException {
  return new HttpException({ code, message, statusCode }, statusCode)
}
