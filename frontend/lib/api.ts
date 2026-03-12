import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    const githubToken = localStorage.getItem('githubToken')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    if (githubToken) config.headers['x-github-token'] = githubToken
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
  localStorage.removeItem('githubToken')
  localStorage.removeItem('selectedRepo')
}

export function getGithubToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('githubToken')
}

export function setGithubToken(token: string) {
  localStorage.setItem('githubToken', token)
}
