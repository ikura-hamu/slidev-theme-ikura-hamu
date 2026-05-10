<script setup lang="ts">
import { useNav, useSlideContext } from "@slidev/client";
import { computed } from "vue";

const { $page, $renderContext, $route, $slidev } = useSlideContext();
const { total } = useNav();

const layout = computed(() => {
  return $route?.meta.layout ?? ($page.value === 1 ? "cover" : "default");
});

const shouldShowFooter = computed(() => {
  return layout.value !== "cover" && $renderContext.value !== "none";
});

const slideTitle = computed(() => {
  const title = $slidev.configs.title;
  return typeof title === "string" ? title : "";
});
</script>

<template>
  <footer
    v-if="shouldShowFooter"
    class="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
  >
    <div
      class="absolute right-8 bottom-6 text-slide-text text-[0.75rem] leading-none tracking-normal"
    >
      {{ $page }} / {{ total }}
    </div>
    <div
      class="flex items-center justify-end h-[18px] px-8 bg-gradient-to-r from-slide-background to-slide-primary"
    >
      <div
        class="min-w-0 overflow-hidden text-slide-inverse text-[14px] leading-[1.2] text-right text-ellipsis whitespace-nowrap"
      >
        {{ slideTitle }}
      </div>
    </div>
  </footer>
</template>
