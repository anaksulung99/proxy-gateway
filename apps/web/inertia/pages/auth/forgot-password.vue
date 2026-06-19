<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
</script>

<template>
  <Head title="Forgot password" />
  <Auth>
    <Form
      v-slot="{ processing, errors }"
      :action="{ url: '/forgot-password', method: 'post' }"
      class="flex flex-col gap-6"
    >
      <FieldGroup>
        <div class="flex flex-col items-center gap-1 text-center">
          <h1 class="text-2xl font-bold">Forgot your password?</h1>
          <p class="text-muted-foreground text-sm text-balance">
            Enter your email and we will send you a secure reset link.
          </p>
        </div>
        <Field>
          <FieldLabel for="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
            autofocus
            :data-invalid="errors.email ? 'true' : undefined"
          />
          <FieldError v-if="errors.email">{{ errors.email }}</FieldError>
        </Field>
        <Button type="submit" :disabled="processing">
          <Spinner v-if="processing" />
          {{ processing ? 'Sending...' : 'Send reset link' }}
        </Button>
        <FieldDescription class="text-center"
          ><Link href="/login" class="underline underline-offset-4"
            >Back to login</Link
          ></FieldDescription
        >
      </FieldGroup>
    </Form>
  </Auth>
</template>
