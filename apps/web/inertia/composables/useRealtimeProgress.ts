import { onBeforeUnmount, onMounted } from 'vue'
import { useNotificationsStore } from '~/stores/notifications'

export const useRealtimeProgress = (intervalMs = 4000) => {
  const notifications = useNotificationsStore()
  let timer: number | null = null

  const tick = () => {
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

  onMounted(start)
  onBeforeUnmount(stop)

  return {
    start,
    stop,
    refresh: tick,
  }
}
