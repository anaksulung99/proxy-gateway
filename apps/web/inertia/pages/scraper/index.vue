<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

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
  recentRuns: RecentRuns
}>()

const NONE = '__none__'
const running = ref<Set<number>>(new Set())
const runningAll = ref(false)
const runMode = ref<'request' | 'playwright' | 'crawlee'>('request')
const scheduleDrafts = reactive<Record<number, string>>({})
const page = usePage<{
  flash?: {
    scraperRunSummary?: any
  }
}>()

for (const source of props.sources) {
  scheduleDrafts[source.id] = source.scheduleCron ?? ''
}

const scraperRunSummary = computed(() => page.props.flash?.scraperRunSummary ?? null)

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

function fmtDate(s: string | null) {
  if (!s) return 'never'
  return new Date(s).toLocaleString()
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
