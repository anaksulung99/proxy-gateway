<script lang="ts" setup>
import { computed, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

interface UserWithRole {
  id: number
  fullName: string
  email: string
  roleId: string
  createdAt: string
  updatedAt: string
  isAdmin: boolean
  role: {
    id: number
    name: string
    level: number
  }
  currentTeam: {
    id: number
    owner_id: string
    name: string
  }
}
const props = defineProps<{
  users: {
    data: Array<UserWithRole>
    meta: {
      total: number
      currentPage: number
      lastPage: number
      perPage: number
    }
  }
  search: string
  roleName: string
}>()

const { warning } = useGlobalAlert()

const filters = reactive({
  search: props.search ?? '',
  roleName: 'all',
})
const selected = ref<Set<number>>(new Set())
const allOnPageSelected = computed(
  () => props.users.data.length > 0 && props.users.data.every((row) => selected.value.has(row.id))
)
const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (allOnPageSelected.value) return true
  return props.users.data.some((row) => selected.value.has(row.id)) ? 'indeterminate' : false
})

function buildQuery(extra: Record<string, string | number> = {}) {
  const query: Record<string, string | number | undefined> = {
    search: filters.search.trim() !== '' ? filters.search : undefined,
    role: filters.roleName !== 'all' ? filters.roleName : undefined,
    perPage: props.users.meta.perPage,
  }
  return { ...query, ...extra }
}

function applyFilters() {
  router.get(
    '/app/teams',
    buildQuery({ page: props.users.meta.currentPage, perPage: props.users.meta.perPage }),
    {
      preserveScroll: true,
      preserveState: true,
    }
  )
}
function goPage(page: number) {
  router.get('/app/teams', buildQuery({ page }), { preserveScroll: true, preserveState: true })
}

function changeLimit(value: unknown) {
  router.get('/app/teams', buildQuery({ page: 1, perPage: Number(value) }), {
    preserveScroll: true,
    preserveState: true,
  })
}

const firstRow = computed(() =>
  props.users.meta.total === 0
    ? 0
    : (props.users.meta.currentPage - 1) * props.users.meta.perPage + 1
)
const lastRow = computed(() =>
  Math.min(props.users.meta.currentPage * props.users.meta.perPage, props.users.meta.total)
)

const hasFilter = computed(() => filters.search.trim() !== '' || filters.roleName !== 'all')

function toggleAll(value: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  for (const row of props.users.data) {
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

function deleteOne(id?: number) {
  if (!id) return
  warning('', `Are you sure you want to delete team ${id}?`).then((confirm) => {
    if (!confirm) return
    router.delete(`/app/teams/${id}/delete`, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        selected.value = new Set()
        applyFilters()
      },
    })
  })
}

function destroySelected() {
  const ids = [...selected.value]
  if (ids.length === 0) return
  warning('Warning!', `Are you sure you want to delete ${ids.length} selected teams?`).then(
    (confirm) => {
      if (!confirm) return
      router.delete('/app/teams/bulk', {
        data: { ids },
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          selected.value = new Set()
          applyFilters()
        },
      })
    }
  )
}

function resetFilters() {
  filters.search = ''
  filters.roleName = 'all'
  applyFilters()
}
function fmtDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}
</script>

<template>
  <Head title="Teams" description="Manage your teams" />
  <AppShell title="Teams" description="Manage your teams">
    <template #actions>
      <div class="flex items-center gap-2">
        <InviteTeam />
      </div>
    </template>
    <Card class="border-border/70">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription> Filter teams by name or role. </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div class="grid gap-1">
            <Label class="text-xs">Search</Label>
            <Input v-model="filters.search" placeholder="Search teams" class="w-full" />
          </div>
          <div class="grid gap-1">
            <Label class="text-xs">Role</Label>
            <Select v-model="filters.roleName">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent class="w-full">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <Button @click="applyFilters">
            <Icon icon="lucide:filter" class="size-4" /> Apply
          </Button>
          <Button v-if="hasFilter" variant="destructive" @click="resetFilters">
            <Icon icon="lucide:x" class="size-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="border-border/70">
      <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Teams ({{ props.users.meta.total }})</CardTitle>
          <CardDescription>List of your teams, including user and admin teams.</CardDescription>
        </div>
        <Button v-if="selected.size > 0" variant="destructive" size="sm" @click="destroySelected">
          <Icon icon="lucide:trash-2" class="size-4" />
          Delete selected ({{ selected.size }})
        </Button>
      </CardHeader>
      <CardContent class="p-4">
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="props.users.data.length === 0">
              <TableCell colspan="9" class="py-10 text-center text-muted-foreground">
                No teams match the current filters.
              </TableCell>
            </TableRow>
            <TableRow v-for="row in props.users.data" :key="row.id">
              <TableCell class="w-10">
                <Checkbox
                  :model-value="selected.has(row.id)"
                  class="border border-emerald-500/50"
                  @update:model-value="toggleOne(row.id, $event)"
                />
              </TableCell>
              <TableCell>{{ row.fullName }}</TableCell>
              <TableCell>{{ row.email }}</TableCell>
              <TableCell class="uppercase">{{ row.role.name }}</TableCell>
              <TableCell>{{ fmtDate(row.createdAt) }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <UpdateTeam :user="row" />
                  <Button size="icon-sm" variant="destructive" @click="deleteOne(row.id)">
                    <Icon icon="material-symbols:delete-forever-outline" />
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
        <Select :model-value="String(props.users.meta.perPage)" @update:model-value="changeLimit">
          <SelectTrigger class="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>{{ firstRow }}-{{ lastRow }} of {{ props.users.meta.total }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span>Page {{ props.users.meta.currentPage }} of {{ props.users.meta.lastPage }}</span>
        <Button
          variant="outline"
          size="sm"
          :disabled="props.users.meta.currentPage <= 1"
          @click="goPage(props.users.meta.currentPage - 1)"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="props.users.meta.currentPage >= props.users.meta.lastPage"
          @click="goPage(props.users.meta.currentPage + 1)"
        >
          Next
        </Button>
      </div>
    </div>
  </AppShell>
</template>

<style scoped></style>
