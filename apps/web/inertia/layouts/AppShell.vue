<script lang="ts" setup>
import type { Data } from '@generated/data'

const props = defineProps<{ title?: string; description?: string }>()

const page = usePage<Data.SharedProps>()
</script>

<template>
  <SidebarProvider class="overflow-x-hidden">
    <AppSidebar />
    <SidebarInset class="min-w-0 max-w-full overflow-x-hidden">
      <header
        class="sticky top-0 z-30 flex min-w-0 shrink-0 items-center gap-2 border-b-2 border-neutral-300 bg-background py-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 data-state:close:py-3 dark:border-neutral-800"
      >
        <div class="flex min-w-0 w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
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
      <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-3 pt-0 sm:p-4 sm:pt-0">
        <div class="flex min-h-0 min-w-0 w-full flex-1 flex-col">
          <div
            class="mx-auto min-h-0 min-w-0 w-full max-w-360 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-3 sm:p-6"
          >
            <div class="flex min-w-0 flex-col gap-4 md:flex-row md:justify-between">
              <div class="flex min-w-0 flex-col justify-start text-start">
                <h1 v-if="props.title" class="text-2xl font-bold">{{ props.title }}</h1>
                <p v-if="props.description" class="mt-1 max-w-4xl text-sm text-muted-foreground">
                  {{ props.description }}
                </p>
              </div>
              <div class="flex max-w-full shrink-0 flex-wrap gap-2">
                <slot name="actions" />
              </div>
            </div>
            <div class="min-w-0 max-w-full space-y-4">
              <slot />
            </div>
          </div>
        </div>
      </div>
      <GlobalAlertDialog />
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped></style>
