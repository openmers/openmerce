<script lang="ts">
import ProgressTabs from "../ProgressTabs.svelte"
import ProgressTabsContent from "../ProgressTabsContent.svelte"
import ProgressTabsList from "../ProgressTabsList.svelte"
import ProgressTabsTrigger from "../ProgressTabsTrigger.svelte"

let { value = $bindable("genel"), onValueChange } = $props<{
  value?: string
  onValueChange?: (value: string) => void
}>()
</script>

<ProgressTabs bind:value {onValueChange} aria-label="Sipariş adımları">
  <ProgressTabsList>
    <ProgressTabsTrigger value="genel" status="completed">Genel</ProgressTabsTrigger>
    <ProgressTabsTrigger value="fiyat" status="in-progress">Fiyat</ProgressTabsTrigger>
    <ProgressTabsTrigger value="stok" status="not-started" disabled>Stok</ProgressTabsTrigger>
  </ProgressTabsList>
  <ProgressTabsContent value="genel">Genel</ProgressTabsContent>
  <ProgressTabsContent value="fiyat">Fiyat</ProgressTabsContent>
  <ProgressTabsContent value="stok">Stok</ProgressTabsContent>
</ProgressTabs>
