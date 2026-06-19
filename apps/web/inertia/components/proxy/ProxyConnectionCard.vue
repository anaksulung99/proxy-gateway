<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { Icon } from '@iconify/vue'

interface RotationConfig {
  rotationType: string
  stickyDurationMinutes: number | null
  intervalMinutes: number | null
  geoTarget: string | null
}

const props = defineProps<{
  gateway: { host: string; secret: string; username: string }
  rotationConfig: RotationConfig | null
}>()

const mode = computed(() => props.rotationConfig?.rotationType ?? 'per_request')

const connectionUrl = computed(
  () => `http://${props.gateway.username}:${props.gateway.secret}@${props.gateway.host}`
)
const curlExample = computed(
  () => `curl -x "${connectionUrl.value}" https://api.ipify.org`
)
const stickyUsername = computed(() => `${props.gateway.username}-session-myid123`)
const countryUsername = computed(() => `${props.gateway.username}-country-us`)

const modeHint = computed(() => {
  switch (mode.value) {
    case 'sticky':
      return `Sticky mode: add "-session-<anything>" to the username to keep the same IP for ${props.rotationConfig?.stickyDurationMinutes ?? 30} minutes. Different session ids get different IPs.`
    case 'interval':
      return `Interval mode: the IP rotates automatically every ${props.rotationConfig?.intervalMinutes ?? 10} minutes — no session needed.`
    default:
      return 'Per-request mode: every request goes through a fresh IP from the pool.'
  }
})

function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Copy failed')
  )
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Connect</CardTitle>
      <CardDescription>
        Point any HTTP/HTTPS client at this gateway. Routing &amp; rotation are controlled by the
        username, exactly like BrightData / IPRoyal.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <!-- Quick fields -->
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="grid gap-1.5">
          <Label class="text-xs">Host : Port</Label>
          <div class="flex items-center gap-1">
            <code class="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{{ gateway.host }}</code>
            <Button variant="ghost" size="icon" class="size-8" @click="copy(gateway.host, 'Endpoint')">
              <Icon icon="lucide:copy" class="size-3.5" />
            </Button>
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Username</Label>
          <div class="flex items-center gap-1">
            <code class="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{{ gateway.username }}</code>
            <Button variant="ghost" size="icon" class="size-8" @click="copy(gateway.username, 'Username')">
              <Icon icon="lucide:copy" class="size-3.5" />
            </Button>
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Password</Label>
          <div class="flex items-center gap-1">
            <code class="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{{ gateway.secret }}</code>
            <Button variant="ghost" size="icon" class="size-8" @click="copy(gateway.secret, 'Password')">
              <Icon icon="lucide:copy" class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Connection string -->
      <div class="grid gap-1.5">
        <Label class="text-xs">Connection string</Label>
        <div class="flex items-center gap-1">
          <code class="flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs">{{ connectionUrl }}</code>
          <Button variant="ghost" size="icon" class="size-8" @click="copy(connectionUrl, 'Connection string')">
            <Icon icon="lucide:copy" class="size-3.5" />
          </Button>
        </div>
      </div>

      <!-- curl -->
      <div class="grid gap-1.5">
        <Label class="text-xs">Test with curl</Label>
        <div class="flex items-center gap-1">
          <code class="flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs">{{ curlExample }}</code>
          <Button variant="ghost" size="icon" class="size-8" @click="copy(curlExample, 'curl command')">
            <Icon icon="lucide:copy" class="size-3.5" />
          </Button>
        </div>
      </div>

      <!-- Mode hint -->
      <div class="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Icon icon="lucide:info" class="mr-1 inline size-3.5" />{{ modeHint }}
      </div>

      <!-- Username modifiers -->
      <div class="grid gap-2 text-xs">
        <div class="font-medium text-foreground">Username modifiers</div>
        <div class="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
          <span class="text-muted-foreground">Sticky IP per session</span>
          <code class="font-mono">{{ stickyUsername }}</code>
        </div>
        <div class="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
          <span class="text-muted-foreground">Target a country</span>
          <code class="font-mono">{{ countryUsername }}</code>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
