<script setup lang="ts"></script>

<template>
  <div class="slidev-layout cover bg-slide-primary">
    <div class="my-auto w-full text-center">
      <slot />
    </div>
  </div>
</template>

<style lang="css" scoped>
.cover {
  @apply text-slide-inverse;
  :deep(h1) {
    border-bottom: 8px solid;
    @apply border-slide-accent text-slide-inverse;
  }
}
</style>
