<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="site-header">
    <RouterLink class="brand" to="/commercial/register" aria-label="EcoRoad, ir al registro">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" fill="#087F57" />
          <path d="M34 10C20 12 12 19 13 30c1 6 5 9 11 8 10-2 14-13 10-28Z" fill="#D5F4E7" />
          <path d="M13 37c6-9 13-15 22-20" stroke="#086C50" stroke-width="3" stroke-linecap="round" />
        </svg>
      </span>
      <span class="brand-name">Eco<span>Road</span></span>
    </RouterLink>
    <nav class="header-nav" aria-label="Navegación comercial">
      <RouterLink to="/commercial/register">Registro</RouterLink>
      <RouterLink to="/commercial/subscription">Suscripción</RouterLink>
    </nav>
  </header>
</template>

