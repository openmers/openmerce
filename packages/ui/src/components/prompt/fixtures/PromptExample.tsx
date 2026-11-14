import {
  Prompt,
  PromptAction,
  PromptCancel,
  PromptContent,
  PromptDescription,
  PromptFooter,
  PromptHeader,
  PromptTitle,
  PromptTrigger,
} from "../Prompt"

export function PromptExample({
  open,
  confirmation = false,
}: {
  open?: boolean
  confirmation?: boolean
}) {
  return (
    <Prompt open={open} variant={confirmation ? "confirmation" : "danger"}>
      <PromptTrigger>Mağazayı sil</PromptTrigger>
      <PromptContent>
        <PromptHeader>
          <PromptTitle>Mağazayı sil</PromptTitle>
          <PromptDescription>Bu işlem geri alınamaz.</PromptDescription>
        </PromptHeader>
        <PromptFooter>
          <PromptCancel>Vazgeç</PromptCancel>
          <PromptAction>Sil</PromptAction>
        </PromptFooter>
      </PromptContent>
    </Prompt>
  )
}
