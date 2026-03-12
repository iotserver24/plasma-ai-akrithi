import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('selectedRepo')
}

export async function login(username: string, password: string) {
  const response = await api.post('/auth/login', { username, password })
  const token = (response.data as { token?: string }).token
  if (token) setToken(token)
  return response.data
}

export async function getRepositories() {
  const response = await api.get('/github/repos')
  return response.data
}

export async function cloneRepository(repo: string) {
  const response = await api.post('/github/clone', { repo })
  return response.data
}

export async function executePrompt(prompt: string) {
  const response = await api.post('/execute', { prompt })
  return response.data
}
