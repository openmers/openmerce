import data from "./tokens.json" with { type: "json" }

export type Tokens = typeof data
export type ColorName = keyof Tokens["colors"]["light"]
export type ShadowName = keyof Tokens["shadows"]["light"]
export type TypographyName = keyof Tokens["typography"]

export const tokens: Tokens = data
