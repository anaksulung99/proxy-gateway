<script setup lang="ts">
import { ref, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { toast } from 'vue-sonner'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'
import { useFlashStore } from '~/stores/flash'

interface ApiKeyRow {
  id: number
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string | null
  monthlyQuotaBytes: number | null
  bytesThisMonth: number
}

const props = defineProps<{
  keys: ApiKeyRow[]
  gateway: { host: string }
  team: { monthlyQuotaBytes: number | null; bytesThisMonth: number }
}>()

const MB = 1024 * 1024
const { warning } = useGlobalAlert()
const flashStore = useFlashStore()
const newKey = computed(() => flashStore.flash?.newApiKey ?? null)
const team = computed(() => props.team)

function fmtBytes(v: number | null) {
  if (!v) return v === 0 ? '0 B' : '∞'
  if (v < 1024) return `${v} B`
  if (v < MB) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 * MB) return `${(v / MB).toFixed(1)} MB`
  return `${(v / (1024 * MB)).toFixed(2)} GB`
}
function fmt(s: string | null) {
  return s ? new Date(s).toLocaleString() : '—'
}

function parseOptionalNumber(value: string | number) {
  const normalized = String(value).trim()
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

// Team quota
const teamUsedPct = computed(() => {
  if (!team.value.monthlyQuotaBytes) return 0
  return Math.min(100, Math.round((team.value.bytesThisMonth / team.value.monthlyQuotaBytes) * 100))
})
const teamForm = useForm({
  monthlyQuotaGb: team.value.monthlyQuotaBytes
    ? +(team.value.monthlyQuotaBytes / (1024 * MB)).toFixed(2)
    : null,
})
const teamQuotaInput = computed({
  get: () => teamForm.monthlyQuotaGb ?? undefined,
  set: (value: string | number) => {
    teamForm.monthlyQuotaGb = parseOptionalNumber(value)
  },
})
function saveTeamQuota() {
  teamForm.post('/app/settings/team-quota', { preserveScroll: true })
}

// Create key
const showCreate = ref(false)
const form = useForm({ name: '', monthlyQuotaMb: null as number | null })
const createQuotaInput = computed({
  get: () => form.monthlyQuotaMb ?? undefined,
  set: (value: string | number) => {
    form.monthlyQuotaMb = parseOptionalNumber(value)
  },
})
function submit() {
  form.post('/app/settings/api-keys', {
    preserveScroll: true,
    onSuccess: () => {
      showCreate.value = false
      form.reset()
    },
  })
}

// Per-key quota edit
const quotaKey = ref<ApiKeyRow | null>(null)
const quotaForm = useForm({ monthlyQuotaMb: null as number | null })
const editQuotaInput = computed({
  get: () => quotaForm.monthlyQuotaMb ?? undefined,
  set: (value: string | number) => {
    quotaForm.monthlyQuotaMb = parseOptionalNumber(value)
  },
})
function openQuota(k: ApiKeyRow) {
  quotaKey.value = k
  quotaForm.monthlyQuotaMb = k.monthlyQuotaBytes ? Math.round(k.monthlyQuotaBytes / MB) : null
}
function saveKeyQuota() {
  if (!quotaKey.value) return
  quotaForm.post(`/app/settings/api-keys/${quotaKey.value.id}/quota`, {
    preserveScroll: true,
    onSuccess: () => (quotaKey.value = null),
  })
}

function revoke(key: ApiKeyRow) {
  warning('Warning!', `Revoke API key "${key.name}"? Clients using it will stop working.`).then(
    (confirm) => {
      if (!confirm) return
      router.post(`/app/settings/api-keys/${key.id}/revoke`, {}, { preserveScroll: true })
    }
  )
}
function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Copy failed')
  )
}
</script>

<template>
  <Head title="API Keys" />
  <AppShell title="Settings · API Keys">
    <template #actions>
      <Button size="sm" @click="showCreate = true">
        <Icon icon="lucide:plus" class="size-4" /> New key
      </Button>
    </template>

    <!-- Team bandwidth quota -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base">Team bandwidth · this month</CardTitle>
        <CardDescription>
          {{ fmtBytes(team.bytesThisMonth) }} used{{
            team.monthlyQuotaBytes ? ` of ${fmtBytes(team.monthlyQuotaBytes)}` : ' · no limit set'
          }}. The gateway rejects requests once the quota is reached.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3">
        <div v-if="team.monthlyQuotaBytes" class="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-all"
            :class="
              teamUsedPct >= 100
                ? 'bg-red-500'
                : teamUsedPct >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            "
            :style="{ width: teamUsedPct + '%' }"
          />
        </div>
        <div class="flex items-end gap-2">
          <div class="grid gap-1">
            <Label class="text-xs">Monthly quota (GB, empty = unlimited)</Label>
            <Input
              v-model="teamQuotaInput"
              type="number"
              min="0"
              step="0.5"
              class="h-9 w-44"
              placeholder="unlimited"
            />
          </div>
          <Button size="sm" class="h-9" :disabled="teamForm.processing" @click="saveTeamQuota">
            Save quota
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Freshly created token -->
    <Card v-if="newKey" class="border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20">
      <CardHeader class="pb-2">
        <CardTitle class="text-base">Save your new key — it won't be shown again</CardTitle>
        <CardDescription>Use it as the gateway password for "{{ newKey.name }}".</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-1">
          <code
            class="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 font-mono text-xs"
            >{{ newKey.token }}</code
          >
          <Button
            variant="outline"
            size="icon"
            class="size-8"
            @click="copy(newKey.token, 'API key')"
          >
            <Icon icon="lucide:copy" class="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Gateway API keys</CardTitle>
        <CardDescription>
          Per-team credentials used as the gateway password. Revoke anytime — usage &amp; bandwidth
          are attributed per key.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Used (mo)</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="keys.length === 0">
              <TableCell colspan="6" class="py-10 text-center text-muted-foreground">
                No API keys yet. Create one to connect to the gateway.
              </TableCell>
            </TableRow>
            <TableRow v-for="k in keys" :key="k.id" :class="k.revokedAt ? 'opacity-50' : ''">
              <TableCell class="font-medium">{{ k.name }}</TableCell>
              <TableCell class="font-mono text-xs">{{ k.tokenPrefix }}…</TableCell>
              <TableCell class="text-xs">
                {{ fmtBytes(k.bytesThisMonth) }}
                <span class="text-muted-foreground">
                  / {{ k.monthlyQuotaBytes ? fmtBytes(k.monthlyQuotaBytes) : '∞' }}
                </span>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ fmt(k.lastUsedAt) }}</TableCell>
              <TableCell>
                <Badge :variant="k.revokedAt ? 'secondary' : 'default'">
                  {{ k.revokedAt ? 'Revoked' : 'Active' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <template v-if="!k.revokedAt">
                  <Button variant="ghost" size="sm" @click="openQuota(k)">Quota</Button>
                  <Button variant="ghost" size="sm" class="text-red-600" @click="revoke(k)">
                    Revoke
                  </Button>
                </template>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create dialog -->
    <Dialog v-model:open="showCreate">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
          <DialogDescription>Give it a name so you can recognise it later.</DialogDescription>
        </DialogHeader>
        <div class="grid gap-3 py-2">
          <div class="grid gap-1.5">
            <Label for="key-name">Name</Label>
            <Input
              id="key-name"
              v-model="form.name"
              placeholder="e.g. scraper-prod"
              @keyup.enter="submit"
            />
            <p v-if="form.errors.name" class="text-xs text-red-600">{{ form.errors.name }}</p>
          </div>
          <div class="grid gap-1.5">
            <Label for="key-quota">Monthly quota (MB, empty = unlimited)</Label>
            <Input
              id="key-quota"
              v-model="createQuotaInput"
              type="number"
              min="0"
              placeholder="unlimited"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreate = false">Cancel</Button>
          <Button :disabled="form.processing || !form.name" @click="submit">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Per-key quota dialog -->
    <Dialog :open="!!quotaKey" @update:open="(v: boolean) => !v && (quotaKey = null)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quota · {{ quotaKey?.name }}</DialogTitle>
          <DialogDescription>Monthly bandwidth limit for this key.</DialogDescription>
        </DialogHeader>
        <div class="grid gap-1.5 py-2">
          <Label>Monthly quota (MB, empty = unlimited)</Label>
          <Input v-model="editQuotaInput" type="number" min="0" placeholder="unlimited" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="quotaKey = null">Cancel</Button>
          <Button :disabled="quotaForm.processing" @click="saveKeyQuota">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
