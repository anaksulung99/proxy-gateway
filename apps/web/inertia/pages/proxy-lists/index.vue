<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

interface ListRow {
  id: number
  name: string
  description: string | null
  isActive: boolean
  entriesCount: number
  healthyCount: number
  rotationConfig: { rotationType: string; protocol: string } | null
  rotationSummary: {
    modeLabel: string
    protocolLabel: string
    cadenceLabel: string
    geoLabel: string
    exclusionsLabel: string
    description: string
  }
}

const props = defineProps<{ lists: ListRow[] }>()

const showCreate = ref(false)
const editingRow = ref<ListRow | null>(null)

function destroy(row: ListRow) {
  if (!confirm(`Delete list "${row.name}" and all its proxies?`)) return
  router.delete(`/app/proxy-lists/${row.id}`)
}

const totalEntries = computed(() => props.lists.reduce((sum, row) => sum + row.entriesCount, 0))
const totalHealthy = computed(() => props.lists.reduce((sum, row) => sum + row.healthyCount, 0))
const activeLists = computed(() => props.lists.filter((row) => row.isActive).length)
const healthyRate = computed(() =>
  totalEntries.value > 0 ? Math.round((totalHealthy.value / totalEntries.value) * 100) : 0
)

function openEdit(row: ListRow) {
  editingRow.value = row
}

function closeEdit() {
  editingRow.value = null
}
</script>

<template>
  <Head title="Proxy Lists" />
  <AppShell
    title="Proxy Lists"
    description="Kelola daftar proxy berdasarkan pool, kebijakan rotasi, dan health status."
  >
    <template #actions>
      <div class="flex gap-2 justify-end">
        <AppTooltip content="Create new list" side="bottom">
          <Button size="sm" @click="showCreate = true">
            <Icon icon="lucide:plus" class="mr-1 size-4" />
            <span>New list</span>
          </Button>
        </AppTooltip>
      </div>
    </template>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Total Lists</CardDescription>
          <CardTitle class="text-2xl">{{ lists.length }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Active Lists</CardDescription>
          <CardTitle class="text-2xl">{{ activeLists }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Total Proxies</CardDescription>
          <CardTitle class="text-2xl">{{ totalEntries }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Healthy Ratio</CardDescription>
          <CardTitle class="text-2xl text-emerald-600">{{ healthyRate }}%</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <Card class="border-border/70">
      <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pool Directory</CardTitle>
          <CardDescription>
            Kelola daftar proxy berdasarkan pool, kebijakan rotasi, dan health status.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Rotation Policy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="lists.length === 0">
              <TableCell colspan="5" class="py-12 text-center text-muted-foreground">
                No proxy lists yet. Create one to start importing your own pools.
              </TableCell>
            </TableRow>
            <TableRow v-for="row in lists" :key="row.id" class="align-top">
              <TableCell class="space-y-2">
                <div class="flex items-center gap-2">
                  <Link :href="`/app/proxy-lists/${row.id}`" class="font-medium hover:underline">
                    {{ row.name }}
                  </Link>
                  <Badge :variant="row.isActive ? 'default' : 'secondary'">
                    {{ row.isActive ? 'Active' : 'Inactive' }}
                  </Badge>
                </div>
                <p v-if="row.description" class="max-w-xl text-xs text-muted-foreground">
                  {{ row.description }}
                </p>
              </TableCell>

              <TableCell>
                <div class="space-y-1 text-sm">
                  <p>
                    <span class="font-medium">{{ row.entriesCount }}</span> total proxies
                  </p>
                  <p class="text-emerald-600">
                    <span class="font-medium">{{ row.healthyCount }}</span> healthy entries
                  </p>
                </div>
              </TableCell>

              <TableCell>
                <div class="space-y-1 text-sm">
                  <p class="font-medium">{{ row.rotationSummary.modeLabel }}</p>
                  <p class="text-muted-foreground">{{ row.rotationSummary.cadenceLabel }}</p>
                  <div class="flex flex-wrap gap-1 pt-1">
                    <Badge variant="outline">{{ row.rotationSummary.protocolLabel }}</Badge>
                    <Badge variant="outline">{{ row.rotationSummary.geoLabel }}</Badge>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <p class="text-sm text-muted-foreground">
                  {{ row.rotationSummary.exclusionsLabel }}
                </p>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" as-child>
                    <Link :href="`/app/proxy-lists/${row.id}`">Open</Link>
                  </Button>
                  <Button variant="ghost" size="sm" @click="openEdit(row)">
                    <Icon icon="lucide:pencil-line" class="size-4" />
                  </Button>
                  <Button variant="ghost" size="sm" class="text-red-600" @click="destroy(row)">
                    <Icon icon="lucide:trash-2" class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <ProxyListFormDialog v-model:open="showCreate" />
    <ProxyListFormDialog
      v-if="editingRow"
      :open="Boolean(editingRow)"
      mode="edit"
      :list-id="editingRow.id"
      :initial-values="editingRow"
      @update:open="(value) => (!value ? closeEdit() : null)"
    />
  </AppShell>
</template>
