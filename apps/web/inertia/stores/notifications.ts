import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'

export type NotificationTaskStatus = 'running' | 'success' | 'error'
export type NotificationTaskKind = 'health_check' | 'scraper'
export type NotificationRuntimeQuarantineStatus = 'timeout' | 'unhealthy'

export interface NotificationTask {
  key: string
  kind: NotificationTaskKind
  status: NotificationTaskStatus
  title: string
  detail: string
  progressLabel: string
  current: number
  total: number
  percent: number | null
  href: string | null
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string | null
  errorMessage?: string | null
}

export interface NotificationRuntimeQuarantineEvent {
  id: number
  proxyEntryId: number
  proxyListId: number
  proxyListName: string
  endpoint: string
  protocol: string
  countryCode: string | null
  status: NotificationRuntimeQuarantineStatus
  checkedAt: string
  errorMessage: string
  title: string
  detail: string
  href: string
}

function taskDescription(task: NotificationTask) {
  const parts = [task.detail, task.progressLabel].filter(Boolean)
  return parts.join(' | ')
}

function isFreshCompletion(task: NotificationTask) {
  if (!task.updatedAt || task.status === 'running') return false
  const ageMs = Date.now() - new Date(task.updatedAt).getTime()
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 10_000
}

function isFreshQuarantine(event: NotificationRuntimeQuarantineEvent) {
  const ageMs = Date.now() - new Date(event.checkedAt).getTime()
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 15_000
}

export const useNotificationsStore = defineStore('notifications', () => {
  const tasks = ref<Record<string, NotificationTask>>({})
  const seenCompletion = ref<Record<string, true>>({})
  const recentQuarantineEvents = ref<Record<number, NotificationRuntimeQuarantineEvent>>({})
  const seenQuarantineEvents = ref<Record<number, true>>({})
  const localTaskKeys = ref<Record<string, true>>({})
  const isFetching = ref(false)
  const pollingBlocked = ref(false)

  const activeTasks = computed(() =>
    Object.values(tasks.value).filter((task) => task.status === 'running')
  )

  function startLocalTask(key: string, title: string, detail: string) {
    localTaskKeys.value[key] = true
    toast.loading(title, {
      id: `local:${key}`,
      description: detail,
      duration: Number.POSITIVE_INFINITY,
    })
  }

  function finishLocalTask(key: string) {
    delete localTaskKeys.value[key]
    toast.dismiss(`local:${key}`)
  }

  function syncTasks(nextTasks: NotificationTask[]) {
    const next: Record<string, NotificationTask> = {}

    for (const task of nextTasks) {
      next[task.key] = task
      const previous = tasks.value[task.key]
      const description = taskDescription(task)

      if (task.status === 'running') {
        toast.loading(task.title, {
          id: task.key,
          description,
          duration: Number.POSITIVE_INFINITY,
        })
        continue
      }

      if ((previous?.status === 'running' || isFreshCompletion(task)) && !seenCompletion.value[task.key]) {
        const notifier = task.status === 'success' ? toast.success : toast.error
        notifier(task.title, {
          id: task.key,
          description: task.errorMessage ?? description,
          duration: 5000,
        })
        seenCompletion.value[task.key] = true
      }
    }

    for (const previous of Object.values(tasks.value)) {
      if (previous.status === 'running' && !next[previous.key]) {
        toast.dismiss(previous.key)
      }
    }

    tasks.value = next
  }

  function syncQuarantineEvents(events: NotificationRuntimeQuarantineEvent[]) {
    const next: Record<number, NotificationRuntimeQuarantineEvent> = {}

    for (const event of events) {
      next[event.id] = event
      if (!seenQuarantineEvents.value[event.id] && isFreshQuarantine(event)) {
        const notifier = event.status === 'timeout' ? toast.warning : toast.error
        notifier(event.title, {
          id: `runtime-quarantine:${event.id}`,
          description: `${event.detail} | ${event.errorMessage}`,
          duration: 7000,
        })
        seenQuarantineEvents.value[event.id] = true
      }
    }

    recentQuarantineEvents.value = next
  }

  function clearRemoteState() {
    for (const previous of Object.values(tasks.value)) {
      if (previous.status === 'running') {
        toast.dismiss(previous.key)
      }
    }

    tasks.value = {}
    recentQuarantineEvents.value = {}
  }

  async function refreshTasks() {
    if (pollingBlocked.value || isFetching.value || typeof window === 'undefined') return

    isFetching.value = true
    try {
      const response = await fetch('/app/runtime/tasks', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })

      if (response.status === 401 || response.status === 403) {
        pollingBlocked.value = true
        clearRemoteState()
        return
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.includes('application/json')) return

      const payload = (await response.json()) as {
        tasks?: NotificationTask[]
        quarantineEvents?: NotificationRuntimeQuarantineEvent[]
      }
      pollingBlocked.value = false
      syncTasks(payload.tasks ?? [])
      syncQuarantineEvents(payload.quarantineEvents ?? [])
    } catch {
      // Silent fail: notifications should never block the app.
    } finally {
      isFetching.value = false
    }
  }

  return {
    tasks,
    recentQuarantineEvents,
    activeTasks,
    isFetching,
    pollingBlocked,
    startLocalTask,
    finishLocalTask,
    syncTasks,
    syncQuarantineEvents,
    clearRemoteState,
    refreshTasks,
  }
})
