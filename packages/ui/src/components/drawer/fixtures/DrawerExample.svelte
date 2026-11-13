<script lang="ts">
import Drawer from "../Drawer.svelte"
import DrawerBody from "../DrawerBody.svelte"
import DrawerClose from "../DrawerClose.svelte"
import DrawerContent from "../DrawerContent.svelte"
import DrawerDescription from "../DrawerDescription.svelte"
import DrawerFooter from "../DrawerFooter.svelte"
import DrawerHeader from "../DrawerHeader.svelte"
import DrawerTitle from "../DrawerTitle.svelte"
import DrawerTrigger from "../DrawerTrigger.svelte"

let { open = $bindable(false) } = $props<{ open?: boolean }>()
</script>

<Drawer bind:open>
  <DrawerTrigger>Detayları aç</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Sipariş detayı</DrawerTitle>
      <DrawerDescription>#1042 numaralı sipariş</DrawerDescription>
    </DrawerHeader>
    <DrawerBody>
      <p>Ürünler burada listelenir.</p>
    </DrawerBody>
    <DrawerFooter>
      <DrawerClose>Vazgeç</DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
