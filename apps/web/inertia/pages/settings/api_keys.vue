<script setup lang="ts">
import { ref, computed } from 'vue'
import { Head, router, useForm, usePage } from '@inertiajs/vue3'
import { toast } from 'vue-sonner'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

interface ApiKeyRow {
  id: number
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string | null
}

defineProps<{
  keys: ApiKeyRow[]
  gateway: { host: string }
}>()

const { warning } = useGlobalAlert()

const page = usePage<{ flash?: { newApiKey?: { name: string; token: string } | null } }>()
const newKey = computed(() => page.props.flash?.newApiKey ?? null)

const showCreate = ref(false)
const form = useForm({ name: '' })

function submit() {
  form.post('/app/settings/api-keys', {
    preserveScroll: true,
    onSuccess: () => {
      showCreate.value = false
      form.reset()
    },
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

function fmt(s: string | null) {
  return s ? new Date(s).toLocaleString() : '—'
}
</script>

<template>
  <Head title="API Keys" />
  <AppShell title="Settings · API Keys">
    <template #actions>
      <Button size="sm" @click="showCreate = true">
        <Icon icon="lucide:plus" class="mr-1 size-4" /> New key
      </Button>
    </template>

    <!-- Freshly created token (shown once) -->
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
          Per-team credentials. Use a key as the password in the connection string (<code
            class="font-mono"
            >list-&lt;id&gt;:&lt;key&gt;@{{ gateway.host }}</code
          >). Revoke anytime — usage is attributed per key.
        </CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
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
              <TableCell class="text-xs text-muted-foreground">{{ fmt(k.lastUsedAt) }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ fmt(k.createdAt) }}</TableCell>
              <TableCell>
                <Badge :variant="k.revokedAt ? 'secondary' : 'default'">
                  {{ k.revokedAt ? 'Revoked' : 'Active' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  v-if="!k.revokedAt"
                  variant="ghost"
                  size="sm"
                  class="text-red-600"
                  @click="revoke(k)"
                >
                  Revoke
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreate">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
          <DialogDescription>Give it a name so you can recognise it later.</DialogDescription>
        </DialogHeader>
        <div class="grid gap-1.5 py-2">
          <Label for="key-name">Name</Label>
          <Input
            id="key-name"
            v-model="form.name"
            placeholder="e.g. scraper-prod"
            @keyup.enter="submit"
          />
          <p v-if="form.errors.name" class="text-xs text-red-600">{{ form.errors.name }}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreate = false">Cancel</Button>
          <Button :disabled="form.processing || !form.name" @click="submit">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppShell>
</template>
