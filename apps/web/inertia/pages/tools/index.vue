<script setup lang="ts">
import { computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'
import { useFlashStore } from '~/stores/flash'
import { useNotificationsStore } from '~/stores/notifications'

interface Result {
  label: string
  protocol: string
  healthy: boolean
  latencyMs: number
  returnedIp: string
  statusCode: number
  error: string
  mode: string
}

interface RecentRun {
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

interface Pagination {
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}

const props = defineProps<{
  results: Result[] | null
  input: { mode: string; targetUrl: string; raw: string } | null
  data: RecentRun[]
  meta: Pagination
}>()

const { warning } = useGlobalAlert()
const flashStore = useFlashStore()
const notifications = useNotificationsStore()

const form = useForm({
  raw: props.input?.raw ?? '',
  mode: props.input?.mode ?? 'request',
  targetUrl: props.input?.targetUrl ?? '',
})

const runSummary = computed(() => flashStore.flash?.healthCheckRunSummary ?? null)
const inputCount = computed(() => form.raw.split(/\r?\n/).filter((line) => line.trim()).length)
const firstRow = computed(() =>
  props.meta.total === 0 ? 0 : (props.meta.currentPage - 1) * props.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.meta.currentPage * props.meta.perPage, props.meta.total)
)
const selected = ref<Set<number>>(new Set())
const allOnPageSelected = computed(
  () => props.data.length > 0 && props.data.every((row) => selected.value.has(row.id))
)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (allOnPageSelected.value) return true
  return props.data.some((row) => selected.value.has(row.id)) ? 'indeterminate' : false
})

function run() {
  const taskKey = 'tools:manual-check'
  notifications.startLocalTask(
    taskKey,
    'Manual health check sedang berjalan',
    `${inputCount.value} proxy | ${String(form.mode).toUpperCase()} mode`
  )
  form.post('/app/tools/check', {
    preserveScroll: true,
    onFinish: () => {
      notifications.finishLocalTask(taskKey)
    },
  })
}

function loadPage(targetPage: number, perPage = props.meta.perPage) {
  router.get(
    '/app/tools',
    {
      page: targetPage,
      perPage,
    },
    {
      preserveScroll: true,
      preserveState: true,
    }
  )
}

function changeLimit(value: unknown) {
  const perPage = Number(value)
  loadPage(1, perPage)
}

function toggleAll(value: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  for (const row of props.data) {
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
        loadPage(1)
      },
    })
  })
}
</script>

<template>
  <Head title="Tools — Proxy Checker" />
  <AppShell title="Tools · Proxy Checker">
    <HealthCheckRunSummaryCard :summary="runSummary" />

    <div class="grid gap-4 lg:grid-cols-[380px_1fr]">
      <!-- Input -->
      <Card class="h-fit">
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <div>
              <CardTitle>External proxy checker</CardTitle>
              <CardDescription>
                Test any proxies (incl. your own server) without saving them.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" as-child>
              <Link href="/app/tools/logs">
                <Icon icon="lucide:history" class="mr-1 size-4" /> Logs
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent class="grid gap-3">
          <div class="grid gap-1.5">
            <Label>Proxies (one per line)</Label>
            <Textarea
              v-model="form.raw"
              rows="9"
              class="font-mono text-xs"
              placeholder="1.2.3.4:8080&#10;user:pass@1.2.3.4:1080&#10;socks5://1.2.3.4:1080"
            />
            <p v-if="form.errors.raw" class="text-xs text-red-600">{{ form.errors.raw }}</p>
          </div>
          <div class="grid gap-1.5">
            <Label>Check mode</Label>
            <Select v-model="form.mode">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem value="request">Request (fast HTTP)</SelectItem>
                <SelectItem value="crawlee">Crawlee (browser-like headers)</SelectItem>
                <SelectItem value="playwright">Playwright (real browser)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label>Target / judge URL (optional)</Label>
            <Input v-model="form.targetUrl" placeholder="https://api.ipify.org" />
          </div>
          <Button :disabled="form.processing || !form.raw.trim()" @click="run">
            <Icon icon="lucide:play" class="mr-1 size-4" />
            {{ form.processing ? 'Checking…' : 'Run check' }}
          </Button>
        </CardContent>
      </Card>

      <!-- Results -->
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription v-if="results">{{ results.length }} checked</CardDescription>
        </CardHeader>
        <CardContent class="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proxy</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Returned IP</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!results || results.length === 0">
                <TableCell colspan="5" class="py-10 text-center text-muted-foreground">
                  Run a check to see results.
                </TableCell>
              </TableRow>
              <TableRow v-for="(r, i) in results" :key="i">
                <TableCell class="font-mono text-xs">
                  {{ r.label }} <span class="text-muted-foreground">({{ r.protocol }})</span>
                </TableCell>
                <TableCell>
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="
                      r.healthy
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                    "
                  >
                    {{ r.healthy ? 'OK' : 'Fail' }}
                  </span>
                </TableCell>
                <TableCell>{{ r.latencyMs ? `${r.latencyMs} ms` : '—' }}</TableCell>
                <TableCell class="font-mono text-xs">{{ r.returnedIp || '—' }}</TableCell>
                <TableCell class="max-w-70 truncate text-xs text-muted-foreground">
                  {{ r.healthy ? `HTTP ${r.statusCode}` : r.error }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

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
            <Button variant="ghost" size="sm" as-child>
              <Link href="/app/tools/logs">Open full history</Link>
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
              <TableHead>Result</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="data.length === 0">
              <TableCell colspan="5" class="py-8 text-center text-muted-foreground">
                No health check runs recorded yet.
              </TableCell>
            </TableRow>
            <TableRow v-for="rn in data" :key="rn.id">
              <TableCell>
                <Checkbox
                  :model-value="selected.has(rn.id)"
                  class="border border-emerald-500/50"
                  @update:model-value="(value) => toggleOne(rn.id, value)"
                />
              </TableCell>
              <TableCell>
                <div class="font-medium uppercase">{{ rn.sourceType }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ rn.targetUrl || 'Default target URL' }}
                </div>
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
                <Badge variant="secondary" class="uppercase">{{ rn.mode }}</Badge>
              </TableCell>
              <TableCell>
                <div class="text-sm">
                  {{ rn.checkedCount }} checked · {{ rn.healthyCount }} healthy ·
                  {{ rn.unhealthyCount }} unhealthy
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ rn.timeoutCount }} timeout · {{ rn.invalidCount }} invalid
                </div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ rn.startedAt ? new Date(rn.startedAt).toLocaleString() : '—' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div
          class="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2">
            <span>Rows per page</span>
            <Select :model-value="String(meta.perPage)" @update:model-value="changeLimit">
              <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
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
              @click="loadPage(meta.currentPage - 1)"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="meta.currentPage >= meta.lastPage"
              @click="loadPage(meta.currentPage + 1)"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </AppShell>
</template>
