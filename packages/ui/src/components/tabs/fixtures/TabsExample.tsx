import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"

export function TabsExample({
  onValueChange,
  listClass = "",
}: {
  onValueChange?: (v: string) => void
  listClass?: string
}) {
  return (
    <Tabs defaultValue="genel" onValueChange={onValueChange} aria-label="Bölümler">
      <TabsList className={listClass} aria-label="Sekmeler">
        <TabsTrigger value="genel">Genel</TabsTrigger>
        <TabsTrigger value="fiyat">Fiyat</TabsTrigger>
        <TabsTrigger value="stok" disabled>
          Stok
        </TabsTrigger>
      </TabsList>
      <TabsContent value="genel">Genel içerik</TabsContent>
      <TabsContent value="fiyat">Fiyat içerik</TabsContent>
      <TabsContent value="stok">Stok içerik</TabsContent>
    </Tabs>
  )
}
