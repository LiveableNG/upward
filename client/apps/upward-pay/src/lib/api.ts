/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'

export const api = {
  signup: (data: any) =>
    request<any>('/tenant/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: any) =>
    request<any>('/tenant/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<any>('/tenant/auth/logout', {
      method: 'POST',
    }),
}
