// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://192.168.1.203:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'minimax-m3:cloud',
  },
  css: ['~/assets/css/styles.css'],
  app: {
    head: {
      title: 'Lar — contas de casa',
      htmlAttrs: { lang: 'pt', 'data-theme': 'light', 'data-density': 'regular' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap',
        },
      ],
      script: [
        {
          // No-flash theme/tweaks init — runs before first paint.
          innerHTML: `(function(){try{var t=JSON.parse(localStorage.getItem('lar.tweaks')||'{}');var e=document.documentElement;if(t.theme)e.setAttribute('data-theme',t.theme);if(t.density)e.setAttribute('data-density',t.density);if(t.accent)e.style.setProperty('--accent-h',t.accent);if(t.radius){e.style.setProperty('--radius',t.radius+'px');e.style.setProperty('--radius-sm',Math.max(4,t.radius-5)+'px');}}catch(_){}})();`,
          tagPosition: 'head',
        },
      ],
    },
  },
})
