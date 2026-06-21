<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  title: string
  description: string
  sourcePath: string
  content: string
}>()
</script>

<template>
  <Head :title="props.title" />
  <AppShell :title="props.title" :description="props.description">
    <template #actions>
      <div class="flex items-center gap-2">
        <Button variant="outline" as-child>
          <Link href="/app">
            <Icon icon="lucide:layout-dashboard" class="size-4" /> Dashboard
          </Link>
        </Button>
        <Button variant="outline" as-child>
          <Link href="/app/analytics?trafficType=tunnel&tunnelPhase=issues">
            <Icon icon="lucide:chart-column-big" class="size-4" /> Tunnel Analytics
          </Link>
        </Button>
      </div>
    </template>

    <div class="space-y-6">
      <div
        class="rounded-3xl border border-border/70 bg-linear-to-br from-indigo-500/10 via-background to-cyan-500/10 p-6 dark:from-indigo-700/30 dark:via-background dark:to-cyan-700/30"
      >
        <div class="max-w-4xl">
          <p class="text-xs uppercase tracking-[0.28em] text-muted-foreground">Internal SOP</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight">{{ props.title }}</h1>
          <p class="mt-3 text-sm text-muted-foreground">
            {{ props.description }}
          </p>
          <p class="mt-3 text-xs text-muted-foreground">
            Source file: {{ props.sourcePath }}
          </p>
        </div>
      </div>

      <Card class="border-border/70">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>
            Jalur cepat untuk verifikasi tunnel issue dan runtime observability.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button variant="outline" as-child>
            <Link href="/app/analytics?trafficType=tunnel">CONNECT only</Link>
          </Button>
          <Button variant="outline" as-child>
            <Link href="/app/analytics?trafficType=tunnel&tunnelPhase=issues">
              Tunnel issues
            </Link>
          </Button>
          <Button variant="outline" as-child>
            <Link href="/app/runtime/quarantine">Runtime quarantine</Link>
          </Button>
        </CardContent>
      </Card>

      <Card class="border-border/70">
        <CardHeader>
          <CardTitle>Guide Content</CardTitle>
          <CardDescription>
            Konten di bawah diambil langsung dari file markdown internal project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            class="overflow-x-auto rounded-2xl border bg-card/70 p-4 text-sm leading-6 whitespace-pre-wrap break-words"
          ><code>{{ props.content }}</code></pre>
        </CardContent>
      </Card>
    </div>
  </AppShell>
</template>
