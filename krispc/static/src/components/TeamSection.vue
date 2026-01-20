<template>
  <section id="team" class="py-20 bg-gray-50 dark:bg-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4" v-html="teamTitle">
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" v-html="teamSubtitle">
        </p>
      </div>

      <!-- Team Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="member in team"
          :key="member.name"
          class="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden group hover:shadow-2xl transition-all duration-300"
        >
          <!-- Image Placeholder -->
          <div class="relative h-64 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
            <div class="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserIcon class="w-20 h-20 text-white" />
            </div>
          </div>

          <!-- Member Info -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {{ member.name }}
            </h3>
            <p class="text-primary font-medium mb-3">
              {{ member.role }}
            </p>
            <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
              {{ member.bio }}
            </p>

            <!-- Social Links -->
            <div v-if="member.social" class="flex gap-3">
              <a
                v-for="(link, platform) in member.social"
                :key="platform"
                :href="link"
                :aria-label="`${member.name} on ${platform}`"
                class="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-primary hover:text-white transition-colors text-sm font-medium"
              >
                {{ platform }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { UserIcon } from '@heroicons/vue/24/solid'

// Get translations from Django
const t = computed(() => window.DJANGO_DATA?.translations?.team || {})
const teamTitle = computed(() => t.value.title || 'Meet Our Team')
const teamSubtitle = computed(() => t.value.subtitle || 'Our experienced professionals are dedicated to providing you with the best IT services')

// Load team members from Django data
const team = computed(() => t.value.members || [
  {
    name: 'Christopher',
    role: 'Technician & Manager',
    bio: 'Over 20 years of experience in programming, computer repair, and IT support'
  }
])
</script>
