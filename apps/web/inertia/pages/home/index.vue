<script setup lang="ts">
import { ref, computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useTrans } from '~/composables/useTrans'

const { t } = useTrans()

// Interactive cost calculator state
const bandwidth = ref(100)
const proxyType = ref('residential')

const perGbCost = computed(() => {
  return proxyType.value === 'residential' ? 3.5 : 6.0
})

const estimatedCost = computed(() => {
  return (bandwidth.value * perGbCost.value).toFixed(2)
})
</script>

<template>
  <LandingLayout>
    <!-- Hero Section -->
    <section class="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden">
      <!-- Glow background -->
      <div
        class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full bg-sky-500/10 blur-[120px] pointer-events-none"
      ></div>
      <div
        class="absolute top-1/3 left-1/3 w-75 h-75 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"
      ></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <!-- Badge announcement -->
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-6 animate-fade-in"
        >
          <span class="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
          {{ t('hero.badge') }}
        </div>

        <!-- Title -->
        <h1
          class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-none"
        >
          <span class="bg-linear-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            {{ t('hero.title') }}
          </span>
        </h1>

        <!-- Subtitle -->
        <p class="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          {{ t('hero.subtitle') }}
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/signup" class="w-full sm:w-auto">
            <Button
              size="lg"
              class="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold text-base py-6 px-8 rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all flex items-center justify-center gap-2"
            >
              {{ t('hero.cta_start') }}
              <Icon icon="lucide:arrow-right" class="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/pricing" class="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              class="w-full sm:w-auto font-semibold text-base py-6 px-8 rounded-xl border-border bg-background hover:bg-accent transition-all flex items-center justify-center gap-2"
            >
              {{ t('hero.cta_pricing') }}
            </Button>
          </Link>
        </div>

        <!-- Stats Row -->
        <div
          class="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto border border-border bg-card/50 backdrop-blur-sm p-8 rounded-2xl shadow-sm"
        >
          <div class="flex flex-col items-center">
            <div
              class="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 mb-3"
            >
              <Icon icon="lucide:globe" class="h-6 w-6" />
            </div>
            <span class="text-3xl font-extrabold text-foreground">10M+</span>
            <span class="text-sm text-muted-foreground mt-1">{{ t('hero.stat_active_ips') }}</span>
          </div>
          <div
            class="flex flex-col items-center border-y sm:border-y-0 sm:border-x border-border py-6 sm:py-0"
          >
            <div
              class="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3"
            >
              <Icon icon="lucide:map-pin" class="h-6 w-6" />
            </div>
            <span class="text-3xl font-extrabold text-foreground">150+</span>
            <span class="text-sm text-muted-foreground mt-1">{{ t('hero.stat_locations') }}</span>
          </div>
          <div class="flex flex-col items-center">
            <div
              class="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3"
            >
              <Icon icon="lucide:activity" class="h-6 w-6" />
            </div>
            <span class="text-3xl font-extrabold text-foreground">99.9%</span>
            <span class="text-sm text-muted-foreground mt-1">{{ t('hero.stat_uptime') }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-20 relative bg-neutral-50/50 dark:bg-neutral-900/10 border-y border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            {{ t('features.title') }}
          </h2>
          <p class="text-lg text-muted-foreground leading-relaxed">
            {{ t('features.subtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Card 1: Residential -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:home" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.res_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.res_desc') }}
            </p>
          </div>

          <!-- Card 2: Mobile -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:smartphone" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.mob_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.mob_desc') }}
            </p>
          </div>

          <!-- Card 3: Speed -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:zap" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.speed_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.speed_desc') }}
            </p>
          </div>

          <!-- Card 4: Rotation -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:refresh-cw" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.rot_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.rot_desc') }}
            </p>
          </div>

          <!-- Card 5: Geo-targeting -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:navigation" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.geo_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.geo_desc') }}
            </p>
          </div>

          <!-- Card 6: Zero Logs -->
          <div
            class="group border border-border bg-card hover:bg-accent/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div
              class="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
            >
              <Icon icon="lucide:shield-alert" class="h-6 w-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground mb-2">{{ t('features.sec_title') }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('features.sec_desc') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Calculator Section -->
    <section class="py-20 relative overflow-hidden">
      <!-- Glow background -->
      <div
        class="absolute bottom-10 right-10 w-100 h-100 rounded-full bg-sky-500/5 blur-[100px] pointer-events-none"
      ></div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="border border-border bg-card/60 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row items-center gap-12 relative"
        >
          <!-- Left side: Form -->
          <div class="w-full md:w-1/2 space-y-6">
            <div>
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                {{ t('calc.title') }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{ t('calc.desc') }}
              </p>
            </div>

            <!-- Select Proxy Type -->
            <div class="space-y-2">
              <label class="text-sm font-semibold text-foreground">{{
                t('calc.label_type')
              }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="flex items-center justify-center py-3 px-4 rounded-xl border font-medium text-sm transition-all focus:outline-none cursor-pointer"
                  :class="
                    proxyType === 'residential'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/20'
                      : 'border-border bg-card hover:bg-accent text-muted-foreground'
                  "
                  @click="proxyType = 'residential'"
                >
                  <Icon icon="lucide:home" class="mr-2 h-4 w-4" />
                  Residensial
                </button>
                <button
                  type="button"
                  class="flex items-center justify-center py-3 px-4 rounded-xl border font-medium text-sm transition-all focus:outline-none cursor-pointer"
                  :class="
                    proxyType === 'mobile'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/20'
                      : 'border-border bg-card hover:bg-accent text-muted-foreground'
                  "
                  @click="proxyType = 'mobile'"
                >
                  <Icon icon="lucide:smartphone" class="mr-2 h-4 w-4" />
                  Seluler
                </button>
              </div>
            </div>

            <!-- Bandwidth Slider -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm font-semibold text-foreground">{{
                  t('calc.label_bandwidth')
                }}</label>
                <span
                  class="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/20 px-3 py-1 rounded-lg"
                >
                  {{ bandwidth }} GB
                </span>
              </div>
              <input
                v-model.number="bandwidth"
                type="range"
                min="5"
                max="1000"
                step="5"
                class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-sky-600 dark:accent-sky-500"
              />
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>5 GB</span>
                <span>500 GB</span>
                <span>1,000 GB</span>
              </div>
            </div>
          </div>

          <!-- Right side: Estimate Display -->
          <div
            class="w-full md:w-1/2 bg-neutral-50 dark:bg-neutral-900 border border-border p-8 rounded-2xl text-center space-y-6 flex flex-col justify-between h-full min-h-75"
          >
            <div>
              <span class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {{ t('calc.est_cost') }}
              </span>
              <div class="mt-4 flex items-baseline justify-center gap-1">
                <span class="text-5xl font-extrabold text-foreground">${{ estimatedCost }}</span>
                <span class="text-sm text-muted-foreground">/mo</span>
              </div>
              <p class="text-xs text-muted-foreground mt-2">
                ${{ perGbCost.toFixed(2) }} {{ t('calc.per_gb') }}
              </p>
            </div>

            <div class="border-t border-border pt-6 space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Proxy Nodes</span>
                <span class="font-bold text-foreground">Unlimited</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">API Access</span>
                <span class="font-bold text-foreground">Included</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Geo-Targeting</span>
                <span class="font-bold text-foreground">Free</span>
              </div>
            </div>

            <Link href="/signup">
              <Button
                class="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 transition-all cursor-pointer"
              >
                {{ t('calc.order_now') }}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA Banner -->
    <section
      class="py-16 md:py-20 relative bg-neutral-950 dark:bg-neutral-950/80 border-t border-border text-white text-center"
    >
      <div
        class="absolute inset-0 bg-linear-to-tr from-sky-900/10 to-indigo-950/20 pointer-events-none"
      ></div>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative space-y-6">
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to scale your web scraping?
        </h2>
        <p class="text-neutral-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Create your account today and experience lightning-fast residential and mobile proxies.
        </p>
        <div class="pt-4">
          <Link href="/signup">
            <Button
              size="lg"
              class="bg-white hover:bg-neutral-100 text-neutral-950 font-bold px-8 py-6 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {{ t('hero.cta_start') }}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
