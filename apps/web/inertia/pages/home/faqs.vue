<script setup lang="ts">
import { useTrans } from '~/composables/useTrans'

const { t } = useTrans()

// Dynamic FAQ list matching the keys in translation files
const faqItems = [
  { value: 'faq-1', q: 'faqs.q1', a: 'faqs.a1' },
  { value: 'faq-2', q: 'faqs.q2', a: 'faqs.a2' },
  { value: 'faq-3', q: 'faqs.q3', a: 'faqs.a3' },
  { value: 'faq-4', q: 'faqs.q4', a: 'faqs.a4' },
  { value: 'faq-5', q: 'faqs.q5', a: 'faqs.a5' },
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
            {{ t('faqs.title') }}
          </span>
        </h1>
        <p class="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {{ t('faqs.subtitle') }}
        </p>
      </div>
    </section>

    <!-- FAQ Accordion section -->
    <section class="pb-24">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="border border-border bg-card/60 backdrop-blur-sm p-6 sm:p-10 rounded-3xl shadow-sm"
        >
          <Accordion type="single" collapsible class="w-full">
            <AccordionItem
              v-for="item in faqItems"
              :key="item.value"
              :value="item.value"
              class="border-b border-border py-2 last:border-b-0"
            >
              <AccordionTrigger
                class="text-left font-bold text-base text-foreground hover:text-sky-600 transition-colors py-4 cursor-pointer"
              >
                {{ t(item.q) }}
              </AccordionTrigger>
              <AccordionContent class="text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                {{ t(item.a) }}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
