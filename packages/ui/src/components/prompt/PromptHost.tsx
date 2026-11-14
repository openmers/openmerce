import { type FormEvent, type MouseEvent, useRef, useState, useSyncExternalStore } from "react"
import {
  Prompt,
  PromptAction,
  PromptCancel,
  PromptContent,
  PromptDescription,
  PromptFooter,
  PromptHeader,
  PromptTitle,
} from "./Prompt"
import { getPromptRequest, settlePrompt, subscribePrompt } from "./prompt-state"
import { promptInputVariants } from "./variants"

// The kit's `hooks/use-prompt`: a confirmation dialog that returns a promise. One `<PromptHost />` in the root layout.
export function PromptHost() {
  const current = useSyncExternalStore(subscribePrompt, getPromptRequest, getPromptRequest)
  const [input, setInput] = useState("")
  const [inputFor, setInputFor] = useState(current)
  const inputRef = useRef<HTMLInputElement>(null)

  // A new request starts with an empty verification field.
  if (inputFor !== current) {
    setInputFor(current)
    setInput("")
  }

  const validInput = !current?.verificationText || input === current.verificationText
  const instructionParts = current?.verificationInstruction?.includes("{val}")
    ? current.verificationInstruction.split("{val}")
    : ["Please type", "to confirm:"]

  function confirm(event: FormEvent | MouseEvent) {
    // Stops the native submit and the Radix auto close, which would settle the prompt as cancelled.
    event.preventDefault()
    if (validInput) settlePrompt(true)
  }

  return (
    <Prompt
      open={current !== null}
      variant={current?.variant ?? "danger"}
      onOpenChange={(open) => {
        if (!open) settlePrompt(false)
      }}
    >
      <PromptContent
        onOpenAutoFocus={(event) => {
          if (!inputRef.current) return
          event.preventDefault()
          inputRef.current.focus()
        }}
      >
        <form onSubmit={confirm}>
          <PromptHeader>
            <PromptTitle>{current?.title}</PromptTitle>
            <PromptDescription>{current?.description}</PromptDescription>
          </PromptHeader>
          {current?.verificationText && (
            <div className="border-border mt-6 flex flex-col gap-y-4 border-y p-6">
              <label
                className="text-muted-foreground txt-compact-small"
                htmlFor="prompt-verification"
              >
                {instructionParts[0]}{" "}
                <span className="txt-compact-medium-plus text-foreground">
                  {current.verificationText}
                </span>{" "}
                {instructionParts[1]}
              </label>
              <input
                ref={inputRef}
                autoComplete="off"
                id="prompt-verification"
                className={promptInputVariants()}
                placeholder={current.verificationText}
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
              />
            </div>
          )}
          <PromptFooter>
            <PromptCancel>{current?.cancelText ?? "Cancel"}</PromptCancel>
            <PromptAction
              type={current?.verificationText ? "submit" : "button"}
              disabled={!validInput}
              onClick={confirm}
            >
              {current?.confirmText ?? "Confirm"}
            </PromptAction>
          </PromptFooter>
        </form>
      </PromptContent>
    </Prompt>
  )
}
