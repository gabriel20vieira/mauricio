<script setup lang="ts">
const { tweaksOpen } = useAppUi()
const { tweaks, set } = useTweaks()
const { user, clear } = useUserSession()

const accents = [
  { label: 'Verde', hue: 165 }, { label: 'Azul', hue: 245 }, { label: 'Violeta', hue: 295 },
  { label: 'Âmbar', hue: 65 }, { label: 'Rosa', hue: 350 }, { label: 'Teal', hue: 195 },
]

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="tweaksOpen" style="position: fixed; inset: 0; z-index: 220" @mousedown="tweaksOpen = false">
      <div style="position: absolute; inset: 0; background: oklch(0.15 0.01 80 / 0.4)" />
      <aside style="position: absolute; top: 0; right: 0; height: 100%; width: 320px; max-width: 90vw; background: var(--surface); border-left: 1px solid var(--border); box-shadow: var(--shadow); padding: 20px; overflow-y: auto; animation: fadeUp 0.2s ease"
        @mousedown.stop>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px">
          <h3 style="font-size: 17px; font-weight: 600">Aparência</h3>
          <UiIconButton name="x" label="Fechar" @click="tweaksOpen = false" />
        </div>

        <UiField label="Tema" style="margin-bottom: 18px">
          <UiSegmented :model-value="tweaks.theme" :options="[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]"
            @update:model-value="set({ theme: $event as any })" />
        </UiField>

        <UiField label="Densidade" style="margin-bottom: 18px">
          <UiSegmented :model-value="tweaks.density" :options="[{ value: 'compact', label: 'Compacta' }, { value: 'regular', label: 'Normal' }, { value: 'comfy', label: 'Folgada' }]"
            @update:model-value="set({ density: $event as any })" />
        </UiField>

        <UiField label="Cor de destaque" style="margin-bottom: 18px">
          <div style="display: flex; flex-wrap: wrap; gap: 8px">
            <button v-for="a in accents" :key="a.hue" type="button"
              :title="a.label"
              :style="{ width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', background: `oklch(0.6 0.13 ${a.hue})`, border: tweaks.accent === a.hue ? '2px solid var(--ink)' : '2px solid transparent', outline: '1px solid var(--border)' }"
              @click="set({ accent: a.hue })" />
          </div>
        </UiField>

        <UiField label="Cantos" style="margin-bottom: 24px">
          <UiSegmented :model-value="String(tweaks.radius)" :options="[{ value: '6', label: 'Retos' }, { value: '14', label: 'Médios' }, { value: '20', label: 'Suaves' }]"
            @update:model-value="set({ radius: Number($event) })" />
        </UiField>

        <div style="border-top: 1px solid var(--border); padding-top: 16px">
          <div style="font-size: 12.5px; color: var(--muted); margin-bottom: 10px">Sessão de {{ user?.name }}</div>
          <UiButton variant="outline" icon="logout" full @click="logout">Terminar sessão</UiButton>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
