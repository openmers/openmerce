import { type ComponentProps, useLayoutEffect, useRef, useState } from "react"
import { cn } from "../../utils/cn"
import { Copy } from "../copy"

export type CodeSnippet = {
  label: string
  language: string
  code: string
  hideLineNumbers?: boolean
  hideCopy?: boolean
}

type Props = ComponentProps<"div"> & {
  snippets: CodeSnippet[]
  hideLabels?: boolean
}

export function CodeBlock({ snippets, hideLabels = false, className, children, ...rest }: Props) {
  const [active, setActive] = useState(snippets[0])
  const tabEls = useRef<Array<HTMLButtonElement | null>>([])
  const [indicator, setIndicator] = useState({ left: "15px", width: "0px" })

  useLayoutEffect(() => {
    const activeIndex = snippets.findIndex((snippet) => snippet.label === active?.label)
    const activeTab = tabEls.current[activeIndex]
    if (!activeTab) {
      return
    }
    const previousWidth = tabEls.current
      .slice(0, activeIndex)
      .reduce((total, tab) => total + (tab?.offsetWidth || 0) + 12, 0)
    setIndicator({ left: `${previousWidth + 15}px`, width: `${activeTab.offsetWidth}px` })
  }, [active, snippets])

  if (!active) {
    return null
  }
  const lines = active.code.split("\n")

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-contrast-bg-base shadow-elevation-code-block",
        className,
      )}
      {...rest}
    >
      <div>
        {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: the label is set only together with the tablist role */}
        <div
          className="flex items-start px-4 pt-2.5"
          role={hideLabels ? undefined : "tablist"}
          aria-label={hideLabels ? undefined : "Code snippets"}
        >
          {!hideLabels &&
            snippets.map((snippet, idx) => (
              <button
                key={snippet.label}
                type="button"
                role="tab"
                aria-selected={active.label === snippet.label}
                data-label={snippet.label}
                ref={(el) => {
                  tabEls.current[idx] = el
                }}
                onClick={() => setActive(snippet)}
                className={cn(
                  "txt-compact-small-plus relative cursor-pointer pb-[9px] pr-3 text-contrast-fg-secondary transition-fg",
                  { "cursor-default text-primary-foreground": active.label === snippet.label },
                )}
              >
                {snippet.label}
              </button>
            ))}
        </div>
        <div className="w-full px-0.5">
          <div className="relative h-px w-full bg-contrast-border-top">
            <div
              className="absolute bottom-0 transition-all duration-150 ease-linear motion-reduce:transition-none"
              style={indicator}
            >
              <div className="h-px rounded-full bg-primary-foreground" />
            </div>
          </div>
        </div>
      </div>
      {(children || !active.hideCopy) && (
        <div className="flex min-h-10 items-center gap-x-3 border-t border-contrast-border-bot px-4 py-2">
          <div className="flex-1 text-contrast-fg-secondary">{children}</div>
          {!active.hideCopy && (
            <Copy content={active.code} className="text-contrast-fg-secondary" />
          )}
        </div>
      )}
      <div className="flex h-full flex-col overflow-hidden px-[5px] pb-[5px]">
        <div className="relative h-full overflow-y-auto rounded-lg border border-contrast-border-bot bg-contrast-bg-subtle p-4">
          <div className="max-w-[90%]">
            <pre
              className={cn("whitespace-pre-wrap bg-transparent", {
                "grid grid-cols-[auto,1fr] gap-x-4": !active.hideLineNumbers,
              })}
            >
              {!active.hideLineNumbers && (
                <div role="presentation" className="flex flex-col text-right">
                  {lines.map((_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are positional
                    <span key={index} className="tabular-nums text-contrast-fg-secondary">
                      {index + 1}
                    </span>
                  ))}
                </div>
              )}
              <div>
                {lines.map((line, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: code lines are positional
                  <div key={index}>{line || " "}</div>
                ))}
              </div>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
