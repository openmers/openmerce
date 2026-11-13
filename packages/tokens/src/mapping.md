# Source → OpenMers token mapping

Values are taken verbatim from an MIT-licensed design token preset (see the root `NOTICE`).
Tokens that have a shadcn name take the shadcn name; the rest keep the source name.
Tailwind class: `bg-<name>`, `text-<name>`, `border-<name>` (e.g. `bg-background`, `bg-tag-blue-bg`).
14 tokens were renamed, 76 kept their names; 90 in total.

## Colors (90)

| Source                         | OpenMers                       | Tailwind name                |
| ------------------------------ | ------------------------------ | ---------------------------- |
| `--alpha-250`                  | `--alpha-250`                  | `alpha-250`                  |
| `--alpha-400`                  | `--alpha-400`                  | `alpha-400`                  |
| `--bg-base`                    | `--card`                       | `card`                       |
| `--bg-base-hover`              | `--accent`                     | `accent`                     |
| `--bg-base-pressed`            | `--bg-base-pressed`            | `bg-base-pressed`            |
| `--bg-component`               | `--popover`                    | `popover`                    |
| `--bg-component-hover`         | `--bg-component-hover`         | `bg-component-hover`         |
| `--bg-component-pressed`       | `--bg-component-pressed`       | `bg-component-pressed`       |
| `--bg-disabled`                | `--muted`                      | `muted`                      |
| `--bg-field`                   | `--bg-field`                   | `bg-field`                   |
| `--bg-field-component`         | `--bg-field-component`         | `bg-field-component`         |
| `--bg-field-component-hover`   | `--bg-field-component-hover`   | `bg-field-component-hover`   |
| `--bg-field-hover`             | `--bg-field-hover`             | `bg-field-hover`             |
| `--bg-highlight`               | `--bg-highlight`               | `bg-highlight`               |
| `--bg-highlight-hover`         | `--bg-highlight-hover`         | `bg-highlight-hover`         |
| `--bg-interactive`             | `--bg-interactive`             | `bg-interactive`             |
| `--bg-overlay`                 | `--bg-overlay`                 | `bg-overlay`                 |
| `--bg-subtle`                  | `--background`                 | `background`                 |
| `--bg-subtle-hover`            | `--bg-subtle-hover`            | `bg-subtle-hover`            |
| `--bg-subtle-pressed`          | `--bg-subtle-pressed`          | `bg-subtle-pressed`          |
| `--bg-switch-off`              | `--bg-switch-off`              | `bg-switch-off`              |
| `--bg-switch-off-hover`        | `--bg-switch-off-hover`        | `bg-switch-off-hover`        |
| `--border-base`                | `--border`                     | `border`                     |
| `--border-danger`              | `--border-danger`              | `border-danger`              |
| `--border-error`               | `--border-error`               | `border-error`               |
| `--border-interactive`         | `--ring`                       | `ring`                       |
| `--border-menu-bot`            | `--border-menu-bot`            | `border-menu-bot`            |
| `--border-menu-top`            | `--border-menu-top`            | `border-menu-top`            |
| `--border-strong`              | `--input`                      | `input`                      |
| `--border-transparent`         | `--border-transparent`         | `border-transparent`         |
| `--button-danger`              | `--destructive`                | `destructive`                |
| `--button-danger-hover`        | `--button-danger-hover`        | `button-danger-hover`        |
| `--button-danger-pressed`      | `--button-danger-pressed`      | `button-danger-pressed`      |
| `--button-inverted`            | `--primary`                    | `primary`                    |
| `--button-inverted-hover`      | `--button-inverted-hover`      | `button-inverted-hover`      |
| `--button-inverted-pressed`    | `--button-inverted-pressed`    | `button-inverted-pressed`    |
| `--button-neutral`             | `--secondary`                  | `secondary`                  |
| `--button-neutral-hover`       | `--button-neutral-hover`       | `button-neutral-hover`       |
| `--button-neutral-pressed`     | `--button-neutral-pressed`     | `button-neutral-pressed`     |
| `--button-transparent`         | `--button-transparent`         | `button-transparent`         |
| `--button-transparent-hover`   | `--button-transparent-hover`   | `button-transparent-hover`   |
| `--button-transparent-pressed` | `--button-transparent-pressed` | `button-transparent-pressed` |
| `--contrast-bg-base`           | `--contrast-bg-base`           | `contrast-bg-base`           |
| `--contrast-bg-base-hover`     | `--contrast-bg-base-hover`     | `contrast-bg-base-hover`     |
| `--contrast-bg-base-pressed`   | `--contrast-bg-base-pressed`   | `contrast-bg-base-pressed`   |
| `--contrast-bg-subtle`         | `--contrast-bg-subtle`         | `contrast-bg-subtle`         |
| `--contrast-border-base`       | `--contrast-border-base`       | `contrast-border-base`       |
| `--contrast-border-bot`        | `--contrast-border-bot`        | `contrast-border-bot`        |
| `--contrast-border-top`        | `--contrast-border-top`        | `contrast-border-top`        |
| `--contrast-fg-primary`        | `--primary-foreground`         | `primary-foreground`         |
| `--contrast-fg-secondary`      | `--contrast-fg-secondary`      | `contrast-fg-secondary`      |
| `--fg-base`                    | `--foreground`                 | `foreground`                 |
| `--fg-disabled`                | `--fg-disabled`                | `fg-disabled`                |
| `--fg-error`                   | `--fg-error`                   | `fg-error`                   |
| `--fg-interactive`             | `--fg-interactive`             | `fg-interactive`             |
| `--fg-interactive-hover`       | `--fg-interactive-hover`       | `fg-interactive-hover`       |
| `--fg-muted`                   | `--fg-muted`                   | `fg-muted`                   |
| `--fg-on-color`                | `--fg-on-color`                | `fg-on-color`                |
| `--fg-on-inverted`             | `--fg-on-inverted`             | `fg-on-inverted`             |
| `--fg-subtle`                  | `--muted-foreground`           | `muted-foreground`           |
| `--tag-blue-bg`                | `--tag-blue-bg`                | `tag-blue-bg`                |
| `--tag-blue-bg-hover`          | `--tag-blue-bg-hover`          | `tag-blue-bg-hover`          |
| `--tag-blue-border`            | `--tag-blue-border`            | `tag-blue-border`            |
| `--tag-blue-icon`              | `--tag-blue-icon`              | `tag-blue-icon`              |
| `--tag-blue-text`              | `--tag-blue-text`              | `tag-blue-text`              |
| `--tag-green-bg`               | `--tag-green-bg`               | `tag-green-bg`               |
| `--tag-green-bg-hover`         | `--tag-green-bg-hover`         | `tag-green-bg-hover`         |
| `--tag-green-border`           | `--tag-green-border`           | `tag-green-border`           |
| `--tag-green-icon`             | `--tag-green-icon`             | `tag-green-icon`             |
| `--tag-green-text`             | `--tag-green-text`             | `tag-green-text`             |
| `--tag-neutral-bg`             | `--tag-neutral-bg`             | `tag-neutral-bg`             |
| `--tag-neutral-bg-hover`       | `--tag-neutral-bg-hover`       | `tag-neutral-bg-hover`       |
| `--tag-neutral-border`         | `--tag-neutral-border`         | `tag-neutral-border`         |
| `--tag-neutral-icon`           | `--tag-neutral-icon`           | `tag-neutral-icon`           |
| `--tag-neutral-text`           | `--tag-neutral-text`           | `tag-neutral-text`           |
| `--tag-orange-bg`              | `--tag-orange-bg`              | `tag-orange-bg`              |
| `--tag-orange-bg-hover`        | `--tag-orange-bg-hover`        | `tag-orange-bg-hover`        |
| `--tag-orange-border`          | `--tag-orange-border`          | `tag-orange-border`          |
| `--tag-orange-icon`            | `--tag-orange-icon`            | `tag-orange-icon`            |
| `--tag-orange-text`            | `--tag-orange-text`            | `tag-orange-text`            |
| `--tag-purple-bg`              | `--tag-purple-bg`              | `tag-purple-bg`              |
| `--tag-purple-bg-hover`        | `--tag-purple-bg-hover`        | `tag-purple-bg-hover`        |
| `--tag-purple-border`          | `--tag-purple-border`          | `tag-purple-border`          |
| `--tag-purple-icon`            | `--tag-purple-icon`            | `tag-purple-icon`            |
| `--tag-purple-text`            | `--tag-purple-text`            | `tag-purple-text`            |
| `--tag-red-bg`                 | `--tag-red-bg`                 | `tag-red-bg`                 |
| `--tag-red-bg-hover`           | `--tag-red-bg-hover`           | `tag-red-bg-hover`           |
| `--tag-red-border`             | `--tag-red-border`             | `tag-red-border`             |
| `--tag-red-icon`               | `--tag-red-icon`               | `tag-red-icon`               |
| `--tag-red-text`               | `--tag-red-text`               | `tag-red-text`               |

## shadcn aliases (no value, reference only)

shadcn names that have no separate upstream value point at another token.

| OpenMers                       | value                       |
| ------------------------------ | --------------------------- |
| `--card-foreground`            | `var(--foreground)`         |
| `--popover-foreground`         | `var(--foreground)`         |
| `--secondary-foreground`       | `var(--foreground)`         |
| `--accent-foreground`          | `var(--foreground)`         |
| `--sidebar`                    | `var(--background)`         |
| `--sidebar-foreground`         | `var(--foreground)`         |
| `--sidebar-primary`            | `var(--primary)`            |
| `--sidebar-primary-foreground` | `var(--primary-foreground)` |
| `--sidebar-accent`             | `var(--accent)`             |
| `--sidebar-accent-foreground`  | `var(--foreground)`         |
| `--sidebar-border`             | `var(--border)`             |
| `--sidebar-ring`               | `var(--ring)`               |

## Others (names kept)

- Shadows (23): `--<name>` as is, class `shadow-<name>` (e.g. `shadow-buttons-neutral`).
- Typography (35): upstream class names as is (`txt-compact-small`, `h1-core` …).
- `rounded-xs`, `font-sans`, `font-mono`, `animate-accordion-down/up`, `transition-fg`: as is.
