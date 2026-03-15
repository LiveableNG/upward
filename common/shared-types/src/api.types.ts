export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}
