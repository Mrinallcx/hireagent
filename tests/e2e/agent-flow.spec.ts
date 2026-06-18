import { expect, test, type Page } from "@playwright/test"

async function launchAgent(page: Page, opts: { name: string; objective: string }) {
  await page.goto("/dashboard/post-agent")

  await page.getByLabel("Agent name").fill(opts.name)

  // Experience tier (Category defaults to "Market Analysis").
  await page.getByRole("combobox", { name: "Experience" }).click()
  await page.getByRole("option", { name: "Intern" }).click()

  await page.getByLabel("Research objective").fill(opts.objective)

  await page.getByRole("button", { name: /Launch agent/i }).click()
  await page.waitForURL("**/dashboard")
}

function cardFor(page: Page, name: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: name })
}

test("create -> success -> result drawer -> rerun -> delete", async ({ page }) => {
  const name = `BTC E2E ${Date.now()}`
  await launchAgent(page, {
    name,
    objective: "Analyze Bitcoin price action and macro outlook for the next 30 days.",
  })

  const card = cardFor(page, name)
  await expect(card).toBeVisible()
  await expect(card.getByText("Success")).toBeVisible({ timeout: 30_000 })

  // Open the result drawer and walk the tabs.
  await card.getByRole("button", { name: /Check result/i }).click()
  await expect(page.getByRole("tab", { name: /Overview/i })).toBeVisible()

  await page.getByRole("tab", { name: /Report/i }).click()
  await expect(page.getByText(/Research only — not investment advice/i)).toBeVisible()

  await page.getByRole("tab", { name: /Sources/i }).click()
  await expect(page.getByRole("link", { name: /latest news/i })).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(page.getByRole("tab", { name: /Overview/i })).toBeHidden()

  // Rerun via the card menu and confirm it lands back on success.
  await card.getByRole("button", { name: /Agent actions/i }).click()
  await page.getByRole("menuitem", { name: /Rerun agent/i }).click()
  await expect(card.getByText("Success")).toBeVisible({ timeout: 30_000 })

  // Delete via the card menu.
  await card.getByRole("button", { name: /Agent actions/i }).click()
  await page.getByRole("menuitem", { name: /Delete agent/i }).click()
  await expect(cardFor(page, name)).toHaveCount(0)
})

test("failure path shows an error state", async ({ page }) => {
  const name = `Fail E2E ${Date.now()}`
  await launchAgent(page, {
    name,
    objective: "Please fail this run intentionally for testing purposes xyzzy.",
  })

  const card = cardFor(page, name)
  await expect(card).toBeVisible()
  await expect(card.getByText("Error")).toBeVisible({ timeout: 30_000 })
})
