<script lang="ts" setup></script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <a href="#" class="flex items-center gap-2 font-medium">
          <img src="/logo.png" alt="Image" class="size-10" />
          Residential Proxy
        </a>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <slot />
        </div>
      </div>
    </div>
    <div class="bg-muted relative hidden lg:block">
      <img
        src="/images/cover1.jpg"
        alt="Image"
        class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  </div>
</template>

<style scoped></style>
