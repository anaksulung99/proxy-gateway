<script setup lang="ts">
import { reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

interface RunRow {
  id: number
  sourceType: 'tools' | 'proxy_list_bulk'
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
  filters: { status: string | null; sourceType: string | null }
}>()

const ANY = '__any__'
const filters = reactive({
  status: props.filters.status ?? ANY,
  sourceType: props.filters.sourceType ?? ANY,
})

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number> = {}
  if (filters.status !== ANY) query.status = filters.status
  if (filters.sourceType !== ANY) query.sourceType = filters.sourceType
  return { ...query, ...extra }
}

function applyFilters() {
  router.get('/app/tools/logs', buildQuery(), { preserveScroll: true, preserveState: true })
}

function goPage(page: number) {
  router.get('/app/tools/logs', buildQuery({ page }), {
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
  <Head title="Tools — Health Check Logs" />
  <AppShell title="Tools · Health Check Logs">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/app/tools" class="hover:underline">
        <Icon icon="lucide:arrow-left" class="inline size-4" /> Back to tools checker
      </Link>
    </div>

    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Health Check Run History</CardTitle>
        <CardDescription>
          Audit semua run checker dari tools external dan bulk re-check proxy list.
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
            <Label class="text-xs">Source</Label>
            <Select v-model="filters.sourceType">
              <SelectTrigger class="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="ANY">All sources</SelectItem>
                <SelectItem value="tools">Tools Checker</SelectItem>
                <SelectItem value="proxy_list_bulk">Proxy List Bulk Re-check</SelectItem>
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
                <div class="font-medium uppercase">{{ run.sourceType }}</div>
                <div class="text-xs text-muted-foreground">Run #{{ run.id }}</div>
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
              <TableCell>
                <div class="text-sm">
                  {{ run.checkedCount }} checked / {{ run.totalInputs }} input ·
                  {{ run.healthyCount }} healthy
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ run.unhealthyCount }} unhealthy · {{ run.timeoutCount }} timeout ·
                  {{ run.invalidCount }} invalid
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
