import type { Data } from '@generated/data'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type SharedTeam = Data.SharedProps['team']

export const useTeamStore = defineStore('team', () => {
  const team = ref<SharedTeam | undefined>(undefined)
  const hasTeam = computed(() => Boolean(team.value))

  function setTeam(value: SharedTeam | undefined) {
    team.value = value
  }

  function clear() {
    team.value = undefined
  }

  return {
    team,
    hasTeam,
    setTeam,
    clear,
  }
})
