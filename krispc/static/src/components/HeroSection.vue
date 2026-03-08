<template>
  <section id="home" class="bg-gray-50 pt-28 pb-16 md:pt-32 md:pb-24">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 text-center">
        <p class="text-xs uppercase tracking-[0.35em] text-gray-500 font-semibold">KrisPC</p>
        <h1 class="mt-4 text-4xl sm:text-5xl md:text-6xl font-brand text-gray-900">
          {{ heroTitle }}<span class="text-primary">.</span>
        </h1>
        <p class="mt-4 text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto" v-html="heroSubtitle"></p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
          <span class="inline-flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            {{ heroNote1 }}
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            {{ heroNote2 }}
          </span>
        </div>
        <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#contact" class="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold text-black bg-primary hover:bg-primary-dark transition-colors">
            Contact
          </a>
          <a href="#services" class="inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors">
            {{ servicesButtonLabel }}
          </a>
        </div>
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
