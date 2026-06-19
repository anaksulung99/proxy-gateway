<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'

defineProps<{
  title: string
  description: string
  href: string
  rows: Array<{
    id: number
    name: string
    subtitle: string
    status: string
    meta: string
    startedAt: string | null
  }>
}>()

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}
</script>

<template>
  <Card class="border-border/70">
    <CardHeader class="flex flex-row items-center justify-between gap-3">
      <div>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription>{{ description }}</CardDescription>
      </div>
      <Button variant="ghost" size="sm" as-child>
        <Link :href="href">Open logs</Link>
      </Button>
    </CardHeader>
    <CardContent class="space-y-3">
      <div v-if="rows.length === 0" class="rounded-xl border p-4 text-sm text-muted-foreground">
        Belum ada aktivitas yang tercatat.
      </div>
      <div
        v-for="row in rows"
        :key="row.id"
        class="rounded-xl border bg-card/70 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium">{{ row.name }}</p>
            <p class="text-xs text-muted-foreground">{{ row.subtitle }}</p>
          </div>
          <Badge :variant="row.status === 'success' ? 'default' : row.status === 'error' ? 'destructive' : 'secondary'">
            {{ row.status }}
          </Badge>
        </div>
        <p class="mt-3 text-sm text-muted-foreground">{{ row.meta }}</p>
        <p class="mt-2 text-xs text-muted-foreground">{{ fmtDate(row.startedAt) }}</p>
      </div>
    </CardContent>
  </Card>
</template>
