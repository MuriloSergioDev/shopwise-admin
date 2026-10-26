// Session shape for nuxt-auth-utils. `user` reaches the browser; `secure` never leaves the server.
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    roles: Array<'customer' | 'admin'>
  }

  interface SecureSessionData {
    /** Set while an admin is signed in. `accessExpiresAt` is epoch milliseconds. */
    tokens?: { accessToken: string; accessExpiresAt: number; refreshToken: string }
  }
}

export {}
