<script setup lang="ts">
import type { AppTokenClaims } from '~~/shared/types/token'

defineOptions({ name: 'ClaimsScenario' })

const { user, isLoggedIn, isLoading, refresh } = useAuth<AppTokenClaims>()
const { $api } = useNuxtApp()
const role = ref('user')
const permissions = ref<string[]>([])
const isBusy = ref(false)
const error = ref('')
const success = ref('')
const before = ref<{ role: string, permissions: string[] } | null>(null)

watch(user, (current) => {
  role.value = current?.role || 'user'
  permissions.value = [...(current?.permissions || [])]
}, { immediate: true })

async function updateClaims(kind: 'role' | 'permissions') {
  if (!user.value) return
  isBusy.value = true
  error.value = ''
  success.value = ''
  before.value = { role: user.value.role, permissions: [...(user.value.permissions || [])] }
  try {
    await $api(`/api/admin/update-${kind}`, {
      method: 'POST',
      body: kind === 'role'
        ? { userId: user.value.sub, role: role.value }
        : { userId: user.value.sub, permissions: permissions.value },
    })
    await refresh({ updateClaims: true })
    success.value = 'Claims updated without signing in again.'
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Claims update failed'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="claims-heading">
    <header class="section-heading">
      <h2 id="claims-heading">
        Claims
      </h2><span class="meta">Authenticated</span>
    </header>
    <p
      v-if="!isLoggedIn"
      class="meta"
    >
      Sign in to update your claims.
    </p>
    <label class="short-field">Role<select
      v-model="role"
      :disabled="isBusy || !isLoggedIn || isLoading"
    ><option value="user">User</option><option value="admin">Admin</option><option value="moderator">Moderator</option></select></label>
    <fieldset
      class="permission-fields"
      :disabled="isBusy || !isLoggedIn || isLoading"
    >
      <legend>Permissions</legend>
      <label
        v-for="permission in ['read', 'write', 'delete', 'admin']"
        :key="permission"
      ><input
        v-model="permissions"
        type="checkbox"
        :value="permission"
      > {{ permission }}</label>
    </fieldset>
    <div class="action-row">
      <button
        type="button"
        class="button button-primary"
        :disabled="isBusy || !isLoggedIn || isLoading"
        @click="updateClaims('role')"
      >
        {{ isBusy ? 'Updating...' : 'Update role' }}
      </button><button
        type="button"
        class="button"
        :disabled="isBusy || !isLoggedIn || isLoading"
        @click="updateClaims('permissions')"
      >
        Update permissions
      </button>
    </div>
    <p
      v-if="success"
      class="feedback"
      role="status"
    >
      {{ success }}
    </p>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div
      v-if="before && success"
      class="result-panel"
    >
      <div class="result-heading">
        <strong>Claims comparison</strong><span class="meta">JWT refresh</span>
      </div>
      <dl class="comparison">
        <div><dt>Role</dt><dd>{{ before.role }} → {{ user?.role }}</dd></div><div><dt>Permissions</dt><dd>{{ before.permissions.join(', ') || 'None' }} → {{ user?.permissions?.join(', ') || 'None' }}</dd></div>
      </dl>
    </div>
  </section>
</template>
