<script setup lang="ts">
defineProps<{
  summary: {
    runId?: number | null
    sourceType: 'tools' | 'proxy_list_bulk'
    status: 'success' | 'error'
    mode: 'request' | 'playwright' | 'crawlee'
    targetUrl: string | null
    totalInputs: number
    checked: number
    healthy: number
    unhealthy: number
    timeout: number
    invalid: number
    finishedAt: string
    errorMessage?: string | null
  } | null
}>()
</script>

<template>
  <Card v-if="summary" class="border-violet-500/20 bg-violet-500/5">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">Latest Health Check Run</CardTitle>
      <CardDescription>
        Ringkasan eksekusi checker terakhir dari tools atau bulk re-check list proxy.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Source</p>
          <p class="text-sm font-semibold uppercase">{{ summary.sourceType }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Mode</p>
          <p class="text-sm font-semibold uppercase">{{ summary.mode }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Checked</p>
          <p class="text-sm font-semibold">{{ summary.checked }} / {{ summary.totalInputs }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Healthy</p>
          <p class="text-sm font-semibold text-emerald-600">{{ summary.healthy }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Unhealthy + Timeout</p>
          <p class="text-sm font-semibold">{{ summary.unhealthy }} + {{ summary.timeout }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Invalid</p>
          <p class="text-sm font-semibold">{{ summary.invalid }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Finished {{ new Date(summary.finishedAt).toLocaleString() }}</Badge>
        <Badge v-if="summary.targetUrl" variant="outline">{{ summary.targetUrl }}</Badge>
        <Badge :variant="summary.status === 'success' ? 'default' : 'destructive'">
          {{ summary.status }}
        </Badge>
      </div>

      <div v-if="summary.errorMessage" class="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">
        {{ summary.errorMessage }}
      </div>
    </CardContent>
  </Card>
</template>
