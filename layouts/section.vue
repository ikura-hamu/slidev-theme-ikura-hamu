<template>
  <div class="slidev-layout section">
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.slidev-layout.section {
  display: grid;
  grid-template-columns: 2fr 8fr;
  align-items: center;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(90deg,
      var(--ikura-slide-primary) 0 10%,
      var(--ikura-slide-background) 10% 100%);
}

.slidev-layout.section .section-content {
  grid-column: 2;
  width: min(36rem, 78%);
  margin: 0 auto;
}

.slidev-layout.section :deep(h1) {
  margin: 0;
  padding-bottom: 0.7rem;
  padding-right: 1rem;
  border-bottom: 0.4rem solid var(--ikura-slide-accent);
  color: var(--ikura-slide-text);
  font-size: 5rem;
  font-weight: 800;
  line-height: 1.05;
  text-align: right;
}
</style>