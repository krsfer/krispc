<template>
  <footer class="bg-gray-900 text-gray-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <!-- Brand -->
        <div>
          <h3 class="font-brand text-2xl text-primary mb-4">KrisPC</h3>
          <p class="text-sm text-gray-400">
            {{ tagline }}
          </p>
        </div>

        <!-- Links -->
        <div>
          <h4 class="font-semibold text-white mb-4">{{ servicesTitle }}</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="#services" class="hover:text-primary transition-colors">{{ servicesTitle }}</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="font-semibold text-white mb-4">{{ contactTitle }}</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="#contact" class="hover:text-primary transition-colors">{{ contactTitle }}</a></li>
            <li><a href="#team" class="hover:text-primary transition-colors">{{ teamTitle }}</a></li>
          </ul>
        </div>

        <!-- For Developers -->
        <div>
          <h4 class="font-semibold text-white mb-4">{{ developersTitle }}</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="/api/krispc/swagger/" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open API Swagger documentation in new tab">API Docs (Swagger)</a></li>
            <li><a href="/api/krispc/redoc/" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open API ReDoc documentation in new tab">API Docs (ReDoc)</a></li>
            <li><a href="/api/krispc/pricelist/" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open pricelist JSON data in new tab">Pricelist (JSON)</a></li>
            <li><a href="/api/krispc/pricelist/?output=text" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open pricelist text format in new tab">Pricelist (Text)</a></li>
            <li><a href="/api/krispc/services/?output=text" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open services text format in new tab">Services (Text)</a></li>
            <li><a href="/docs/mcp/" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors" aria-label="Open MCP Server documentation for AI in new tab">MCP Server for AI</a></li>
          </ul>
        </div>
      </div>

      <!-- Copyright -->
      <div class="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
        <p>
          {{ copyright }}
          - <a :href="privacyUrl" class="hover:text-primary transition-colors underline decoration-gray-600">{{ privacyLabel }}</a>
          - <a :href="termsUrl" class="hover:text-primary transition-colors underline decoration-gray-600">{{ termsLabel }}</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'

// Get translations from Django
const t = computed(() => window.DJANGO_DATA?.translations?.footer || {})

const tagline = computed(() => t.value.tagline || 'Professional IT services and computer repair')
const servicesTitle = computed(() => t.value.services_title || 'Services')
const contactTitle = computed(() => t.value.contact_title || 'Contact')
const teamTitle = computed(() => t.value.team_title || 'Our Team')
const copyright = computed(() => t.value.copyright || `© ${new Date().getFullYear()} KrisPC. All rights reserved.`)
const privacyLabel = computed(() => t.value.privacy || 'Privacy Policy')
const termsLabel = computed(() => t.value.terms || 'Terms of Service')
const privacyUrl = computed(() => t.value.privacy_url || '/privacy/')
const termsUrl = computed(() => t.value.terms_url || '/terms/')
const developersTitle = computed(() => t.value.developers_title || 'For Developers')
</script>
