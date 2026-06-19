<script setup lang="ts">
interface ScraperRunRow {
  sourceId: number
  sourceKey: string
  sourceName: string
  targetListName: string
  requestedMode: string
  scrapedTotal: number
  created: number
  updated: number
  invalid: number
  duplicatesInBatch: number
  enqueued: number
  finishedAt: string
  bySource: Record<string, { count: number; error?: string }>
}

interface ScraperRunSummary {
  requestedMode: string
  totalSources?: number
  completedSources?: number
  totalScraped?: number
  totalCreated?: number
  totalUpdated?: number
  totalInvalid?: number
  totalEnqueued?: number
  results?: ScraperRunRow[]
  sourceId?: number
  sourceKey?: string
  sourceName?: string
  targetListName?: string
  scrapedTotal?: number
  created?: number
  updated?: number
  invalid?: number
  duplicatesInBatch?: number
  enqueued?: number
  finishedAt?: string
  bySource?: Record<string, { count: number; error?: string }>
}

const props = defineProps<{ summary: ScraperRunSummary | null }>()

const rows = computed<ScraperRunRow[]>(() => {
  if (!props.summary) return []
  if (props.summary.results) return props.summary.results
  if (!props.summary.sourceName || !props.summary.sourceKey || !props.summary.finishedAt) return []

  return [
    {
      sourceId: props.summary.sourceId ?? 0,
      sourceKey: props.summary.sourceKey,
      sourceName: props.summary.sourceName,
      targetListName: props.summary.targetListName ?? 'Unknown target',
      requestedMode: props.summary.requestedMode,
      scrapedTotal: props.summary.scrapedTotal ?? 0,
      created: props.summary.created ?? 0,
      updated: props.summary.updated ?? 0,
      invalid: props.summary.invalid ?? 0,
      duplicatesInBatch: props.summary.duplicatesInBatch ?? 0,
      enqueued: props.summary.enqueued ?? 0,
      finishedAt: props.summary.finishedAt,
      bySource: props.summary.bySource ?? {},
    },
  ]
})
</script>

<template>
  <Card v-if="summary" class="border-cyan-500/20 bg-cyan-500/5">
    <CardHeader class="pb-3">
      <CardTitle class="text-base">Latest Scraper Run</CardTitle>
      <CardDescription>
        Ringkasan hasil scraping, import ke proxy list, dan antrean auto health check.
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Check Mode</p>
          <p class="text-lg font-semibold uppercase">{{ summary.requestedMode }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Sources</p>
          <p class="text-lg font-semibold">
            {{ summary.completedSources ?? rows.length }}
          </p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Scraped</p>
          <p class="text-lg font-semibold">{{ summary.totalScraped ?? summary.scrapedTotal ?? 0 }}</p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Created / Updated</p>
          <p class="text-lg font-semibold">
            {{ summary.totalCreated ?? summary.created ?? 0 }} / {{ summary.totalUpdated ?? summary.updated ?? 0 }}
          </p>
        </div>
        <div class="rounded-lg border bg-background/70 p-3">
          <p class="text-xs text-muted-foreground">Queued Checks</p>
          <p class="text-lg font-semibold">{{ summary.totalEnqueued ?? summary.enqueued ?? 0 }}</p>
        </div>
      </div>

      <div class="grid gap-3 xl:grid-cols-2">
        <div
          v-for="row in rows"
          :key="`${row.sourceId}-${row.finishedAt}`"
          class="rounded-xl border bg-background/70 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ row.sourceName }}</p>
              <p class="text-xs text-muted-foreground">{{ row.sourceKey }} → {{ row.targetListName }}</p>
            </div>
            <Badge variant="secondary">{{ row.scrapedTotal }} scraped</Badge>
          </div>

          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <p class="text-sm text-muted-foreground">Created: <span class="font-medium text-foreground">{{ row.created }}</span></p>
            <p class="text-sm text-muted-foreground">Updated: <span class="font-medium text-foreground">{{ row.updated }}</span></p>
            <p class="text-sm text-muted-foreground">Invalid: <span class="font-medium text-foreground">{{ row.invalid }}</span></p>
            <p class="text-sm text-muted-foreground">Duplicates: <span class="font-medium text-foreground">{{ row.duplicatesInBatch }}</span></p>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{{ row.enqueued }} queued</Badge>
            <Badge
              v-for="(entry, key) in row.bySource"
              :key="key"
              variant="outline"
              class="gap-1"
            >
              {{ key }}: {{ entry.count }}
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
