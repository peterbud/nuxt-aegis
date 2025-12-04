<template>
  <div>
    <h1>Custom Error Page</h1>
    <p>Authentication failed!</p>
    <p v-if="$route.query.error">
      Error: {{ $route.query.error }}
    </p>
    <p v-if="$route.query.error_description">
      Description: {{ $route.query.error_description }}
    </p>
  </div>
</template>
