<template>
  <section id="contact" class="py-20 bg-white dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          {{ contactTitle }}
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {{ contactSubtitle }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="max-w-2xl mx-auto space-y-6">
        <!-- Name Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="firstname" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ firstNameLabel }} <span class="text-red-500">{{ requiredLabel }}</span>
            </label>
            <input
              id="firstname"
              v-model="form.firstname"
              type="text"
              required
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              :class="{ 'border-red-500': errors.firstname }"
            />
            <span v-if="errors.firstname" class="text-red-500 text-sm mt-1 block">
              {{ errors.firstname }}
            </span>
          </div>

          <div>
            <label for="surname" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ lastNameLabel }}
            </label>
            <input
              id="surname"
              v-model="form.surname"
              type="text"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ emailLabel }} <span class="text-red-500">{{ requiredLabel }}</span>
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            :class="{ 'border-red-500': errors.email }"
          />
          <span v-if="errors.email" class="text-red-500 text-sm mt-1 block">
            {{ errors.email }}
          </span>
        </div>

        <!-- Message Field -->
        <div>
          <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ messageLabel }} <span class="text-red-500">{{ requiredLabel }}</span>
          </label>
          <textarea
            id="message"
            v-model="form.message"
            rows="5"
            required
            class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            :class="{ 'border-red-500': errors.message }"
          ></textarea>
          <span v-if="errors.message" class="text-red-500 text-sm mt-1 block">
            {{ errors.message }}
          </span>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary-dark transform hover:scale-105 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span v-if="!loading">{{ sendLabel }}</span>
          <span v-else class="flex items-center justify-center gap-2">
            <span class="sr-only">Loading</span>
            <svg class="animate-spin h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ sendingLabel }}
          </span>
        </button>

        <!-- Success Message -->
        <transition name="fade">
          <div
            v-if="success"
            class="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-700"
          >
            {{ success }}
          </div>
        </transition>

        <!-- General Error Message -->
        <transition name="fade">
          <div
            v-if="errors.general"
            class="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700"
          >
            {{ errors.general }}
          </div>
        </transition>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

// Get translations from Django
const t = computed(() => window.DJANGO_DATA?.translations?.contact || {})

const contactTitle = computed(() => t.value.title || 'Get In Touch')
const contactSubtitle = computed(() => t.value.subtitle || 'Have a question or need assistance? Send us a message and we\'ll get back to you as soon as possible')
const firstNameLabel = computed(() => t.value.firstName || 'First Name')
const lastNameLabel = computed(() => t.value.lastName || 'Last Name')
const emailLabel = computed(() => t.value.email || 'Email')
const messageLabel = computed(() => t.value.message || 'Message')
const requiredLabel = computed(() => t.value.required || '*')
const sendLabel = computed(() => t.value.send || 'Send Message')
const sendingLabel = computed(() => t.value.sending || 'Sending...')
const successMessage = computed(() => t.value.successMessage || 'Thank you for your message! We will get back to you soon.')
const errorGeneral = computed(() => t.value.errorGeneral || 'An error occurred. Please try again later.')
const errorSubmit = computed(() => t.value.errorSubmit || 'Something went wrong. Please try again.')

const form = ref({
  firstname: '',
  surname: '',
  email: '',
  message: ''
})

const errors = ref({})
const loading = ref(false)
const success = ref('')

const handleSubmit = async () => {
  loading.value = true
  errors.value = {}
  success.value = ''

  try {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                     document.querySelector('meta[name="csrf-token"]')?.content ||
                     getCookie('csrftoken')

    const response = await fetch('/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken,
      },
      body: JSON.stringify(form.value)
    })

    if (response.ok) {
      success.value = successMessage.value
      form.value = { firstname: '', surname: '', email: '', message: '' }

      // Clear success message after 5 seconds
      setTimeout(() => {
        success.value = ''
      }, 5000)
    } else {
      const data = await response.json()
      errors.value = data.errors || { general: errorSubmit.value }
    }
  } catch (error) {
    errors.value = { general: errorGeneral.value }
  } finally {
    loading.value = false
  }
}

// Helper function to get CSRF token from cookie
function getCookie(name) {
  let cookieValue = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
