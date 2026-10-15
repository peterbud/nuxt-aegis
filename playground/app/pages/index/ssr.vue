<script setup lang="ts">
defineOptions({ name: 'SsrScenario' })

const { user, authStatus, isLoggedIn, isLoading: authLoading } = useAuth()
const isHydrated = ref(false)
const isLoading = computed(() => !isHydrated.value || authLoading.value)
const { data, error, status, refresh: fetchProfile, clear } = await useAegisFetch('/api/user/profile', {
  key: 'ssr-profile',
  immediate: isLoggedIn.value,
  watch: false,
})

const serverSnapshot = useState('playground-ssr-snapshot', () => ({
  renderedOnServer: import.meta.server,
  renderedAt: import.meta.server ? new Date().toISOString() : null,
  authStatus: import.meta.server ? authStatus.value : null,
  user: import.meta.server && user.value
    ? { name: user.value.name, email: user.value.email, provider: user.value.provider }
    : null,
  profileFetched: import.meta.server && data.value != null,
}))

watch(isLoggedIn, (signedIn) => {
  if (signedIn) {
    void fetchProfile()
  }
  else {
    clear()
  }
})

onMounted(() => {
  isHydrated.value = true
  if (isLoggedIn.value && !data.value && status.value !== 'pending') {
    void fetchProfile()
  }
})
</script>

<template>
  <section aria-labelledby="ssr-heading">
    <header class="section-heading">
      <h2 id="ssr-heading">
        SSR
      </h2><span class="meta">Rendering</span>
    </header>
    <div class="test-list">
      <div class="test-row">
        <div><strong>Server rendering & hydration</strong><small>Session restoration & authenticated fetching</small></div><button
          type="button"
          class="button"
          :disabled="isLoading"
          @click="reloadNuxtApp({ path: '/ssr', force: true })"
        >
          Reload page
        </button>
      </div>
    </div>
    <div class="subsection">
      <h3>Server snapshot</h3>
      <dl
        class="comparison"
        data-testid="server-snapshot"
      >
        <div><dt>Document</dt><dd>{{ serverSnapshot.renderedOnServer ? 'Server-rendered' : 'Client-side navigation' }}</dd></div>
        <div><dt>Rendered at</dt><dd>{{ serverSnapshot.renderedAt || 'Not rendered on server' }}</dd></div>
        <div><dt>Session</dt><dd>{{ serverSnapshot.authStatus === 'authenticated' ? 'Authenticated' : serverSnapshot.authStatus === 'guest' ? 'Guest' : 'Not resolved' }}</dd></div>
        <div><dt>User</dt><dd>{{ serverSnapshot.user?.email || 'None' }}</dd></div>
        <div><dt>Provider</dt><dd>{{ serverSnapshot.user?.provider || 'None' }}</dd></div>
        <div><dt>Profile fetched</dt><dd>{{ serverSnapshot.profileFetched ? 'Yes' : 'No' }}</dd></div>
      </dl>
    </div>
    <div class="subsection">
      <h3>Live client state</h3>
      <dl
        class="comparison"
        data-testid="client-state"
      >
        <div><dt>Client mounted</dt><dd>{{ isHydrated ? 'Yes' : 'No' }}</dd></div>
        <div><dt>Session</dt><dd>{{ isLoading ? 'Restoring...' : isLoggedIn ? 'Authenticated' : 'Guest' }}</dd></div>
        <div><dt>User</dt><dd>{{ user?.email || 'None' }}</dd></div>
      </dl>
      <div class="action-row">
        <button
          type="button"
          class="button button-primary"
          :disabled="isLoading || !isLoggedIn || status === 'pending'"
          @click="fetchProfile()"
        >
          {{ status === 'pending' ? 'Fetching...' : 'Fetch profile' }}
        </button>
      </div>
      <p
        v-if="!isLoggedIn"
        class="meta"
      >
        Sign in to fetch your profile.
      </p>
      <p
        v-if="error"
        class="feedback feedback-error"
        role="alert"
      >
        {{ error.message }}
      </p>
      <div
        v-if="data"
        class="result-panel"
      >
        <div class="result-heading">
          <strong>Profile response</strong><span class="status">200 OK</span>
        </div><pre>{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </div>
  </section>
</template>
