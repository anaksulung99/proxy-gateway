<script setup lang="ts">
import { useTrans } from '~/composables/useTrans'

const { t } = useTrans()
</script>

<template>
  <LandingLayout>
    <section class="py-16 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="border border-border bg-card p-8 sm:p-12 rounded-3xl space-y-8 shadow-sm">
        <!-- Header -->
        <div class="border-b border-border pb-6 space-y-2">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-foreground">
            {{ t('terms.title') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ t('terms.last_updated') }}
          </p>
        </div>

        <!-- Content -->
        <div
          class="prose dark:prose-invert max-w-none text-muted-foreground space-y-6 text-sm sm:text-base leading-relaxed"
        >
          <p>
            Welcome to SmartBoost Labs! These terms and conditions outline the rules and regulations
            for the use of SmartBoost Labs's Website and Proxy Services, located at
            smartboostlabs.com.
          </p>
          <p>
            By accessing this website and purchasing our services, we assume you accept these terms
            and conditions. Do not continue to use SmartBoost Labs if you do not agree to take all
            of the terms and conditions stated on this page.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">1. Intellectual Property</h2>
          <p>
            Other than the content you own, under these Terms, SmartBoost Labs and/or its licensors
            own all the intellectual property rights and materials contained in this Website. You
            are granted a limited license only for purposes of viewing the material contained on
            this Website.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">2. Acceptable Use Policy</h2>
          <p>You must not use our residential or mobile proxy services to:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Engage in any form of cyber-attack, hacking, or flooding of target servers.</li>
            <li>Distribute spyware, malware, or participate in illegal botnet activity.</li>
            <li>Bypass security blocks to conduct fraudulent or malicious transactions.</li>
            <li>Send unsolicited emails (SPAM) or perform phishing campaigns.</li>
          </ul>
          <p>
            Any violation of this Acceptable Use Policy will result in immediate termination of your
            account without refund.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">3. Limitation of Liability</h2>
          <p>
            In no event shall SmartBoost Labs, nor any of its officers, directors, and employees, be
            held liable for anything arising out of or in any way connected with your use of this
            Website or proxy services.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">4. Refund Policy</h2>
          <p>
            Due to the nature of digital goods and bandwidth allocation, we do not offer refunds
            once proxy traffic has been consumed, except in cases where technical failures on our
            gateway prevent access entirely and cannot be resolved by support within 48 hours.
          </p>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
