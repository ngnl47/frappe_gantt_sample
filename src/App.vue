<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <GanttView />
  </div>
</template>

<script setup lang="ts">
import GanttView from './views/GanttView.vue'
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>