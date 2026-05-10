import { defineConfig } from "unocss";

export default defineConfig({
  theme: {
    colors: {
      // Main brand color
      primary: {
        DEFAULT: "#0f71f2",
        base: "#0f71f2",
        light: "#a0a8df",
      },

      // Semantic palette for presentation slides
      slide: {
        primary: "#0f71f2", // ベース・主張・章タイトル
        secondary: "#a0a8df", // 補助情報・サブ見出し
        background: "#e6f4f1", // 通常背景・カード背景
        accent: "#eee8a9", // ハイライト・注意喚起
        text: "#0d0d0d", // 本文・見出し
        inverse: "#ffffff", // 青・黒背景上の文字
      },
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
