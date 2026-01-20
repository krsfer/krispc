<template>
  <div
    class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
    @click="$emit('click', service)"
  >
    <div class="p-6">
      <!-- Icon Circle -->
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <component :is="service.icon" class="w-8 h-8 text-white" />
      </div>

      <!-- Service Name -->
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {{ service.name }}
      </h3>

      <!-- Service Description -->
      <p class="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
        {{ service.description }}
      </p>
    </div>

    <!-- Hover Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
  </div>
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
