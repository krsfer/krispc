<template>
  <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <!-- Animated background shapes -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
    </div>

    <div class="relative z-10 max-w-5xl mx-auto px-4 text-center pt-16">
      <h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-primary to-accent bg-clip-text text-transparent dark:from-gray-100 dark:via-primary dark:to-accent">
        {{ heroTitle }}
      </h1>
      <p class="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto" v-html="heroSubtitle">
      </p>
      <div class="text-sm text-gray-600 dark:text-gray-400 mb-8 space-y-1">
        <p>{{ heroNote1 }}</p>
        <p>{{ heroNote2 }}</p>
      </div>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="#contact" class="px-8 py-4 bg-primary text-white rounded-full hover:bg-primary-dark transform hover:scale-105 transition-all shadow-lg hover:shadow-xl font-medium">
          Contact
        </a>
        <a href="#services" class="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors font-medium">
          {{ servicesButtonLabel }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

// Get translations from Django
const translations = computed(() => window.DJANGO_DATA?.translations || {})

const heroTitle = computed(() => translations.value.hero?.title || 'Professional IT Services')
const heroSubtitle = computed(() => translations.value.hero?.subtitle || 'Expert computer repair, maintenance, and support for your business')
const heroNote1 = computed(() => translations.value.hero?.note1 || '')
const heroNote2 = computed(() => translations.value.hero?.note2 || '')
const servicesButtonLabel = computed(() => translations.value.sections?.services_title || 'Our Services')
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 6s ease-in-out infinite;
}
</style>
