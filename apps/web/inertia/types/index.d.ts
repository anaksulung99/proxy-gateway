declare global {
  type UserRole = 'admin' | 'user'

  interface Window {}

  interface AppNavMain {
    title: string
    href: string
    icon?: string
    exact: boolean
    roles?: UserRole[]
    children?: {
      title: string
      href: string
      exact: boolean
    }[]
  }
}

export {}
