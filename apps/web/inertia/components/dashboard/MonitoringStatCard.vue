<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  title: string
  value: string | number
  detail: string
  icon: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}>()

const toneClasses = {
  default: 'border-border/70 bg-card',
  success: 'border-emerald-500/20 bg-emerald-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  danger: 'border-red-500/20 bg-red-500/5',
  info: 'border-cyan-500/20 bg-cyan-500/5',
}
</script>

<template>
  <Card :class="toneClasses[tone ?? 'default']">
    <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-3">
      <div>
        <CardDescription>{{ title }}</CardDescription>
        <CardTitle class="mt-2 text-2xl">{{ value }}</CardTitle>
      </div>
      <div class="rounded-xl border bg-background/80 p-2">
        <Icon :icon="icon" class="size-5 text-muted-foreground" />
      </div>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">{{ detail }}</p>
    </CardContent>
  </Card>
</template>
