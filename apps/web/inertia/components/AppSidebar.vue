<script lang="ts" setup>
import { computed } from 'vue'
import { useSidebar, type SidebarProps } from '@/components/ui/sidebar'
import { useAuthStore } from '~/stores/auth'
const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const auth = useAuthStore()
const userRole = computed<UserRole>(() => auth.user?.role?.name ?? 'user')
const isAdmin = computed(() => auth.user?.isAdmin === true)

const navMain: AppNavMain[] = [
  { title: 'Dashboard', href: '/app', icon: 'lucide:layout-dashboard', exact: true },
  { title: 'Analytics', href: '/app/analytics', icon: 'lucide:chart-column', exact: false },
  { title: 'Proxy Lists', href: '/app/proxy-lists', icon: 'lucide:list', exact: false },
  { title: 'Scraper', href: '/app/scraper', icon: 'lucide:radar', exact: false },
  { title: 'Tools', href: '/app/tools', icon: 'lucide:wrench', exact: false },
  { title: 'API Keys', href: '/app/settings/api-keys', icon: 'lucide:key-round', exact: false },
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
      title: 'Teams',
      href: '/app/teams',
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
  <Sidebar v-bind="props" class="z-40 overflow-x-hidden">
    <SidebarHeader class="pt-14 md:pt-5">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex min-w-0 items-center gap-2 overflow-hidden">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-lg">
                <img
                  src="/logo.png"
                  alt="Residential Proxy"
                  class="data-[state=open]:size-10 data-[state=collapsed]:size-8"
                />
              </div>
              <div
                v-show="showAppName"
                class="grid min-w-0 flex-1 text-left text-sm leading-tight transition-all duration-200"
              >
                <span class="truncate font-semibold text-foreground"> Residential Proxy </span>
                <span class="truncate text-xs text-muted-foreground"> 0.0.1 </span>
              </div>
              <div
                class="grid min-w-0 flex-1 text-left text-sm leading-tight transition-all duration-200 md:hidden"
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
    </SidebarContent>
    <SidebarFooter>
      <AppNavUser />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped></style>
