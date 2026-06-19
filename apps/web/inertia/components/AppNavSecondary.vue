<script lang="ts" setup>
import type { Data } from '@generated/data'
import { Icon } from '@iconify/vue'
import { Link } from '@adonisjs/inertia/vue'
import { ChevronRight } from '@lucide/vue'
import { cn } from '~/lib/utils'

defineProps<{
  items: AppNavMain[]
}>()

const page = usePage<Data.SharedProps>()
const currentUrl = computed(() => page.url)

function isActive(href: string, exact: boolean) {
  const url = currentUrl.value.split('?')[0]
  return exact ? url === href : url === href || url.startsWith(href + '/')
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Settings</SidebarGroupLabel>
    <SidebarMenu>
      <Collapsible
        v-for="item in items"
        :key="item.title"
        as-child
        :default-open="item.exact"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton
              :tooltip="item.title"
              :class="
                cn(
                  'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-500 hover:font-bold',
                  {
                    'text-emerald-600 dark:text-emerald-500 font-bold': isActive(
                      item.href,
                      item.exact
                    ),
                  }
                )
              "
              as-child
            >
              <Link :href="item.href">
                <Icon v-if="item.icon" :icon="item.icon" />
                <span>{{ item.title }}</span>
                <ChevronRight
                  v-if="item.children"
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </Link>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub v-if="item.children">
              <SidebarMenuSubItem v-for="subItem in item.children" :key="subItem.title">
                <SidebarMenuSubButton
                  :class="
                    cn(
                      'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-500 hover:font-bold',
                      {
                        'text-emerald-600 dark:text-emerald-500 font-bold': isActive(
                          subItem.href,
                          subItem.exact
                        ),
                      }
                    )
                  "
                  as-child
                  :href="subItem.href"
                >
                  <Link :href="subItem.href">
                    <span>{{ subItem.title }}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>
</template>

<style scoped></style>
