<script setup lang="ts">
import type { AppTokenClaims } from '~~/shared/types/token'

defineOptions({ name: 'AegisPlayground' })

const route = useRoute()
const { user, isLoggedIn, isLoading, logout, isImpersonating, originalUser, stopImpersonation } = useAuth<AppTokenClaims>()
const sessionError = ref('')
const isBusy = ref(false)

async function handleSessionAction(action: 'logout' | 'stop') {
  sessionError.value = ''
  isBusy.value = true
  try {
    if (action === 'logout') {
      await logout('/sign-in')
    }
    else {
      await stopImpersonation()
    }
  }
  catch (error) {
    sessionError.value = error instanceof Error ? error.message : 'Session action failed'
  }
  finally {
    isBusy.value = false
  }
}

const scenarios = [
  { id: 'sign-in', label: 'Sign-in', detail: 'Providers & mock users' },
  { id: 'access', label: 'Access checks', detail: 'APIs & protected pages' },
  { id: 'claims', label: 'Claims', detail: 'Roles & permissions' },
  { id: 'impersonation', label: 'Impersonation', detail: 'Admin & user context' },
  { id: 'account', label: 'Account', detail: 'Password & recovery' },
  { id: 'ssr', label: 'SSR', detail: 'Rendering & hydration' },
  { id: 'redirects', label: 'Redirects', detail: 'Login & logout destinations' },
]
</script>

<template>
  <div class="playground-page">
    <div class="playground-shell">
      <header class="page-header">
        <div>
          <h1>Nuxt Aegis playground</h1>
          <p class="page-subtitle">
            Authentication scenarios
          </p>
        </div>
        <div class="header-session">
          <span class="status"><span
            class="status-dot"
            :class="{ 'status-dot--inactive': !isLoggedIn }"
          /> {{ isLoading ? 'Restoring session...' : isLoggedIn ? 'Signed in' : 'Signed out' }}</span>
          <button
            v-if="isLoggedIn"
            type="button"
            class="button"
            :disabled="isBusy || isLoading"
            @click="handleSessionAction('logout')"
          >
            Sign out
          </button>
        </div>
      </header>

      <p
        v-if="sessionError"
        class="feedback feedback-error"
        role="alert"
      >
        {{ sessionError }}
      </p>
      <div
        v-if="isImpersonating"
        class="impersonation-notice"
      >
        <div><strong>Impersonating {{ user?.email }}</strong><small>Original identity: {{ originalUser?.originalUserEmail }}</small><small v-if="user?.impersonation?.reason">Reason: {{ user.impersonation.reason }}</small></div>
        <button
          type="button"
          class="button"
          :disabled="isBusy || isLoading"
          @click="handleSessionAction('stop')"
        >
          End impersonation
        </button>
      </div>

      <div class="workspace">
        <aside class="scenario-sidebar">
          <nav aria-label="Scenarios">
            <h2 class="sidebar-heading">
              Scenarios
            </h2>
            <ul class="scenario-list">
              <li
                v-for="scenario in scenarios"
                :key="scenario.id"
              >
                <a
                  v-if="scenario.id === 'ssr'"
                  :href="`/${scenario.id}`"
                  class="scenario-link"
                  :class="{ 'scenario-link--active': route.path === `/${scenario.id}` }"
                  :aria-current="route.path === `/${scenario.id}` ? 'page' : undefined"
                >
                  <span>{{ scenario.label }}</span>
                  <small>{{ scenario.detail }}</small>
                </a>
                <NuxtLink
                  v-else
                  :to="`/${scenario.id}`"
                  class="scenario-link"
                  exact-active-class="scenario-link--active"
                >
                  <span>{{ scenario.label }}</span>
                  <small>{{ scenario.detail }}</small>
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <div class="sidebar-footer">
            <span class="environment-dot" /> Development
          </div>
        </aside>

        <main class="scenario-content">
          <NuxtPage />
        </main>

        <aside
          class="session-sidebar"
          aria-labelledby="session-heading"
        >
          <div class="section-heading">
            <h2 id="session-heading">
              Session
            </h2><span class="meta">{{ isLoading ? 'Loading' : isLoggedIn ? 'Active' : 'Guest' }}</span>
          </div>
          <div
            v-if="user"
            class="session-identity"
          >
            <span
              class="avatar avatar-large"
              aria-hidden="true"
            >{{ (user.name || user.email || '?').slice(0, 2).toUpperCase() }}</span><div><strong>{{ user.name || 'User' }}</strong><small>{{ user.email }}</small></div>
          </div>
          <p
            v-else
            class="meta"
          >
            {{ isLoading ? 'Restoring session...' : 'No active session' }}
          </p>
          <dl
            v-if="user"
            class="session-details"
          >
            <div><dt>Provider</dt><dd>{{ user.provider || '—' }}</dd></div>
            <div><dt>Role</dt><dd>{{ user.role || '—' }}</dd></div>
            <div v-if="user.subscription">
              <dt>Subscription</dt><dd>{{ user.subscription }}</dd>
            </div>
            <div>
              <dt>Permissions</dt><dd>
                <span
                  v-for="permission in user.permissions"
                  :key="permission"
                  class="permission-tag"
                >{{ permission }}</span><span v-if="!user.permissions?.length">None</span>
              </dd>
            </div>
            <div><dt>Impersonating</dt><dd>{{ isImpersonating ? 'Yes' : 'No' }}</dd></div>
          </dl>
          <details
            v-if="user"
            class="disclosure"
            open
          >
            <summary>Raw claims</summary><pre class="claims-json">{{ JSON.stringify(user, null, 2) }}</pre>
          </details>
          <div
            v-if="isLoggedIn"
            class="session-footer"
          >
            <span class="status-dot" /> Session active
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style>
.playground-page {
& {
  --ink: #222;
  --muted: #626862;
  --border: #ddd;
  --accent: #006f47;
  --selected: #e5f2eb;
  --surface: #f6f8f7;
  min-height: 100vh;
  padding: 24px 24px 48px;
  box-sizing: border-box;
  color: var(--ink);
  background: #fff;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0;
}
*, *::before, *::after { box-sizing: border-box; }
.playground-shell { max-width: 1320px; margin: 0 auto; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 8px; color: var(--muted); margin-bottom: 24px; }
a { color: var(--accent); text-underline-offset: 3px; }
.page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
h1 { margin: 0; font-size: 28px; line-height: 1.2; font-weight: 650; text-wrap: balance; }
.page-subtitle { margin: 6px 0 0; color: var(--muted); }
.header-session, .action-row, .provider-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.status { display: inline-flex; align-items: center; gap: 7px; color: var(--accent); font-size: 13px; }
.status-dot, .environment-dot { display: inline-block; flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.environment-dot { background: #858b86; }
.workspace { display: grid; grid-template-columns: 196px minmax(0, 1fr) 272px; gap: 32px; align-items: start; padding-top: 28px; }
.workspace > * { min-width: 0; }
.scenario-sidebar, .session-sidebar { position: sticky; top: 24px; }
h2, .sidebar-heading { margin: 0; font-size: 18px; line-height: 1.4; font-weight: 650; }
.sidebar-heading { font-size: 14px; margin-bottom: 12px; }
.scenario-list { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border); }
.scenario-list li { border-bottom: 1px solid var(--border); }
.scenario-link { display: grid; gap: 2px; padding: 12px 10px; color: var(--ink); text-decoration: none; border-radius: 0; }
.scenario-link span { font-weight: 600; }
.scenario-link:hover, .scenario-link:focus-visible, .scenario-link--active { background: var(--selected); }
.scenario-link small { font-size: 12px; }
.sidebar-footer { display: flex; gap: 8px; align-items: center; margin-top: 24px; color: var(--muted); font-size: 12px; }
.section-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; min-height: 32px; margin-bottom: 20px; }
h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
.meta, small { color: var(--muted); font-size: 13px; font-weight: 400; }
small { display: block; }
.requirement { color: #76501d; background: #faf1de; padding: 2px 7px; border-radius: 4px; font-size: 12px; }
.identity-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
.identity-list li { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.identity, .identity-action, .session-identity { display: flex; gap: 10px; align-items: center; min-width: 0; }
.identity > div, .session-identity > div { min-width: 0; overflow-wrap: anywhere; }
.identity-action { flex-wrap: wrap; }
strong { font-weight: 600; }
.avatar { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 4px; background: var(--selected); color: var(--accent); font-size: 13px; font-weight: 600; }
.avatar-large { width: 38px; height: 38px; }
.subsection { margin-top: 24px; }
.button { min-height: 32px; padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; color: var(--ink); background: #fff; font: inherit; font-size: 13px; white-space: nowrap; }
.button { cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
.button:hover:not(:disabled) { background: var(--selected); }
.button-primary { color: #fff; border-color: var(--accent); background: var(--accent); }
.button-primary:hover:not(:disabled) { background: #005638; }
.button:disabled { cursor: not-allowed; color: #646964; background: #f7f8f7; }
.button-primary:disabled { color: #626862; border-color: #ccc; background: #f7f8f7; }
.status-dot--inactive { background: #858b86; }
.feedback { margin: 16px 0 0; padding: 10px 12px; background: var(--selected); border-radius: 4px; overflow-wrap: anywhere; }
.feedback-error { color: #8f2518; background: #fff0ed; }
.impersonation-notice { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px; margin-top: 20px; background: #faf1de; border-radius: 4px; }
.provider-actions .button { flex: 1; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.form-stack { display: grid; gap: 12px; }
.form-fields { border: 0; padding: 0; margin: 0; min-width: 0; }
label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; min-width: 0; }
input:not([type='radio']):not([type='checkbox']), select, textarea { width: 100%; min-width: 0; min-height: 36px; padding: 7px 10px; border: 1px solid #ccc; border-radius: 4px; color: var(--ink); background: #fff; font: inherit; }
input::placeholder, textarea::placeholder { color: var(--muted); }
textarea { resize: vertical; }
input[type='radio'], input[type='checkbox'] { margin: 0; accent-color: var(--accent); width: 14px; height: 14px; }
.mode-selector { display: flex; flex-wrap: wrap; gap: 18px; border: 0; padding: 0; margin: 0 0 16px; }
.mode-selector label, .permission-fields label { display: flex; align-items: center; gap: 6px; font-weight: 400; }
.action-row { margin-top: 14px; }
.action-row a { font-size: 13px; }
.disclosure { border-top: 1px solid var(--border); margin-top: 20px; padding-top: 12px; }
summary { cursor: pointer; font-size: 13px; font-weight: 500; }
.detail-content { margin-top: 14px; }
.detail-content > .button { margin-top: 12px; justify-self: start; }
.test-list { border-top: 1px solid var(--border); }
.test-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); }
.test-row > div { min-width: 0; flex: 1 1 180px; }
.test-row code { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.result-panel { margin-top: 18px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); overflow: hidden; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 12px; border-bottom: 1px solid var(--border); font-size: 12px; }
pre { margin: 0; padding: 12px; font-family: 'Consolas', 'Liberation Mono', monospace; font-size: 12px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.short-field { max-width: 240px; }
.permission-fields { display: flex; gap: 16px; flex-wrap: wrap; border: 0; padding: 0; margin: 18px 0; }
.permission-fields legend { margin-bottom: 10px; font-size: 13px; font-weight: 500; }
.comparison { margin: 0; padding: 12px; display: grid; gap: 8px; font-size: 13px; }
.comparison > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; }
dt { color: var(--muted); }
dd { margin: 0; overflow-wrap: anywhere; }
.session-sidebar { padding-left: 24px; border-left: 1px solid var(--border); }
.session-sidebar h2 { font-size: 14px; }
.session-sidebar .section-heading { margin-bottom: 16px; }
.session-details { display: grid; gap: 12px; margin: 22px 0; font-size: 13px; }
.session-details > div { display: flex; justify-content: space-between; gap: 12px; }
.permission-tag { padding: 2px 6px; background: var(--selected); color: var(--accent); border-radius: 3px; font-family: 'Consolas', monospace; font-size: 12px; }
.claims-json { padding: 12px 0 0; font-size: 11px; }
.session-footer { display: flex; align-items: center; gap: 7px; padding-top: 16px; margin-top: 20px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 1100px) {
  .workspace { grid-template-columns: 172px minmax(0, 1fr); gap: 24px; }
  .session-sidebar { grid-column: 2; position: static; border-left: 0; border-top: 1px solid var(--border); padding: 24px 0 0; }
  .session-details { max-width: 360px; }
}
@media (max-width: 700px) {
  & { padding: 20px 16px 32px; }
  h1 { font-size: 24px; }
  .workspace { grid-template-columns: minmax(0, 1fr); padding-top: 20px; }
  .scenario-sidebar { position: static; }
  .scenario-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scenario-link { padding: 10px 4px; }
  .scenario-link small { display: none; }
  .sidebar-footer { display: none; }
  .session-sidebar { grid-column: 1; grid-row: 2; padding: 16px 0; border-bottom: 1px solid var(--border); }
  .session-sidebar .disclosure, .session-footer { display: none; }
  .session-details { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 14px 0 0; max-width: none; }
  .session-details > div { gap: 6px; }
  .form-grid { grid-template-columns: minmax(0, 1fr); }
  .identity-list li { align-items: flex-start; }
  .identity-action { margin-left: 42px; }
}
}
</style>
