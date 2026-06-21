import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useNotificationsStore } from '~/stores/notifications'

export const useRealtimeProgress = (
  enabled: MaybeRefOrGetter<boolean> = true,
  intervalMs = 4000
) => {
  const notifications = useNotificationsStore()
  let timer: number | null = null
  let isMounted = false

  const tick = () => {
    if (!toValue(enabled)) return
    if (typeof document !== 'undefined' && document.hidden) return
    void notifications.refreshTasks()
  }

  const start = () => {
    if (typeof window === 'undefined' || timer !== null) return
    tick()
    timer = window.setInterval(tick, intervalMs)
  }

  const stop = () => {
    if (timer === null || typeof window === 'undefined') return
    window.clearInterval(timer)
    timer = null
  }

  const sync = () => {
    if (!isMounted) return
    if (toValue(enabled)) start()
    else stop()
  }

  watch(() => toValue(enabled), sync)

  onMounted(() => {
    isMounted = true
    sync()
  })
  onBeforeUnmount(stop)

  return {
    start,
    stop,
    refresh: tick,
  }
}
