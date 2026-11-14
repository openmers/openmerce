import { useState } from "react"
import { PromptHost } from "../PromptHost"
import { prompt } from "../prompt-state"

export function PromptHostExample({
  verificationText,
  verificationInstruction,
  variant = "danger",
}: {
  verificationText?: string
  verificationInstruction?: string
  variant?: "danger" | "confirmation"
}) {
  const [result, setResult] = useState("bekliyor")

  async function ask() {
    const confirmed = await prompt({
      title: "Mağazayı sil",
      description: "Bu işlem geri alınamaz.",
      variant,
      verificationText,
      verificationInstruction,
      confirmText: "Sil",
      cancelText: "Vazgeç",
    })
    setResult(confirmed ? "onaylandı" : "iptal")
  }

  return (
    <>
      <button type="button" onClick={ask}>
        Sor
      </button>
      <PromptHost />
      <p data-testid="result">{result}</p>
    </>
  )
}
