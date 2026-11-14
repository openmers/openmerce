import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../Drawer"

export function DrawerExample({ open }: { open?: boolean }) {
  return (
    <Drawer open={open}>
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
  )
}
