import {
  ProgressTabs,
  ProgressTabsContent,
  ProgressTabsList,
  ProgressTabsTrigger,
} from "../ProgressTabs"

export function ProgressTabsExample({
  onValueChange,
}: {
  onValueChange?: (value: string) => void
}) {
  return (
    <ProgressTabs defaultValue="genel" onValueChange={onValueChange} aria-label="Sipariş adımları">
      <ProgressTabsList>
        <ProgressTabsTrigger value="genel" status="completed">
          Genel
        </ProgressTabsTrigger>
        <ProgressTabsTrigger value="fiyat" status="in-progress">
          Fiyat
        </ProgressTabsTrigger>
        <ProgressTabsTrigger value="stok" status="not-started" disabled>
          Stok
        </ProgressTabsTrigger>
      </ProgressTabsList>
      <ProgressTabsContent value="genel">Genel</ProgressTabsContent>
      <ProgressTabsContent value="fiyat">Fiyat</ProgressTabsContent>
      <ProgressTabsContent value="stok">Stok</ProgressTabsContent>
    </ProgressTabs>
  )
}
