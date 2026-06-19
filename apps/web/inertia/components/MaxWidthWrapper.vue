<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <section
    :class="cn('h-full mx-auto w-full max-w-full md:max-w-7xl px-4 md:px-12 lg:px-20', props.class)"
  >
    <slot />
  </section>
</template>

<style scoped></style>
