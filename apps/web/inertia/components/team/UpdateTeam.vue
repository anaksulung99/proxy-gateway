<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'

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
  user?: UserWithRole | null
}>()

const open = ref(false)
const form = useForm({
  fullName: props.user?.fullName || '',
  email: props.user?.email || '',
  role: props.user?.role.name || 'user',
})

function submit() {
  if (!form.fullName) return
  form.patch(`/app/teams/${props.user?.id}`, {
    preserveScroll: true,
    onSuccess: () => {
      form.reset('fullName', 'email', 'role')
    },
  })
  open.value = false
}

const roleOptions = [
  { label: 'User', value: 'user' },
  { label: 'Admin', value: 'admin' },
]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <AppTooltip content="Update Team" side="bottom">
        <Button
          type="button"
          size="icon-sm"
          class="bg-blue-600 dark:bg-blue-500 text-white"
          @click="open = true"
        >
          <Icon icon="lucide:pen" />
        </Button>
      </AppTooltip>
    </DialogTrigger>
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle> Update Team</DialogTitle>
        <DialogDescription> Update a team information. </DialogDescription>
      </DialogHeader>
      <div class="grid gap-3 py-1">
        <div class="grid gap-1.5">
          <Label class="text-xs">Full Name</Label>
          <Input
            v-model="form.fullName"
            type="text"
            name="fullName"
            class="font-mono text-xs"
            placeholder="Full Name"
          />
          <p v-if="form.errors.fullName" class="text-xs text-red-600">{{ form.errors.fullName }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Email</Label>
          <Input
            v-model="form.email"
            type="text"
            name="email"
            class="font-mono text-xs"
            placeholder="Email"
          />
          <p v-if="form.errors.email" class="text-xs text-red-600">{{ form.errors.email }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Role</Label>
          <Select v-model="form.role">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem v-for="item in roleOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="form.processing || !form.fullName" @click="submit"> Update </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped></style>
