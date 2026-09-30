/** esbuild is run with `--loader:.css=text`, so CSS imports resolve to their source as a string. */
declare module '*.css' {
  const css: string
  export default css
}
