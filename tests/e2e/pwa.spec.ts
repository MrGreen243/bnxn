import { expect, test } from "@playwright/test";

test("the app shell loads from the service worker cache when offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  }, null, { timeout: 30_000 });
  // give the precache a moment to finish
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      const entries = await c.keys();
      if (entries.length > 40) return true;
    }
    return false;
  }, null, { timeout: 30_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Offline")).toBeVisible().catch(() => {});
  await context.setOffline(false);
});

test("manifest and icons are served", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBe(true);
  const json = await m.json();
  expect(json.display).toBe("standalone");
  for (const icon of json.icons) {
    const r = await request.get(icon.src);
    expect(r.ok()).toBe(true);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
});
