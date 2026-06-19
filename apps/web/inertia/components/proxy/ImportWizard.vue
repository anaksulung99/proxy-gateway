<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import { Icon } from '@iconify/vue'

const props = defineProps<{ listId: number }>()

const open = ref(false)
const form = useForm({ raw: '', defaultProtocol: 'http' })

const lineCount = computed(() => form.raw.split(/\r?\n/).filter((l) => l.trim()).length)

function submit() {
  form.post(`/app/proxy-lists/${props.listId}/import`, {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
      form.reset('raw')
    },
  })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <AppTooltip content="Import proxies" side="bottom">
        <Button size="sm">
          <Icon icon="lucide:upload" class="mr-1 size-4" />
          <span class="hidden md:block">Import proxies</span>
        </Button>
      </AppTooltip>
    </DialogTrigger>
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Import own proxies</DialogTitle>
        <DialogDescription>
          One proxy per line. Supported: <code>host:port</code>, <code>host:port:user:pass</code>,
          <code>user:pass@host:port</code>, <code>scheme://host:port</code>.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 py-1">
        <span class="ml-auto text-xs text-muted-foreground">{{ lineCount }} lines</span>
        <div class="w-full space-y-2">
          <Textarea
            v-model="form.raw"
            rows="10"
            class="font-mono text-xs"
            placeholder="203.0.113.10:8080&#10;user:pass@198.51.100.5:1080&#10;socks5://192.0.2.7:1080"
          />
          <p v-if="form.errors.raw" class="text-xs text-red-600">{{ form.errors.raw }}</p>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Default protocol (no scheme)</Label>
          <Select v-model="form.defaultProtocol">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent class="w-full">
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="https">HTTPS</SelectItem>
              <SelectItem value="socks5">SOCKS5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="form.processing || !form.raw.trim()" @click="submit">
          Import &amp; auto-check
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
