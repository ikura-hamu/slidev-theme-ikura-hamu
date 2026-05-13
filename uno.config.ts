import { defineConfig } from "unocss";

export default defineConfig({
  theme: {
    colors: {
      // Main brand color
      primary: {
        DEFAULT: "var(--ikura-slide-primary)",
        base: "var(--ikura-slide-primary)",
        light: "var(--ikura-slide-secondary)",
      },

      // Semantic palette for presentation slides
      slide: {
        primary: "var(--ikura-slide-primary)", // ベース・主張・章タイトル
        secondary: "var(--ikura-slide-secondary)", // 補助情報・サブ見出し
        background: "var(--ikura-slide-background)", // 通常背景・カード背景
        accent: "var(--ikura-slide-accent)", // ハイライト・注意喚起
        text: "var(--ikura-slide-text)", // 本文・見出し
        inverse: "var(--ikura-slide-inverse)", // 青・黒背景上の文字
      },
    },
    fontSize: {
      sm: ["20px", "1.5"],
      md: ["24px", "1.5"],
      lg: ["28px", "1.5"],
    },
    boxShadow: {
      slide: "0 18px 45px rgba(13, 13, 13, 0.12)",
      card: "0 8px 24px rgba(13, 13, 13, 0.08)",
    },

    borderRadius: {
      slide: "24px",
      card: "18px",
    },
  },
});
