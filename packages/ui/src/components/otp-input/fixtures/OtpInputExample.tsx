import { OtpInput } from "../OtpInput"

export function OtpInputExample({ onComplete }: { onComplete?: (value: string) => void }) {
  return <OtpInput onComplete={onComplete} />
}
