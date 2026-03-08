<template>
  <div
    class="group h-full rounded-2xl border border-gray-200 bg-white transition-colors duration-200 cursor-pointer hover:border-primary"
    @click="$emit('click', service)"
  >
    <div class="p-6">
      <!-- Icon Circle -->
      <div class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
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
