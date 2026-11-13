<script lang="ts">
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
import Calendar from "../src/components/calendar/fixtures/CalendarExample.svelte"
import CommandBar from "../src/components/command-bar/fixtures/CommandBarExample.svelte"
import DataTable from "../src/components/data-table/fixtures/DataTableExample.svelte"
import DatePicker from "../src/components/date-picker/fixtures/DatePickerExample.svelte"
import DateSegment from "../src/components/date-segment/fixtures/DateSegmentExample.svelte"
import Drawer from "../src/components/drawer/fixtures/DrawerExample.svelte"
import DropdownMenu from "../src/components/dropdown-menu/fixtures/DropdownMenuExample.svelte"
import FocusModal from "../src/components/focus-modal/fixtures/FocusModalExample.svelte"
import OtpInput from "../src/components/otp-input/fixtures/OtpInputExample.svelte"
import Popover from "../src/components/popover/fixtures/PopoverExample.svelte"
import ProgressAccordion from "../src/components/progress-accordion/fixtures/ProgressAccordionExample.svelte"
import ProgressTabs from "../src/components/progress-tabs/fixtures/ProgressTabsExample.svelte"
import Prompt from "../src/components/prompt/fixtures/PromptExample.svelte"
import RadioGroup from "../src/components/radio-group/fixtures/RadioGroupExample.svelte"
import Select from "../src/components/select/fixtures/SelectExample.svelte"
import Tabs from "../src/components/tabs/fixtures/TabsExample.svelte"
import TimeInput from "../src/components/time-input/fixtures/TimeInputExample.svelte"
import Toaster from "../src/components/toast/fixtures/ToasterExample.svelte"
import Section from "./Section.svelte"

let dark = $state(false)
$effect(() => document.documentElement.classList.toggle("dark", dark))
const colors = ["green", "red", "blue", "orange", "grey", "purple"] as const
</script>

<main class="mx-auto max-w-5xl p-8">
  <div class="flex items-center justify-between">
    <Heading level="h1">@openmers/ui galeri</Heading>
    <Button variant="secondary" onclick={() => (dark = !dark)}>{dark ? "Açık" : "Koyu"} kip</Button>
  </div>

  <Section title="Button">
    {#each ["primary", "secondary", "transparent", "danger"] as const as v}
      <Button variant={v}>{v}</Button>
    {/each}
    {#each ["small", "base", "large", "xlarge"] as const as s}
      <Button size={s}>{s}</Button>
    {/each}
    <Button isLoading>Yükleniyor</Button>
    <Button disabled>Devre dışı</Button>
    <IconButton aria-label="Ekle">+</IconButton>
  </Section>
  <Section title="Badge / StatusBadge / IconBadge">
    {#each colors as c}<Badge color={c}>{c}</Badge>{/each}
    {#each colors as c}<StatusBadge color={c}>{c}</StatusBadge>{/each}
    {#each colors as c}<IconBadge color={c}>★</IconBadge>{/each}
  </Section>
  <Section title="Alert / InlineTip">
    {#each ["info", "success", "warning", "error"] as const as v}
      <div class="w-full"><Alert variant={v}>{v} uyarısı</Alert></div>
    {/each}
    <InlineTip label="İpucu">Kısa bir ipucu metni.</InlineTip>
  </Section>
  <Section title="Tipografi">
    <Heading level="h2">Başlık</Heading><Text>Gövde metni</Text><Text weight="plus">Kalın</Text>
    <Label>Etiket</Label><Hint>İpucu</Hint><Kbd>⌘K</Kbd><Code>const a = 1</Code>
    <Divider class="w-full" />
  </Section>
  <Section title="Form">
    <Input placeholder="Input" /><Input placeholder="Geçersiz" aria-invalid="true" /><Input disabled placeholder="Devre dışı" />
    <CurrencyInput symbol="$" code="USD" /><Textarea placeholder="Textarea" />
    <Switch /><Checkbox /><Select /><RadioGroup /><OtpInput /><DateSegment /><TimeInput />
  </Section>
  <Section title="Tarih"><Calendar /><DatePicker /></Section>
  <Section title="Gezinme"><Tabs /><ProgressTabs /><ProgressAccordion /></Section>
  <Section title="Yüzeyler">
    <Popover /><DropdownMenu /><Drawer /><FocusModal /><Prompt /><Toaster /><CommandBar />
  </Section>
  <Section title="Diğer">
    <Avatar fallback="OM" /><Copy content="kopyalandı">Kopyala</Copy>
    <Container class="w-full">Container</Container>
    <div class="w-full"><CodeBlock snippets={[{ label: "ts", language: "ts", code: "const x = 1\nconsole.log(x)" }]} /></div>
    <Skeleton class="h-6 w-40" />
  </Section>
  <Section title="DataTable"><div class="w-full"><DataTable /></div></Section>
</main>
