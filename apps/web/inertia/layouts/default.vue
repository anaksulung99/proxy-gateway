<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { toast, Toaster } from 'vue-sonner'
import type { Data } from '@generated/data'

const page = usePage<Data.SharedProps>()

watch(
  () => page.url,
  () => toast.dismiss()
)

watch(
  () => page.props.flash,
  (flashMessages) => {
    if (flashMessages?.error) {
      toast.error(flashMessages.error)
    }
    if (flashMessages?.success) {
      toast.success(flashMessages.success)
    }
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <slot />
  <Toaster position="top-center" rich-colors />
</template>
