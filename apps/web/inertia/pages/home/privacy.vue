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
            {{ t('privacy.title') }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ t('privacy.last_updated') }}
          </p>
        </div>

        <!-- Content -->
        <div
          class="prose dark:prose-invert max-w-none text-muted-foreground space-y-6 text-sm sm:text-base leading-relaxed"
        >
          <p>
            At SmartBoost Labs, accessible from smartboostlabs.com, one of our main priorities is
            the privacy of our visitors. This Privacy Policy document contains types of information
            that is collected and recorded by SmartBoost Labs and how we use it.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">1. Information We Collect</h2>
          <p>
            The personal information that you are asked to provide, and the reasons why you are
            asked to provide it, will be made clear to you at the point we ask you to provide your
            personal information.
          </p>
          <p>
            If you contact us directly, we may receive additional information about you such as your
            name, email address, phone number, the contents of the message and/or attachments you
            may send us, and any other information you may choose to provide.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">2. How We Use Your Information</h2>
          <p>We use the information we collect in various ways, including to:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>Provide, operate, and maintain our website and proxy gateway</li>
            <li>Improve, personalize, and expand our website and gateway services</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>
              Communicate with you, either directly or through one of our partners, including for
              customer service and support
            </li>
          </ul>

          <h2 class="text-lg font-bold text-foreground pt-4">3. Log Files and Proxy Privacy</h2>
          <p>
            SmartBoost Labs follows a strict zero-logs policy regarding proxy traffic. We do not
            store, inspect, or log the data passing through our residential or mobile proxy servers.
            We only track bandwidth usage totals (in bytes) to enforce plan quotas.
          </p>

          <h2 class="text-lg font-bold text-foreground pt-4">4. GDPR Data Protection Rights</h2>
          <p>
            We would like to make sure you are fully aware of all of your data protection rights.
            Every user is entitled to the following:
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>The right to access</strong> – You have the right to request copies of your
              personal data.
            </li>
            <li>
              <strong>The right to rectification</strong> – You have the right to request that we
              correct any information you believe is inaccurate.
            </li>
            <li>
              <strong>The right to erasure</strong> – You have the right to request that we erase
              your personal data, under certain conditions.
            </li>
          </ul>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>
