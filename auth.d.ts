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
    // session payload (besides user) — none extra for now
  }
}

export {}
