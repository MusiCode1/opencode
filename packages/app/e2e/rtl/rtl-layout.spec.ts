/**
 * RTL Layout E2E Tests
 *
 * These tests verify that the app layout flips correctly between LTR and RTL.
 * They load the app with different locale cookies and assert element positions
 * using getBoundingClientRect().
 *
 * WHY: CSS and Tailwind changes can silently break RTL layout. These tests
 * catch regressions like a sidebar stuck on the wrong side, or a switch
 * component that lost its dir="ltr" override.
 *
 * WHEN THEY FAIL: An element is positioned on the wrong side for the given
 * text direction, or a forced-LTR element (code blocks, switches) lost its
 * dir attribute.
 *
 * REQUIRES: A running dev server (started automatically by Playwright config).
 */
import { test, expect } from "../fixtures"

async function setLocale(page: import("@playwright/test").Page, locale: string) {
  await page.context().addCookies([
    { name: "oc_locale", value: locale, domain: "127.0.0.1", path: "/" },
  ])
  await page.evaluate((loc) => {
    localStorage.setItem("language.v1", JSON.stringify({ locale: loc }))
  }, locale)
}

async function getBounds(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).first().boundingBox()
}

test.describe("RTL layout positioning", () => {
  test("LTR: sidebar is left of main content", async ({ page, withProject }) => {
    await setLocale(page, "en")
    await withProject(async ({ gotoSession }) => {
      await gotoSession()
      const sidebar = await getBounds(page, '[data-component="sidebar-nav-desktop"]')
      const main = await getBounds(page, "main")
      expect(sidebar).toBeTruthy()
      expect(main).toBeTruthy()
      expect(sidebar!.x).toBeLessThan(main!.x)
    })
  })

  test("RTL: sidebar is right of main content", async ({ page, withProject }) => {
    await setLocale(page, "he")
    await withProject(async ({ gotoSession }) => {
      await gotoSession()
      const sidebar = await getBounds(page, '[data-component="sidebar-nav-desktop"]')
      const main = await getBounds(page, "main")
      expect(sidebar).toBeTruthy()
      expect(main).toBeTruthy()
      expect(sidebar!.x).toBeGreaterThan(main!.x)
    })
  })

  test("RTL: document direction is rtl", async ({ page, withProject }) => {
    await setLocale(page, "he")
    await withProject(async ({ gotoSession }) => {
      await gotoSession()
      const dir = await page.evaluate(() => document.documentElement.dir)
      expect(dir).toBe("rtl")
    })
  })

  test("LTR: document direction is ltr", async ({ page, withProject }) => {
    await setLocale(page, "en")
    await withProject(async ({ gotoSession }) => {
      await gotoSession()
      const dir = await page.evaluate(() => document.documentElement.dir)
      expect(dir).toBe("ltr")
    })
  })
})

test.describe("RTL forced-LTR elements", () => {
  test("switch controls have dir=ltr", async ({ page, withProject }) => {
    await setLocale(page, "he")
    await withProject(async ({ gotoSession }) => {
      await gotoSession()
      // Open settings
      await page.getByRole("button", { name: "הגדרות" }).click()
      const switchControl = page.locator('[data-slot="switch-control"]').first()
      await expect(switchControl).toBeVisible()
      await expect(switchControl).toHaveAttribute("dir", "ltr")
    })
  })
})
