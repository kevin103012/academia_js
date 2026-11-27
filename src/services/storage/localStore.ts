export const localStore = {
  getText(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setText(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },

  getJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  setJson<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },
}
