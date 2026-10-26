<script setup lang="ts">
import * as z from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Sign in · Shopwise admin' })

const { login } = useAuth()
const route = useRoute()
const errorMessage = ref<string>()

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'admin@shopwise.test', required: true },
  { name: 'password', type: 'password', label: 'Password', required: true },
]

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

async function onSubmit({ data }: FormSubmitEvent<z.output<typeof schema>>) {
  errorMessage.value = undefined
  try {
    await login(data)
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (error) {
    errorMessage.value = errorMessageOf(error, 'Sign in failed. Try again.')
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Shopwise admin"
        description="Sign in with an admin account."
        icon="i-lucide-store"
        :submit="{ label: 'Sign in' }"
        @submit="onSubmit"
      >
        <template #validation>
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
