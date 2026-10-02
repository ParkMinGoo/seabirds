const { test, expect } = require("@playwright/test");

test("capture real paper logbook detail", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 1200 });
  await page.goto("/?design-preview=1");
  await expect(page.locator("html")).toHaveAttribute("data-seabirds-ready", "true");
  await page.evaluate(() => window.SeaBirds.Core.commit((state) => {
    state.settings.timeFormat = "24";
    state.dives = [{
      id: "preview-log", diveNumber: 166, date: "2026-08-16", time: "09:09", endTime: "09:51",
      site: "호조비 다이빙", location: "울릉도", diveSite: "코끼리 바위", weather: "맑음",
      wave: "약함", current: "보통", startPressure: 200, endPressure: 50, surfaceTemp: 27,
      temp: 24, visibility: 15, surfaceInterval: 52, safetyStop: 3, duration: 42, depth: 19.1,
      avgDepth: 12.9, diveMode: "Air", salinity: "Salt", gasUsed: "Air", diveType: "Shore/Beach",
      diveStyle: "Single Tank", buddy: "호조비", notes: "여류가 있고 파도가 다소 거셌다.\n쉬고 힘들어서 쉬는 동안 정신이 놓침.",
      gfLow: 45, gfHigh: 95, profile: window.SeaBirds.Core.sampleProfile(19.1, 42), tags: []
    }];
  }));
  await page.locator("#allDives .dive-row").click();
  await expect(page.locator(".paper-tank-flow")).toBeVisible();
  await page.locator("#profileDialog").screenshot({ path: "outputs/logbook-design-preview.png" });
});
