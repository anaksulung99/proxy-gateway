<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const map: Record<string, { label: string; class: string }> = {
  healthy: { label: 'Healthy', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  unhealthy: { label: 'Unhealthy', class: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  timeout: { label: 'Timeout', class: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  unknown: { label: 'Unknown', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
}

const cfg = computed(() => map[props.status] ?? map.unknown)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="cfg.class"
  >
    {{ cfg.label }}
  </span>
</template>
