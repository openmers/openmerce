import { test } from "@e2e-dev/web"
import { expect } from "e2e"

test("vitrin ana sayfası açılır", async ({ app, browser }) => {
  await app.open("/")
  await expect(browser).toHaveURL("/")
})
