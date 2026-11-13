// tokens.json -> packages/ui/src/theme.css (Tailwind 4). No dependencies, Node only.
import { readFileSync, writeFileSync } from "node:fs"

const here = new URL(".", import.meta.url)
const tokens = JSON.parse(readFileSync(new URL("src/tokens.json", here), "utf8"))
const out = new URL("../ui/src/theme.css", here)

const decls = (obj, indent) =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join("\n")
const vars = (obj, prefix = "") =>
  decls(Object.fromEntries(Object.entries(obj).map(([k, v]) => [`--${prefix}${k}`, v])), "  ")
const refs = (prefix, names) => names.map((n) => `  --${prefix}-${n}: var(--${n});`).join("\n")

const colorNames = [...Object.keys(tokens.colors.light), ...Object.keys(tokens.colorAliases)]
const aliasVars = Object.fromEntries(
  Object.entries(tokens.colorAliases).map(([k, v]) => [k, `var(--${v})`]),
)

const typography = Object.entries(tokens.typography)
  .map(
    ([name, t]) => `@utility ${name} {
  font-family: ${tokens.typographyFonts[t.fontFamily]};
  font-size: ${t.fontSize};
  line-height: ${t.lineHeight};
  font-weight: ${t.fontWeight};
}`,
  )
  .join("\n\n")

const keyframes = Object.entries(tokens.keyframes)
  .map(([name, steps]) => {
    const body = Object.entries(steps)
      .map(([step, props]) => `  ${step} {\n${decls(props, "    ")}\n  }`)
      .join("\n")
    return `@keyframes ${name} {\n${body}\n}`
  })
  .join("\n\n")

const css = `/* GENERATED, do not edit by hand. Source: packages/tokens/src/tokens.json, command: pnpm --filter @openmers/tokens build:theme */
/* Values come from an MIT-licensed design token preset; see the root NOTICE. */

@custom-variant dark (&:where(.dark, .dark *, [data-mode="dark"], [data-mode="dark"] *));

@theme inline {
${refs("color", colorNames)}

${refs("shadow", Object.keys(tokens.shadows.light))}

  --font-sans: ${tokens.fonts.sans};
  --font-mono: ${tokens.fonts.mono};

${vars(tokens.radius, "radius-")}

${vars(tokens.animation, "animate-")}
}

:root {
${vars(tokens.colors.light)}
${vars(aliasVars)}
${vars(tokens.shadows.light)}
}

.dark,
[data-mode="dark"] {
${vars(tokens.colors.dark)}
${vars(tokens.shadows.dark)}
}

@layer base {
  * {
    border-color: var(--border);
  }

  /* Icons are 15px "mini" upstream; lucide defaults to 24px. An explicit size class (size-*) overrides this. */
  svg.lucide {
    width: 15px;
    height: 15px;
  }

  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}

@utility transition-fg {
  transition-property: ${tokens.transitionProperty.fg};
  transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
  transition-duration: var(--tw-duration, var(--default-transition-duration));
}

${typography}

${keyframes}
`

writeFileSync(out, css)
console.log(`theme.css yazıldı: ${colorNames.length} renk adı`)
