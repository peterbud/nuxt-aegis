<script setup lang="ts">
const auth = useAuth()
const first = await useAegisFetch('/api/aegis-fetch')
const second = await useAegisFetch('/api/aegis-fetch')
const sharedFirst = await useAegisFetch('/api/aegis-fetch', { key: 'aegis-shared' })
const sharedSecond = await useAegisFetch('/api/aegis-fetch', { key: 'aegis-shared' })
const label = ref('options')
const options = await useAegisFetch('/api/aegis-fetch', {
  query: { label },
  transform: result => ({ email: result.email, label: result.label.toUpperCase(), unused: true }),
  pick: ['email', 'label'],
})
const deferred = await useAegisFetch('/api/aegis-fetch', {
  immediate: false,
  default: () => ({ email: '', label: 'default', requestId: '' }),
})
const mounted = ref(false)
onMounted(
  () => { mounted.value = true },
)

async function fetchDeferred() {
  await auth.refresh()
  await deferred.execute()
}
</script>

<template>
  <div>
    <div id="mounted">
      {{ mounted }}
    </div>
    <div id="email">
      {{ first.data.value?.email }}
    </div>
    <div id="status">
      {{ first.status.value }}
    </div>
    <div id="distinct">
      {{ first.data.value?.requestId !== second.data.value?.requestId }}
    </div>
    <div id="shared">
      {{ sharedFirst.data.value?.requestId === sharedSecond.data.value?.requestId }}
    </div>
    <div id="first-id">
      {{ first.data.value?.requestId }}
    </div>
    <div id="second-id">
      {{ second.data.value?.requestId }}
    </div>
    <div id="options">
      {{ JSON.stringify(options.data.value) }}
    </div>
    <div id="deferred">
      {{ deferred.data.value?.label }}
    </div>
    <div id="deferred-email">
      {{ deferred.data.value?.email }}
    </div>
    <div id="deferred-error">
      {{ deferred.error.value?.statusCode }}
    </div>
    <div id="auth-status">
      {{ auth.authStatus.value }}
    </div>
    <div id="auth-user">
      {{ auth.user.value?.sub }}
    </div>
    <div id="auth-error">
      {{ auth.error.value?.category }}
    </div>
    <button
      id="execute"
      @click="fetchDeferred"
    >
      Execute
    </button>
    <button
      id="refresh"
      @click="first.refresh()"
    >
      Refresh
    </button>
    <button
      id="query"
      @click="label = 'changed'"
    >
      Change Query
    </button>
    <button
      id="clear"
      @click="deferred.clear()"
    >
      Clear
    </button>
  </div>
</template>
