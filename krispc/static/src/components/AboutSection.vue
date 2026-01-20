<template>
  <section id="about" class="py-20 bg-white dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <!-- Content -->
        <div>
          <h2 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {{ title }}
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
            {{ description }}
          </p>
          <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {{ commitment }}
          </p>

          <!-- Features -->
          <div class="space-y-4">
            <div v-for="(feature, index) in features" :key="index" class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <component :is="icons[index]" class="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                  {{ feature.title }}
                </h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm">
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
            class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 text-center"
          >
            <div class="text-4xl font-bold text-primary mb-2">
              {{ stat.value }}
            </div>
            <div class="text-gray-600 dark:text-gray-300 font-medium">
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

const title = computed(() => t.value.title || 'About KrisPC')
const description = computed(() => t.value.description || '')
const commitment = computed(() => t.value.commitment || '')
const features = computed(() => t.value.features || [])
const stats = computed(() => t.value.stats || [])
</script>
