<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'

defineProps<{
  pools: Array<{
    id: number
    name: string
    isActive: boolean
    entriesCount: number
    healthyCount: number
    unhealthyCount: number
    timeoutCount: number
    unknownCount: number
    healthyRatio: number
    scraperSources: number
    rotationSummary: {
      modeLabel: string
      protocolLabel: string
      cadenceLabel: string
    }
  }>
}>()
</script>

<template>
  <Card class="border-border/70">
    <CardHeader>
      <CardTitle>Pool Health Matrix</CardTitle>
      <CardDescription>
        Pool terbesar yang paling berpengaruh ke kualitas endpoint tim Anda.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Rotation</TableHead>
            <TableHead>Sources</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="pools.length === 0">
            <TableCell colspan="5" class="py-10 text-center text-muted-foreground">
              Belum ada proxy pool yang bisa dipantau.
            </TableCell>
          </TableRow>
          <TableRow v-for="pool in pools" :key="pool.id">
            <TableCell>
              <div class="flex items-center gap-2">
                <Link :href="`/app/proxy-lists/${pool.id}`" class="font-medium hover:underline">
                  {{ pool.name }}
                </Link>
                <Badge :variant="pool.isActive ? 'default' : 'secondary'">
                  {{ pool.isActive ? 'Active' : 'Inactive' }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="text-sm">
              {{ pool.entriesCount }} proxies
            </TableCell>
            <TableCell>
              <div class="space-y-1 text-sm">
                <p class="font-medium">{{ pool.healthyRatio }}% healthy</p>
                <p class="text-muted-foreground">
                  {{ pool.healthyCount }} ok · {{ pool.unhealthyCount }} bad ·
                  {{ pool.timeoutCount }} timeout · {{ pool.unknownCount }} unchecked
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div class="space-y-1 text-sm">
                <p class="font-medium">{{ pool.rotationSummary.modeLabel }}</p>
                <p class="text-muted-foreground">
                  {{ pool.rotationSummary.protocolLabel }} · {{ pool.rotationSummary.cadenceLabel }}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ pool.scraperSources }} linked</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
