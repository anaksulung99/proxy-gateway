<script setup lang="ts">
defineProps<{
  summary: {
    totalLines: number
    parsed: number
    invalid: number
    invalidSamples: { line: string; reason: string }[]
    duplicatesInBatch: number
    created: number
    updated: number
    enqueued: number
  } | null
}>()
</script>

<template>
  <Card v-if="summary" class="border-emerald-500/20 bg-emerald-500/5">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">Latest Import Summary</CardTitle>
      <CardDescription>
        Ringkasan hasil import terakhir beserta antrean auto health check.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Parsed</p>
          <p class="text-lg font-semibold">{{ summary.parsed }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Created</p>
          <p class="text-lg font-semibold text-emerald-600">{{ summary.created }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Updated</p>
          <p class="text-lg font-semibold">{{ summary.updated }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Invalid</p>
          <p class="text-lg font-semibold text-amber-600">{{ summary.invalid }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Queued Checks</p>
          <p class="text-lg font-semibold">{{ summary.enqueued }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{{ summary.totalLines }} input lines</Badge>
        <Badge variant="secondary">{{ summary.duplicatesInBatch }} duplicates skipped</Badge>
      </div>

      <div v-if="summary.invalidSamples.length" class="space-y-2">
        <p class="text-sm font-medium">Sample invalid rows</p>
        <div class="grid gap-2">
          <div
            v-for="sample in summary.invalidSamples"
            :key="`${sample.line}-${sample.reason}`"
            class="rounded-lg border bg-background/70 p-3"
          >
            <p class="font-mono text-xs">{{ sample.line }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ sample.reason }}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
