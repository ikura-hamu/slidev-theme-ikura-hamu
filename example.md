---
theme: ./
---

# スライドテーマスライドテーマスライドテーマ

## ikura-hamu / aaa

---
layout: intro
---

::icon::

<MyIcon />

::content::

# ikura-hamu / いくら・はむ

- イントロ
- intro

---

# Slidev って何？

Slidev は開発者のために設計された、スライド制作・プレゼンテーションツールです。以下の機能を持っています。

- 📝 **テキストベース** - Markdown で内容に集中し、スタイルを後から付ける
- 🎨 **テーマによるカスタム** - テーマは npm パッケージとして共有し再利用
- 🧑‍💻 **開発者フレンドリー** - コードハイライト、ライブコーディング、自動補完
- 🤹 **インタラクティブ** - Vue コンポーネントを埋め込んで表現を拡張
- 🎥 **レコーディング** - ビルトインのレコーディングとカメラ
- 📤 **ポータブル** - PDF、PPTX、PNG、ホストできる SPA にエクスポート
- 🛠 **ハックできる** - Web ページでできることは Slidev でもなんでもできる

Read more about [Why Slidev?](https://sli.dev/guide/why)

---

# Components

## `<MyIcon />`

<MyIcon />

---

# Code

Use code snippets and get the highlighting directly!

```ts
interface User {
  id: number
  firstName: string
  lastName: string
  role: string
}

function updateUser(id: number, update: Partial<User>) {
  const user = getUser(id)
  const newUser = { ...user, ...update }
  saveUser(id, newUser)
}
```
