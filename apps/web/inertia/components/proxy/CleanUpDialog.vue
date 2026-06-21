<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'
import { useGlobalAlert } from '~/composables/useAlert'

const props = defineProps<{ listId: number }>()
const { warning } = useGlobalAlert()

const openDialog = ref(false)
const form = useForm({
  listId: props.listId,
  status: 'unknown',
})

function submit() {
  if (!form.listId) return
  warning('Clean up list', 'Are you sure you want to clean up this list?').then((result) => {
    if (!result) return

    form.delete('/app/proxy-entries/bulk/delete', {
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
    label: 'Delete unhealthy lists',
    value: 'unhealthy',
  },
  {
    label: 'Delete timeout lists',
    value: 'timeout',
  },
  {
    label: 'Delete unchecked lists',
    value: 'unknown',
  },
]
</script>

<template>
  <Dialog v-model:open="openDialog">
    <DialogTrigger as-child>
      <AppTooltip content="Clean up proxy list" side="bottom">
        <Button size="sm" variant="destructive" @click="openDialog = true">
          <Icon icon="hugeicons:clean" class="size-4" />
          <span class="hidden md:block">Clean Up</span>
        </Button>
      </AppTooltip>
    </DialogTrigger>
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle> Clean up Proxy List</DialogTitle>
        <DialogDescription>
          Clean up all entries with the selected status in this list.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-3 py-1">
        <Input v-model.number="form.listId" type="hidden" name="listId" />
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
        <Button :disabled="form.processing || !form.listId" @click="submit"> Delete list </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped></style>
