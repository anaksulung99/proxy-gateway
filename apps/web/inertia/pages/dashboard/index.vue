<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

const ANY = '__all__'

function fmtBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const props = defineProps<{
  stats: {
    lists: number
    totalLists: number
    activeLists: number
    totalEntries: number
    healthy: number
    unhealthy: number
    timeout: number
    unknown: number
    healthyRatio: number
    needAttention: number
    enabledScrapers: number
    scheduledScrapers: number
    scraperRuns24h: number
    scraperErrors24h: number
    healthRuns24h: number
    healthErrors24h: number
    usageRequests24h: number
    usageSuccessful24h: number
    usageFailed24h: number
    usageSuccessRate24h: number
  }
  filters: {
    listId: number | null
    listName: string | null
    availablePools: Array<{ id: number; name: string }>
  }
  alerts: Array<{
    title: string
    detail: string
    tone: 'critical' | 'warning' | 'info'
    href: string
  }>
  engine:
    | {
        ok: true
        configured: true
        runtime: {
          status: string
          service: string
          env: string
          gatewayPort: string
          adminPort: string
          workers: number
          internalAuthEnabled: boolean
          cacheSize: number
          usageDropped: number
          uptimeSeconds: number
          timestamp: string
        }
      }
    | {
        ok: false
        configured: boolean
        error: string
      }
  traffic: {
    avgDurationMs24h: number
    totalResponseBytes24h: number
    topTargetHost: string | null
    topTargetRequests: number
    topPoolName: string | null
    topPoolRequests: number
  }
  pools: Array<{
    id: number
    name: string
    isActive: boolean
    entriesCount: number
    healthyCount: number
    unhealthyCount: number
    timeoutCount: number
    unknownCount: number
    healthyRatio: number
    scraperSources: number
    rotationSummary: {
      modeLabel: string
      protocolLabel: string
      cadenceLabel: string
    }
  }>
  recentScraperRuns: Array<{
    id: number
    sourceName: string
    sourceKey: string
    targetListName: string | null
    status: string
    scrapedTotal: number
    createdCount: number
    updatedCount: number
    startedAt: string | null
  }>
  recentHealthRuns: Array<{
    id: number
    sourceType: string
    targetUrl: string | null
    status: string
    checkedCount: number
    healthyCount: number
    unhealthyCount: number
    timeoutCount: number
    startedAt: string | null
  }>
}>()

const isRefreshing = ref(false)
const poolFilter = reactive({
  listId: props.filters.listId ? String(props.filters.listId) : ANY,
})

const hasFilter = computed(() => poolFilter.listId !== ANY)

const applyPoolFilter = () => {
  router.get('/app', poolFilter.listId === ANY ? {} : { listId: Number(poolFilter.listId) }, {
    preserveScroll: true,
    preserveState: true,
    onBefore: () => (isRefreshing.value = true),
    onFinish: () => (isRefreshing.value = false),
  })
}

const refreshWithState = () => {
  router.reload({
    preserveUrl: true,
    onBefore: () => (isRefreshing.value = true),
    onFinish: () => (isRefreshing.value = false),
  })
}
</script>

<template>
  <Head title="Dashboard" />
  <AppShell title="Operations Dashboard" description="Overview of all operations">
    <template #actions>
      <div class="flex gap-2 justify-center">
        <AppTooltip content="Refresh" side="bottom">
          <Button variant="outline" :loading="isRefreshing" @click="refreshWithState">
            <Icon icon="material-symbols-light:directory-sync" class="inline size-4" />
          </Button>
        </AppTooltip>
        <AppTooltip content="Manage pools" side="bottom">
          <Button as-child>
            <Link href="/app/proxy-lists">
              <Icon icon="lucide:database-zap" class="inline size-4" />
            </Link>
          </Button>
        </AppTooltip>
        <AppTooltip content="Open scraper" side="bottom">
          <Button class="bg-sky-600 dark:bg-sky-500 text-white" as-child>
            <Link href="/app/scraper">
              <Icon icon="material-symbols:cloud-sync-outline-rounded" class="inline size-4" />
            </Link>
          </Button>
        </AppTooltip>
        <AppTooltip content="Open checker" side="bottom">
          <Button class="bg-emerald-600 dark:bg-emerald-500 text-white" as-child>
            <Link href="/app/tools">
              <Icon icon="material-symbols:check-circle-unread-outline" class="inline size-4" />
            </Link>
          </Button>
        </AppTooltip>
        <AppTooltip content="Open analytics" side="bottom">
          <Button class="bg-violet-600 dark:bg-violet-500 text-white" as-child>
            <Link href="/app/analytics">
              <Icon icon="material-symbols:analytics-outline" class="inline size-4" />
            </Link>
          </Button>
        </AppTooltip>
      </div>
    </template>
    <div class="space-y-6">
      <div
        class="rounded-3xl border border-border/70 bg-linear-to-br from-cyan-500/10 via-background to-violet-500/10 p-6"
      >
        <div class="flex flex-col gap-4">
          <div class="max-w-3xl">
            <p class="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Residential Proxy Control Center
            </p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight">
              Monitor pool health, scraper freshness, dan checker stability dari satu layar.
            </h1>
            <p class="mt-3 text-sm text-muted-foreground">
              Fokuskan tim ke alert operasional, kualitas pool terbesar, dan aktivitas terakhir dari
              pipeline scraper serta health checker.
            </p>
            <p
              v-if="props.filters.listName"
              class="mt-3 text-sm font-medium text-cyan-600 dark:text-cyan-400"
            >
              Filter aktif: {{ props.filters.listName }}
            </p>
          </div>

          <div class="rounded-2xl border bg-background/80 p-4 xl:min-w-80">
            <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pool Filter</p>
            <div class="mt-3 flex flex-col gap-3">
              <Select v-model="poolFilter.listId">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Semua pool" />
                </SelectTrigger>
                <SelectContent class="w-full">
                  <SelectItem :value="ANY">Semua pool</SelectItem>
                  <SelectItem
                    v-for="pool in props.filters.availablePools"
                    :key="pool.id"
                    :value="String(pool.id)"
                  >
                    {{ pool.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div class="flex gap-2 justify-end">
                <Button variant="default" @click="applyPoolFilter">
                  <Icon icon="lucide:filter" class="size-4" /> Apply
                </Button>
                <Button
                  v-if="hasFilter"
                  variant="destructive"
                  @click="((poolFilter.listId = ANY), applyPoolFilter())"
                >
                  <Icon icon="lucide:refresh-ccw" class="size-4" />
                  Reset
                </Button>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ stats.lists }} dari {{ stats.totalLists }} pool sedang ditampilkan pada
                dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard
          title="Proxy Pools"
          :value="stats.lists"
          :detail="`${stats.activeLists} aktif dan siap melayani endpoint tim`"
          icon="lucide:database-zap"
          tone="info"
        />
        <MonitoringStatCard
          title="Healthy Inventory"
          :value="`${stats.healthyRatio}%`"
          :detail="`${stats.healthy} sehat dari ${stats.totalEntries} total proxy`"
          icon="lucide:shield-check"
          tone="success"
        />
        <MonitoringStatCard
          title="Need Attention"
          :value="stats.needAttention"
          :detail="`${stats.unhealthy} unhealthy · ${stats.timeout} timeout · ${stats.unknown} unchecked`"
          icon="lucide:triangle-alert"
          tone="warning"
        />
        <MonitoringStatCard
          title="Scheduled Scrapers"
          :value="stats.scheduledScrapers"
          :detail="`${stats.enabledScrapers} source aktif, ${stats.scraperRuns24h} run dalam 24 jam`"
          icon="lucide:radar"
          tone="default"
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <OperationsAlertList :alerts="alerts" />

        <Card class="border-border/70">
          <CardHeader>
            <CardTitle>Pipeline Pulse</CardTitle>
            <CardDescription>
              Snapshot ringkas untuk kualitas scraper dan health checker 24 jam terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <div class="rounded-xl border bg-card/70 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium">Scraper Runs</p>
                  <p class="text-xs text-muted-foreground">Manual, batch, dan scheduled runs</p>
                </div>
                <Badge :variant="stats.scraperErrors24h > 0 ? 'destructive' : 'default'">
                  {{ stats.scraperErrors24h }} errors
                </Badge>
              </div>
              <p class="mt-3 text-2xl font-semibold">{{ stats.scraperRuns24h }}</p>
            </div>

            <div class="rounded-xl border bg-card/70 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium">Health Check Runs</p>
                  <p class="text-xs text-muted-foreground">Tools checker dan bulk list re-check</p>
                </div>
                <Badge :variant="stats.healthErrors24h > 0 ? 'destructive' : 'default'">
                  {{ stats.healthErrors24h }} errors
                </Badge>
              </div>
              <p class="mt-3 text-2xl font-semibold">{{ stats.healthRuns24h }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border/70">
        <CardHeader>
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Gateway Traffic Pulse</CardTitle>
              <CardDescription>
                Ringkasan usage logs 24 jam terakhir untuk trafik yang melewati proxy-engine.
              </CardDescription>
            </div>
            <Button variant="outline" as-child>
              <Link href="/app/analytics">View full analytics</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Requests 24h</p>
              <p class="mt-2 text-2xl font-semibold">{{ stats.usageRequests24h }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ stats.usageSuccessful24h }} success · {{ stats.usageFailed24h }} failed
              </p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Gateway Success Rate</p>
              <p class="mt-2 text-2xl font-semibold">{{ stats.usageSuccessRate24h }}%</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Berdasarkan usage logs 24 jam terakhir
              </p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Avg Duration</p>
              <p class="mt-2 text-2xl font-semibold">{{ traffic.avgDurationMs24h }} ms</p>
              <p class="mt-1 text-xs text-muted-foreground">Rata-rata durasi request gateway</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Traffic Served</p>
              <p class="mt-2 text-2xl font-semibold">
                {{ fmtBytes(traffic.totalResponseBytes24h) }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                Payload response yang berhasil disalurkan
              </p>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Top Target</p>
              <p class="mt-2 text-sm font-semibold">
                {{ traffic.topTargetHost ?? 'Belum ada trafik' }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ traffic.topTargetRequests }} request dalam 24 jam terakhir
              </p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Top Pool</p>
              <p class="mt-2 text-sm font-semibold">
                {{ traffic.topPoolName ?? 'Belum ada pool usage' }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ traffic.topPoolRequests }} request dalam 24 jam terakhir
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/70">
        <CardHeader>
          <CardTitle>Proxy Engine Runtime</CardTitle>
          <CardDescription>
            Status listener gateway dan admin plane yang dipantau langsung dari service Go.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="engine.ok" class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Service</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.service }}</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Gateway Port</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.gatewayPort }}</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Admin Port</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.adminPort }}</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Cache Size</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.cacheSize }}</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Uptime</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.uptimeSeconds }}s</p>
            </div>
            <div class="rounded-xl border bg-card/70 p-4">
              <p class="text-xs text-muted-foreground">Dropped Usage Logs</p>
              <p class="mt-2 text-sm font-semibold">{{ engine.runtime.usageDropped }}</p>
            </div>
          </div>
          <div v-else class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p class="font-medium">Proxy engine runtime belum tersedia</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ engine.error }}</p>
          </div>
        </CardContent>
      </Card>

      <PoolHealthTable :pools="pools" />

      <div class="grid gap-6 xl:grid-cols-2">
        <RunFeedCard
          title="Recent Scraper Activity"
          description="Run terbaru yang mempengaruhi freshness source dan isi pool."
          href="/app/scraper/logs"
          :rows="
            recentScraperRuns.map((run) => ({
              id: run.id,
              name: run.sourceName,
              subtitle: `${run.sourceKey} -> ${run.targetListName ?? 'No target'}`,
              status: run.status,
              meta: `${run.scrapedTotal} scraped · ${run.createdCount} new · ${run.updatedCount} updated`,
              startedAt: run.startedAt,
            }))
          "
        />

        <RunFeedCard
          title="Recent Health Check Activity"
          description="Eksekusi checker terakhir dari tools eksternal maupun pool re-check."
          href="/app/tools/logs"
          :rows="
            recentHealthRuns.map((run) => ({
              id: run.id,
              name: run.sourceType === 'tools' ? 'Tools Checker' : 'Proxy List Bulk Re-check',
              subtitle: run.targetUrl || 'Default target URL',
              status: run.status,
              meta: `${run.checkedCount} checked · ${run.healthyCount} healthy · ${run.unhealthyCount} unhealthy · ${run.timeoutCount} timeout`,
              startedAt: run.startedAt,
            }))
          "
        />
      </div>
    </div>
  </AppShell>
</template>
