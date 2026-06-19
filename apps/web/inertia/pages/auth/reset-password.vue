<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'

defineProps<{ token: string; email: string }>()
</script>

<template>
  <Head title="Reset password" />
  <Auth>
    <Form
      v-slot="{ processing, errors }"
      :action="{ url: '/reset-password', method: 'post' }"
      class="flex flex-col gap-6"
    >
      <input type="hidden" name="token" :value="token" />
      <FieldGroup>
        <div class="flex flex-col items-center gap-1 text-center">
          <h1 class="text-2xl font-bold">Choose a new password</h1>
          <p class="text-muted-foreground text-sm">Resetting password for {{ email }}</p>
        </div>
        <Field>
          <FieldLabel for="password">New password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            autofocus
            :data-invalid="errors.password ? 'true' : undefined"
          />
          <FieldError v-if="errors.password">{{ errors.password }}</FieldError>
        </Field>
        <Field>
          <FieldLabel for="passwordConfirmation">Confirm new password</FieldLabel>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            :data-invalid="errors.passwordConfirmation ? 'true' : undefined"
          />
          <FieldError v-if="errors.passwordConfirmation">{{
            errors.passwordConfirmation
          }}</FieldError>
        </Field>
        <Button type="submit" :disabled="processing"
          ><Spinner v-if="processing" />{{ processing ? 'Updating...' : 'Reset password' }}</Button
        >
      </FieldGroup>
    </Form>
  </Auth>
</template>
