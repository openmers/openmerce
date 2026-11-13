import { promotionChannels, promotions } from "@openmers/db"
import { eq } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { mapRow } from "../../channels/queries/loadChannels"
import type { PromotionChannelLink, PromotionRow } from "../registry/compilePromotions"

/** Enabled promotions + channel links, in one round trip via `batch` (input of `compilePromotions`). */
export async function loadPromotions(
  p: Pick<Platform, "db" | "batch">,
): Promise<{ rows: PromotionRow[]; links: PromotionChannelLink[] }> {
  const [promoRows = [], linkRows = []] = await p.batch([
    p.db
      .select()
      .from(promotions)
      .where(eq(promotions.enabled, true))
      .orderBy(promotions.id)
      .toSQL(),
    p.db
      .select({
        promotionId: promotionChannels.promotionId,
        channelId: promotionChannels.channelId,
      })
      .from(promotionChannels)
      .toSQL(),
  ])
  return {
    rows: promoRows.map((row) => mapRow(promotions, row)),
    links: linkRows.map((row) => ({
      promotionId: Number(row.promotion_id),
      channelId: Number(row.channel_id),
    })),
  }
}
