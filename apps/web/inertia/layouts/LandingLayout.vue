<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Icon } from '@iconify/vue'
import { useTrans } from '~/composables/useTrans'
import type { Data } from '@generated/data'
import { toast, Toaster } from 'vue-sonner'
import { useFlashStore } from '~/stores/flash'

const { t, currentLocale, changeLocale } = useTrans()
const page = usePage<Data.SharedProps>()
const flashStore = useFlashStore()

const user = computed(() => page.props?.user)
const flash = computed(() => page.props?.flash)
const isMenuOpen = ref(false)

// Year for footer copyright
const currentYear = new Date().getFullYear()

watch(flash, (value) => flashStore.setFlash(value), { immediate: true })
watch(
  () => flashStore.flash,
  (flashMessages) => {
    if (flashMessages?.success) {
      toast.success(flashMessages.success)
    }
    if (flashMessages?.error) {
      toast.error(flashMessages.error)
    }
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 antialiased font-sans"
  >
    <!-- Grid Background overlay (subtle visual depth) -->
    <div
      class="fixed inset-0 pointer-events-none opacity-20 dark:opacity-30 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(14,165,233,0.15),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(14,165,233,0.08),transparent)]"
    ></div>

    <!-- Header -->
    <header
      class="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Logo -->
        <Link href="/" class="flex items-center gap-2 group">
          <div
            class="h-10 w-10 rounded-xl bg-linear-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-all"
          >
            <Icon icon="lucide:shield-check" class="h-6 w-6" />
          </div>
          <span
            class="font-bold text-xl tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text"
          >
            SmartBoost Labs<span class="text-sky-500">.</span>
          </span>
        </Link>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-6">
          <Link
            href="/"
            class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-foreground font-semibold': page.url === '/' }"
          >
            {{ t('nav.home') }}
          </Link>
          <Link
            href="/pricing"
            class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-foreground font-semibold': page.url.startsWith('/pricing') }"
          >
            {{ t('nav.pricing') }}
          </Link>
          <Link
            href="/about"
            class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-foreground font-semibold': page.url.startsWith('/about') }"
          >
            {{ t('nav.about') }}
          </Link>
          <Link
            href="/faqs"
            class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-foreground font-semibold': page.url.startsWith('/faqs') }"
          >
            {{ t('nav.faqs') }}
          </Link>
          <Link
            href="/contact"
            class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-foreground font-semibold': page.url.startsWith('/contact') }"
          >
            {{ t('nav.contact') }}
          </Link>
        </nav>

        <!-- Actions -->
        <div class="hidden md:flex items-center gap-4">
          <!-- Language Selector -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="flex items-center gap-1.5 h-9">
                <Icon icon="lucide:languages" class="h-4 w-4" />
                <span class="text-xs font-semibold uppercase">{{ currentLocale }}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-32">
              <DropdownMenuItem
                class="flex items-center justify-between cursor-pointer"
                @click="changeLocale('en')"
              >
                <span>English</span>
                <Icon
                  v-if="currentLocale === 'en'"
                  icon="lucide:check"
                  class="h-4 w-4 text-sky-500"
                />
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex items-center justify-between cursor-pointer"
                @click="changeLocale('id')"
              >
                <span>Indonesia</span>
                <Icon
                  v-if="currentLocale === 'id'"
                  icon="lucide:check"
                  class="h-4 w-4 text-sky-500"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Dark/Light Theme -->
          <ThemeToggle />

          <!-- Auth Status -->
          <div v-if="user" class="flex items-center gap-3">
            <Link href="/app">
              <Button
                size="sm"
                class="bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm transition-all"
              >
                <Icon icon="lucide:layout-dashboard" class="mr-2 h-4 w-4" />
                {{ t('nav.dashboard') }}
              </Button>
            </Link>
          </div>
          <div v-else class="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" class="text-sm font-medium text-foreground">
                {{ t('nav.signin') }}
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                class="bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm shadow-sky-500/10 hover:shadow-sky-500/20 transition-all"
              >
                {{ t('nav.signup') }}
              </Button>
            </Link>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <div class="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="sm" class="h-10 w-10 p-0" @click="isMenuOpen = !isMenuOpen">
            <Icon :icon="isMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-6 w-6" />
          </Button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div
        v-if="isMenuOpen"
        class="md:hidden border-b border-border bg-background animate-in slide-in-from-top duration-200"
      >
        <div class="px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/"
            class="block px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="isMenuOpen = false"
          >
            {{ t('nav.home') }}
          </Link>
          <Link
            href="/pricing"
            class="block px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="isMenuOpen = false"
          >
            {{ t('nav.pricing') }}
          </Link>
          <Link
            href="/about"
            class="block px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="isMenuOpen = false"
          >
            {{ t('nav.about') }}
          </Link>
          <Link
            href="/faqs"
            class="block px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="isMenuOpen = false"
          >
            {{ t('nav.faqs') }}
          </Link>
          <Link
            href="/contact"
            class="block px-3 py-2 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            @click="isMenuOpen = false"
          >
            {{ t('nav.contact') }}
          </Link>

          <div class="h-px bg-border my-2"></div>

          <!-- Language Selector Mobile -->
          <div class="flex items-center justify-between px-3 py-2">
            <span class="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
              <Icon icon="lucide:languages" class="h-4 w-4" /> Language
            </span>
            <div class="flex gap-2">
              <Button
                size="sm"
                :variant="currentLocale === 'en' ? 'default' : 'outline'"
                class="h-7 px-3 text-xs"
                @click="changeLocale('en')"
                >EN</Button
              >
              <Button
                size="sm"
                :variant="currentLocale === 'id' ? 'default' : 'outline'"
                class="h-7 px-3 text-xs"
                @click="changeLocale('id')"
                >ID</Button
              >
            </div>
          </div>

          <div class="h-px bg-border my-2"></div>

          <div v-if="user" class="px-3">
            <Link href="/app" class="w-full block" @click="isMenuOpen = false">
              <Button class="w-full bg-sky-600 text-white justify-center">
                <Icon icon="lucide:layout-dashboard" class="mr-2 h-4 w-4" />
                {{ t('nav.dashboard') }}
              </Button>
            </Link>
          </div>
          <div v-else class="px-3 space-y-2">
            <Link href="/login" class="w-full block" @click="isMenuOpen = false">
              <Button variant="outline" class="w-full justify-center">
                {{ t('nav.signin') }}
              </Button>
            </Link>
            <Link href="/signup" class="w-full block" @click="isMenuOpen = false">
              <Button class="w-full bg-sky-600 text-white justify-center shadow-md">
                {{ t('nav.signup') }}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="grow z-10">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-neutral-50 dark:bg-neutral-950 border-t border-border py-12 mt-20 relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Branding Column -->
          <div class="md:col-span-1 space-y-4">
            <Link href="/" class="flex items-center gap-2">
              <div
                class="h-8 w-8 rounded-lg bg-sky-600 flex items-center justify-center text-white"
              >
                <Icon icon="lucide:shield-check" class="h-5 w-5" />
              </div>
              <span class="font-bold text-lg tracking-tight"
                >SmartBoost Labs<span class="text-sky-500">.</span></span
              >
            </Link>
            <p class="text-sm text-muted-foreground leading-relaxed">
              {{ t('footer.desc') }}
            </p>
          </div>

          <!-- Resources -->
          <div>
            <h4 class="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">
              {{ t('footer.resources') }}
            </h4>
            <ul class="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('nav.home') }}</Link
                >
              </li>
              <li>
                <Link
                  href="/pricing"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('nav.pricing') }}</Link
                >
              </li>
              <li>
                <Link
                  href="/faqs"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('nav.faqs') }}</Link
                >
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div>
            <h4 class="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">
              {{ t('footer.company') }}
            </h4>
            <ul class="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('nav.about') }}</Link
                >
              </li>
              <li>
                <Link
                  href="/contact"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('nav.contact') }}</Link
                >
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4 class="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">
              {{ t('footer.legal') }}
            </h4>
            <ul class="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('privacy.title') }}</Link
                >
              </li>
              <li>
                <Link
                  href="/terms"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  >{{ t('terms.title') }}</Link
                >
              </li>
            </ul>
          </div>
        </div>

        <div
          class="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground"
        >
          <p>{{ t('footer.rights', { year: currentYear }) }}</p>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5"
              ><Icon icon="lucide:shield" class="h-3.5 w-3.5" /> SECURE SSL</span
            >
            <span class="flex items-center gap-1.5"
              ><Icon icon="lucide:server" class="h-3.5 w-3.5" /> 99.9% UPTIME</span
            >
          </div>
        </div>
      </div>
    </footer>

    <!-- Sonner Toaster for gorgeous notifications -->
    <Toaster position="top-right" rich-colors />
  </div>
</template>
