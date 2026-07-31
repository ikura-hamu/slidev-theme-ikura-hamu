# @ikura-hamu/create-slidev-theme-ikura-hamu

Create a Slidev project, install [`@ikura-hamu/slidev-theme-ikura-hamu`](https://www.npmjs.com/package/@ikura-hamu/slidev-theme-ikura-hamu), and copy this package's template files into the project.

## Usage

Pass the project directory as an argument:

```sh
npm create @ikura-hamu/slidev-theme-ikura-hamu my-slides
pnpm create @ikura-hamu/slidev-theme-ikura-hamu my-slides
yarn create @ikura-hamu/slidev-theme-ikura-hamu my-slides
bun create @ikura-hamu/slidev-theme-ikura-hamu my-slides
```

If the directory is omitted in an interactive terminal, the creator asks for it.

This creator automatically tells the underlying `create-slidev` command not to install or start the development server. After the theme is installed and template files are copied, it asks whether to start the development server. In a non-interactive environment, the server is not started.

The target directory must not exist or must be empty. This prevents the automatic response intended for the server prompt from being applied to `create-slidev`'s existing-directory confirmation.

## Template files

Add files under [`template`](./template) using the paths they should have in generated projects. The directory is copied recursively after the theme is installed. `.gitkeep` files are ignored.

Existing destination files are overwritten. Existing directories can receive new files, but copying stops before writing anything if a file and directory conflict or if a destination is a symbolic link.
