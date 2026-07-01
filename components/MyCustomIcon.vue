<script setup lang="ts">
import { renderIconCanvas } from '@ikura-hamu/icon-generator'
import { onMounted, useTemplateRef } from 'vue';
import { useSlideContext } from '@slidev/client'

const iconCanvasRef = useTemplateRef('iconCanvasRef');

type IconColors = {
  boardBgColor: string
  textColor: string
} | 'icon-board-primary' | 'icon-text-primary'


const props = defineProps<{
  text: string
  fontSize?: number
  bold?: boolean
  colors?: IconColors
  linePadding?: number
  fontName?: string
}>()


onMounted(async () => {
  if (iconCanvasRef.value) {
    const styles = getComputedStyle(document.documentElement)

    const primaryColor = styles.getPropertyValue('--ikura-slide-primary').trim()
    const inverseColor = styles.getPropertyValue('--ikura-slide-inverse').trim()

    function toCanvasColors(colors: IconColors) {
      if (colors === 'icon-board-primary') {
        return { boardBgColor: primaryColor, textColor: inverseColor }
      }
      if (colors === 'icon-text-primary') {
        return { boardBgColor: inverseColor, textColor: primaryColor }
      }
      return colors
    }

    const canvasColors = toCanvasColors(props.colors || 'icon-board-primary')

    await renderIconCanvas({
      canvas: iconCanvasRef.value,
      boardBgColor: canvasColors.boardBgColor,
      text: props.text,
      textColor: canvasColors.textColor,
      fontName: props.fontName ?? "Noto Sans JP",
      fontSize: props.fontSize ?? 20,
      linePadding: props.linePadding ?? 1,
      bold: props.bold,
    })
  }
})

</script>

<template>
  <canvas ref="iconCanvasRef" />
</template>