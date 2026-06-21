<script setup lang="ts">
import { useTrans } from '~/composables/useTrans'
import { Icon } from '@iconify/vue'
import { Link } from '@adonisjs/inertia/vue'

const { t } = useTrans()

// Plan lists for easier iteration
const residentialPlans = [
  {
    name: 'pricing.res_starter',
    price: '$35',
    period: '/mo',
    desc: 'pricing.res_starter_desc',
    features: [
      '10 GB Bandwidth Included',
      '10M+ Real Residential IPs',
      'Country & City Targeting',
      'HTTP/HTTPS/SOCKS5 Support',
      '3 Concurrent Connections',
    ],
    popular: false,
  },
  {
    name: 'pricing.res_pro',
    price: '$150',
    period: '/mo',
    desc: 'pricing.res_pro_desc',
    features: [
      '50 GB Bandwidth Included',
      'Dedicated Smart Router Gateway',
      'Precision City & ASN Targeting',
      'HTTP/HTTPS/SOCKS5 Support',
      'Unlimited Concurrent Connections',
      '24/7 Priority Live Support',
    ],
    popular: true,
  },
  {
    name: 'pricing.res_ent',
    price: '$500',
    period: '/mo',
    desc: 'pricing.res_ent_desc',
    features: [
      '200 GB Bandwidth Included',
      'Custom Proxy Pools & Custom Rotation',
      'Dedicated IP Whitelisting',
      'Premium API Access & Webhooks',
      'Unlimited Concurrent Connections',
      'Dedicated Account Manager',
    ],
    popular: false,
  },
]

const mobilePlans = [
  {
    name: 'pricing.mob_starter',
    price: '$60',
    period: '/mo',
    desc: 'pricing.mob_starter_desc',
    features: [
      '10 GB Mobile Bandwidth',
      'Ethical 4G/5G Network Carrier IPs',
      'Country-Level Targeting',
      'Dynamic HTTP/HTTPS Rotator',
      '2 Concurrent Connections',
    ],
    popular: false,
  },
  {
    name: 'pricing.mob_pro',
    price: '$250',
    period: '/mo',
    desc: 'pricing.mob_pro_desc',
    features: [
      '50 GB Mobile Bandwidth',
      'Advanced 4G/5G/LTE Carrier IPs',
      'City & Carrier Targeting (e.g. T-Mobile)',
      'Dynamic SOCKS5 & HTTPS Rotator',
      'Unlimited Concurrent Connections',
      'Priority Ticket Support',
    ],
    popular: true,
  },
  {
    name: 'pricing.mob_ent',
    price: '$800',
    period: '/mo',
    desc: 'pricing.mob_ent_desc',
    features: [
      '200 GB Mobile Bandwidth',
      'Dedicated Private Carrier Port Pools',
      'Custom HTTP Header Modification',
      'API Endpoint & Usage Analytics',
      'Unlimited Concurrent Connections',
      'Dedicated Account Manager',
    ],
    popular: false,
  },
]
</script>

<template>
  <LandingLayout>
    <!-- Header -->
    <section class="relative pt-16 pb-12 md:pt-24 md:pb-16 text-center overflow-hidden">
      <div
        class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 rounded-full bg-sky-500/5 blur-[100px] pointer-events-none"
      ></div>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative space-y-4">
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span class="bg-linear-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
            {{ t('pricing.title') }}
          </span>
        </h1>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {{ t('pricing.subtitle') }}
        </p>
      </div>
    </section>

    <!-- Pricing Grid with Tabs -->
    <section class="pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs default-value="residential" class="w-full text-center space-y-12">
          <div class="flex justify-center">
            <TabsList
              class="grid grid-cols-2 w-87.5 p-1 bg-neutral-100 dark:bg-neutral-900 border border-border rounded-xl"
            >
              <TabsTrigger
                value="residential"
                class="py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
              >
                {{ t('features.res_title') }}
              </TabsTrigger>
              <TabsTrigger
                value="mobile"
                class="py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
              >
                {{ t('features.mob_title') }}
              </TabsTrigger>
            </TabsList>
          </div>

          <!-- Residential Tab Content -->
          <TabsContent value="residential" class="animate-in fade-in duration-300">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              <div
                v-for="plan in residentialPlans"
                :key="plan.name"
                class="border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative text-left bg-card hover:shadow-lg"
                :class="
                  plan.popular
                    ? 'border-sky-500 shadow-md md:scale-105 z-10 bg-linear-to-b from-sky-500/5 to-transparent'
                    : 'border-border'
                "
              >
                <!-- Popular Badge -->
                <div
                  v-if="plan.popular"
                  class="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wider uppercase"
                >
                  Most Popular
                </div>

                <div class="space-y-6">
                  <div>
                    <h3 class="text-xl font-bold text-foreground">{{ t(plan.name) }}</h3>
                    <p class="text-xs text-muted-foreground mt-1">{{ t(plan.desc) }}</p>
                  </div>

                  <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-extrabold text-foreground">{{ plan.price }}</span>
                    <span class="text-sm text-muted-foreground">{{ plan.period }}</span>
                  </div>

                  <div class="h-px bg-border"></div>

                  <!-- Features List -->
                  <ul class="space-y-3.5">
                    <li
                      v-for="feat in plan.features"
                      :key="feat"
                      class="flex items-start gap-2.5 text-sm"
                    >
                      <div
                        class="h-5 w-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <Icon icon="lucide:check" class="h-3 w-3" />
                      </div>
                      <span class="text-muted-foreground leading-tight">{{ feat }}</span>
                    </li>
                  </ul>
                </div>

                <div class="mt-8 pt-4">
                  <Link href="/signup">
                    <Button
                      class="w-full py-6 rounded-xl font-bold transition-all cursor-pointer"
                      :variant="plan.popular ? 'default' : 'outline'"
                      :class="
                        plan.popular
                          ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/10'
                          : 'border-border hover:bg-accent text-foreground'
                      "
                    >
                      {{ t('pricing.buy_now') }}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          <!-- Mobile Tab Content -->
          <TabsContent value="mobile" class="animate-in fade-in duration-300">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              <div
                v-for="plan in mobilePlans"
                :key="plan.name"
                class="border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative text-left bg-card hover:shadow-lg"
                :class="
                  plan.popular
                    ? 'border-sky-500 shadow-md md:scale-105 z-10 bg-linear-to-b from-sky-500/5 to-transparent'
                    : 'border-border'
                "
              >
                <!-- Popular Badge -->
                <div
                  v-if="plan.popular"
                  class="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wider uppercase"
                >
                  Most Popular
                </div>

                <div class="space-y-6">
                  <div>
                    <h3 class="text-xl font-bold text-foreground">{{ t(plan.name) }}</h3>
                    <p class="text-xs text-muted-foreground mt-1">{{ t(plan.desc) }}</p>
                  </div>

                  <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-extrabold text-foreground">{{ plan.price }}</span>
                    <span class="text-sm text-muted-foreground">{{ plan.period }}</span>
                  </div>

                  <div class="h-px bg-border"></div>

                  <!-- Features List -->
                  <ul class="space-y-3.5">
                    <li
                      v-for="feat in plan.features"
                      :key="feat"
                      class="flex items-start gap-2.5 text-sm"
                    >
                      <div
                        class="h-5 w-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"
                      >
                        <Icon icon="lucide:check" class="h-3 w-3" />
                      </div>
                      <span class="text-muted-foreground leading-tight">{{ feat }}</span>
                    </li>
                  </ul>
                </div>

                <div class="mt-8 pt-4">
                  <Link href="/signup">
                    <Button
                      class="w-full py-6 rounded-xl font-bold transition-all cursor-pointer"
                      :variant="plan.popular ? 'default' : 'outline'"
                      :class="
                        plan.popular
                          ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/10'
                          : 'border-border hover:bg-accent text-foreground'
                      "
                    >
                      {{ t('pricing.buy_now') }}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  </LandingLayout>
</template>
