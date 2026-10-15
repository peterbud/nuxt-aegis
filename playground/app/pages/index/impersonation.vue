<script setup lang="ts">
import type { AppTokenClaims } from '~~/shared/types/token'

defineOptions({ name: 'ImpersonationScenario' })

const { user, isLoggedIn, isLoading, isImpersonating, originalUser, impersonate, stopImpersonation } = useAuth<AppTokenClaims>()
const { $api } = useNuxtApp()
const target = ref('')
const reason = ref('')
const isBusy = ref(false)
const error = ref('')
const response = ref<unknown>(null)

async function runAction(action: 'start' | 'stop' | 'context') {
  error.value = ''
  response.value = null
  isBusy.value = true
  try {
    if (action === 'start') {
      await impersonate(target.value.trim(), reason.value.trim() || undefined)
      target.value = ''
      reason.value = ''
    }
    else if (action === 'stop') {
      await stopImpersonation()
    }
    else {
      response.value = await $api('/api/admin/impersonate-demo')
    }
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Impersonation action failed'
  }
  finally {
    isBusy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="impersonation-heading">
    <header class="section-heading">
      <h2 id="impersonation-heading">
        Impersonation
      </h2><span
        v-if="!isImpersonating && user?.role !== 'admin'"
        class="requirement"
      >Admin session required</span><span
        v-else
        class="meta"
      >{{ isImpersonating ? 'Impersonating' : 'Admin' }}</span>
    </header>
    <form @submit.prevent="runAction('start')">
      <fieldset
        class="form-stack form-fields"
        :disabled="isBusy || isLoading || user?.role !== 'admin' || isImpersonating"
      >
        <label>Target user<input
          v-model="target"
          type="text"
          placeholder="User ID or email"
          required
        ></label>
        <label>Reason (optional)<textarea
          v-model="reason"
          rows="2"
          placeholder="Support investigation"
        /></label>
        <div class="action-row">
          <button
            type="submit"
            class="button button-primary"
          >
            Start impersonation
          </button>
        </div>
      </fieldset>
    </form>
    <div
      v-if="isImpersonating"
      class="action-row"
    >
      <button
        type="button"
        class="button"
        :disabled="isBusy || isLoading"
        @click="runAction('stop')"
      >
        Stop impersonation
      </button>
    </div>
    <p
      v-if="error"
      class="feedback feedback-error"
      role="alert"
    >
      {{ error }}
    </p>
    <div
      v-if="user"
      class="result-panel"
    >
      <div class="result-heading">
        <strong>Identity context</strong><span class="meta">Live</span>
      </div>
      <dl class="comparison">
        <div><dt>Original user</dt><dd>{{ originalUser?.originalUserEmail || user.email }}</dd></div><div><dt>Effective user</dt><dd>{{ user.email }}</dd></div>
      </dl>
    </div>
    <div class="test-row">
      <div><strong>Server impersonation context</strong><code>GET /api/admin/impersonate-demo</code></div><button
        type="button"
        class="button"
        :disabled="isBusy || isLoading || !isLoggedIn"
        @click="runAction('context')"
      >
        {{ isBusy ? 'Working...' : 'Run request' }}
      </button>
    </div>
    <div
      v-if="response"
      class="result-panel"
    >
      <div class="result-heading">
        <strong>Server response</strong>
      </div><pre>{{ JSON.stringify(response, null, 2) }}</pre>
    </div>
  </section>
</template>
