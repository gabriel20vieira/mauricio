// Type augmentation for nuxt-auth-utils session.
declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    email: string
    role: 'admin' | 'user'
    hue: number
  }
  interface UserSession {
    // Server-side session row id — used to validate/revoke per device.
    sid?: string
    // "Remember me" tick at login — decides the cookie lifetime on every re-seal.
    remember?: boolean
  }
}

export {}
