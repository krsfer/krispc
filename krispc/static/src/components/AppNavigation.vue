<template>
  <nav class="fixed top-0 w-full bg-white border-b border-gray-200 z-50" role="navigation" aria-label="Main navigation">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <a :href="hubUrl" class="font-brand text-2xl text-primary">KrisPC</a>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a v-for="link in navLinks"
             :key="link.href"
             :href="link.href"
             class="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
            {{ link.label }}
          </a>

          <!-- Language Selector -->
          <LanguageSelector />
        </div>

        <!-- Mobile menu button -->
        <button @click="mobileMenuOpen = !mobileMenuOpen"
                class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Toggle mobile menu"
                :aria-expanded="mobileMenuOpen">
          <Bars3Icon v-if="!mobileMenuOpen" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <transition name="slide-down">
      <div v-if="mobileMenuOpen"
           class="md:hidden bg-white border-t border-gray-200">
        <div class="px-4 pt-2 pb-4 space-y-2">
          <a v-for="link in navLinks"
             :key="link.href"
             :href="link.href"
             @click="mobileMenuOpen = false"
             class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">
            {{ link.label }}
          </a>

          <!-- Language Selector (Mobile) -->
          <div class="pt-3 mt-2 border-t border-gray-200">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import LanguageSelector from './LanguageSelector.vue'

const mobileMenuOpen = ref(false)

// Get translations from Django
const translations = computed(() => window.DJANGO_DATA?.translations?.nav || {})

// Get hub URL (language-aware)
// Supports common language prefixes (en, de, fr, es, nl, etc.)
const hubUrl = computed(() => {
  const currentPath = window.location.pathname
  const langMatch = currentPath.match(/^\/([a-z]{2})\//)
  return langMatch ? `/${langMatch[1]}/` : '/'
})

const navLinks = computed(() => [
  { href: '#home', label: translations.value.home || 'Home' },
  { href: '#about', label: translations.value.about || 'About' },
  { href: '#services', label: translations.value.services || 'Services' },
  { href: '#team', label: translations.value.team || 'Team' },
  { href: '#contact', label: translations.value.contact || 'Contact' },
])
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
