<script lang="ts">
import Tabs from "../Tabs.svelte"
import TabsContent from "../TabsContent.svelte"
import TabsList from "../TabsList.svelte"
import TabsTrigger from "../TabsTrigger.svelte"

let {
  value = $bindable("genel"),
  onValueChange,
  listClass = "",
} = $props<{ value?: string; onValueChange?: (v: string) => void; listClass?: string }>()
</script>

<Tabs bind:value {onValueChange} aria-label="Bölümler">
  <TabsList class={listClass} aria-label="Sekmeler">
    <TabsTrigger value="genel">Genel</TabsTrigger>
    <TabsTrigger value="fiyat">Fiyat</TabsTrigger>
    <TabsTrigger value="stok" disabled>Stok</TabsTrigger>
  </TabsList>
  <TabsContent value="genel">Genel içerik</TabsContent>
  <TabsContent value="fiyat">Fiyat içerik</TabsContent>
  <TabsContent value="stok">Stok içerik</TabsContent>
</Tabs>
