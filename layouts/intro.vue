<template>
  <div class="slidev-layout intro">
    <div class="my-auto w-full flex gap-16">
      <div>
        <slot name="icon" />
      </div>
      <div>
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.intro {
  :deep(h1) {
    font-size: 42px;
    @apply border-b-slide-accent border-b-4 px-2;
  }
}
</style>
