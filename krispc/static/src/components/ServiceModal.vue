<template>
  <Teleport to="body">
    <transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
        @keydown.esc="close"
        tabindex="0"
      >
        <div
          class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="modalTitleId"
        >
          <!-- Close Button -->
          <button
            @click="close"
            class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label="Close modal"
          >
            <XMarkIcon class="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>

          <!-- Modal Content -->
          <div class="p-8">
            <!-- Icon -->
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
              <component :is="service?.icon" class="w-10 h-10 text-white" />
            </div>

            <!-- Title -->
            <h2
              :id="modalTitleId"
              class="text-3xl font-bold text-gray-900 dark:text-white mb-4"
            >
              {{ service?.name }}
            </h2>

            <!-- Full Description -->
            <div class="prose dark:prose-invert max-w-none">
              <p class="text-gray-600 dark:text-gray-300 text-lg mb-6">
                {{ service?.description }}
              </p>

              <!-- Additional Details with Pricing (HTML from Django)
                   Note: service.details is server-rendered HTML from Django templates,
                   which is sanitized on the backend. Do not use with user-generated content. -->
              <div
                v-if="service?.details"
                class="text-gray-700 dark:text-gray-300"
                v-html="service.details"
              ></div>
            </div>

            <!-- CTA Button -->
            <div class="mt-8">
              <a
                href="#contact"
                @click="close"
                class="inline-block px-8 py-4 bg-primary text-white rounded-full hover:bg-primary-dark transform hover:scale-105 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  service: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

// Generate stable ID for aria-labelledby
const modalTitleId = computed(() => `service-modal-title-${props.service?.id || 'default'}`)

const close = () => {
  emit('update:modelValue', false)
}

// Handle ESC key
const handleEscape = (e) => {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

// Prevent body scroll when modal is open
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
