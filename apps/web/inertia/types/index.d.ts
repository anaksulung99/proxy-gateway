declare global {
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
