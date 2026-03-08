<template>
  <section id="team" class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="text-xs uppercase tracking-[0.35em] text-gray-500 font-semibold">KrisPC</p>
        <h2 class="mt-3 text-4xl md:text-5xl font-brand text-gray-900 mb-4" v-html="teamTitle">
        </h2>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto" v-html="teamSubtitle">
        </p>
      </div>

      <!-- Team Grid -->
      <div class="max-w-3xl mx-auto">
        <div
          v-for="member in team"
          :key="member.name"
          class="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
        >
          <!-- Image Placeholder -->
          <div class="h-64 bg-white flex items-center justify-center border-b border-gray-200">
            <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon class="w-20 h-20 text-primary" />
            </div>
          </div>

          <!-- Member Info -->
          <div class="p-6">
            <h3 class="text-2xl font-semibold text-gray-900 mb-1">
              {{ member.name }}
            </h3>
            <p class="text-primary font-medium mb-3">
              {{ member.role }}
            </p>
            <p class="text-sm leading-6 text-gray-600 mb-4">
              {{ member.bio }}
            </p>

            <!-- Social Links -->
            <div v-if="member.social" class="flex gap-3">
              <a
                v-for="(link, platform) in member.social"
                :key="platform"
                :href="link"
                :aria-label="`${member.name} on ${platform}`"
                class="px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-primary hover:text-primary transition-colors text-sm font-medium"
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
    bio: '15+ years of hands-on experience in programming, computer repair, and IT support, using modern tools, including AI assistance, to diagnose issues and deliver practical solutions'
  }
])
</script>
