<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'

interface ListFormValues {
  name: string
  description: string | null
  isActive: boolean
}

const props = withDefaults(
  defineProps<{
    open: boolean
    mode?: 'create' | 'edit'
    listId?: number | null
    initialValues?: Partial<ListFormValues> | null
  }>(),
  {
    mode: 'create',
    listId: null,
    initialValues: null,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const title = computed(() => (props.mode === 'create' ? 'New proxy list' : 'Edit proxy list'))
const description = computed(() =>
  props.mode === 'create'
    ? 'A list groups proxies, rotation policy, and source assignments.'
    : 'Update the name, notes, and active status for this proxy list.'
)

const form = useForm({
  name: '',
  description: '',
  isActive: true,
})

function syncForm() {
  form.defaults({
    name: props.initialValues?.name ?? '',
    description: props.initialValues?.description ?? '',
    isActive: props.initialValues?.isActive ?? true,
  })
  form.reset()
  form.clearErrors()
}

watch(
  () => [props.open, props.initialValues, props.mode] as const,
  () => {
    if (props.open) syncForm()
  },
  { immediate: true }
)

function updateOpen(value: boolean) {
  emit('update:open', value)
}

function submit() {
  const options = {
    preserveScroll: true,
    onSuccess: () => updateOpen(false),
  }

  form.transform((data) => ({
    ...data,
    description: data.description.trim() ? data.description.trim() : null,
  }))

  if (props.mode === 'edit' && props.listId) {
    form.post(`/app/proxy-lists/${props.listId}/update`, options)
    return
  }

  form.post('/app/proxy-lists', options)
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <div class="grid gap-1.5">
          <Label for="proxy-list-name">Name</Label>
          <Input id="proxy-list-name" v-model="form.name" placeholder="e.g. US Residential Pool" />
          <p v-if="form.errors.name" class="text-xs text-red-600">{{ form.errors.name }}</p>
        </div>

        <div class="grid gap-1.5">
          <Label for="proxy-list-description">Description</Label>
          <Textarea
            id="proxy-list-description"
            v-model="form.description"
            rows="3"
            placeholder="Notes for your team, source usage, or targeting purpose"
          />
          <p v-if="form.errors.description" class="text-xs text-red-600">
            {{ form.errors.description }}
          </p>
        </div>

        <label class="flex items-center justify-between rounded-lg border px-3 py-3">
          <div class="space-y-1">
            <p class="text-sm font-medium">List active</p>
            <p class="text-xs text-muted-foreground">
              Inactive lists stay stored but should not be used by the gateway.
            </p>
          </div>
          <Checkbox :model-value="form.isActive" @update:model-value="(value) => (form.isActive = Boolean(value))" />
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="updateOpen(false)">Cancel</Button>
        <Button :disabled="form.processing || !form.name.trim()" @click="submit">
          {{ mode === 'create' ? 'Create list' : 'Save changes' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
