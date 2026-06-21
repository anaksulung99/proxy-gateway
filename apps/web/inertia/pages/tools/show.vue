<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

interface RunRow {
  id: number
  sourceType: 'tools' | 'proxy_list_bulk'
  trigger: string
  triggerLabel: string
  stage: string | null
  status: 'running' | 'success' | 'error'
  mode: 'request' | 'playwright' | 'crawlee'
  targetUrl: string | null
  totalInputs: number
  checkedCount: number
  healthyCount: number
  unhealthyCount: number
  timeoutCount: number
  invalidCount: number
  errorMessage: string | null
  retryAttempt: number
  retryMax: number
  retryKind: string | null
  previousRunId: number | null
  scheduledDelaySec: number | null
  retryDelaySec: number | null
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
  filters: { status: string | null; sourceType: string | null; trigger: string | null }
}>()

const { warning } = useGlobalAlert()

const ANY = '__any__'
const filters = reactive({
  status: props.filters.status ?? ANY,
  sourceType: props.filters.sourceType ?? ANY,
  trigger: props.filters.trigger ?? ANY,
})
const hasFilters = computed(
  () => filters.status !== ANY || filters.sourceType !== ANY || filters.trigger !== ANY
)

const firstRow = computed(() =>
  props.runs.meta.total === 0 ? 0 : (props.runs.meta.currentPage - 1) * props.runs.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.runs.meta.currentPage * props.runs.meta.perPage, props.runs.meta.total)
)
const selected = ref<Set<number>>(new Set())
const allOnPageSelected = computed(
  () => props.runs.data.length > 0 && props.runs.data.every((row) => selected.value.has(row.id))
)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (allOnPageSelected.value) return true
  return props.runs.data.some((row) => selected.value.has(row.id)) ? 'indeterminate' : false
})

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = {}
  if (filters.status !== ANY) query.status = filters.status
  if (filters.sourceType !== ANY) query.sourceType = filters.sourceType
  if (filters.trigger !== ANY) query.trigger = filters.trigger
  return { ...query, ...extra }
}

function applyFilters() {
  router.get('/app/tools/logs', buildQuery({ page: props.runs.meta.currentPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function goPage(page: number) {
  router.get('/app/tools/logs', buildQuery({ page, perPage: props.runs.meta.perPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function changeLimit(value: unknown) {
  const perPage = Number(value)
  router.get('/app/tools/logs', buildQuery({ page: props.runs.meta.currentPage, perPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}

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

function clearFilter() {
  filters.status = ANY
  filters.sourceType = ANY
  filters.trigger = ANY
  applyFilters()
}

function destroySelected() {
  const ids = [...selected.value]
  if (ids.length === 0) return
  warning(
    'Warning!',
    `Are you sure you want to delete ${ids.length} selected health check runs?`
  ).then((confirm) => {
    if (!confirm) return
    router.delete('/app/tools/check', {
      data: { ids },
      preserveScroll: true,
      onSuccess: () => {
        selected.value = new Set()
        applyFilters()
      },
    })
  })
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}
</script>

<template>
  <Head title="Tools — Health Check Logs" />
  <AppShell title="Tools · Health Check Logs">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/app/tools" class="hover:underline">
        <Icon icon="lucide:arrow-left" class="inline size-4" /> Back to tools checker
      </Link>
    </div>

    <div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-medium">Halaman ini hanya untuk health check runs</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Jika source scraper gagal fetch/import sebelum auto-check dibuat, detail error-nya
            muncul di Scraper Logs, bukan di halaman ini.
          </p>
        </div>
        <Button variant="outline" size="sm" as-child>
          <Link href="/app/scraper/logs">
            <Icon icon="lucide:logs" class="mr-1 size-4" /> Open scraper logs
          </Link>
        </Button>
      </div>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Health Check Run History</CardTitle>
        <CardDescription>
          Audit semua run checker dari tools external dan bulk re-check proxy list.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <Label class="text-xs">Source</Label>
            <Select v-model="filters.sourceType">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem :value="ANY">All sources</SelectItem>
                <SelectItem value="tools">Tools Checker</SelectItem>
                <SelectItem value="proxy_list_bulk">Proxy List Bulk Re-check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-1">
            <Label class="text-xs">Trigger</Label>
            <Select v-model="filters.trigger">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem :value="ANY">All triggers</SelectItem>
                <SelectItem value="tools_manual">Tools Manual</SelectItem>
                <SelectItem value="manual_recheck">Manual Recheck</SelectItem>
                <SelectItem value="runtime_auto_recheck">Runtime Auto Recheck</SelectItem>
                <SelectItem value="runtime_quarantine_recheck">Runtime Quarantine Recheck</SelectItem>
                <SelectItem value="import_auto_check">Import Auto Check</SelectItem>
                <SelectItem value="scraper_auto_check">Scraper Auto Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <Button @click="applyFilters">
            <Icon icon="lucide:filter" class="size-4" /> Apply
          </Button>
          <Button v-if="hasFilters" variant="destructive" @click="clearFilter">
            <Icon icon="lucide:x" class="size-4" /> Clear
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="border-border/70">
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Recent Health Check Runs</CardTitle>
            <CardDescription>
              Riwayat terbaru checker dari Tools maupun bulk re-check Proxy Lists.
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <Button
              v-if="selected.size > 0"
              variant="destructive"
              size="sm"
              @click="destroySelected"
            >
              <Icon icon="lucide:trash-2" class="mr-1 size-4" />
              Delete selected ({{ selected.size }})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0 space-y-4">
        <Table>
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
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="runs.data.length === 0">
              <TableCell colspan="6" class="py-10 text-center text-muted-foreground">
                No health check runs match the current filters.
              </TableCell>
            </TableRow>
            <TableRow v-for="run in runs.data" :key="run.id">
              <TableCell>
                <Checkbox
                  :model-value="selected.has(run.id)"
                  class="border border-emerald-500/50"
                  @update:model-value="(value) => toggleOne(run.id, value)"
                />
              </TableCell>
              <TableCell>
                <div class="font-medium uppercase">{{ run.sourceType }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ run.triggerLabel }} · Run #{{ run.id }}
                  <span v-if="run.retryAttempt > 0"> · Attempt {{ run.retryAttempt }}/{{ run.retryMax }}</span>
                </div>
                <div v-if="run.stage || run.previousRunId" class="text-xs text-muted-foreground">
                  <span v-if="run.stage">Stage: {{ run.stage }}</span>
                  <span v-if="run.previousRunId"> · Prev run #{{ run.previousRunId }}</span>
                </div>
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
              <TableCell>
                <Badge variant="secondary" class="uppercase">{{ run.mode }}</Badge>
              </TableCell>
              <TableCell class="max-w-65 truncate text-xs text-muted-foreground">
                {{ run.targetUrl || 'Default target URL' }}
              </TableCell>
              <TableCell class="max-w-20 whitespace-normal">
                <div class="text-sm">
                  {{ run.checkedCount }} checked / {{ run.totalInputs }} input ·
                  {{ run.healthyCount }} healthy
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ run.unhealthyCount }} unhealthy · {{ run.timeoutCount }} timeout ·
                  {{ run.invalidCount }} invalid
                </div>
                <div
                  v-if="run.retryAttempt > 0 && (run.scheduledDelaySec || run.retryDelaySec)"
                  class="text-xs text-muted-foreground"
                >
                  Delay {{ run.scheduledDelaySec ?? 0 }}s
                  <span v-if="run.retryDelaySec"> · Retry window {{ run.retryDelaySec }}s</span>
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
        <div
          class="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <Select :model-value="String(runs.meta.perPage)" @update:model-value="changeLimit">
              <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
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
      </CardContent>
    </Card>
  </AppShell>
</template>
