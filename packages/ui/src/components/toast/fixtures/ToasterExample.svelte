<script lang="ts">
import Toaster from "../Toaster.svelte"
import { toast } from "../toast"
</script>

<button type="button" onclick={() => toast.success("Kaydedildi", { description: "Ürün güncellendi" })}>
  Başarı bildirimi
</button>
<button type="button" onclick={() => toast.error("Hata", { action: { label: "Tekrar dene", onClick: () => {} } })}>
  Hata bildirimi
</button>
<Toaster />
