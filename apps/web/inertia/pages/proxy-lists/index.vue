<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

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

interface PaginatedLists {
  data: ListRow[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

interface ListStats {
  totalLists: number
  activeLists: number
  totalEntries: number
  healthyEntries: number
}

const props = defineProps<{ lists: PaginatedLists; stats: ListStats }>()

const { warning } = useGlobalAlert()

const showCreate = ref(false)
const editingRow = ref<ListRow | null>(null)
const selected = ref<Set<number>>(new Set())

const allOnPageSelected = computed(
  () => props.lists.data.length > 0 && props.lists.data.every((row) => selected.value.has(row.id))
)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (allOnPageSelected.value) return true
  return props.lists.data.some((row) => selected.value.has(row.id)) ? 'indeterminate' : false
})

function toggleAll(value: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  for (const row of props.lists.data) {
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
  warning('Warning!', `Delete ${ids.length} selected lists and all their proxies?`).then(
    (confirm) => {
      if (!confirm) return
      router.delete('/app/proxy-lists/bulk', {
        data: { ids },
        preserveScroll: true,
        onSuccess: () => {
          selected.value = new Set()
        },
      })
    }
  )
}

function destroy(row: ListRow) {
  warning('Warning!', `Delete list "${row.name}" and all its proxies?`).then((confirm) => {
    if (!confirm) return
    router.delete(`/app/proxy-lists/${row.id}`)
  })
}

const healthyRate = computed(() =>
  props.stats.totalEntries > 0
    ? Math.round((props.stats.healthyEntries / props.stats.totalEntries) * 100)
    : 0
)

const firstRow = computed(() =>
  props.lists.meta.total === 0
    ? 0
    : (props.lists.meta.currentPage - 1) * props.lists.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.lists.meta.currentPage * props.lists.meta.perPage, props.lists.meta.total)
)

function loadPage(page: number, perPage = props.lists.meta.perPage) {
  router.get(
    '/app/proxy-lists',
    {
      page,
      perPage,
    },
    {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        selected.value = new Set()
      },
    }
  )
}

function changeLimit(value: unknown) {
  const perPage = Number(value)
  loadPage(1, perPage)
}

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
            <Icon icon="lucide:plus" class="size-4" />
            <span>New list</span>
          </Button>
        </AppTooltip>
      </div>
    </template>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Total Lists</CardDescription>
          <CardTitle class="text-2xl">{{ stats.totalLists }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Active Lists</CardDescription>
          <CardTitle class="text-2xl">{{ stats.activeLists }}</CardTitle>
        </CardHeader>
      </Card>
      <Card class="border-border/70">
        <CardHeader class="pb-2">
          <CardDescription>Total Proxies</CardDescription>
          <CardTitle class="text-2xl">{{ stats.totalEntries }}</CardTitle>
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
        <Button v-if="selected.size > 0" variant="destructive" size="sm" @click="destroySelected">
          <Icon icon="lucide:trash-2" class="mr-1 size-4" />
          Delete selected ({{ selected.size }})
        </Button>
      </CardHeader>
      <CardContent class="py-0 px-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox :model-value="selectAllState" @update:model-value="toggleAll" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Rotation Policy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="lists.data.length === 0">
              <TableCell colspan="6" class="py-12 text-center text-muted-foreground">
                No proxy lists yet. Create one to start importing your own pools.
              </TableCell>
            </TableRow>
            <TableRow v-for="row in lists.data" :key="row.id" class="align-top">
              <TableCell>
                <Checkbox
                  :model-value="selected.has(row.id)"
                  @update:model-value="(value) => toggleOne(row.id, value)"
                />
              </TableCell>
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
                  <Button
                    class="bg-emerald-600 dark:bg-emerald-500 text-white"
                    size="icon-sm"
                    as-child
                  >
                    <Link :href="`/app/proxy-lists/${row.id}`">
                      <Icon icon="lucide:eye" class="size-4" />
                    </Link>
                  </Button>
                  <Button
                    class="bg-blue-600 dark:bg-blue-500 text-white"
                    size="icon-sm"
                    @click="openEdit(row)"
                  >
                    <Icon icon="lucide:pencil-line" class="size-4" />
                  </Button>
                  <Button variant="destructive" size="icon-sm" @click="destroy(row)">
                    <Icon icon="lucide:trash-2" class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <div
      class="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2">
        <span>Rows per page</span>
        <Select :model-value="String(lists.meta.perPage)" @update:model-value="changeLimit">
          <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>{{ firstRow }}-{{ lastRow }} of {{ lists.meta.total }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span>Page {{ lists.meta.currentPage }} of {{ lists.meta.lastPage }}</span>
        <Button
          variant="outline"
          size="sm"
          :disabled="lists.meta.currentPage <= 1"
          @click="loadPage(lists.meta.currentPage - 1)"
        >
          <Icon icon="lucide:chevron-left" class="mr-1 size-4" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="lists.meta.currentPage >= lists.meta.lastPage"
          @click="loadPage(lists.meta.currentPage + 1)"
        >
          Next <Icon icon="lucide:chevron-right" class="ml-1 size-4" />
        </Button>
      </div>
    </div>

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
