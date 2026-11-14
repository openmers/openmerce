import { Toaster } from "../Toaster"
import { toast } from "../toast"

export function ToasterExample() {
  return (
    <>
      <button
        type="button"
        onClick={() => toast.success("Kaydedildi", { description: "Ürün güncellendi" })}
      >
        Başarı bildirimi
      </button>
      <button
        type="button"
        onClick={() => toast.error("Hata", { action: { label: "Tekrar dene", onClick: () => {} } })}
      >
        Hata bildirimi
      </button>
      <Toaster />
    </>
  )
}
