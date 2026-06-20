<script lang="ts" setup>
import type { Data } from '@generated/data'

const props = defineProps<{ title?: string; description?: string }>()

const page = usePage<Data.SharedProps>()
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header
        class="sticky top-0 flex z-999 shrink-0 items-center gap-2 border-b-2 border-neutral-300 dark:border-neutral-800 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-background py-3 data-state:close:py-3"
      >
        <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="#" class="text-primary">
                  {{ page.props.title }}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div class="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <!-- WS status indicator -->
            <!-- <span
              class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              :title="
                ws.connected.value
                  ? 'Real-time connected'
                  : 'Real-time disconnected'
              "
            >
              <span
                class="size-2 rounded-full"
                :class="
                  ws.connected.value
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-muted-foreground/40'
                "
              />
            </span> -->
          </div>
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div class="flex h-screen w-full flex-col">
          <div class="mx-auto h-full w-full flex-1 overflow-y-auto p-6 space-y-6">
            <div class="flex flex-col md:flex-row md:justify-between gap-4">
              <div class="text-start flex flex-col justify-start">
                <h1 v-if="props.title" class="text-2xl font-bold">{{ props.title }}</h1>
                <p v-if="props.description" class="text-sm text-muted-foreground mt-1">
                  {{ props.description }}
                </p>
              </div>
              <slot name="actions" class="flex gap-2" />
            </div>
            <slot />
          </div>
        </div>
      </div>
      <GlobalAlertDialog />
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped></style>
