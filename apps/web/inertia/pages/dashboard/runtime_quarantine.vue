<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

const ANY = '__any__'

const props = defineProps<{
  rows: Array<{
    id: number
    proxyEntryId: number
    proxyListId: number
    proxyListName: string
    endpoint: string
    protocol: string
    countryCode: string | null
    status: 'timeout' | 'unhealthy'
    checkedAt: string
    errorMessage: string
  }>
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
  summary: {
    total24h: number
    timeout24h: number
    unhealthy24h: number
    affectedLists24h: number
    latestAt: string | null
  }
  filters: {
    status: 'timeout' | 'unhealthy' | null
    search: string | null
    listId: number | null
    listName: string | null
    availablePools: Array<{ id: number; name: string }>
  }
}>()

const filters = reactive({
  status: props.filters.status ?? ANY,
  search: props.filters.search ?? '',
  listId: props.filters.listId ? String(props.filters.listId) : ANY,
})

const hasFilters = computed(
  () => filters.status !== ANY || filters.listId !== ANY || filters.search.trim().length > 0
)
const firstRow = computed(() =>
  props.meta.total === 0 ? 0 : (props.meta.currentPage - 1) * props.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.meta.currentPage * props.meta.perPage, props.meta.total)
)

function fmtDate(value: string | null) {
  if (!value) return 'Belum ada event'
  return new Date(value).toLocaleString()
}

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = {}
  if (filters.status !== ANY) query.status = filters.status
  if (filters.listId !== ANY) query.listId = Number(filters.listId)
  if (filters.search.trim()) query.search = filters.search.trim()
  return { ...query, ...extra }
}

function applyFilters() {
  router.get('/app/runtime/quarantine', buildQuery({ page: 1, perPage: props.meta.perPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function clearFilters() {
  filters.status = ANY
  filters.listId = ANY
  filters.search = ''
  applyFilters()
}

function goPage(page: number) {
  router.get('/app/runtime/quarantine', buildQuery({ page, perPage: props.meta.perPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}

function changeLimit(value: unknown) {
  const perPage = Number(value)
  router.get('/app/runtime/quarantine', buildQuery({ page: 1, perPage }), {
    preserveScroll: true,
    preserveState: true,
  })
}
</script>

<template>
  <Head title="Runtime Quarantine Logs" />
  <AppShell title="Runtime Quarantine Logs" description="Runtime auto-unhealthy and timeout events">
    <div class="space-y-6">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/app" class="hover:underline">
          <Icon icon="lucide:arrow-left" class="inline size-4" /> Back to dashboard
        </Link>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MonitoringStatCard
          title="Events 24h"
          :value="summary.total24h"
          detail="Runtime failure yang auto-menurunkan health proxy"
          icon="lucide:shield-alert"
          tone="warning"
        />
        <MonitoringStatCard
          title="Timeout 24h"
          :value="summary.timeout24h"
          detail="Proxy yang dikarantina karena timeout atau deadline"
          icon="lucide:timer-off"
          tone="default"
        />
        <MonitoringStatCard
          title="Unhealthy 24h"
          :value="summary.unhealthy24h"
          detail="Failure runtime selain timeout"
          icon="lucide:activity"
          tone="warning"
        />
        <MonitoringStatCard
          title="Affected Pools"
          :value="summary.affectedLists24h"
          :detail="`Last event ${fmtDate(summary.latestAt)}`"
          icon="lucide:database-zap"
          tone="info"
        />
      </div>

      <Card class="border-border/70">
        <CardHeader>
          <CardTitle>Filter Runtime Quarantine</CardTitle>
          <CardDescription>
            Fokuskan ke pool tertentu, status quarantine, atau cari host dan pesan error runtime.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="grid gap-1">
              <Label class="text-xs">Status</Label>
              <Select v-model="filters.status">
                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent class="w-full">
                  <SelectItem :value="ANY">Semua status</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                  <SelectItem value="unhealthy">Unhealthy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-1">
              <Label class="text-xs">Pool</Label>
              <Select v-model="filters.listId">
                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
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
            </div>

            <div class="grid gap-1">
              <Label class="text-xs">Search</Label>
              <Input
                v-model="filters.search"
                placeholder="host, pool, atau pesan runtime"
                @keyup.enter="applyFilters"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2">
            <Button @click="applyFilters">
              <Icon icon="lucide:filter" class="size-4" /> Apply
            </Button>
            <Button v-if="hasFilters" variant="destructive" @click="clearFilters">
              <Icon icon="lucide:x" class="size-4" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border/70">
        <CardHeader>
          <CardTitle>Runtime Quarantine Event Feed</CardTitle>
          <CardDescription>
            Log event dari runtime tracker saat proxy di-auto mark `timeout` atau `unhealthy`.
          </CardDescription>
        </CardHeader>
        <CardContent class="p-0 space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Proxy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="rows.length === 0">
                <TableCell colspan="5" class="py-10 text-center text-muted-foreground">
                  Belum ada runtime quarantine event yang cocok dengan filter aktif.
                </TableCell>
              </TableRow>
              <TableRow v-for="row in rows" :key="row.id">
                <TableCell>
                  <div class="font-medium">{{ row.proxyListName }}</div>
                  <div class="text-xs text-muted-foreground">Pool #{{ row.proxyListId }}</div>
                </TableCell>
                <TableCell>
                  <div class="font-mono text-xs">{{ row.endpoint }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ row.protocol.toUpperCase() }}
                    <span v-if="row.countryCode"> · {{ row.countryCode }}</span>
                    · Proxy #{{ row.proxyEntryId }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge :variant="row.status === 'timeout' ? 'secondary' : 'destructive'">
                    {{ row.status }}
                  </Badge>
                </TableCell>
                <TableCell class="max-w-105 whitespace-normal text-sm text-muted-foreground">
                  {{ row.errorMessage }}
                </TableCell>
                <TableCell class="text-xs text-muted-foreground">
                  {{ fmtDate(row.checkedAt) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div
            class="flex flex-col gap-3 px-6 pb-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-2">
              <span>Rows per page</span>
              <Select :model-value="String(meta.perPage)" @update:model-value="changeLimit">
                <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>{{ firstRow }}-{{ lastRow }} of {{ meta.total }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span>Page {{ meta.currentPage }} of {{ meta.lastPage }}</span>
              <Button
                variant="outline"
                size="sm"
                :disabled="meta.currentPage <= 1"
                @click="goPage(meta.currentPage - 1)"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="meta.currentPage >= meta.lastPage"
                @click="goPage(meta.currentPage + 1)"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>
