import type { Storage } from "../../../platform"
import { srcset } from "../images/sizeLadder"

/** What the read model stores per image (`catalog_index.thumb`, `product_view` images). */
export type StoredImage = {
  key: string
  width: number | null
  height: number | null
  sizes: number[]
}

/** What clients get: a ready URL and `srcset`; storage keys never leave the API. */
export type ImageView = {
  url: string
  width: number | null
  height: number | null
  /** `null`: only the original exists (no processor or it failed). */
  srcset: string | null
}

export function imageView(storage: Pick<Storage, "url">, image: StoredImage): ImageView {
  const urlOf = (key: string) => storage.url(key)
  return {
    url: urlOf(image.key),
    width: image.width,
    height: image.height,
    srcset: srcset(urlOf, image.key, image.sizes ?? [], image.width),
  }
}
