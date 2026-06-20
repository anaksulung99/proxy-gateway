<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { usePolling } from '~/composables/usePolling'

interface Source {
  id: number
  name: string
  sourceKey: string
  isEnabled: boolean
  proxyListId: number | null
  scheduleCron: string | null
  cronLabel: string
  lastCount: number
  lastRunAt: string | null
  availability: 'available' | 'unreachable'
  logsHref: string
  health: null | {
    status: 'idle' | 'healthy' | 'degraded' | 'error' | 'misconfigured'
    lastResult: string
    lastRunAt: string | null
    lastSuccessAt: string | null
    lastDurationMs: number
    lastEntries: number
    consecutiveFailures: number
    triggers: Array<{
      trigger: string
      status: 'idle' | 'healthy' | 'degraded' | 'error' | 'misconfigured'
      totalRuns: number
      successfulRuns: number
      errorRuns: number
      consecutiveFailures: number
      lastRunAt: string | null
    }>
  }
}

interface RecentRun {
  id: number
  triggerType: 'manual' | 'batch' | 'scheduled'
  status: 'running' | 'success' | 'error'
  checkMode: 'request' | 'playwright' | 'crawlee'
  sourceKey: string
  sourceName: string
  targetListName: string | null
  scrapedTotal: number
  createdCount: number
  updatedCount: number
  enqueuedCount: number
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
}

interface RecentRuns {
  data: RecentRun[]
  total: number
  page: number
  perPage: number
  lastPage: number
}

const props = defineProps<{
  sources: Source[]
  lists: { id: number; name: string }[]
  overview: {
    totalSources: number
    enabledSources: number
    configuredSources: number
    availableSources: number
  }
  filters: {
    healthStatus: string | null
  }
  sourceHealth:
    | {
        ok: true
        generatedAt: string
        overview: {
          total: number
          idle: number
          healthy: number
          degraded: number
          error: number
          misconfigured: number
        }
      }
    | {
        ok: false
        error: string
      }
  recentRuns: RecentRuns
}>()

const NONE = '__none__'
const ANY = '__all__'
const running = ref<Set<number>>(new Set())
const runningAll = ref(false)
const runMode = ref<'request' | 'playwright' | 'crawlee'>('request')
const scheduleDrafts = reactive<Record<number, string>>({})
const filterState = reactive({
  healthStatus: props.filters.healthStatus ?? ANY,
})
const page = usePage<{
  flash?: {
    scraperRunSummary?: any
  }
}>()

for (const source of props.sources) {
  scheduleDrafts[source.id] = source.scheduleCron ?? ''
}

const scraperRunSummary = computed(() => page.props.flash?.scraperRunSummary ?? null)

// Live refresh while a scrape is running (manual, all, or scheduled in-flight).
const anyRunning = computed(
  () =>
    runningAll.value ||
    running.value.size > 0 ||
    props.recentRuns.data.some((r) => r.status === 'running')
)
const { enabled: livePolling } = usePolling(['sources', 'overview', 'sourceHealth', 'recentRuns'], {
  interval: 4000,
  enabled: anyRunning.value,
})
watch(anyRunning, (v) => (livePolling.value = v))

const firstRow = computed(() =>
  props.recentRuns.total === 0 ? 0 : (props.recentRuns.page - 1) * props.recentRuns.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.recentRuns.page * props.recentRuns.perPage, props.recentRuns.total)
)

function loadPage(currentPage: number, perPage = props.recentRuns.perPage) {
  router.get(
    '/app/scraper',
    {
      page: currentPage,
      perPage,
      ...(filterState.healthStatus !== ANY ? { healthStatus: filterState.healthStatus } : {}),
    },
    {
      preserveState: true,
      preserveScroll: true,
    }
  )
}

function setTarget(source: Source, value: string) {
  router.post(
    `/app/scraper/${source.id}/update`,
    { proxyListId: value === NONE ? null : Number(value) },
    { preserveScroll: true }
  )
}

function toggleEnabled(source: Source, value: boolean) {
  router.post(`/app/scraper/${source.id}/update`, { isEnabled: value }, { preserveScroll: true })
}

function saveSchedule(source: Source) {
  router.post(
    `/app/scraper/${source.id}/update`,
    { scheduleCron: scheduleDrafts[source.id].trim() || null },
    { preserveScroll: true, preserveState: true }
  )
}

function run(source: Source) {
  running.value.add(source.id)
  running.value = new Set(running.value)
  router.post(
    `/app/scraper/${source.id}/run`,
    { mode: runMode.value },
    {
      preserveScroll: true,
      onFinish: () => {
        running.value.delete(source.id)
        running.value = new Set(running.value)
      },
    }
  )
}

function runEnabledSources() {
  runningAll.value = true
  router.post(
    '/app/scraper/run-enabled',
    { mode: runMode.value },
    {
      preserveScroll: true,
      onFinish: () => {
        runningAll.value = false
      },
    }
  )
}

function changeLimit(value: unknown) {
  const perPage = Number(value)
  loadPage(1, perPage)
}

function applyHealthFilter() {
  loadPage(1)
}

function clearHealthFilter() {
  filterState.healthStatus = ANY
  loadPage(1)
}

function fmtDate(s: string | null) {
  if (!s) return 'never'
  return new Date(s).toLocaleString()
}

function relativeAge(value: string | null) {
  if (!value) return 'never'

  const diffMs = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now'

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`
  return `${Math.floor(diffMs / day)}d ago`
}
</script>

<template>
  <Head title="Scraper" />
  <AppShell title="Scraper · Proxy Sources">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Total Sources</CardDescription>
          <CardTitle class="text-2xl">{{ overview.totalSources }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Enabled Sources</CardDescription>
          <CardTitle class="text-2xl">{{ overview.enabledSources }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Configured Targets</CardDescription>
          <CardTitle class="text-2xl">{{ overview.configuredSources }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Reachable Adapters</CardDescription>
          <CardTitle class="text-2xl">{{ overview.availableSources }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <Card class="border-border/70">
      <CardHeader class="pb-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle class="text-base">Source Filters</CardTitle>
            <CardDescription>
              Filter daftar source berdasarkan status health terbaru.
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <Select v-model="filterState.healthStatus">
              <SelectTrigger class="w-48"><SelectValue placeholder="All health states" /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="ANY">All health states</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="misconfigured">Misconfigured</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" @click="applyHealthFilter">
              <Icon icon="lucide:filter" class="mr-2 size-4" /> Apply
            </Button>
            <Button
              v-if="filterState.healthStatus !== ANY"
              variant="outline"
              size="sm"
              @click="clearHealthFilter"
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>

    <Card class="border-border/70">
      <CardHeader class="pb-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle class="text-base">Source Health Snapshot</CardTitle>
            <CardDescription>
              Status adapter scraper terbaru dari endpoint internal source-health.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" as-child>
            <Link href="/app/scraper/logs">Open logs</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent v-if="sourceHealth.ok" class="grid gap-3 md:grid-cols-4">
        <div class="rounded-xl border bg-card/70 p-4">
          <p class="text-xs text-muted-foreground">Healthy</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {{ sourceHealth.overview.healthy }}
          </p>
        </div>
        <div class="rounded-xl border bg-card/70 p-4">
          <p class="text-xs text-muted-foreground">Degraded</p>
          <p class="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {{ sourceHealth.overview.degraded }}
          </p>
        </div>
        <div class="rounded-xl border bg-card/70 p-4">
          <p class="text-xs text-muted-foreground">Error</p>
          <p class="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
            {{ sourceHealth.overview.error + sourceHealth.overview.misconfigured }}
          </p>
        </div>
        <div class="rounded-xl border bg-card/70 p-4">
          <p class="text-xs text-muted-foreground">Idle</p>
          <p class="mt-2 text-2xl font-semibold">{{ sourceHealth.overview.idle }}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Updated {{ fmtDate(sourceHealth.generatedAt) }}
          </p>
        </div>
      </CardContent>
      <CardContent v-else>
        <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p class="font-medium">Source-health scraper belum tersedia</p>
          <p class="mt-1 text-sm text-muted-foreground">{{ sourceHealth.error }}</p>
        </div>
      </CardContent>
    </Card>

    <ScraperRunSummaryCard :summary="scraperRunSummary" />

    <Card class="border-border/70">
      <CardHeader>
        <div class="flex flex-col gap-4">
          <div>
            <CardTitle>Proxy sources</CardTitle>
            <CardDescription>
              Pilih target list, atur cron opsional, pilih mode checker, lalu jalankan satu source
              atau semua source aktif. Proxy hasil scrape langsung di-import dan di-enqueue ke
              health checker.
            </CardDescription>
          </div>

          <div class="space-y-4">
            <div class="flex flex-col md:flex-row justify-between items-center gap-2 w-full">
              <div class="space-y-1 w-full mb-0 md:mb-4">
                <Label class="text-xs">Health check mode</Label>
                <Select v-model="runMode">
                  <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent class="w-full">
                    <SelectItem value="request">Request</SelectItem>
                    <SelectItem value="playwright">Playwright</SelectItem>
                    <SelectItem value="crawlee">Crawlee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                :disabled="runningAll || lists.length === 0"
                class="min-w-44"
                @click="runEnabledSources"
              >
                <Icon
                  :icon="runningAll ? 'lucide:loader-circle' : 'lucide:play-circle'"
                  class="mr-2 size-4"
                  :class="runningAll ? 'animate-spin' : ''"
                />
                {{ runningAll ? 'Running enabled…' : 'Run enabled sources' }}
              </Button>
              <Button variant="outline" as-child>
                <Link href="/app/scraper/logs">
                  <Icon icon="lucide:history" class="mr-2 size-4" /> View logs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-4 overflow-auto max-w-7xl rounded-lg">
        <Table class="table-auto">
          <TableHeader>
            <TableRow>
              <TableHead class="px-4 py-3 font-medium">Source</TableHead>
              <TableHead class="px-4 py-3 font-medium">Availability</TableHead>
              <TableHead class="px-4 py-3 font-medium">Health</TableHead>
              <TableHead class="px-4 py-3 font-medium">Reliability</TableHead>
              <TableHead class="px-4 py-3 font-medium">Enabled</TableHead>
              <TableHead class="px-4 py-3 font-medium">Target list</TableHead>
              <TableHead class="px-4 py-3 font-medium">Schedule</TableHead>
              <TableHead class="px-4 py-3 font-medium">Last run</TableHead>
              <TableHead class="px-4 py-3 font-medium">Last count</TableHead>
              <TableHead class="px-4 py-3 font-medium text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="s in sources" :key="s.id">
              <TableCell>
                <div class="font-medium">{{ s.name }}</div>
                <div class="text-xs text-muted-foreground">{{ s.sourceKey }}</div>
              </TableCell>
              <TableCell>
                <Badge :variant="s.availability === 'available' ? 'default' : 'secondary'">
                  {{ s.availability === 'available' ? 'Reachable' : 'Unavailable' }}
                </Badge>
              </TableCell>
              <TableCell class="min-w-56">
                <div v-if="s.health" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <Badge
                      :variant="
                        s.health.status === 'misconfigured' || s.health.status === 'error'
                          ? 'destructive'
                          : s.health.status === 'degraded'
                            ? 'secondary'
                            : 'outline'
                      "
                    >
                      {{ s.health.status }}
                    </Badge>
                    <span class="text-xs text-muted-foreground">
                      {{ s.health.lastEntries }} entries · {{ s.health.lastDurationMs }} ms
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Badge
                      v-for="trigger in s.health.triggers"
                      :key="`${s.id}-${trigger.trigger}`"
                      variant="outline"
                      class="uppercase"
                    >
                      {{ trigger.trigger }} · {{ trigger.status }}
                    </Badge>
                  </div>
                </div>
                <span v-else class="text-xs text-muted-foreground">No source-health data yet</span>
              </TableCell>
              <TableCell class="min-w-48">
                <div v-if="s.health" class="space-y-1 text-xs text-muted-foreground">
                  <div>
                    Last success:
                    <span class="font-medium text-foreground">{{ fmtDate(s.health.lastSuccessAt) }}</span>
                  </div>
                  <div>
                    <Badge
                      :variant="
                        s.health.lastSuccessAt === null
                          ? 'destructive'
                          : s.health.consecutiveFailures >= 3
                            ? 'secondary'
                            : 'outline'
                      "
                      class="mt-1"
                    >
                      {{ relativeAge(s.health.lastSuccessAt) }}
                    </Badge>
                  </div>
                  <div>
                    Consecutive failures:
                    <span class="font-medium text-foreground">{{ s.health.consecutiveFailures }}</span>
                  </div>
                </div>
                <span v-else class="text-xs text-muted-foreground">No reliability data yet</span>
              </TableCell>
              <TableCell>
                <Switch
                  :model-value="s.isEnabled"
                  @update:model-value="(v: boolean) => toggleEnabled(s, v)"
                />
              </TableCell>
              <TableCell>
                <Select
                  :model-value="s.proxyListId ? String(s.proxyListId) : NONE"
                  @update:model-value="(v: any) => setTarget(s, String(v))"
                >
                  <SelectTrigger class="w-full"
                    ><SelectValue placeholder="Choose list"
                  /></SelectTrigger>
                  <SelectContent class="w-full">
                    <SelectItem :value="NONE">— none —</SelectItem>
                    <SelectItem v-for="l in lists" :key="l.id" :value="String(l.id)">
                      {{ l.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="scheduleDrafts[s.id]"
                    class="w-full"
                    placeholder="*/30 * * * *"
                    @blur="saveSchedule(s)"
                    @keyup.enter="saveSchedule(s)"
                  />
                </div>
                <div class="mt-1 text-xs text-muted-foreground">{{ s.cronLabel }}</div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{
                fmtDate(s.lastRunAt)
              }}</TableCell>
              <TableCell>{{ s.lastCount }}</TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" as-child>
                    <Link :href="s.logsHref">Logs</Link>
                  </Button>
                  <Button
                    size="sm"
                    :disabled="!s.proxyListId || running.has(s.id) || runningAll"
                    @click="run(s)"
                  >
                    <Icon
                      :icon="running.has(s.id) ? 'lucide:loader-circle' : 'lucide:play'"
                      class="mr-1 size-4"
                      :class="running.has(s.id) ? 'animate-spin' : ''"
                    />
                    {{ running.has(s.id) ? 'Scraping…' : 'Run' }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card class="border-border/70">
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>
              Histori run terbaru dari aksi manual, batch, maupun scheduler otomatis.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" as-child>
            <Link href="/app/scraper/logs">Open full history</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent class="py-0 px-2 space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="recentRuns.data.length === 0">
              <TableCell colspan="6" class="py-8 text-center text-muted-foreground">
                No scraper runs recorded yet.
              </TableCell>
            </TableRow>
            <TableRow v-for="rn in recentRuns.data" :key="rn.id">
              <TableCell>
                <div class="font-medium">{{ rn.sourceName }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ rn.sourceKey }} → {{ rn.targetListName ?? 'No target list' }}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" class="uppercase">{{ rn.triggerType }}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  :variant="
                    rn.status === 'success'
                      ? 'default'
                      : rn.status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  "
                >
                  {{ rn.status }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" class="uppercase">{{ rn.checkMode }}</Badge>
              </TableCell>
              <TableCell>
                <div class="text-sm">
                  {{ rn.scrapedTotal }} scraped · {{ rn.createdCount }} new ·
                  {{ rn.updatedCount }}
                  updated
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ rn.enqueuedCount }} queued
                  <span v-if="rn.errorMessage">· {{ rn.errorMessage }}</span>
                </div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ fmtDate(rn.startedAt) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div
          class="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <Select :model-value="String(recentRuns.perPage)" @update:model-value="changeLimit">
              <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>{{ firstRow }}-{{ lastRow }} of {{ recentRuns.total }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span>Page {{ recentRuns.page }} of {{ recentRuns.lastPage }}</span>
            <Button
              variant="outline"
              size="sm"
              :disabled="recentRuns.page <= 1"
              @click="loadPage(recentRuns.page - 1)"
            >
              <Icon icon="lucide:chevron-left" class="mr-1 size-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="recentRuns.page >= recentRuns.lastPage"
              @click="loadPage(recentRuns.page + 1)"
            >
              Next <Icon icon="lucide:chevron-right" class="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <p v-if="recentRuns.data.length === 0" class="text-sm text-muted-foreground">
      Create a scraper run first.
    </p>
  </AppShell>
</template>
