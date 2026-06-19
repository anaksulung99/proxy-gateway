<script setup lang="ts">
import { reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

interface RunRow {
  id: number
  triggerType: 'manual' | 'batch' | 'scheduled'
  status: 'running' | 'success' | 'error'
  checkMode: 'request' | 'playwright' | 'crawlee'
  sourceKey: string
  sourceName: string
  targetListName: string | null
  scheduleCron: string | null
  scrapedTotal: number
  createdCount: number
  updatedCount: number
  invalidCount: number
  duplicateCount: number
  enqueuedCount: number
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
}

interface PaginatedRuns {
  data: RunRow[]
  meta: {
    total: number
    currentPage: number
    lastPage: number
    perPage: number
  }
}

const props = defineProps<{
  runs: PaginatedRuns
  filters: {
    status: string | null
    triggerType: string | null
    sourceKey: string | null
  }
  sourceKeys: string[]
}>()

const ANY = '__any__'
const filters = reactive({
  status: props.filters.status ?? ANY,
  triggerType: props.filters.triggerType ?? ANY,
  sourceKey: props.filters.sourceKey ?? ANY,
})

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = {}
  if (filters.status !== ANY) query.status = filters.status
  if (filters.triggerType !== ANY) query.triggerType = filters.triggerType
  if (filters.sourceKey !== ANY) query.sourceKey = filters.sourceKey
  return { ...query, ...extra }
}

function applyFilters() {
  router.get('/app/scraper/logs', buildQuery(), { preserveScroll: true, preserveState: true })
}

function goPage(page: number) {
  router.get('/app/scraper/logs', buildQuery({ page }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}
</script>

<template>
  <Head title="Scraper Logs" />
  <AppShell title="Scraper · Run History">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/app/scraper" class="hover:underline">
        <Icon icon="lucide:arrow-left" class="inline size-4" /> Back to scraper sources
      </Link>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Run History</CardTitle>
        <CardDescription>
          Audit semua run scraper, termasuk manual, batch, dan scheduler otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="grid gap-1">
            <Label class="text-xs">Status</Label>
            <Select v-model="filters.status">
              <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="ANY">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-1">
            <Label class="text-xs">Trigger</Label>
            <Select v-model="filters.triggerType">
              <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="ANY">All</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-1">
            <Label class="text-xs">Source</Label>
            <Select v-model="filters.sourceKey">
              <SelectTrigger class="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="ANY">All sources</SelectItem>
                <SelectItem v-for="sourceKey in sourceKeys" :key="sourceKey" :value="sourceKey">
                  {{ sourceKey }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="secondary" @click="applyFilters">
            <Icon icon="lucide:filter" class="mr-2 size-4" /> Apply
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="border-border/70">
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="runs.data.length === 0">
              <TableCell colspan="7" class="py-10 text-center text-muted-foreground">
                No run history matches the current filters.
              </TableCell>
            </TableRow>
            <TableRow v-for="run in runs.data" :key="run.id" class="align-top">
              <TableCell>
                <div class="font-medium">{{ run.sourceName }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ run.sourceKey }} → {{ run.targetListName ?? 'No target list' }}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" class="uppercase">{{ run.triggerType }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="run.status === 'success' ? 'default' : run.status === 'error' ? 'destructive' : 'secondary'">
                  {{ run.status }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" class="uppercase">{{ run.checkMode }}</Badge>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ run.scheduleCron || 'Manual only' }}
              </TableCell>
              <TableCell>
                <div class="text-sm">
                  {{ run.scrapedTotal }} scraped · {{ run.createdCount }} new ·
                  {{ run.updatedCount }} updated
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ run.invalidCount }} invalid · {{ run.duplicateCount }} duplicates ·
                  {{ run.enqueuedCount }} queued
                </div>
                <div v-if="run.errorMessage" class="mt-1 text-xs text-red-600">
                  {{ run.errorMessage }}
                </div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                <div>{{ fmtDate(run.startedAt) }}</div>
                <div>Finished: {{ fmtDate(run.finishedAt) }}</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {{ runs.meta.total }} runs · page {{ runs.meta.currentPage }} / {{ runs.meta.lastPage }}
      </span>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="runs.meta.currentPage <= 1"
          @click="goPage(runs.meta.currentPage - 1)"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="runs.meta.currentPage >= runs.meta.lastPage"
          @click="goPage(runs.meta.currentPage + 1)"
        >
          Next
        </Button>
      </div>
    </div>
  </AppShell>
</template>
