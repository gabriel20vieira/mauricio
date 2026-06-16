// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://192.168.1.203:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'minimax-m3:cloud',
    // nuxt-auth-utils session hardening (password comes from NUXT_SESSION_PASSWORD).
    session: {
      name: 'lar-session',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      cookie: {
        sameSite: 'strict', // CSRF defence for state-changing requests
        httpOnly: true,
        // `secure` is left to nuxt-auth-utils' default (on in production, off in dev)
        // so the cookie is still stored over http://localhost during development.
      },
    },
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
          // No-flash theme init — applies the persisted light/dark choice before first paint.
          innerHTML: `(function(){try{var t=localStorage.getItem('lar.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(_){}})();`,
          tagPosition: 'head',
        },
      ],
    },
  },
})
