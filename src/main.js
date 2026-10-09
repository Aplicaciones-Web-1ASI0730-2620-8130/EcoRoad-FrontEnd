import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'
import 'primeicons/primeicons.css'
import './style.css'
import App from './app.vue'
import router from './router.js'

createApp(App)
  .use(PrimeVue, { theme: { preset: Material }, ripple: true })
  .use(router)
  .mount('#app')

