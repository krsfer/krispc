<template>
  <div id="app">
    <!-- Vue app root -->
    <AppNavigation />
    <main id="main">
      <HomePage />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AppNavigation from './components/AppNavigation.vue'
import AppFooter from './components/AppFooter.vue'
import HomePage from './components/HomePage.vue'

onMounted(() => {
  console.log('Vue app mounted successfully!')
})
</script>

<style scoped>
/* App-level styles */
</style>
