<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

interface LogRow {
  id: number
  requestMethod: string
  targetHost: string | null
  targetPort: number | null
  targetScheme: string | null
  isTunnel: boolean
  success: boolean
  statusCode: number | null
  attemptCount: number
  durationMs: number
  responseBytes: number
  sessionKey: string | null
  countryOverride: string | null
  selectedProtocol: string | null
  selectedCountry: string | null
  selectedAsn: number | null
  errorMessage: string | null
  requestedAt: string | null
  proxyListId: number | null
  proxyListName: string | null
}

const props = defineProps<{
  filters: { hours: number; listId: number | null; status: string }
  lists: Array<{ id: number; name: string }>
  trend: {
    unit: 'hour' | 'day'
    points: Array<{
      label: string
      bucketStart: string | null
      requestCount: number
      successfulRequests: number
      failedRequests: number
    }>
  }
  overview: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    successRate: number
    avgDurationMs: number
    totalResponseBytes: number
  }
  topTargets: Array<{ targetHost: string; requestCount: number; avgDurationMs: number }>
  topPools: Array<{
    proxyListId: number | null
    proxyListName: string
    requestCount: number
    avgDurationMs: number
    successRate: number
  }>
  methods: Array<{ requestMethod: string; requestCount: number }>
  logs: {
    data: LogRow[]
    meta: { total: number; currentPage: number; lastPage: number; perPage: number }
  }
}>()

const trendMax = computed(() =>
  Math.max(...props.trend.points.map((point) => point.requestCount), 0)
)

const ANY = '__any__'
const filters = reactive({
  hours: String(props.filters.hours),
  listId: props.filters.listId ? String(props.filters.listId) : ANY,
  status: props.filters.status ?? 'all',
})
const exportUrl = computed(() => {
  const params = new URLSearchParams()
  params.set('hours', filters.hours)
  params.set('status', filters.status)
  if (filters.listId !== ANY) params.set('listId', filters.listId)
  return `/app/analytics/export?${params.toString()}`
})

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = { hours: filters.hours, status: filters.status }
  if (filters.listId !== ANY) query.listId = filters.listId
  return { ...query, ...extra }
}

function applyFilters() {
  router.get('/app/analytics', buildQuery(), { preserveScroll: true, preserveState: true })
}

function goPage(page: number) {
  router.get('/app/analytics', buildQuery({ page }), { preserveScroll: true, preserveState: true })
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function fmtBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function trendBarHeight(value: number) {
  if (trendMax.value <= 0) return 12
  return Math.max(Math.round((value / trendMax.value) * 220), value > 0 ? 16 : 12)
}
</script>

<template>
  <Head title="Analytics" />
  <AppShell title="Gateway Usage Analytics">
    <div
      class="rounded-3xl border border-border/70 bg-linear-to-br from-emerald-500/10 via-background to-cyan-500/10 p-6"
    >
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Proxy Engine Traffic
          </p>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight">
            Audit request volume, success rate, target traffic, dan performa gateway dalam satu
            halaman.
          </h1>
          <p class="mt-3 text-sm text-muted-foreground">
            Data ini berasal langsung dari usage logs proxy-engine, jadi tim Anda bisa melihat pool
            mana yang paling sibuk dan target mana yang paling sering diakses.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button variant="outline" as-child>
            <a :href="exportUrl">
              <Icon icon="lucide:download" class="mr-2 size-4" /> Export CSV
            </a>
          </Button>
          <Button variant="outline" as-child>
            <Link href="/app">
              <Icon icon="lucide:arrow-left" class="mr-2 size-4" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription
          >Sesuaikan jendela waktu, pool, dan status request untuk analisis lebih
          fokus.</CardDescription
        >
      </CardHeader>
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="grid gap-1">
          <Label class="text-xs">Time window</Label>
          <Select v-model="filters.hours">
            <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
              <SelectItem value="720">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid gap-1">
          <Label class="text-xs">Proxy list</Label>
          <Select v-model="filters.listId">
            <SelectTrigger class="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ANY">All pools</SelectItem>
              <SelectItem v-for="list in lists" :key="list.id" :value="String(list.id)">
                {{ list.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid gap-1">
          <Label class="text-xs">Status</Label>
          <Select v-model="filters.status">
            <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="secondary" @click="applyFilters">
          <Icon icon="lucide:filter" class="mr-2 size-4" /> Apply
        </Button>
        <Button variant="outline" as-child>
          <a :href="exportUrl">
            <Icon icon="lucide:sheet" class="mr-2 size-4" /> Download CSV
          </a>
        </Button>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card class="border-cyan-500/20 bg-cyan-500/5">
        <CardHeader class="pb-2">
          <CardDescription>Total Requests</CardDescription>
          <CardTitle class="text-2xl">{{ overview.totalRequests }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader class="pb-2">
          <CardDescription>Success Rate</CardDescription>
          <CardTitle class="text-2xl">{{ overview.successRate }}%</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-amber-500/20 bg-amber-500/5">
        <CardHeader class="pb-2">
          <CardDescription>Avg Duration</CardDescription>
          <CardTitle class="text-2xl">{{ overview.avgDurationMs }} ms</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Traffic Served</CardDescription>
          <CardTitle class="text-2xl">{{ fmtBytes(overview.totalResponseBytes) }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Traffic Trend</CardTitle>
        <CardDescription>
          Tren request gateway per {{ trend.unit === 'hour' ? 'jam' : 'hari' }} untuk jendela waktu
          yang sedang dipilih.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          v-if="trend.points.length === 0"
          class="rounded-xl border p-6 text-sm text-muted-foreground"
        >
          Belum ada data trend untuk filter yang dipilih.
        </div>
        <div v-else class="space-y-4">
          <div class="grid gap-3 md:grid-cols-3">
            <div class="rounded-xl border p-4">
              <p class="text-xs text-muted-foreground">Granularity</p>
              <p class="mt-2 text-sm font-semibold">
                {{ trend.unit === 'hour' ? 'Hourly buckets' : 'Daily buckets' }}
              </p>
            </div>
            <div class="rounded-xl border p-4">
              <p class="text-xs text-muted-foreground">Peak bucket</p>
              <p class="mt-2 text-sm font-semibold">{{ trendMax }} requests</p>
            </div>
            <div class="rounded-xl border p-4">
              <p class="text-xs text-muted-foreground">Buckets shown</p>
              <p class="mt-2 text-sm font-semibold">{{ trend.points.length }}</p>
            </div>
          </div>

          <div class="rounded-xl border p-2 sm:p-4 w-full overflow-x-auto">
            <div
              class="grid gap-1 sm:gap-2 items-end"
              :style="{
                gridTemplateColumns: `repeat(${trend.points.length}, minmax(20px, 60px))`,
                justifyContent: 'center',
                maxWidth: '100%',
              }"
            >
              <div
                v-for="point in trend.points"
                :key="point.bucketStart ?? point.label"
                class="flex flex-col items-center gap-1 sm:gap-2"
                :title="`${point.label}: ${point.requestCount} requests (${point.successfulRequests} success, ${point.failedRequests} failed)`"
              >
                <span
                  class="text-[8px] sm:text-[10px] text-muted-foreground truncate w-full text-center"
                >
                  {{ point.requestCount }}
                </span>
                <div
                  class="flex items-end w-full justify-center"
                  :style="{ height: `${Math.min(200, 56 + trend.points.length)}px` }"
                >
                  <div
                    class="w-full max-w-10 rounded-t-md bg-linear-to-t from-cyan-500 to-emerald-400"
                    :style="{
                      height: `${trendBarHeight(point.requestCount)}px`,
                      minHeight: point.requestCount > 0 ? '4px' : '0px',
                      width: '100%',
                    }"
                  />
                </div>
                <span
                  class="text-[8px] sm:text-[10px] text-muted-foreground truncate w-full text-center"
                >
                  {{ point.label }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Hover bar untuk detail success/failed.</span>
            <span>Bar tertinggi mewakili {{ trendMax }} requests.</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-6 xl:grid-cols-3">
      <Card class="border-border/70 xl:col-span-1">
        <CardHeader>
          <CardTitle>HTTP Method Mix</CardTitle>
          <CardDescription>Distribusi request method di jendela waktu terpilih.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-if="methods.length === 0"
            class="rounded-xl border p-4 text-sm text-muted-foreground"
          >
            Belum ada data method.
          </div>
          <div v-for="row in methods" :key="row.requestMethod" class="rounded-xl border p-4">
            <div class="flex items-center justify-between gap-3">
              <Badge variant="secondary" class="uppercase">{{ row.requestMethod }}</Badge>
              <span class="text-sm font-medium">{{ row.requestCount }}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/70 xl:col-span-1">
        <CardHeader>
          <CardTitle>Top Targets</CardTitle>
          <CardDescription>Host tujuan yang paling sering dilewati gateway.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-if="topTargets.length === 0"
            class="rounded-xl border p-4 text-sm text-muted-foreground"
          >
            Belum ada target yang tercatat.
          </div>
          <div v-for="row in topTargets" :key="row.targetHost" class="rounded-xl border p-4">
            <p class="font-medium">{{ row.targetHost }}</p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ row.requestCount }} requests · avg {{ row.avgDurationMs }} ms
            </p>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/70 xl:col-span-1">
        <CardHeader>
          <CardTitle>Top Pools</CardTitle>
          <CardDescription>Pool yang paling banyak dipakai oleh trafik gateway.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-if="topPools.length === 0"
            class="rounded-xl border p-4 text-sm text-muted-foreground"
          >
            Belum ada pool usage yang tercatat.
          </div>
          <div
            v-for="row in topPools"
            :key="`${row.proxyListId}-${row.proxyListName}`"
            class="rounded-xl border p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium">{{ row.proxyListName }}</p>
              <Badge variant="outline">{{ row.successRate }}% success</Badge>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ row.requestCount }} requests · avg {{ row.avgDurationMs }} ms
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Recent Gateway Logs</CardTitle>
        <CardDescription
          >Jejak request terbaru dari proxy-engine untuk kebutuhan audit dan
          troubleshooting.</CardDescription
        >
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Selection</TableHead>
              <TableHead>Perf</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="logs.data.length === 0">
              <TableCell colspan="8" class="py-10 text-center text-muted-foreground">
                No gateway usage logs match the current filters.
              </TableCell>
            </TableRow>
            <TableRow v-for="row in logs.data" :key="row.id">
              <TableCell class="text-xs text-muted-foreground">{{
                fmtDate(row.requestedAt)
              }}</TableCell>
              <TableCell>
                <div class="font-medium">{{ row.proxyListName ?? 'Unknown list' }}</div>
                <div class="text-xs text-muted-foreground">ID {{ row.proxyListId ?? '—' }}</div>
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ row.targetHost ?? 'Unknown target' }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ row.targetScheme ?? '—' }} : {{ row.targetPort ?? '—' }}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" class="uppercase">
                  {{ row.isTunnel ? 'CONNECT' : row.requestMethod }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="row.success ? 'default' : 'destructive'">
                  {{ row.success ? `OK ${row.statusCode ?? ''}` : `FAIL ${row.statusCode ?? ''}` }}
                </Badge>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                <div>{{ row.selectedProtocol ?? '—' }}</div>
                <div>{{ row.selectedCountry ?? '—' }} · ASN {{ row.selectedAsn ?? '—' }}</div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                <div>Attempts: {{ row.attemptCount }}</div>
                <div>Session: {{ row.sessionKey ?? '—' }}</div>
                <div>Geo: {{ row.countryOverride ?? '—' }}</div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                <div>{{ row.durationMs }} ms</div>
                <div>{{ fmtBytes(row.responseBytes) }}</div>
                <div v-if="row.errorMessage" class="text-red-600">{{ row.errorMessage }}</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span
        >{{ logs.meta.total }} logs · page {{ logs.meta.currentPage }} /
        {{ logs.meta.lastPage }}</span
      >
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="logs.meta.currentPage <= 1"
          @click="goPage(logs.meta.currentPage - 1)"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="logs.meta.currentPage >= logs.meta.lastPage"
          @click="goPage(logs.meta.currentPage + 1)"
        >
          Next
        </Button>
      </div>
    </div>
  </AppShell>
</template>
