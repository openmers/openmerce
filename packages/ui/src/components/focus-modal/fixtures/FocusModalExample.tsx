import {
  FocusModal,
  FocusModalBody,
  FocusModalClose,
  FocusModalContent,
  FocusModalDescription,
  FocusModalFooter,
  FocusModalHeader,
  FocusModalTitle,
  FocusModalTrigger,
} from "../FocusModal"

export function FocusModalExample({
  open,
  contentClass = "",
}: {
  open?: boolean
  contentClass?: string
}) {
  return (
    <FocusModal open={open}>
      <FocusModalTrigger>Yeni ürün</FocusModalTrigger>
      <FocusModalContent className={contentClass}>
        <FocusModalHeader>
          <FocusModalTitle>Yeni ürün oluştur</FocusModalTitle>
          <FocusModalDescription>Zorunlu alanları doldurun.</FocusModalDescription>
        </FocusModalHeader>
        <FocusModalBody>
          <p>Form alanları</p>
        </FocusModalBody>
        <FocusModalFooter>
          <FocusModalClose>İptal</FocusModalClose>
        </FocusModalFooter>
      </FocusModalContent>
    </FocusModal>
  )
}
