<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { usePolling } from '~/composables/usePolling'

interface List {
  id: number
  name: string
  description: string | null
  isActive: boolean
}
interface RotationConfig {
  rotationType: string
  protocol: string
  stickyDurationMinutes: number | null
  intervalMinutes: number | null
  geoTarget: string | null
  excludeCountries: string[] | null
  excludeAsn: number[] | null
}

const props = defineProps<{
  list: List
  rotationConfig: RotationConfig | null
  rotationSummary: {
    modeLabel: string
    protocolLabel: string
    cadenceLabel: string
    geoLabel: string
    exclusionsLabel: string
    description: string
  }
  gateway: { host: string; socksHost: string; username: string; hasActiveKey: boolean }
  entries: any
  filters: any
  stats: { total: number; healthy: number; unhealthy: number; timeout: number; unknown: number }
}>()

const showEdit = ref(false)
const page = usePage<{
  flash?: {
    importSummary?: {
      totalLines: number
      parsed: number
      invalid: number
      invalidSamples: { line: string; reason: string }[]
      duplicatesInBatch: number
      created: number
      updated: number
      enqueued: number
    } | null
  }
}>()

const importSummary = computed(() => page.props.flash?.importSummary ?? null)
const healthyRate = computed(() =>
  props.stats.total > 0 ? Math.round((props.stats.healthy / props.stats.total) * 100) : 0
)

// Live health status — auto-refresh entries + stats (pauses when tab hidden).
const { enabled: live, isFetching } = usePolling(['entries', 'stats'], {
  interval: 4000,
  enabled: true,
})
</script>

<template>
  <Head :title="props.list.name" />
  <AppShell :title="props.list.name" description="Detail daftar proxy">
    <template #actions>
      <div class="flex items-center gap-2 justify-end">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
          :class="live ? 'border-emerald-500/40 text-emerald-600' : 'text-muted-foreground'"
          @click="live = !live"
        >
          <span
            class="size-2 rounded-full"
            :class="live ? (isFetching ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500') : 'bg-muted-foreground/40'"
          />
          {{ live ? 'Live' : 'Paused' }}
        </button>
        <AppTooltip content="Edit list" side="bottom">
          <Button variant="outline" size="sm" @click="showEdit = true">
            <Icon icon="lucide:pencil-line" class="mr-1 size-4" />
            <span class="hidden md:block">Edit list</span>
          </Button>
        </AppTooltip>
        <ImportWizard :list-id="props.list.id" />
      </div>
    </template>

    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/app/proxy-lists" class="hover:underline">
        <Icon icon="lucide:arrow-left" class="inline size-4" /> All lists
      </Link>
      <span v-if="props.list.description">· {{ props.list.description }}</span>
    </div>

    <div class="grid grid-cols-2 gap-3 xl:grid-cols-6">
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Total</div>
        <div class="text-xl font-semibold">{{ stats.total }}</div>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Healthy</div>
        <div class="text-xl font-semibold text-emerald-600">{{ stats.healthy }}</div>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Healthy Ratio</div>
        <div class="text-xl font-semibold">{{ healthyRate }}%</div>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Unhealthy</div>
        <div class="text-xl font-semibold text-red-600">{{ stats.unhealthy }}</div>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Timeout</div>
        <div class="text-xl font-semibold text-amber-600">{{ stats.timeout }}</div>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Unchecked</div>
        <div class="text-xl font-semibold">{{ stats.unknown }}</div>
      </Card>
    </div>

    <ProxyImportSummaryCard :summary="importSummary" />
    <ProxyRotationSummaryCard :summary="props.rotationSummary" />

    <Tabs default-value="proxies" class="mt-2">
      <TabsList>
        <TabsTrigger value="proxies">Proxies</TabsTrigger>
        <TabsTrigger value="rotation">Rotation &amp; Targeting</TabsTrigger>
        <TabsTrigger value="connect">Connect</TabsTrigger>
      </TabsList>
      <TabsContent value="proxies" class="mt-4">
        <ProxyTable :list-id="props.list.id" :entries="props.entries" :filters="props.filters" />
      </TabsContent>
      <TabsContent value="rotation" class="mt-4">
        <RotationConfigForm :list-id="props.list.id" :config="props.rotationConfig" />
      </TabsContent>
      <TabsContent value="connect" class="mt-4">
        <ProxyConnectionCard :gateway="props.gateway" :rotation-config="props.rotationConfig" />
      </TabsContent>
    </Tabs>

    <ProxyListFormDialog
      v-model:open="showEdit"
      mode="edit"
      :list-id="props.list.id"
      :initial-values="props.list"
    />
  </AppShell>
</template>
