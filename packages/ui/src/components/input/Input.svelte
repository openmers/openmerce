<script lang="ts">
import Eye from "@lucide/svelte/icons/eye"
import EyeOff from "@lucide/svelte/icons/eye-off"
import Search from "@lucide/svelte/icons/search"
import type { HTMLInputAttributes } from "svelte/elements"
import { cn } from "../../utils/cn"
import { type InputVariants, inputVariants } from "./variants"

type Props = Omit<HTMLInputAttributes, "size"> & InputVariants

let { class: className, type, size = "base", ...rest }: Props = $props()

let toggledType = $state<"text" | "password" | null>(null)
const typeState = $derived(toggledType ?? type)
const isPassword = $derived(type === "password")
const isSearch = $derived(type === "search")
</script>

<div class="relative">
  <input
    type={isPassword ? typeState : type}
    class={cn(
      inputVariants({ size }),
      {
        "pl-8": isSearch && size === "base",
        "pr-8": isPassword && size === "base",
        "pl-7": isSearch && size === "small",
        "pr-7": isPassword && size === "small",
      },
      className,
    )}
    {...rest}
  />
  {#if isSearch}
    <div
      class={cn(
        "pointer-events-none absolute bottom-0 left-0 flex items-center justify-center text-fg-muted",
        {
          "h-8 w-8": size === "base",
          "h-7 w-7": size === "small",
        },
      )}
      role="img"
    >
      <Search aria-hidden="true" />
    </div>
  {/if}
  {#if isPassword}
    <div
      class={cn("absolute bottom-0 right-0 flex items-center justify-center border-l", {
        "h-8 w-8": size === "base",
        "h-7 w-7": size === "small",
      })}
    >
      <button
        class="h-fit w-fit rounded-xs text-fg-muted outline-hidden transition-all hover:text-foreground focus-visible:text-foreground active:text-foreground"
        type="button"
        onclick={() => {
          toggledType = typeState === "password" ? "text" : "password"
        }}
      >
        <span class="sr-only">
          {typeState === "password" ? "Show password" : "Hide password"}
        </span>
        {#if typeState === "password"}
          <Eye aria-hidden="true" />
        {:else}
          <EyeOff aria-hidden="true" />
        {/if}
      </button>
    </div>
  {/if}
</div>
