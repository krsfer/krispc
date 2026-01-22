<template>
  <div class="relative">
    <!-- Current Language Button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      :aria-expanded="isOpen"
      aria-label="Select language"
    >
      <img
        :src="currentLanguage.flag"
        :alt="`${currentLanguage.name} flag`"
        class="w-8 h-6 object-contain"
      />
      <svg
        class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Language Dropdown -->
    <transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
        @click.stop
      >
        <a
          v-for="lang in availableLanguages"
          :key="lang.code"
          :href="getLanguageUrl(lang.code)"
          class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="{ 'bg-primary/10': lang.code === currentLanguage.code }"
          @click="isOpen = false"
        >
          <img
            :src="lang.flag"
            :alt="`${lang.name} flag`"
            class="w-8 h-6 object-contain"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ lang.name }}
          </span>
          <svg
            v-if="lang.code === currentLanguage.code"
            class="w-4 h-4 text-primary ml-auto"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </a>
      </div>
    </transition>

    <!-- Click outside to close -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const isOpen = ref(false)

const languages = {
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '/static/images/lv_franceCroppedFlattened1.png'
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '/static/images/lv_united_kingdomCroppedFlattened1.png'
  }
}

const availableLanguages = Object.values(languages)

const currentLanguageCode = ref('fr')
const currentPath = ref('')

onMounted(() => {
  // Get current language from Django data or URL
  const djangoLocale = window.DJANGO_DATA?.locale || 'fr'
  currentLanguageCode.value = djangoLocale.split('-')[0] // 'fr-fr' -> 'fr'

  // Get current path without language prefix
  const path = window.location.pathname
  const pathWithoutLang = path.replace(/^\/(fr|en)/, '') || '/'
  currentPath.value = pathWithoutLang
})

const currentLanguage = computed(() => {
  return languages[currentLanguageCode.value] || languages.fr
})

const getLanguageUrl = (langCode) => {
  // If switching to French, we must use query param to properly override
  // any existing session language preference (sticky session)
  // because root path '/' honors the persisted preference.
  if (langCode === 'fr') {
    // Only append if we aren't already just on root without params
    // But since currentPath strips params, we just append ?lang=fr
    // This is simple and robust.
    // Ensure we handle currentPath correctly (it might be '/' or '/foo')
    const separator = currentPath.value.includes('?') ? '&' : '?'
    return `${currentPath.value}${separator}lang=fr`
  }
  
  // For English, standard prefix works
  return `/en${currentPath.value}`
}

// Close dropdown on ESC key
const handleEscape = (e) => {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
