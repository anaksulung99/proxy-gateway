<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

const props = defineProps<{ listId: number }>()
const { confirm } = useGlobalAlert()

const openDialog = ref(false)
const form = useForm({
  listId: props.listId,
  status: 'unknown',
})

function submit() {
  if (!form.listId) return
  confirm('Recheck list', 'Are you sure you want to recheck this list?').then((result) => {
    if (!result) return
    form.post('/app/proxy-entries/bulk/recheck', {
      preserveScroll: true,
      onSuccess: () => {
        form.reset('status', 'listId')
      },
    })
    openDialog.value = false
  })
}

const statusOptions = [
  {
    label: 'Recheck unhealthy lists',
    value: 'unhealthy',
  },
  {
    label: 'Recheck timeout lists',
    value: 'timeout',
  },
  {
    label: 'Recheck unchecked lists',
    value: 'unknown',
  },
]
</script>

<template>
  <Dialog v-model:open="openDialog">
    <DialogTrigger as-child>
      <AppTooltip content="Recheck list" side="bottom">
        <Button
          size="sm"
          class="bg-emerald-600 hover:bg-emerald-700 text-white"
          @click="openDialog = true"
        >
          <Icon icon="material-symbols:health-and-safety-rounded" class="size-4" />
          <span class="hidden md:block">Recheck list</span>
        </Button>
      </AppTooltip>
    </DialogTrigger>
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle> Recheck list</DialogTitle>
        <DialogDescription>
          Recheck all entries with the selected status in this list.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-3 py-1">
        <div class="grid gap-1.5">
          <Label class="text-xs">List ID</Label>
          <Input
            v-model.number="form.listId"
            type="number"
            name="listId"
            class="font-mono text-xs"
            disabled
            placeholder="List ID"
          />
          <p v-if="form.errors.listId" class="text-xs text-red-600">{{ form.errors.listId }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Status</Label>
          <Select v-model="form.status">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="openDialog = false">Cancel</Button>
        <Button :disabled="form.processing || !form.listId" @click="submit"> Recheck list </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped></style>
