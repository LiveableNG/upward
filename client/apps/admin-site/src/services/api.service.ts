const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

class ApiService {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private async handleResponse(response: Response) {
    const data = await response.json()
    if (!response.ok) {
      throw { status: response.status, message: data.message || 'API request failed' }
    }
    return data
  }

  async get(endpoint: string, token?: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(token),
      credentials: 'include',
    })
    return this.handleResponse(response)
  }

  async post(endpoint: string, body: unknown, token?: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    })
    return this.handleResponse(response)
  }

  async postForm(endpoint: string, body: FormData, token?: string) {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
    })
    return this.handleResponse(response)
  }

  async put(endpoint: string, body: unknown, token?: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    })
    return this.handleResponse(response)
  }

  async patch(endpoint: string, body: unknown, token?: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    })
    return this.handleResponse(response)
  }

  async delete(endpoint: string, token?: string) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
      body: JSON.stringify({}),
      credentials: 'include',
    })
    return this.handleResponse(response)
  }
}

export const apiService = new ApiService()
