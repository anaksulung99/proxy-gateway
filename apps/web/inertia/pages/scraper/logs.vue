<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

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

const { warning } = useGlobalAlert()

const ANY = '__any__'
const filters = reactive({
  status: props.filters.status ?? ANY,
  triggerType: props.filters.triggerType ?? ANY,
  sourceKey: props.filters.sourceKey ?? ANY,
})
const selected = ref<Set<number>>(new Set())
const allOnPageSelected = computed(
  () => props.runs.data.length > 0 && props.runs.data.every((row) => selected.value.has(row.id))
)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (allOnPageSelected.value) return true
  return props.runs.data.some((row) => selected.value.has(row.id)) ? 'indeterminate' : false
})
const hasFilter = computed(
  () => filters.status !== ANY || filters.triggerType !== ANY || filters.sourceKey !== ANY
)

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = { perPage: props.runs.meta.perPage }
  if (filters.status !== ANY) query.status = filters.status
  if (filters.triggerType !== ANY) query.triggerType = filters.triggerType
  if (filters.sourceKey !== ANY) query.sourceKey = filters.sourceKey
  return { ...query, ...extra }
}

function applyFilters() {
  router.get(
    '/app/scraper/logs',
    buildQuery({ page: props.runs.meta.currentPage, perPage: props.runs.meta.perPage }),
    {
      preserveScroll: true,
      preserveState: true,
    }
  )
}

function goPage(page: number) {
  router.get('/app/scraper/logs', buildQuery({ page }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function changeLimit(value: unknown) {
  router.get('/app/scraper/logs', buildQuery({ page: 1, perPage: Number(value) }), {
    preserveScroll: true,
    preserveState: true,
  })
}

const firstRow = computed(() =>
  props.runs.meta.total === 0 ? 0 : (props.runs.meta.currentPage - 1) * props.runs.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.runs.meta.currentPage * props.runs.meta.perPage, props.runs.meta.total)
)

function toggleAll(value: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  for (const row of props.runs.data) {
    if (value === true) next.add(row.id)
    else next.delete(row.id)
  }
  selected.value = next
}

function toggleOne(id: number, value: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  if (value === true) next.add(id)
  else next.delete(id)
  selected.value = next
}

async function clearFilters() {
  filters.status = ANY
  filters.triggerType = ANY
  filters.sourceKey = ANY
  applyFilters()
}

function destroySelected() {
  const ids = [...selected.value]
  if (ids.length === 0) return
  warning('Warning!', `Are you sure you want to delete ${ids.length} selected runs?`).then(
    (confirm) => {
      if (!confirm) return
      router.delete('/app/scraper/logs/delete', {
        data: { ids },
        preserveScroll: true,
        onSuccess: () => {
          selected.value = new Set()
          applyFilters()
        },
      })
    }
  )
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div class="grid gap-1">
            <Label class="text-xs">Status</Label>
            <Select v-model="filters.status">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
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
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
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
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem :value="ANY">All sources</SelectItem>
                <SelectItem v-for="sourceKey in sourceKeys" :key="sourceKey" :value="sourceKey">
                  {{ sourceKey }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="flex justify-end items-center gap-2">
          <Button @click="applyFilters">
            <Icon icon="lucide:filter" class="size-4" /> Apply
          </Button>
          <Button v-if="hasFilter" variant="destructive" @click="clearFilters">
            <Icon icon="lucide:filter-x" class="size-4" /> Clear
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="border-border/70 w-full overflow-hidden">
      <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Run History</CardTitle>
          <CardDescription>
            Audit semua run scraper, termasuk manual, batch, dan scheduler otomatis.
          </CardDescription>
        </div>
        <Button v-if="selected.size > 0" variant="destructive" size="sm" @click="destroySelected">
          <Icon icon="lucide:trash-2" class="mr-1 size-4" />
          Delete selected ({{ selected.size }})
        </Button>
      </CardHeader>
      <CardContent class="p-2 w-full overflow-x-auto">
        <Table class="w-full table-auto">
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox
                  :model-value="selectAllState"
                  class="border border-emerald-500/50"
                  @update:model-value="toggleAll"
                />
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="hidden sm:table-cell">Mode</TableHead>
              <TableHead class="hidden md:table-cell">Schedule</TableHead>
              <TableHead class="hidden lg:table-cell">Result</TableHead>
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
                <Checkbox
                  :model-value="selected.has(run.id)"
                  class="border border-emerald-500/50"
                  @update:model-value="(value) => toggleOne(run.id, value)"
                />
              </TableCell>
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
                <Badge
                  :variant="
                    run.status === 'success'
                      ? 'default'
                      : run.status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  "
                >
                  {{ run.status }}
                </Badge>
              </TableCell>
              <TableCell class="hidden sm:table-cell">
                <Badge variant="secondary" class="uppercase">{{ run.checkMode }}</Badge>
              </TableCell>
              <TableCell class="hidden sm:table-cell">
                {{ run.scheduleCron || 'Manual only' }}
              </TableCell>
              <TableCell
                class="hidden sm:table-cell text-sm text-muted-foreground max-w-20 whitespace-normal"
              >
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
              <TableCell class="text-xs text-muted-foreground max-w-20 whitespace-normal">
                <div>{{ fmtDate(run.startedAt) }}</div>
                <div>Finished: {{ fmtDate(run.finishedAt) }}</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div
      class="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2">
        <span>Rows per page</span>
        <Select :model-value="String(runs.meta.perPage)" @update:model-value="changeLimit">
          <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>{{ firstRow }}-{{ lastRow }} of {{ runs.meta.total }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span>Page {{ runs.meta.currentPage }} of {{ runs.meta.lastPage }}</span>
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
