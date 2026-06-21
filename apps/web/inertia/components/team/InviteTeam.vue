<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'

const open = ref(false)
const form = useForm({
  fullName: '',
  email: '',
  password: '',
  role: 'user',
})

function submit() {
  if (!form.fullName) return
  form.post('/app/teams', {
    preserveScroll: true,
    onSuccess: () => {
      form.reset('fullName', 'email', 'password', 'role')
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
      <AppTooltip content="Invite Team" side="bottom">
        <Button @click="open = true">
          <Icon icon="lucide:plus" class="size-4" />
          Invite Team
        </Button>
      </AppTooltip>
    </DialogTrigger>
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle> Invite Team</DialogTitle>
        <DialogDescription> Invite a team member. </DialogDescription>
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
          <Label class="text-xs">Password</Label>
          <Input
            v-model="form.password"
            type="password"
            name="password"
            class="font-mono text-xs"
            placeholder="Password"
          />
          <p v-if="form.errors.password" class="text-xs text-red-600">{{ form.errors.password }}</p>
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
        <Button :disabled="form.processing || !form.fullName" @click="submit"> Invite Team </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped></style>
