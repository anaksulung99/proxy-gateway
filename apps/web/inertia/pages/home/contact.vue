<script setup lang="ts">
import { ref } from 'vue'
import { useTrans } from '~/composables/useTrans'
import { Icon } from '@iconify/vue'
import { toast } from 'vue-sonner'

const { t } = useTrans()

const name = ref('')
const email = ref('')
const message = ref('')
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const getCookie = (cookieName: string) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${cookieName}=`)
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift()!)
  return null
}

const submitForm = async () => {
  loading.value = true
  errors.value = {}

  // Local Validation
  if (!name.value || name.value.trim().length < 2) {
    errors.value.name = 'Name must be at least 2 characters'
  }
  if (!email.value || !email.value.includes('@')) {
    errors.value.email = 'Please enter a valid email address'
  }
  if (!message.value || message.value.trim().length < 2) {
    errors.value.message = 'Message must be at least 2 characters'
  }

  if (Object.keys(errors.value).length > 0) {
    loading.value = false
    return
  }

  try {
    const xsrfToken = getCookie('XSRF-TOKEN')

    const response = await fetch('/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(xsrfToken ? { 'x-xsrf-token': xsrfToken } : {}),
      },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value,
      }),
    })

    if (response.status === 201) {
      toast.success(t('contact.success_msg'))
      name.value = ''
      email.value = ''
      message.value = ''
    } else {
      const data = await response.json()
      if (data.errors) {
        data.errors.forEach((err: any) => {
          if (err.field) {
            errors.value[err.field] = err.message
          }
        })
      }
      toast.error(t('contact.error_msg'))
    }
  } catch (err) {
    toast.error(t('contact.error_msg'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <LandingLayout>
    <!-- Header -->
    <section class="relative pt-16 pb-12 md:pt-24 md:pb-16 text-center overflow-hidden">
      <div
        class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 rounded-full bg-sky-500/5 blur-[100px] pointer-events-none"
      ></div>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative space-y-4">
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span class="bg-linear-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
            {{ t('contact.title') }}
          </span>
        </h1>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {{ t('contact.subtitle') }}
        </p>
      </div>
    </section>

    <!-- Main Grid -->
    <section class="pb-24">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Contact Info -->
          <div class="lg:col-span-1 space-y-6">
            <div class="border border-border bg-card p-6 rounded-2xl space-y-6">
              <h3 class="text-lg font-bold text-foreground">{{ t('contact.info_title') }}</h3>

              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div
                    class="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Icon icon="lucide:mail" class="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      class="block text-xs text-muted-foreground uppercase font-semibold tracking-wider"
                      >{{ t('contact.info_email') }}</span
                    >
                    <a
                      href="mailto:support@smartboostlabs.com"
                      class="text-sm font-medium text-foreground hover:text-sky-600 transition-colors"
                      >support@smartboostlabs.com</a
                    >
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Icon icon="lucide:clock" class="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      class="block text-xs text-muted-foreground uppercase font-semibold tracking-wider"
                      >{{ t('contact.info_hours') }}</span
                    >
                    <span class="text-sm text-foreground">24/7/365</span>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Icon icon="lucide:message-square" class="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      class="block text-xs text-muted-foreground uppercase font-semibold tracking-wider"
                      >Live Chat</span
                    >
                    <span class="text-sm text-foreground">Available inside user dashboard</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="border border-border bg-linear-to-tr from-sky-600 to-indigo-600 text-white p-6 rounded-2xl space-y-4"
            >
              <h4 class="font-bold text-lg">Need custom enterprise quotas?</h4>
              <p class="text-xs leading-relaxed text-white/80">
                Contact our enterprise team to configure private proxy carrier pools, custom
                bandwidth plans, and dedicated IP routing.
              </p>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="lg:col-span-2">
            <div
              class="border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-10 rounded-3xl shadow-sm"
            >
              <form class="space-y-6" @submit.prevent="submitForm">
                <!-- Name -->
                <div class="space-y-2">
                  <label for="name" class="text-sm font-semibold text-foreground">
                    {{ t('contact.form_name') }}
                  </label>
                  <Input
                    id="name"
                    v-model="name"
                    type="text"
                    placeholder="John Doe"
                    class="h-11 border-border rounded-xl focus-visible:ring-sky-500"
                    :class="{ 'border-destructive focus-visible:ring-destructive': errors.name }"
                  />
                  <p v-if="errors.name" class="text-xs text-destructive mt-1">{{ errors.name }}</p>
                </div>

                <!-- Email -->
                <div class="space-y-2">
                  <label for="email" class="text-sm font-semibold text-foreground">
                    {{ t('contact.form_email') }}
                  </label>
                  <Input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="john@example.com"
                    class="h-11 border-border rounded-xl focus-visible:ring-sky-500"
                    :class="{ 'border-destructive focus-visible:ring-destructive': errors.email }"
                  />
                  <p v-if="errors.email" class="text-xs text-destructive mt-1">
                    {{ errors.email }}
                  </p>
                </div>

                <!-- Message -->
                <div class="space-y-2">
                  <label for="message" class="text-sm font-semibold text-foreground">
                    {{ t('contact.form_message') }}
                  </label>
                  <Textarea
                    id="message"
                    v-model="message"
                    rows="5"
                    placeholder="Tell us about your project or requests..."
                    class="border-border rounded-xl focus-visible:ring-sky-500"
                    :class="{ 'border-destructive focus-visible:ring-destructive': errors.message }"
                  />
                  <p v-if="errors.message" class="text-xs text-destructive mt-1">
                    {{ errors.message }}
                  </p>
                </div>

                <!-- Submit -->
                <div>
                  <Button
                    type="submit"
                    size="lg"
                    :disabled="loading"
                    class="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-bold px-8 py-6 rounded-xl transition-all shadow-md shadow-sky-500/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Icon v-if="loading" icon="lucide:loader-2" class="h-5 w-5 animate-spin" />
                    {{ t('contact.form_submit') }}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
