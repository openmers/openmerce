import { channelStockLocations, stockLocations } from "@openmers/db"
import { and, asc, eq, sql } from "drizzle-orm"
import { affected, guardedInsertStatement } from "../../../platform"
import { auditStatement } from "../../audit"
import { auditActorOf } from "../../catalog/products/types"
import { insertWithPublicId, PUBLIC_ID_PREFIXES } from "../../ids"
import { locationIdByPublicId } from "../levels/statements"
import { assertCount, type StockCtx, StockError } from "../types"

export type CreateLocationInput = {
  name: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  region?: string | null
  district?: string | null
  postalCode?: string | null
  /** ISO 3166-1 alpha-2. */
  countryCode?: string | null
  active?: boolean
  pickupEnabled?: boolean
}

/** Warehouse + audit in one `atomic()`; linking to a channel is separate (`linkLocationToChannel`). */
export async function createLocation(
  ctx: StockCtx,
  input: CreateLocationInput,
): Promise<{ publicId: string }> {
  const name = input.name.trim()
  if (name.length === 0) throw new StockError("INVALID_INPUT", "depo adı boş olamaz")
  if (input.countryCode != null && !/^[A-Z]{2}$/.test(input.countryCode)) {
    throw new StockError("INVALID_INPUT", "ülke kodu iki büyük harf olmalı")
  }
  const p = ctx.platform
  const publicId = await insertWithPublicId(
    p,
    (publicId) => [
      p.db
        .insert(stockLocations)
        .values({ ...input, publicId, name, createdAt: ctx.now, updatedAt: ctx.now })
        .toSQL(),
      auditStatement(
        p.db,
        {
          actor: auditActorOf(ctx),
          action: "stock:write",
          entityType: "stock_location",
          entityPublicId: publicId,
          channelId: ctx.channel.id,
          after: { publicId, name },
          requestId: ctx.requestId,
        },
        ctx.now,
      ),
    ],
    { prefix: PUBLIC_ID_PREFIXES.stock_locations },
  )
  return { publicId }
}

/** Links the warehouse to `ctx.channel` or updates its priority (lower first); `NOT_FOUND` if the warehouse is missing. */
export async function linkLocationToChannel(
  ctx: StockCtx,
  input: { locationPublicId: string; priority: number },
): Promise<void> {
  assertCount(input.priority, "öncelik")
  const p = ctx.platform
  const insert = guardedInsertStatement(
    channelStockLocations,
    {
      channelId: ctx.channel.id,
      locationId: locationIdByPublicId(input.locationPublicId),
      priority: input.priority,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
    sql`EXISTS (SELECT 1 FROM ${stockLocations} WHERE ${stockLocations.publicId} = ${input.locationPublicId})`,
  )
  const result = await p.atomic([
    {
      ...insert,
      sql: `${insert.sql} on conflict ("channel_id", "location_id") do update set
        "priority" = excluded."priority", "updated_at" = excluded."updated_at"`,
    },
  ])
  if (!affected(result, 0)) throw new StockError("NOT_FOUND", "depo bulunamadı")
}

export type LocationItem = {
  publicId: string
  name: string
  city: string | null
  countryCode: string | null
  active: boolean
  pickupEnabled: boolean
  /** The priority if linked to `ctx.channel`, otherwise `null`. */
  channelPriority: number | null
}

/** Warehouse list (a table with few rows); the channel link is joined via the PK. */
export async function listLocations(ctx: Pick<StockCtx, "platform" | "channel">) {
  const rows: LocationItem[] = await ctx.platform.db
    .select({
      publicId: stockLocations.publicId,
      name: stockLocations.name,
      city: stockLocations.city,
      countryCode: stockLocations.countryCode,
      active: stockLocations.active,
      pickupEnabled: stockLocations.pickupEnabled,
      channelPriority: channelStockLocations.priority,
    })
    .from(stockLocations)
    .leftJoin(
      channelStockLocations,
      and(
        eq(channelStockLocations.locationId, stockLocations.id),
        eq(channelStockLocations.channelId, ctx.channel.id),
      ),
    )
    .orderBy(asc(stockLocations.name), asc(stockLocations.publicId))
  return rows
}
