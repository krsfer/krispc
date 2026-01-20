<template>
  <section id="services" class="py-20 bg-gray-50 dark:bg-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {{ sectionTitle }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          <!-- Subtitle can be added to translations if needed -->
        </p>
      </div>

      <!-- Services Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ServiceCard
          v-for="service in services"
          :key="service.id"
          :service="service"
          @click="openModal"
        />
      </div>
    </div>

    <!-- Service Modal -->
    <ServiceModal
      v-model="showModal"
      :service="selectedService"
    />
  </section>
</template>

<script>
// Module-level iconMap - prevents recreation on each component instance
import { markRaw } from 'vue'
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  PrinterIcon,
  LightBulbIcon,
  BugAntIcon,
  LockClosedIcon,
  WifiIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/vue/24/outline'

const iconMap = {
  'ri-phone-line': markRaw(DevicePhoneMobileIcon),
  'ri-computer-line': markRaw(ComputerDesktopIcon),
  'ri-file-copy-line': markRaw(DocumentDuplicateIcon),
  'ri-printer-line': markRaw(PrinterIcon),
  'ri-lightbulb-line': markRaw(LightBulbIcon),
  'ri-bug-2-line': markRaw(BugAntIcon),
  'ri-lock-2-line': markRaw(LockClosedIcon),
  'ri-home-wifi-line': markRaw(WifiIcon),
  'ri-headphone-line': markRaw(ChatBubbleLeftRightIcon)
}
</script>

<script setup>
import { ref, defineAsyncComponent, computed } from 'vue'
import ServiceCard from './ServiceCard.vue'

// Lazy load modal component for code splitting
const ServiceModal = defineAsyncComponent(() =>
  import('./ServiceModal.vue')
)

const showModal = ref(false)
const selectedService = ref(null)

// Get section title from Django translations
const sectionTitle = computed(() => {
  return window.DJANGO_DATA?.translations?.sections?.services_title || 'Our Services'
})

// Load Django data (with pricing and translations)
const services = computed(() => {
  const djangoData = window.DJANGO_DATA?.prods || []
  return djangoData.map((prod, index) => ({
    id: index + 1,
    name: prod.Prd_Name,
    icon: iconMap[prod.Prd_Icon] || markRaw(ComputerDesktopIcon),
    description: prod.Prd_Desc,
    details: prod.Prd_More  // Contains pricing and full translated description
  }))
})

const openModal = (service) => {
  selectedService.value = service
  showModal.value = true
}
</script>
