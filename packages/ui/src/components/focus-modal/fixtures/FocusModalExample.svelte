<script lang="ts">
import FocusModal from "../FocusModal.svelte"
import FocusModalBody from "../FocusModalBody.svelte"
import FocusModalClose from "../FocusModalClose.svelte"
import FocusModalContent from "../FocusModalContent.svelte"
import FocusModalDescription from "../FocusModalDescription.svelte"
import FocusModalFooter from "../FocusModalFooter.svelte"
import FocusModalHeader from "../FocusModalHeader.svelte"
import FocusModalTitle from "../FocusModalTitle.svelte"
import FocusModalTrigger from "../FocusModalTrigger.svelte"

let { open = $bindable(false), contentClass = "" } = $props<{
  open?: boolean
  contentClass?: string
}>()
</script>

<FocusModal bind:open>
  <FocusModalTrigger>Yeni ürün</FocusModalTrigger>
  <FocusModalContent class={contentClass}>
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
