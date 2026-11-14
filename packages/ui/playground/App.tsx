import { useEffect, useState } from "react"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Code,
  CodeBlock,
  Container,
  Copy,
  CurrencyInput,
  Divider,
  Heading,
  Hint,
  IconBadge,
  IconButton,
  InlineTip,
  Input,
  Kbd,
  Label,
  Skeleton,
  StatusBadge,
  Switch,
  Text,
  Textarea,
} from "../src"
import { CalendarExample } from "../src/components/calendar/fixtures/CalendarExample"
import { CommandBarExample } from "../src/components/command-bar/fixtures/CommandBarExample"
import { DataTableExample } from "../src/components/data-table/fixtures/DataTableExample"
import { DatePickerExample } from "../src/components/date-picker/fixtures/DatePickerExample"
import { DateSegmentExample } from "../src/components/date-segment/fixtures/DateSegmentExample"
import { DrawerExample } from "../src/components/drawer/fixtures/DrawerExample"
import { DropdownMenuExample } from "../src/components/dropdown-menu/fixtures/DropdownMenuExample"
import { FocusModalExample } from "../src/components/focus-modal/fixtures/FocusModalExample"
import { OtpInputExample } from "../src/components/otp-input/fixtures/OtpInputExample"
import { PopoverExample } from "../src/components/popover/fixtures/PopoverExample"
import { ProgressAccordionExample } from "../src/components/progress-accordion/fixtures/ProgressAccordionExample"
import { ProgressTabsExample } from "../src/components/progress-tabs/fixtures/ProgressTabsExample"
import { PromptExample } from "../src/components/prompt/fixtures/PromptExample"
import { RadioGroupExample } from "../src/components/radio-group/fixtures/RadioGroupExample"
import { SelectExample } from "../src/components/select/fixtures/SelectExample"
import { TabsExample } from "../src/components/tabs/fixtures/TabsExample"
import { TimeInputExample } from "../src/components/time-input/fixtures/TimeInputExample"
import { ToasterExample } from "../src/components/toast/fixtures/ToasterExample"
import { Section } from "./Section"

const colors = ["green", "red", "blue", "orange", "grey", "purple"] as const

export function App() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <Heading level="h1">@openmers/ui galeri</Heading>
        <Button variant="secondary" onClick={() => setDark(!dark)}>
          {dark ? "Açık" : "Koyu"} kip
        </Button>
      </div>

      <Section title="Button">
        {(["primary", "secondary", "transparent", "danger"] as const).map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        {(["small", "base", "large", "xlarge"] as const).map((s) => (
          <Button key={s} size={s}>
            {s}
          </Button>
        ))}
        <Button isLoading>Yükleniyor</Button>
        <Button disabled>Devre dışı</Button>
        <IconButton aria-label="Ekle">+</IconButton>
      </Section>
      <Section title="Badge / StatusBadge / IconBadge">
        {colors.map((c) => (
          <Badge key={c} color={c}>
            {c}
          </Badge>
        ))}
        {colors.map((c) => (
          <StatusBadge key={c} color={c}>
            {c}
          </StatusBadge>
        ))}
        {colors.map((c) => (
          <IconBadge key={c} color={c}>
            ★
          </IconBadge>
        ))}
      </Section>
      <Section title="Alert / InlineTip">
        {(["info", "success", "warning", "error"] as const).map((v) => (
          <div key={v} className="w-full">
            <Alert variant={v}>{v} uyarısı</Alert>
          </div>
        ))}
        <InlineTip label="İpucu">Kısa bir ipucu metni.</InlineTip>
      </Section>
      <Section title="Tipografi">
        <Heading level="h2">Başlık</Heading>
        <Text>Gövde metni</Text>
        <Text weight="plus">Kalın</Text>
        <Label>Etiket</Label>
        <Hint>İpucu</Hint>
        <Kbd>⌘K</Kbd>
        <Code>const a = 1</Code>
        <Divider className="w-full" />
      </Section>
      <Section title="Form">
        <Input placeholder="Input" />
        <Input placeholder="Geçersiz" aria-invalid="true" />
        <Input disabled placeholder="Devre dışı" />
        <CurrencyInput symbol="$" code="USD" />
        <Textarea placeholder="Textarea" />
        <Switch />
        <Checkbox />
        <SelectExample />
        <RadioGroupExample />
        <OtpInputExample />
        <DateSegmentExample />
        <TimeInputExample />
      </Section>
      <Section title="Tarih">
        <CalendarExample />
        <DatePickerExample />
      </Section>
      <Section title="Gezinme">
        <TabsExample />
        <ProgressTabsExample />
        <ProgressAccordionExample />
      </Section>
      <Section title="Yüzeyler">
        <PopoverExample />
        <DropdownMenuExample />
        <DrawerExample />
        <FocusModalExample />
        <PromptExample />
        <ToasterExample />
        <CommandBarExample />
      </Section>
      <Section title="Diğer">
        <Avatar fallback="OM" />
        <Copy content="kopyalandı">Kopyala</Copy>
        <Container className="w-full">Container</Container>
        <div className="w-full">
          <CodeBlock
            snippets={[{ label: "ts", language: "ts", code: "const x = 1\nconsole.log(x)" }]}
          />
        </div>
        <Skeleton className="h-6 w-40" />
      </Section>
      <Section title="DataTable">
        <div className="w-full">
          <DataTableExample />
        </div>
      </Section>
    </main>
  )
}
