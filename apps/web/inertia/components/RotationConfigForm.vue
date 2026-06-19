<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'

interface RotationConfig {
  rotationType: string
  protocol: string
  stickyDurationMinutes: number | null
  intervalMinutes: number | null
  geoTarget: string | null
  excludeCountries: string[] | null
  excludeAsn: number[] | null
}

const props = defineProps<{
  listId: number
  config: RotationConfig | null
}>()

const form = useForm({
  rotationType: props.config?.rotationType ?? 'per_request',
  protocol: props.config?.protocol ?? 'any',
  stickyDurationMinutes: props.config?.stickyDurationMinutes ?? 30,
  intervalMinutes: props.config?.intervalMinutes ?? 10,
  geoTarget: props.config?.geoTarget ?? '',
  excludeCountries: [...(props.config?.excludeCountries ?? [])] as string[],
  excludeAsn: (props.config?.excludeAsn ?? []).map((n) => String(n)) as string[],
})

const isSticky = computed(() => form.rotationType === 'sticky')
const isInterval = computed(() => form.rotationType === 'interval')
const summary = computed(() => {
  const cadence = isSticky.value
    ? `Session keeps the same IP for ${form.stickyDurationMinutes || 30} minutes`
    : isInterval.value
      ? `Gateway rotates to a new IP every ${form.intervalMinutes || 10} minutes`
      : 'Gateway rotates to a new IP for every request'

  const target = form.geoTarget
    ? `Geo target ${String(form.geoTarget).toUpperCase()}`
    : 'No default geo target'
  const exclusions = []
  if (form.excludeCountries.length)
    exclusions.push(`${form.excludeCountries.length} countries excluded`)
  if (form.excludeAsn.length) exclusions.push(`${form.excludeAsn.length} ASN excluded`)

  return {
    cadence,
    target,
    exclusions: exclusions.length ? exclusions.join(' + ') : 'No geo or ASN exclusions',
  }
})

function save() {
  form
    .transform((data) => ({
      rotationType: data.rotationType,
      protocol: data.protocol,
      stickyDurationMinutes:
        data.rotationType === 'sticky' ? Number(data.stickyDurationMinutes) : null,
      intervalMinutes: data.rotationType === 'interval' ? Number(data.intervalMinutes) : null,
      geoTarget: data.geoTarget ? data.geoTarget.toUpperCase() : null,
      excludeCountries: [...new Set(data.excludeCountries.map((c) => c.toUpperCase()))],
      excludeAsn: data.excludeAsn.map((a) => Number(a)).filter((n) => Number.isFinite(n)),
    }))
    .post(`/app/proxy-lists/${props.listId}/rotation`, { preserveScroll: true })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Rotation &amp; Targeting</CardTitle>
      <CardDescription>
        Controls how the gateway picks an IP for this list — like BrightData/IpRoyal.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-5 md:grid-cols-2">
      <div class="rounded-xl border bg-muted/30 p-4 md:col-span-2">
        <div class="grid gap-2 md:grid-cols-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Cadence</p>
            <p class="mt-1 text-sm font-medium">{{ summary.cadence }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Targeting</p>
            <p class="mt-1 text-sm font-medium">{{ summary.target }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Exclusions</p>
            <p class="mt-1 text-sm font-medium">{{ summary.exclusions }}</p>
          </div>
        </div>
      </div>

      <!-- Rotation type -->
      <div class="grid gap-1.5">
        <Label>Rotation mode</Label>
        <Select v-model="form.rotationType">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent class="w-full">
            <SelectItem value="sticky">Sticky session</SelectItem>
            <SelectItem value="per_request">Rotating — per request</SelectItem>
            <SelectItem value="interval">Rotating — interval</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          Sticky keeps one IP per session; per-request rotates every call; interval rotates every N
          minutes.
        </p>
      </div>

      <!-- Protocol -->
      <div class="grid gap-1.5">
        <Label>Protocol</Label>
        <Select v-model="form.protocol">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent class="w-full">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="https">HTTPS</SelectItem>
            <SelectItem value="socks5">SOCKS5</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          Use `Any` to let the engine choose from the whole pool, or lock the list to one protocol.
        </p>
      </div>

      <!-- Sticky duration -->
      <div v-if="isSticky" class="grid gap-1.5">
        <Label>Sticky duration (minutes)</Label>
        <Input v-model.number="form.stickyDurationMinutes" type="number" min="1" max="1440" />
      </div>

      <!-- Interval -->
      <div v-if="isInterval" class="grid gap-1.5">
        <Label>Rotate every (minutes, 1–30)</Label>
        <Input v-model.number="form.intervalMinutes" type="number" min="1" max="30" />
        <p v-if="form.errors.intervalMinutes" class="text-xs text-red-600">
          {{ form.errors.intervalMinutes }}
        </p>
      </div>

      <!-- Geo target -->
      <div class="grid gap-1.5">
        <Label>Default geo target (country code)</Label>
        <Input v-model="form.geoTarget" maxlength="2" placeholder="US" class="uppercase" />
        <p class="text-xs text-muted-foreground">Leave blank for no targeting.</p>
      </div>

      <!-- Exclude countries -->
      <div class="grid gap-1.5">
        <Label>Exclude countries</Label>
        <TagsInput v-model="form.excludeCountries">
          <TagsInputItem v-for="c in form.excludeCountries" :key="c" :value="c">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput placeholder="CN, RU…" />
        </TagsInput>
        <p class="text-xs text-muted-foreground">
          Gunakan kode negara ISO dua huruf, misalnya `CN`, `RU`, atau `BR`.
        </p>
      </div>

      <!-- Exclude ASN -->
      <div class="grid gap-1.5 md:col-span-2">
        <Label>Exclude ASN</Label>
        <TagsInput v-model="form.excludeAsn">
          <TagsInputItem v-for="a in form.excludeAsn" :key="a" :value="a">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput placeholder="13335, 15169…" />
        </TagsInput>
        <p class="text-xs text-muted-foreground">
          Useful to avoid datacenter ASNs and prefer residential.
        </p>
      </div>
    </CardContent>
    <CardFooter class="justify-end">
      <Button :disabled="form.processing" @click="save">Save rotation config</Button>
    </CardFooter>
  </Card>
</template>
