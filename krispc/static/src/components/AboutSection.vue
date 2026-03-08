<template>
  <section id="about" class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-12 items-start">
        <!-- Content -->
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-gray-500 font-semibold">{{ subtitle }}</p>
          <h2 class="mt-3 text-4xl md:text-5xl font-brand text-gray-900 mb-6">
            {{ title }}<span class="text-primary">.</span>
          </h2>
          <p class="text-lg text-gray-600 leading-8 mb-6">
            {{ description }}
          </p>
          <p class="text-lg text-gray-600 leading-8 mb-8">
            {{ commitment }}
          </p>

          <!-- Features -->
          <div class="space-y-4">
            <div v-for="(feature, index) in features" :key="index" class="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <component :is="icons[index]" class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 mb-1">
                  {{ feature.title }}
                </h3>
                <p class="text-sm leading-6 text-gray-600">
                  {{ feature.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-6">
          <div
            v-for="(stat, index) in stats"
            :key="index"
            class="rounded-2xl border border-gray-200 bg-white p-6 text-center"
          >
            <div class="text-4xl font-bold text-primary mb-2">
              {{ stat.value }}
            </div>
            <div class="font-medium text-gray-600">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { BoltIcon, ShieldCheckIcon, UserIcon } from '@heroicons/vue/24/solid'

const icons = [markRaw(BoltIcon), markRaw(ShieldCheckIcon), markRaw(UserIcon)]

// Get translations from Django
const t = computed(() => window.DJANGO_DATA?.translations?.about || {})

const subtitle = computed(() => t.value.subtitle || 'About')
const title = computed(() => t.value.title || 'About KrisPC')
const description = computed(() => t.value.description || '')
const commitment = computed(() => t.value.commitment || '')
const features = computed(() => t.value.features || [])
const stats = computed(() => t.value.stats || [])
</script>
