<script lang="ts" setup>
import { router } from '@inertiajs/vue3'
import { useSidebar } from '@/components/ui/sidebar'
import { BadgeCheck, Shield, LogOut, ChevronsUpDown, KeyRoundIcon } from '@lucide/vue'

type UserProfile = {
  email?: string | null
  profile?: {
    name?: string | null
    email?: string | null
  } | null
}

const props = defineProps<{
  user: UserProfile | null
}>()

const { isMobile } = useSidebar()

const displayName = computed(() => props.user?.profile?.name || props.user?.email || 'User')
const displayInitials = computed(() => displayName.value.slice(0, 2).toUpperCase())
const displayEmail = computed(() => props.user?.profile?.email || props.user?.email || 'Email')

function handleSignOut() {
  router.post('/logout')
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarFallback class="rounded-lg uppercase">
                {{ displayInitials }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold capitalize">{{ displayName }}</span>
              <span class="truncate text-xs">{{ displayEmail }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarFallback class="rounded-lg uppercase">
                  {{ displayInitials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold capitalize">{{ displayName }}</span>
                <span class="truncate text-xs">{{ displayEmail }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <RouterLink to="/app/accounts/profile">
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
            </RouterLink>
            <RouterLink to="/app/accounts/security">
              <DropdownMenuItem>
                <Shield />
                Security
              </DropdownMenuItem>
            </RouterLink>
            <RouterLink to="/app/accounts/license">
              <DropdownMenuItem>
                <KeyRoundIcon />
                License
              </DropdownMenuItem>
            </RouterLink>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" @click="handleSignOut">
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped></style>
