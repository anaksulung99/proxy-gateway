<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import { MailCheck } from '@lucide/vue'
</script>

<template>
  <Head title="Verify email" />
  <Auth>
    <div class="flex flex-col gap-6 text-center">
      <div class="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
        <MailCheck class="size-6" />
      </div>
      <div class="space-y-2">
        <h1 class="text-2xl font-bold">Check your email</h1>
        <p class="text-muted-foreground text-sm text-balance">
          We sent you a verification link. Open it to activate your account. The link expires in 24
          hours.
        </p>
      </div>
      <Form v-slot="{ processing }" :action="{ url: '/verify-email/resend', method: 'post' }">
        <Button variant="outline" class="w-full" type="submit" :disabled="processing">
          <Spinner v-if="processing" />
          {{ processing ? 'Sending...' : 'Resend verification email' }}
        </Button>
      </Form>
      <Form route="session.destroy">
        <Button variant="link" type="submit">Log out and use another account</Button>
      </Form>
    </div>
  </Auth>
</template>
