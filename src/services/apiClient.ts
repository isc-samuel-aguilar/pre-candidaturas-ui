export interface ApiResponse<T> {
  data: T
  status: number
  ok: boolean
}

export interface ApiError {
  message: string
  status: number
  error?: string
}

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  timeout?: number
  includeAuth?: boolean
  queryParams?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private onUnauthorized: (() => void) | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  setOnUnauthorized(callback: (() => void) | null) {
    this.onUnauthorized = callback
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { timeout = 10000, includeAuth = true, queryParams, ...fetchOptions } = options
    let url = `${this.baseUrl}${endpoint}`

    if (queryParams) {
      const params = new URLSearchParams(queryParams)
      url += `?${params.toString()}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const isFormData = body instanceof FormData
      const response = await fetch(url, {
        method,
        headers: isFormData
          ? { Authorization: `Bearer ${this.token}` }
          : this.getHeaders(includeAuth),
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...fetchOptions,
      })

      clearTimeout(timeoutId)

      let data: T | undefined
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.onUnauthorized?.()
        }
        const errorData = data as ApiError | undefined
        throw {
          message: errorData?.message || `Error ${response.status}`,
          status: response.status,
          error: errorData?.error,
        } as ApiError
      }

      return {
        data: data as T,
        status: response.status,
        ok: true,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw {
          message: 'Tiempo de espera agotado',
          status: 408,
        } as ApiError
      }

      if ('status' in (error as ApiError)) {
        throw error
      }

      throw {
        message: 'Error de conexión con el servidor',
        status: 0,
      } as ApiError
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options)
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options)
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options)
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options)
  }
}

export const authClient = new ApiClient(import.meta.env.VITE_AUTH_URL)
export const apiClient = new ApiClient(import.meta.env.VITE_API_URL)