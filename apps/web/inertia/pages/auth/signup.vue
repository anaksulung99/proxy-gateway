<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
</script>

<template>
  <Head title="Create account" />
  <Auth>
    <Form v-slot="{ processing, errors }" route="new_account.store" class="flex flex-col gap-6">
      <FieldGroup>
        <div class="flex flex-col items-center gap-1 text-center">
          <h1 class="text-2xl font-bold">Create your account</h1>
          <p class="text-muted-foreground text-sm text-balance">
            Start managing your residential proxies securely.
          </p>
        </div>
        <Field>
          <FieldLabel for="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            autocomplete="name"
            placeholder="John Doe"
            :data-invalid="errors.fullName ? 'true' : undefined"
          />
          <FieldError v-if="errors.fullName">{{ errors.fullName }}</FieldError>
        </Field>
        <Field>
          <FieldLabel for="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
            :data-invalid="errors.email ? 'true' : undefined"
          />
          <FieldError v-if="errors.email">{{ errors.email }}</FieldError>
        </Field>
        <Field>
          <FieldLabel for="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            placeholder="Minimum 8 characters"
            minlength="8"
            required
            :data-invalid="errors.password ? 'true' : undefined"
          />
          <FieldError v-if="errors.password">{{ errors.password }}</FieldError>
        </Field>
        <Field>
          <FieldLabel for="passwordConfirmation">Confirm password</FieldLabel>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autocomplete="new-password"
            placeholder="Repeat your password"
            minlength="8"
            required
            :data-invalid="errors.passwordConfirmation ? 'true' : undefined"
          />
          <FieldError v-if="errors.passwordConfirmation">{{
            errors.passwordConfirmation
          }}</FieldError>
        </Field>
        <Button type="submit" :disabled="processing">
          <Spinner v-if="processing" />
          {{ processing ? 'Creating account...' : 'Create account' }}
        </Button>
        <FieldDescription class="text-center"
          >Already have an account?
          <Link href="/login" class="underline underline-offset-4">Log in</Link></FieldDescription
        >
      </FieldGroup>
    </Form>
  </Auth>
</template>
