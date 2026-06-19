<script setup lang="ts">
defineProps<{
  summary: {
    modeLabel: string
    protocolLabel: string
    cadenceLabel: string
    geoLabel: string
    exclusionsLabel: string
    description: string
  }
}>()
</script>

<template>
  <Card class="border-border/70 bg-card/80">
    <CardHeader class="space-y-2">
      <div class="flex items-center justify-between gap-3">
        <div>
          <CardTitle class="text-base">Rotation Policy</CardTitle>
          <CardDescription>{{ summary.description }}</CardDescription>
        </div>
        <Badge variant="secondary">{{ summary.protocolLabel }}</Badge>
      </div>
    </CardHeader>
    <CardContent class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Mode</p>
        <p class="mt-1 text-sm font-medium">{{ summary.modeLabel }}</p>
      </div>
      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Cadence</p>
        <p class="mt-1 text-sm font-medium">{{ summary.cadenceLabel }}</p>
      </div>
      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Geo</p>
        <p class="mt-1 text-sm font-medium">{{ summary.geoLabel }}</p>
      </div>
      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">Exclusions</p>
        <p class="mt-1 text-sm font-medium">{{ summary.exclusionsLabel }}</p>
      </div>
    </CardContent>
  </Card>
</template>
