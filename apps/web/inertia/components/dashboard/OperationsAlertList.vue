<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'

defineProps<{
  alerts: Array<{
    title: string
    detail: string
    tone: 'critical' | 'warning' | 'info'
    href: string
  }>
}>()

const toneClasses = {
  critical: 'border-red-500/20 bg-red-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-cyan-500/20 bg-cyan-500/5',
}
</script>

<template>
  <Card class="border-border/70">
    <CardHeader>
      <CardTitle>Operational Alerts</CardTitle>
      <CardDescription>
        Prioritas item yang paling butuh tindakan dari tim Anda saat ini.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div v-if="alerts.length === 0" class="rounded-xl border bg-emerald-500/5 p-4 text-sm text-muted-foreground">
        Tidak ada alert kritikal saat ini. Pipeline scraper dan checker terlihat sehat.
      </div>

      <Link
        v-for="alert in alerts"
        :key="`${alert.title}-${alert.href}`"
        :href="alert.href"
        class="block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
        :class="toneClasses[alert.tone]"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium">{{ alert.title }}</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ alert.detail }}</p>
          </div>
          <Badge :variant="alert.tone === 'critical' ? 'destructive' : 'secondary'" class="uppercase">
            {{ alert.tone }}
          </Badge>
        </div>
      </Link>
    </CardContent>
  </Card>
</template>
