<script lang="ts" setup>
import { Head, useForm } from '@inertiajs/vue3'
import { useGlobalAlert } from '~/composables/useAlert'
import { useAuthStore } from '~/stores/auth'

const { confirm } = useGlobalAlert()
const auth = useAuthStore()

const profileForm = useForm({
  fullName: auth.user?.fullName || '',
  email: auth.user?.email || '',
})
const passwordForm = useForm({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const submitProfile = () => {
  profileForm.patch('/app/profile/update', {
    preserveScroll: true,
    onSuccess: () => {
      profileForm.reset('email', 'fullName')
    },
  })
}

const submitPassword = () => {
  confirm('', 'Are you sure you want to update your password?').then((val) => {
    if (val) {
      passwordForm.patch('/app/profile/password', {
        preserveScroll: true,
        onSuccess: () => {
          passwordForm.reset('currentPassword', 'newPassword', 'confirmPassword')
        },
      })
    }
  })
}
</script>

<template>
  <Head title="Profile" />
  <AppShell title="Profile">
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="grid gap-2">
              <Label for="fullName">Full Name</Label>
              <Input
                id="fullName"
                v-model="profileForm.fullName"
                name="fullName"
                required
                placeholder="Enter your full name"
                :disabled="profileForm.processing"
              />
              <p v-if="profileForm.errors.fullName" class="text-xs text-red-600">
                {{ profileForm.errors.fullName }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="profileForm.email"
                name="email"
                required
                placeholder="Enter your email"
                :disabled="profileForm.processing"
              />
              <p v-if="profileForm.errors.email" class="text-xs text-red-600">
                {{ profileForm.errors.email }}
              </p>
            </div>
            <div class="flex items-center justify-end">
              <Button type="submit" :disabled="profileForm.processing" @click="submitProfile">
                <Spinner v-if="profileForm.processing" />
                {{ profileForm.processing ? 'Saving...' : 'Save Update' }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account settings and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="grid gap-2">
              <Label for="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                type="password"
                name="currentPassword"
                required
                placeholder="Enter your current password"
                :disabled="passwordForm.processing"
              />
              <p v-if="passwordForm.errors.currentPassword" class="text-xs text-red-600">
                {{ passwordForm.errors.currentPassword }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="newPassword">New Password</Label>
              <Input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                name="newPassword"
                required
                placeholder="Enter your new password"
                :disabled="passwordForm.processing"
              />
              <p v-if="passwordForm.errors.newPassword" class="text-xs text-red-600">
                {{ passwordForm.errors.newPassword }}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                name="confirmPassword"
                required
                placeholder="Enter your confirm password"
                :disabled="passwordForm.processing"
              />
              <p v-if="passwordForm.errors.confirmPassword" class="text-xs text-red-600">
                {{ passwordForm.errors.confirmPassword }}
              </p>
            </div>
            <div class="flex items-center justify-end">
              <Button type="submit" :disabled="passwordForm.processing" @click="submitPassword">
                <Spinner v-if="passwordForm.processing" />
                {{ passwordForm.processing ? 'Saving...' : 'Change Password' }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>

<style scoped></style>
