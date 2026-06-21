<script setup lang="ts">
import { useTrans } from '~/composables/useTrans'
import { Icon } from '@iconify/vue'

const { t } = useTrans()
</script>

<template>
  <LandingLayout>
    <!-- Header Hero -->
    <section
      class="relative pt-16 pb-20 md:pt-24 md:pb-28 text-center overflow-hidden border-b border-border"
    >
      <div
        class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"
      ></div>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
          <span class="bg-linear-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
            {{ t('about.title') }}
          </span>
        </h1>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {{ t('about.subtitle') }}
        </p>
      </div>
    </section>

    <!-- Main Content Grid -->
    <section class="py-20">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        <!-- Story / Mission Row -->
        <div class="flex flex-col md:flex-row items-center gap-12">
          <div class="w-full md:w-1/2 space-y-4">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-semibold"
            >
              {{ t('nav.about') }}
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {{ t('about.story_title') }}
            </h2>
            <p class="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {{ t('about.story_desc') }}
            </p>
          </div>
          <div
            class="w-full md:w-1/2 bg-neutral-100 dark:bg-neutral-900 border border-border p-8 rounded-3xl flex items-center justify-center min-h-62.5 relative overflow-hidden group"
          >
            <div
              class="absolute inset-0 bg-linear-to-tr from-sky-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            ></div>
            <Icon
              icon="lucide:target"
              class="h-24 w-24 text-sky-500/80 group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>

        <!-- Tech Row -->
        <div class="flex flex-col md:flex-row-reverse items-center gap-12">
          <div class="w-full md:w-1/2 space-y-4">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
            >
              Infrastructure
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {{ t('about.tech_title') }}
            </h2>
            <p class="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {{ t('about.tech_desc') }}
            </p>
          </div>
          <div
            class="w-full md:w-1/2 bg-neutral-100 dark:bg-neutral-900 border border-border p-8 rounded-3xl flex items-center justify-center min-h-62.5 relative overflow-hidden group"
          >
            <div
              class="absolute inset-0 bg-linear-to-tr from-indigo-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            ></div>
            <Icon
              icon="lucide:server"
              class="h-24 w-24 text-indigo-500/80 group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>

        <!-- Numbers / Statistics Section -->
        <div class="pt-8 border-t border-border">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div class="border border-border p-6 rounded-2xl bg-card text-center">
              <span class="text-3xl font-extrabold text-foreground">25,000+</span>
              <span
                class="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-2"
              >
                {{ t('about.stat_users') }}
              </span>
            </div>
            <div class="border border-border p-6 rounded-2xl bg-card text-center">
              <span class="text-3xl font-extrabold text-foreground">1 Billion+</span>
              <span
                class="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-2"
              >
                {{ t('about.stat_requests') }}
              </span>
            </div>
            <div class="border border-border p-6 rounded-2xl bg-card text-center">
              <span class="text-3xl font-extrabold text-foreground">150+</span>
              <span
                class="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-2"
              >
                {{ t('hero.stat_locations') }}
              </span>
            </div>
            <div class="border border-border p-6 rounded-2xl bg-card text-center">
              <span class="text-3xl font-extrabold text-foreground">99.9%</span>
              <span
                class="block text-xs uppercase tracking-wider font-semibold text-muted-foreground mt-2"
              >
                {{ t('hero.stat_uptime') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
