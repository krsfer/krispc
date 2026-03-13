<template>
  <button
    type="button"
    :class="[
      'group h-full w-full rounded-2xl border text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
      service.featured
        ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-md hover:shadow-lg'
        : 'border-gray-200 bg-white hover:border-primary'
    ]"
    @click="$emit('click', service)"
  >
    <div class="relative p-6">
      <span
        v-if="service.featured"
        class="absolute top-4 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white sm:px-3 sm:py-1 sm:text-xs"
      >
        Most Popular
      </span>

      <!-- Icon Circle -->
      <div
        :class="[
          'mb-5 flex h-16 w-16 items-center justify-center rounded-xl',
          service.featured ? 'bg-primary/20' : 'bg-primary/10'
        ]"
      >
        <component :is="service.icon" class="w-8 h-8 text-primary" />
      </div>

      <!-- Service Name -->
      <h3 class="text-xl font-semibold text-gray-900 mb-3">
        {{ service.name }}
      </h3>

      <!-- Service Description -->
      <p class="text-sm leading-6 text-gray-600 line-clamp-3">
        {{ service.description }}
      </p>
    </div>
  </button>
</template>

<script setup>
defineProps({
  service: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
