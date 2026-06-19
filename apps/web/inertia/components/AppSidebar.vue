<script lang="ts" setup>
import { useSidebar, type SidebarProps } from '@/components/ui/sidebar'
const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const userRole = computed<'USER' | 'ADMIN' | 'OWNER'>(() => 'USER')
const isAdmin = computed(() => userRole.value === 'ADMIN' || userRole.value === 'OWNER')

const navMain: AppNavMain[] = [
  { title: 'Dashboard', href: '/app', icon: 'lucide:layout-dashboard', exact: true },
  { title: 'Proxy Lists', href: '/app/proxy-lists', icon: 'lucide:list', exact: false },
  { title: 'Scraper', href: '/app/scraper', icon: 'lucide:radar', exact: false },
  { title: 'Analytics', href: '/app/analytics', icon: 'lucide:chart-column', exact: false },
  { title: 'Tools', href: '/app/tools', icon: 'lucide:wrench', exact: false },
]

const navSecondary: AppNavMain[] = [
  {
    title: 'Accounts',
    href: '#',
    icon: 'material-symbols:account-circle',
    exact: false,
    children: [
      {
        title: 'Profile',
        href: '/app/accounts',
        exact: true,
      },
      {
        title: 'License',
        href: '/app/accounts/license',
        exact: true,
      },
    ],
  },
  {
    title: 'Settings',
    href: '/app/settings',
    icon: 'material-symbols:settings-outline',
    exact: false,
  },
]

const navMainItems = computed(() => {
  const items = navMain.filter((item) => {
    if (!item.roles?.length) {
      return true
    }

    return item.roles.includes(userRole.value as any)
  })

  if (isAdmin.value) {
    items.push({
      title: 'Users',
      href: '/app/users',
      icon: 'material-symbols:group-outline',
      exact: false,
    })
  }

  return items
})

const { isMobile, state, open } = useSidebar()

const isIconMode = computed(() => {
  if (isMobile.value) return true
  return state.value === 'collapsed' || !open.value
})
const showAppName = computed(() => {
  return !isIconMode.value
})
</script>

<template>
  <Sidebar v-bind="props" class="z-9999">
    <SidebarHeader class="pt-14 md:pt-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex items-center gap-2">
              <div class="flex size-10 items-center justify-center rounded-lg">
                <img
                  src="/logo.png"
                  alt="Residential Proxy"
                  class="data-[state=open]:size-10 data-[state=collapsed]:size-8"
                />
              </div>
              <div
                v-show="showAppName"
                class="grid flex-1 text-left text-sm leading-tight transition-all duration-200"
              >
                <span class="truncate font-semibold text-foreground"> Residential Proxy </span>
                <span class="truncate text-xs text-muted-foreground"> 0.0.1 </span>
              </div>
              <div
                class="grid md:hidden flex-1 text-left text-sm leading-tight transition-all duration-200"
              >
                <span class="truncate font-semibold text-foreground"> Residential Proxy </span>
                <span class="truncate text-xs text-muted-foreground"> 0.0.1 </span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <AppNavMain :items="navMainItems" />
      <AppNavSecondary :items="navSecondary" />
    </SidebarContent>
    <SidebarFooter>
      <!-- <AppNavUser :user="user" /> -->
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped></style>
