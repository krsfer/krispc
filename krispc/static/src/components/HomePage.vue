<template>
  <div>
    <HeroSection />
    <AboutSection />
    <ServicesSection />
    <TeamSection />
    <ContactForm />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import HeroSection from './HeroSection.vue'
import AboutSection from './AboutSection.vue'
import ServicesSection from './ServicesSection.vue'

// Lazy load below-the-fold components for better initial load
const TeamSection = defineAsyncComponent(() =>
  import('./TeamSection.vue')
)
const ContactForm = defineAsyncComponent(() =>
  import('./ContactForm.vue')
)
</script>
