<template>
  <nav class="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 dark:bg-gray-900/90">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <a href="#home" class="font-brand text-2xl text-primary">KrisPC</a>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a v-for="link in navLinks"
             :key="link.href"
             :href="link.href"
             class="text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary">
            {{ link.label }}
          </a>

          <!-- Language Selector -->
          <LanguageSelector />
        </div>

        <!-- Mobile menu button -->
        <button @click="mobileMenuOpen = !mobileMenuOpen"
                class="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
           class="md:hidden bg-white dark:bg-gray-900 shadow-lg">
        <div class="px-4 pt-2 pb-4 space-y-2">
          <a v-for="link in navLinks"
             :key="link.href"
             :href="link.href"
             @click="mobileMenuOpen = false"
             class="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors dark:text-gray-300 dark:hover:bg-gray-800">
            {{ link.label }}
          </a>

          <!-- Language Selector (Mobile) -->
          <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
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
