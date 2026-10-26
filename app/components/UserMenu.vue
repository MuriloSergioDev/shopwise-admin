<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

const { user, logout } = useAuth()
const toast = useToast()

async function signOut() {
  await logout()
  toast.add({ title: 'Signed out', icon: 'i-lucide-log-out' })
  await navigateTo('/login')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.email ?? '', type: 'label' }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }],
])
</script>

<template>
  <UDropdownMenu v-if="user" :items="items" :content="{ align: 'start' }">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-user"
      :label="collapsed ? undefined : user.name"
      :square="collapsed"
      block
      class="justify-start"
    />
  </UDropdownMenu>
</template>
