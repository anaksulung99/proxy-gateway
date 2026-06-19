<script setup lang="ts">
import { computed } from 'vue'
import { Head, useForm, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

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

const props = defineProps<{
  results: Result[] | null
  input: { mode: string; targetUrl: string; raw: string } | null
  recentRuns: RecentRun[]
}>()

const form = useForm({
  raw: props.input?.raw ?? '',
  mode: props.input?.mode ?? 'request',
  targetUrl: props.input?.targetUrl ?? '',
})

const page = usePage<{
  flash?: {
    healthCheckRunSummary?: {
      runId?: number | null
      sourceType: 'tools' | 'proxy_list_bulk'
      status: 'success' | 'error'
      mode: 'request' | 'playwright' | 'crawlee'
      targetUrl: string | null
      totalInputs: number
      checked: number
      healthy: number
      unhealthy: number
      timeout: number
      invalid: number
      finishedAt: string
      errorMessage?: string | null
    } | null
  }
}>()

const runSummary = computed(() => page.props.flash?.healthCheckRunSummary ?? null)

function run() {
  form.post('/app/tools/check', { preserveScroll: true })
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
        <CardContent class="p-0">
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
          <Button variant="ghost" size="sm" as-child>
            <Link href="/app/tools/logs">Open full history</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="recentRuns.length === 0">
              <TableCell colspan="5" class="py-8 text-center text-muted-foreground">
                No health check runs recorded yet.
              </TableCell>
            </TableRow>
            <TableRow v-for="rn in recentRuns" :key="rn.id">
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
      </CardContent>
    </Card>
  </AppShell>
</template>
