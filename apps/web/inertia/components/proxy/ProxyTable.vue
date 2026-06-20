<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { router } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

interface Entry {
  id: number
  host: string
  port: number
  protocol: string
  countryCode: string | null
  asnNumber: number | null
  status: string
  latencyMs: number | null
  returnedIp: string | null
  lastCheckedAt: string | null
  source: string
}
interface Paginated {
  data: Entry[]
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
}

const props = defineProps<{
  listId: number
  entries: Paginated
  filters: {
    status: string | null
    country: string | null
    protocol: string | null
    asn: number | null
    search: string | null
  }
}>()
const { warning } = useGlobalAlert()

const ANY = '__any__'
const filters = reactive({
  search: props.filters.search ?? '',
  status: props.filters.status ?? ANY,
  protocol: props.filters.protocol ?? ANY,
  country: props.filters.country ?? '',
})

const selected = ref<Set<number>>(new Set())
const allOnPageSelected = computed(
  () => props.entries.data.length > 0 && props.entries.data.every((e) => selected.value.has(e.id))
)

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true) props.entries.data.forEach((e) => selected.value.add(e.id))
  else props.entries.data.forEach((e) => selected.value.delete(e.id))
}
function toggleOne(id: number, value: boolean | 'indeterminate') {
  if (value === true) selected.value.add(id)
  else selected.value.delete(id)
  // force reactivity
  selected.value = new Set(selected.value)
}

function buildQuery(extra: Record<string, any> = {}) {
  const q: Record<string, any> = {}
  if (filters.search) q.search = filters.search
  if (filters.status !== ANY) q.status = filters.status
  if (filters.protocol !== ANY) q.protocol = filters.protocol
  if (filters.country) q.country = filters.country
  return { ...q, ...extra }
}

function applyFilters() {
  router.get(`/app/proxy-lists/${props.listId}`, buildQuery(), {
    preserveState: true,
    preserveScroll: true,
  })
}

function goPage(page: number) {
  router.get(`/app/proxy-lists/${props.listId}`, buildQuery({ page }), {
    preserveState: true,
    preserveScroll: true,
  })
}

function bulk(action: 'delete' | 'recheck') {
  const ids = [...selected.value]
  if (ids.length === 0) return
  if (action === 'delete') {
    warning('Warning!', `Are you sure you want to delete ${ids.length} proxies?`).then(
      (confirm) => {
        if (!confirm) return
        router.post(
          '/app/proxy-entries/bulk',
          { listId: props.listId, action, ids },
          {
            preserveScroll: true,
            onSuccess: () => {
              selected.value = new Set()
            },
          }
        )
      }
    )
  }
}

const exportUrl = computed(() => {
  const q = new URLSearchParams(buildQuery({ format: 'txt', creds: '1' }) as any).toString()
  return `/app/proxy-lists/${props.listId}/export?${q}`
})
</script>

<template>
  <div class="space-y-3">
    <!-- Filter bar -->
    <div class="flex flex-col gap-4 w-full">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div class="grid gap-1">
          <Label class="text-xs">Search host</Label>
          <Input
            v-model="filters.search"
            class="h-9 w-full"
            placeholder="1.2.3.4"
            @keyup.enter="applyFilters"
          />
        </div>
        <div class="grid gap-1">
          <Label class="text-xs">Status</Label>
          <Select v-model="filters.status">
            <SelectTrigger class="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem :value="ANY">All</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="unhealthy">Unhealthy</SelectItem>
              <SelectItem value="timeout">Timeout</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-1">
          <Label class="text-xs">Protocol</Label>
          <Select v-model="filters.protocol">
            <SelectTrigger class="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem :value="ANY">All</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="https">HTTPS</SelectItem>
              <SelectItem value="socks5">SOCKS5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-1">
          <Label class="text-xs">Country</Label>
          <Input
            v-model="filters.country"
            maxlength="2"
            class="h-9 w-full uppercase"
            placeholder="US"
          />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 ml-auto">
        <Button variant="default" class="h-9" @click="applyFilters">
          <Icon icon="lucide:filter" class="mr-1 size-4" /> Filter
        </Button>
        <Button variant="outline" class="ml-auto h-9" as-child>
          <a :href="exportUrl"><Icon icon="lucide:download" class="mr-1 size-4" /> Export</a>
        </Button>
      </div>
    </div>

    <!-- Bulk bar -->
    <div
      v-if="selected.size > 0"
      class="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
    >
      <span>{{ selected.size }} selected</span>
      <Button variant="outline" size="sm" @click="bulk('recheck')">
        <Icon icon="lucide:refresh-cw" class="mr-1 size-3.5" /> Re-check
      </Button>
      <Button variant="destructive" size="sm" @click="bulk('delete')">
        <Icon icon="lucide:trash-2" class="mr-1 size-3.5" /> Delete
      </Button>
    </div>

    <!-- Table -->
    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox :model-value="allOnPageSelected" @update:model-value="toggleAll" />
              </TableHead>
              <TableHead>Proxy</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>ASN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="entries.data.length === 0">
              <TableCell colspan="8" class="py-10 text-center text-muted-foreground">
                No proxies match. Import some to get started.
              </TableCell>
            </TableRow>
            <TableRow v-for="e in entries.data" :key="e.id">
              <TableCell>
                <Checkbox
                  :model-value="selected.has(e.id)"
                  @update:model-value="(v) => toggleOne(e.id, v)"
                />
              </TableCell>
              <TableCell class="font-mono text-xs">{{ e.host }}:{{ e.port }}</TableCell>
              <TableCell class="uppercase">{{ e.protocol }}</TableCell>
              <TableCell>{{ e.countryCode ?? '—' }}</TableCell>
              <TableCell>{{ e.asnNumber ?? '—' }}</TableCell>
              <TableCell><HealthStatusBadge :status="e.status" /></TableCell>
              <TableCell>{{ e.latencyMs != null ? `${e.latencyMs} ms` : '—' }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ e.source }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span
        >{{ entries.meta.total }} total · page {{ entries.meta.currentPage }} /
        {{ entries.meta.lastPage }}</span
      >
      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          :disabled="entries.meta.currentPage <= 1"
          @click="goPage(entries.meta.currentPage - 1)"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="entries.meta.currentPage >= entries.meta.lastPage"
          @click="goPage(entries.meta.currentPage + 1)"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
