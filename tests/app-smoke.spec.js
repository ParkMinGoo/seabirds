const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => {
  await page.goto("/?smoke=1");
  await expect(page.locator("html")).toHaveAttribute(
    "data-seabirds-ready",
    "true",
  );
});
test("starts all modules and navigates", async ({ page }) => {
  await expect(page.locator('.nav[data-view="dashboard"]')).toHaveCount(0);
  await expect(page.locator("#dashboard")).toHaveCount(0);
  await expect(page.locator("#dives")).toHaveClass(/active/);
  await expect(page.locator("#dives .stats")).toBeVisible();
  await expect(page.locator("#dives .stats article")).toHaveCount(8);
  await expect(page.locator("#statComputers")).toBeVisible();
  await expect(page.locator("#statMode")).toBeVisible();
  await expect(page.locator("#statStyle")).toBeVisible();
  await expect(page.locator("#statType")).toBeVisible();
  const modules = await page.evaluate(() =>
    [
      "diveList",
      "diveEditor",
      "diveExport",
      "equipment",
      "devices",
      "settings",
      "importExport",
    ].map((name) => Boolean(window.SeaBirds.Core.feature(name))),
  );
  expect(modules).toEqual([true, true, true, true, true, true, true]);
  await page.locator('.nav[data-view="settings"]').click();
  await expect(page.locator("#settings")).toHaveClass(/active/);
  await expect(page.getByText("Application updates", { exact: true })).toHaveCount(0);
  await expect(page.locator(".platform-downloads .download")).toHaveCount(2);
  await expect(page.locator(".platform-downloads")).toContainText("Android");
  await expect(page.locator(".platform-downloads")).toContainText("Windows");
  await expect(page.locator(".support-block")).toContainText("오류를 발견했거나 새로운 기능을 제안하고 싶으신가요?");
  await expect(page.locator(".support-block a[href='https://github.com/Three-Cats-LSP/seabirds/issues']")).toBeVisible();
  await expect(page.locator(".settings-collapse")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.locator(".settings-collapse > summary").click();
  await expect(page.locator(".settings-collapse")).toHaveAttribute("open", "");
  await expect(page.locator("#masterGearLibrary")).toBeHidden();
  await page.locator("#openMasterGear").click();
  await expect(page.locator("#settingsMain")).toBeHidden();
  await expect(page.locator("#masterGearPage")).toBeVisible();
  await expect(page.locator("#masterGearPage .master-gear")).toBeVisible();
  await page.locator("#closeMasterGear").click();
  await expect(page.locator("#settingsMain")).toBeVisible();
  await page.locator("#openDiveGroups").click();
  await expect(page.locator("#diveGroupsPage")).toBeVisible();
  await expect(page.locator("#diveGroupDialog")).not.toHaveAttribute("open", "");
  await page.locator("#newDiveGroup").click();
  await expect(page.locator("#diveGroupDialog")).toHaveAttribute("open", "");
  await page.locator("#diveGroupName").fill("Weekend dives");
  await page.locator("#diveGroupType").selectOption("manual");
  await expect(page.locator("#diveGroupRuleFields")).toBeHidden();
  await page.locator("#saveDiveGroup").click();
  await expect(page.locator("#diveGroupDialog")).not.toHaveAttribute("open", "");
  await expect(page.locator("#diveGroupsLibrary")).toContainText("Weekend dives");
  await expect(page.locator(".edit-dive-group")).toContainText("✎");
  await expect(page.locator("#saveMasterGear")).toHaveClass(/save-dive/);
  await page.locator("#closeDiveGroups").click();
  await expect(page.locator("#settingsMain")).toBeVisible();
});

test("collapses the welcome summary on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const summary = page.locator(".mobile-stats-collapse");
  await expect(summary).not.toHaveAttribute("open", "");
  await expect(summary.locator(".stats")).toBeHidden();
  await summary.locator("summary").click();
  await expect(summary).toHaveAttribute("open", "");
  await expect(summary.locator(".stats")).toBeVisible();
});

test("calculates GF99 samples with the ZHL profile engine", async ({
  page,
}) => {
  const result = await page.evaluate(() =>
    window.SeaBirdsZhlProfile.annotate([
      { t: 0, depth: 0, gas: "21/0" },
      { t: 2, depth: 20, gas: "21/0" },
      { t: 22, depth: 20, gas: "21/0" },
      { t: 25, depth: 0, gas: "21/0" },
    ]),
  );
  expect(result).toHaveLength(4);
  expect(result.every((point) => Number.isFinite(point.gf99))).toBeTruthy();
  expect(Math.max(...result.map((point) => point.gf99))).toBeGreaterThan(0);
});
test("does not mistake OC PPO2 telemetry for a CCR setpoint", async ({ page }) => {
  const result = await page.evaluate(() =>
    window.SeaBirdsZhlProfile.annotate(
      [
        { t: 0, depth: 0, gas: "21/0", ppo2: 0.21 },
        { t: 3, depth: 27, gas: "21/0", ppo2: 0.78 },
        { t: 30, depth: 27, gas: "21/0", ppo2: 0.78 },
        { t: 48, depth: 0, gas: "21/0", ppo2: 0.21 },
      ],
      { gas: "21/0", closedCircuit: false },
    ),
  );
  expect(Math.max(...result.map((point) => point.gf99))).toBeGreaterThan(20);
});
test("renders the calculated GF99 overlay for an existing dive profile", async ({
  page,
}) => {
  await page.evaluate(() => {
    const dive = {
      id: "gf99-render",
      site: "GF99 render check",
      date: "2026-08-08",
      time: "09:00",
      duration: 46,
      depth: 30,
      gases: ["21/0"],
      profile: [
        { t: 0, depth: 0, gas: "21/0" },
        { t: 4, depth: 15, gas: "21/0" },
        { t: 10, depth: 22, gas: "21/0" },
        { t: 20, depth: 30, gas: "21/0" },
        { t: 30, depth: 15, gas: "21/0" },
        { t: 40, depth: 6, gas: "21/0" },
        { t: 46, depth: 0, gas: "21/0" },
      ],
    };
    window.SeaBirds.Core.getState().dives = [dive];
    window.SeaBirds.Core.feature("diveEditor").open(dive.id);
  });
  await expect(page.locator("#profileDialog")).toHaveAttribute("open", "");
  await page.waitForTimeout(100);
  const orangePixels = await page.evaluate(() => {
    const canvas = document.getElementById("seaBirdsProfileCanvas");
    const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 190 && data[index + 1] > 95 && data[index + 1] < 180 && data[index + 2] < 90) count++;
    }
    return count;
  });
  expect(orangePixels).toBeGreaterThan(20);
});
test("toggles temperature, NDL and GF99 graph layers without changing the dive", async ({ page }) => {
  await page.evaluate(() => {
    const dive = { id: "layer-toggle", site: "Layer toggle", date: "2026-08-08", duration: 30, depth: 24, gases: ["21/0"], profile: [{ t: 0, depth: 0, temperature: 28, ndl: 99 }, { t: 10, depth: 24, temperature: 26, ndl: 25 }, { t: 30, depth: 0, temperature: 28, ndl: 99 }] };
    window.SeaBirds.Core.getState().dives = [dive];
    window.SeaBirds.Core.feature("diveEditor").open(dive.id);
  });
  await expect(page.locator("#profileDialog")).toHaveAttribute("open", "");
  const before = await page.evaluate(() => JSON.stringify(window.SeaBirds.Core.getState().dives));
  await page.evaluate(() => document.querySelectorAll('[data-graph-layer]').forEach((input) => input.click()));
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('[data-graph-layer]')].map((input) => input.checked))).toEqual([false, false, false]);
  expect(await page.evaluate(() => JSON.stringify(window.SeaBirds.Core.getState().dives))).toBe(before);
});
test("uses the detected dive computer in default imported titles", async ({ page }) => {
  const dives = await page.evaluate(() =>
    window.SeaBirds.Core.normalizeState({
      dives: [
        { id: "teric", computer: "Teric", site: "Perdix dive 48" },
        { id: "edited", computer: "Teric", site: "Perdix dive 47", userEdited: true },
      ],
    }).dives,
  );
  expect(dives[0].site).toBe("Teric dive 48");
  expect(dives[1].site).toBe("Perdix dive 47");
});
test("paginates dives and filters by year and month", async ({ page }) => {
  await page.evaluate(() =>
    window.SeaBirds.Core.commit((state) => {
      state.dives = Array.from({ length: 12 }, (_, index) => ({
        id: `page-${index}`,
        site: `Pagination dive ${index + 1}`,
        date:
          index < 6
            ? `2026-08-${String(index + 1).padStart(2, "0")}`
            : `2025-07-${String(index - 5).padStart(2, "0")}`,
        time: "10:00",
        depth: 18,
        duration: 40,
        temp: 25,
        profile: [],
      }));
    }),
  );
  await page.locator('.nav[data-view="settings"]').click();
  await page.locator("#divesPerPage").selectOption("10");
  await page.locator('.nav[data-view="dives"]').click();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(10);
  await expect(page.locator("#divePagination")).toContainText("1 / 2 페이지");
  await page.locator('[data-page="next"]').click();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(2);
  await page.locator(".logbook-filter-collapse > summary").click();
  await page.locator("#yearFilter summary").click();
  await page.locator("#yearFilters").getByLabel("2025").check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(6);
  await page.locator("#monthFilter summary").click();
  await page.locator('#monthFilters [data-month-filter]:not([data-month-filter="all"])').first().check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(6);
  await expect(page.locator("#monthFilter")).toHaveAttribute("open", "");
  const panelWidths = await page.evaluate(() =>
    ["yearFilter", "monthFilter"].map((id) => {
      const dropdown = document.getElementById(id);
      return {
        trigger: dropdown.getBoundingClientRect().width,
        panel: dropdown.querySelector(".dropdown-filter-options").getBoundingClientRect()
          .width,
      };
    }),
  );
  panelWidths.forEach(({ trigger, panel }) => expect(panel).toBeCloseTo(trigger, 0));
  await page.locator("#search").click();
  await expect(page.locator("#monthFilter")).not.toHaveAttribute("open", "");
});
test("filters manual and automatic dive groups", async ({ page }) => {
  await page.evaluate(() =>
    window.SeaBirds.Core.commit((state) => {
      state.diveGroups = [
        { id: "okinawa", name: "Okinawa", type: "rule", field: "location", value: "Okinawa" },
        { id: "fun", name: "Fun dives", type: "manual" },
      ];
      state.dives = [
        { id: "group-rule", site: "Rule dive", date: "2026-08-01", depth: 10, duration: 30, temp: 25, location: "Okinawa" },
        { id: "group-manual", site: "Manual group dive", date: "2026-08-02", depth: 12, duration: 35, temp: 25, groupIds: ["fun"] },
      ];
    }),
  );
  await expect(page.locator("#groupFilters")).toContainText("Okinawa");
  await page.locator(".logbook-filter-collapse > summary").click();
  await page.locator("#groupFilter summary").click();
  await page.locator("#groupFilters").getByLabel("Okinawa").check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await expect(page.locator("#allDives")).toContainText("Rule dive");
  await page.locator('[data-group-filter="all"]').check();
  await page.locator("#groupFilters").getByLabel("Fun dives").check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await expect(page.locator("#allDives")).toContainText("Manual group dive");
});
test("shows readable placeholders for missing dive times", async ({ page }) => {
  await page.evaluate(() =>
    window.SeaBirds.Core.commit((state) => {
      state.dives = [
        {
          id: "missing-times",
          site: "Untimed dive",
          date: "2026-08-01",
          duration: 42,
          depth: 18,
          temp: 26,
        },
      ];
    }),
  );
  await expect(page.locator("#allDives .dive-row")).toContainText(
    "--:-- · 18.0 m · 42분",
  );
});
test("draft edits persist, remain searchable and filter by mode and style", async ({
  page,
}) => {
  await page.locator('.nav[data-view="settings"]').click();
  await page.locator("#demoToggle").check();
  await expect(page.locator("#diveCount")).toHaveText("3");
  await page.locator('.nav[data-view="dives"]').click();
  await page.locator("#allDives .dive-row").first().click();
  await page.locator("#paperEdit").click();
  await page.locator("#editDiveTitle").fill("Discard me");
  await page.locator("#profileDialog .close").click();
  await expect(page.locator("#allDives .dive-row").first()).toContainText(
    "Blue Corner",
  );
  await page.locator("#allDives .dive-row").first().click();
  await page.locator("#paperEdit").click();
  await page.locator("#editDiveNumber").fill("321");
  await page.locator("#editDiveDate").fill("2026-08-02");
  await page.locator("#editDiveTime").fill("14:35");
  await page.locator("#editDiveTitle").fill("Saved smoke dive");
  await page.locator("#editDiveLocation").fill("Okinawa");
  await page.locator("#editDiveSpot").fill("Blue Cave");
  await page.locator("#editDiveType").selectOption("Boat");
  await page.locator("#editDiveMode").selectOption("CC/BO");
  await page.locator("#editDiveStyle").selectOption("Sidemount");
  await page.locator("#editDiveSalinity").selectOption("Fresh");
  await page.locator("#saveDiveDetails").click();
  const savedRow = page.locator("#allDives .dive-row").first();
  await expect(savedRow).toContainText("Okinawa");
  await expect(savedRow).toContainText("Blue Cave");
  await expect(savedRow).toContainText("CC/BO / Sidemount");
  await expect(savedRow).toContainText("2026-08-02");
  await expect(savedRow).toContainText("오후 2:35");
  await expect(savedRow.locator(".dive-number-cell")).toContainText("321");
  await expect
    .poll(() =>
      page.evaluate(() => window.SeaBirds.Core.getState().dives[0]?.salinity),
    )
    .toBe("Fresh");
  await expect
    .poll(() =>
      page.evaluate(() => window.SeaBirds.Core.getState().dives[0]?.diveType),
    )
    .toBe("Boat");
  await page.waitForTimeout(300);
  await page.reload();
  await page.locator('.nav[data-view="dives"]').click();
  await page.getByRole("searchbox").fill("321");
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await page.getByRole("searchbox").fill("");
  await page.locator(".logbook-filter-collapse > summary").click();
  await expect(page.locator("#styleFilters label")).toHaveText([
    "전체",
    "싱글 탱크",
    "더블 탱크",
    "사이드마운트",
    "해당 없음",
  ]);
  await expect(page.locator("#typeFilters label")).toHaveText([
    "전체",
    "해변 입수",
    "보트 다이빙",
    "해당 없음",
  ]);
  await page.locator("#modeFilter summary").click();
  await page.locator("#modeFilters").getByLabel("CC/BO").check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await page.locator('[data-style-filter="Sidemount"]').check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await page.locator('[data-type-filter="Boat"]').check();
  await expect(page.locator("#allDives .dive-row")).toHaveCount(1);
  await expect(page.locator("#allDives .dive-row")).toContainText(
    "Blue Cave",
  );
});
test("allows a user gas mix to override automatic gas detection", async ({
  page,
}) => {
  await page.locator('.nav[data-view="settings"]').click();
  await page.locator("#demoToggle").check();
  await page.locator('.nav[data-view="dives"]').click();
  await page.locator("#allDives .dive-row").first().click();
  await page.locator("#paperEdit").click();
  await expect(page.locator("#editDiveGas")).toHaveValue("공기");
  await page.locator("#editDiveGas").fill("EAN32");
  await page.locator("#saveDiveDetails").click();
  await expect(page.locator("#profileDialog")).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      window.SeaBirds.Core.getState().dives.some(
        (dive) => dive.gasUsed === "EAN32",
      ),
    ),
  ).toBe(true);
  await page.locator("#allDives .dive-row").first().click();
  await expect(page.locator("#profileStats")).toContainText("EAN32");
});

test("exports every current dive-entry field", async ({ page }) => {
  await page.goto("/");
  const exported = await page.evaluate(() => {
    const dive = {
      id: "export-fixture",
      diveNumber: 501,
      site: "Okinawa Blue Cave",
      location: "Okinawa, Japan",
      diveSite: "Blue Cave",
      diveType: "Boat",
      date: "2026-08-07",
      time: "09:15",
      endTime: "10:02",
      buddy: "Marika",
      diveMode: "3 GasNx",
      diveStyle: "Double tanks",
      gasUsed: "EAN32 · EAN50 · O₂",
      salinity: "EN13319",
      tags: ["training", "wreck"],
      notes: "Export verification notes",
      depth: 31.2,
      duration: 47,
      temp: 26.4,
      equipment: ["Regulator"],
      profile: [{ t: 1, depth: 8, temperature: 26 }],
    };
    return {
      text: window.SeaBirds.DiveTextExport.build(dive),
      uddf: window.SeaBirds.DiveUddfExport.build(dive),
    };
  });
  for (const value of [
    "501",
    "Okinawa Blue Cave",
    "Okinawa, Japan",
    "Blue Cave",
    "Boat",
    "09:15",
    "10:02",
    "Marika",
    "3 GasNx",
    "Double tanks",
    "EAN32",
    "EN13319",
    "training, wreck",
    "Export verification notes",
  ])
    expect(exported.text).toContain(value);
  for (const value of [
    "<divenumber>501</divenumber>",
    "<title>Okinawa Blue Cave</title>",
    "<location>Okinawa, Japan</location>",
    "<divesite>Blue Cave</divesite>",
    "<type>Boat</type>",
    "<endtime>10:02</endtime>",
    "<divemode>3 GasNx</divemode>",
    "<style>Double tanks</style>",
    "<gas>EAN32",
    "<salinity>EN13319</salinity>",
    "<tags>training, wreck</tags>",
    "<notes>Export verification notes</notes>",
  ])
    expect(exported.uddf).toContain(value);
});
test("exports one dive as text, PDF and UDDF", async ({ page }) => {
  await page.locator('.nav[data-view="settings"]').click();
  await page.locator("#demoToggle").check();
  const textExport = await page.evaluate(() =>
    window.SeaBirds.DiveTextExport.build(
      window.SeaBirds.Core.getState().dives[0],
    ),
  );
  expect(textExport).toContain("PROFILE SAMPLES");
  expect(textExport).toMatch(/min\s+\d+\.\d m\s+\S+ \u00b0C\s+NDL/);
  expect(textExport).not.toContain("\t");
  const uddfExport = await page.evaluate(() => {
    const dive = window.SeaBirds.Core.getState().dives[0];
    return { source: dive, xml: window.SeaBirds.DiveUddfExport.build(dive) };
  });
  expect(uddfExport.xml).toContain(
    "<profiletimeunit>seconds</profiletimeunit>",
  );
  await page.locator("#importFile").setInputFiles({
    name: "round-trip.uddf",
    mimeType: "application/xml",
    buffer: Buffer.from(uddfExport.xml),
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.SeaBirds.Core.getState().dives.length),
    )
    .toBe(4);
  const restoredProfile = await page.evaluate(() => {
    const state = window.SeaBirds.Core.getState();
    const normalise = (profile) =>
      profile.map((point) => [
        point.t,
        point.depth,
        point.temperature ?? point.temp ?? null,
        point.ndl ?? null,
        point.tts ?? null,
      ]);
    return {
      duration: state.dives.at(-1).duration,
      source: normalise(state.dives[0].profile),
      restored: normalise(state.dives.at(-1).profile),
    };
  });
  expect(restoredProfile.duration).toBe(uddfExport.source.duration);
  expect(restoredProfile.restored).toEqual(restoredProfile.source);
  await page.locator('.nav[data-view="dives"]').click();
  await page.locator("#allDives .dive-row").first().click();
  const formats = [
    ["text", ".txt"],
    ["pdf", ".pdf"],
    ["uddf", ".uddf"],
  ];
  for (const [format, extension] of formats) {
    await page.locator("#openDiveExport").click();
    await expect(page.locator("#diveExportDialog")).toBeVisible();
    const pending = page.waitForEvent("download");
    await page.locator(`[data-dive-export="${format}"]`).click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain(extension);
  }
});
test("creates, imports, backs up, restores and deletes dives", async ({
  page,
}) => {
  await page.locator('.nav[data-view="dives"]').click();
  await page.locator("#addDive").click();
  await expect(page.locator("#addDiveDialog")).toBeVisible();
  await page.locator("#chooseManualDive").click();
  const dialog = page.locator("#profileDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/editing-profile/);
  await dialog.locator("#editDiveTitle").fill("Manual Reef");
  await dialog.locator("#saveDiveDetails").click();
  await expect(page.locator("#allDives .dive-row")).toContainText(
    "Manual Reef",
  );
  await page
    .locator("#importFile")
    .setInputFiles("tests/fixtures/one-dive.uddf");
  await expect(page.locator("#allDives")).toContainText("Smoke Reef");
  await page.evaluate(() => {
    window.showSaveFilePicker = undefined;
  });
  await page.locator('.nav[data-view="settings"]').click();
  const download = page.waitForEvent("download");
  await page.locator("#backupJson").click();
  const backup = await download;
  expect(backup.suggestedFilename()).toBe("seabirds-dive-log.json");
  const backupPath = await backup.path();
  await page.locator('.nav[data-view="dives"]').click();
  await page
    .locator("#allDives .dive-row")
    .filter({ hasText: "Manual Reef" })
    .click();
  page.once("dialog", (prompt) => prompt.accept());
  await page.locator("#deleteDive").click();
  await expect(page.locator("#allDives")).not.toContainText("Manual Reef");
  await page.locator('.nav[data-view="settings"]').click();
  page.once("dialog", (prompt) => prompt.accept());
  await page.locator("#restoreJson").setInputFiles(backupPath);
  await page.waitForFunction(() =>
    window.SeaBirds.Core.getState().dives.some(
      (dive) => dive.site === "Manual Reef",
    ),
  );
  await page.locator('.nav[data-view="dives"]').click();
  await expect(page.locator("#allDives")).toContainText("Manual Reef");
});

test("creates a log-number trip group and organizes dives by day and start time", async ({ page }) => {
  await page.evaluate(async () => {
    await window.SeaBirds.Core.commit((state) => {
      state.diveGroups = [];
      state.dives = [
        { id: "cebu-182", diveNumber: 182, date: "2026-07-12", time: "11:35", site: "마리곤돈 케이브", location: "막탄", depth: 25.1, duration: 48, startPressure: 180, endPressure: 50, profile: [] },
        { id: "cebu-181", diveNumber: 181, date: "2026-07-12", time: "09:10", site: "콘티키 하우스리프", location: "막탄", depth: 18.4, duration: 42, startPressure: 200, endPressure: 60, profile: [] },
        { id: "cebu-183", diveNumber: 183, date: "2026-07-13", time: "08:55", site: "탈리마", location: "올랑고", depth: 21.3, duration: 46, startPressure: 200, endPressure: 60, profile: [] },
      ];
    });
  });
  await page.locator("#addTripGroup").click();
  await expect(page.locator("#diveGroupType")).toHaveValue("range");
  await page.locator("#diveGroupName").fill("7월 세부여행");
  await expect(page.locator("#diveGroupStartNumber option").first()).toContainText("#181 · 콘티키 하우스리프");
  await page.locator("#diveGroupStartNumber").selectOption("181");
  await page.locator("#diveGroupEndNumber").selectOption("183");
  await page.locator("#saveDiveGroup").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-seabirds-ready", "true");
  const groupCard = page.locator(".trip-group-card").filter({ hasText: "7월 세부여행" });
  await expect(groupCard).toContainText("3회 다이빙");
  await groupCard.click();
  await expect(page.locator("#tripGroupDetail .trip-detail-hero")).toContainText("7월 세부여행");
  await expect(page.locator("#tripGroupDetail .trip-day-section")).toHaveCount(2);
  await expect(page.locator("#tripGroupDetail .trip-day-section").first()).toContainText("1일차 · 7월 12일 (일)");
  const firstDayTimes = await page.locator("#tripGroupDetail .trip-day-section").first().locator("time").allTextContents();
  expect(firstDayTimes).toEqual(["오전 9:10", "오전 11:35"]);
  await expect(page.locator("#tripGroupDetail")).toContainText("200 → 60 bar");
  await page.locator("[data-close-trip-group]").click();
  await expect(page.locator("#tripGroupsSection")).toBeVisible();
});

test("calculates surface interval from the previous dive record", async ({ page }) => {
  await page.evaluate(async () => {
    await window.SeaBirds.Core.commit((state) => {
      state.dives = [
        { id: "interval-1", date: "2026-09-20", time: "09:00", duration: 40, site: "첫 다이빙", depth: 12, profile: [] },
        { id: "interval-2", date: "2026-09-20", time: "10:35", duration: 45, site: "두 번째 다이빙", depth: 15, profile: [], surfaceInterval: null },
      ];
    });
    window.SeaBirds.Core.feature("diveEditor").open("interval-2");
  });
  await expect(page.locator("#editDiveSurfaceInterval")).toHaveValue("55");
  await expect(page.locator("#profileStats")).toContainText("55분");
});

test("assigns the next dive number and saves the weight", async ({ page }) => {
  await page.evaluate(async () => {
    await window.SeaBirds.Core.commit((state) => {
      state.settings.manualLastLogNumber = "165";
      state.dives = [
        { id: "numbered-166", diveNumber: 166, date: "2026-09-20", time: "09:00", duration: 40, site: "기존 기록", depth: 12, profile: [] },
      ];
    });
    window.SeaBirds.Core.feature("diveEditor").createManual();
  });
  await expect(page.locator("#editDiveNumber")).toHaveValue("167");
  await page.locator("#editDiveWeight").fill("6.5");
  await page.locator("#saveDiveDetails").click();
  const newest = await page.evaluate(() =>
    window.SeaBirds.Core.getState().dives.find((dive) => dive.diveNumber === 167),
  );
  expect(newest.weight).toBe(6.5);
});

test("shows minimum maximum and average profile temperatures in the logbook", async ({ page }) => {
  await page.evaluate(async () => {
    const dive = {
      id: "temperature-summary",
      diveNumber: 168,
      date: "2026-09-25",
      time: "09:00",
      duration: 30,
      depth: 12,
      site: "온도 테스트",
      profile: [
        { t: 0, depth: 0, temperature: 27 },
        { t: 10, depth: 12, temperature: 23 },
        { t: 20, depth: 10, temperature: 25 },
        { t: 30, depth: 0, temperature: 27 },
      ],
    };
    await window.SeaBirds.Core.commit((state) => { state.dives = [dive]; });
    window.SeaBirds.Core.feature("diveEditor").open(dive.id);
  });
  const temperatures = page.locator(".paper-temperature-summary");
  await expect(temperatures).toContainText("최저 수온");
  await expect(temperatures).toContainText("23.0°C");
  await expect(temperatures).toContainText("최고 수온");
  await expect(temperatures).toContainText("27.0°C");
  await expect(temperatures).toContainText("평균 수온");
  await expect(temperatures).toContainText("25.5°C");
});

test("shows tank pressures in the list and toggles multiple dive types without a popup", async ({ page }) => {
  await page.evaluate(async () => {
    const dive = {
      id: "pressure-and-types",
      diveNumber: 169,
      date: "2026-09-25",
      time: "09:00",
      duration: 40,
      depth: 15,
      site: "압력 테스트",
      location: "울릉도",
      diveSite: "코끼리 바위",
      startPressure: 200,
      endPressure: 50,
      diveType: "",
      tags: [],
      profile: [],
    };
    await window.SeaBirds.Core.commit((state) => { state.dives = [dive]; });
  });
  await expect(page.locator('.logbook-card[data-id="pressure-and-types"]')).toContainText("200 → 50 bar");
  await page.evaluate(() => window.SeaBirds.Core.feature("diveEditor").open("pressure-and-types"));
  await page.locator('[data-toggle-dive-tag="shore"]').click();
  await page.locator('[data-toggle-dive-tag="boat"]').click();
  await page.locator('[data-toggle-dive-tag="night"]').click();
  await expect(page.locator("#quickEditDialog")).not.toHaveAttribute("open", "");
  const tags = await page.evaluate(() => window.SeaBirds.Core.getState().dives[0].tags);
  expect(tags).toEqual(expect.arrayContaining(["해안", "보트", "야간"]));
  await expect(page.locator(".paper-check.checked")).toHaveCount(3);
});

test("opens the photo and video picker directly from the paper logbook", async ({ page }) => {
  await page.evaluate(async () => {
    const dive = { id: "media-button", diveNumber: 170, date: "2026-09-25", time: "09:00", duration: 30, depth: 10, site: "미디어 테스트", tags: [], profile: [] };
    await window.SeaBirds.Core.commit((state) => { state.dives = [dive]; });
    window.SeaBirds.Core.feature("diveEditor").open(dive.id);
    const input = document.getElementById("editDiveMedia");
    input.addEventListener("click", () => { input.dataset.pickerOpened = "true"; });
  });
  const addMedia = page.locator("[data-add-dive-media]");
  await expect(addMedia).toBeVisible();
  await addMedia.click();
  await expect(page.locator("#editDiveMedia")).toHaveAttribute("data-picker-opened", "true");
  await expect(page.locator("#quickEditDialog")).not.toHaveAttribute("open", "");
});

test("draws with a finger and saves the sketch in the dive log", async ({ page }) => {
  await page.evaluate(async () => {
    const dive = { id: "drawing-log", diveNumber: 171, date: "2026-09-26", time: "10:00", duration: 35, depth: 12, site: "그림 테스트", tags: [], profile: [] };
    await window.SeaBirds.Core.commit((state) => { state.dives = [dive]; });
    window.SeaBirds.Core.feature("diveEditor").open(dive.id);
  });
  await page.locator(".paper-drawing-add").click();
  await expect(page.locator("#diveDrawingDialog")).toHaveAttribute("open", "");
  const canvas = page.locator("#diveDrawingCanvas"), box = await canvas.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 120, { steps: 8 });
  await page.mouse.up();
  await page.locator("#saveDiveDrawing").click();
  await expect(page.locator("#diveDrawingDialog")).not.toHaveAttribute("open", "");
  await expect(page.locator("#paperMediaGallery img")).toHaveCount(1);
  await page.locator(".paper-drawing-add").click();
  await page.evaluate(() => window.SeaBirdsHandleBack());
  await expect(page.locator("#diveDrawingDialog")).not.toHaveAttribute("open", "");
  await expect(page.locator("#profileDialog")).toHaveAttribute("open", "");
});

test("shows compact location/site cards and keeps local photo attachments", async ({ page }) => {
  await page.locator("#addDive").click();
  await page.locator("#chooseManualDive").click();
  await page.locator("#editDiveLocation").fill("울릉도");
  await page.locator("#editDiveSpot").fill("코끼리 바위");
  await page.locator("#editDiveTitle").fill("울릉도 다이빙");
  await page.locator("#editDiveEndTime").fill("09:43");
  await page.locator("#editDiveAvgDepth").fill("6.8");
  await page.locator("#editDiveSurfaceInterval").fill("52");
  await page.locator("#editDiveSafetyStop").selectOption("3");
  await page.locator("#editDiveStartPressure").fill("200");
  await page.locator("#editDiveEndPressure").fill("50");
  await page.locator("#editDiveWeather").selectOption("맑음");
  await page.locator("#editDiveWave").selectOption("약함");
  await page.locator("#editDiveCurrent").selectOption("보통");
  await page.locator("#editDiveMedia").setInputFiles({
    name: "reef.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#167b8a"/></svg>'),
  });
  await expect(page.locator("#diveMediaGallery img")).toHaveCount(1);
  await page.locator("#saveDiveDetails").click();
  const card = page.locator("#allDives .logbook-card").filter({ hasText: "코끼리 바위" });
  await expect(card).toContainText("울릉도");
  await card.click();
  await expect(page.locator("#profileStats .paper-logbook-heading")).toContainText("울릉도");
  await expect(page.locator("#profileStats .paper-logbook-heading")).toContainText("코끼리 바위");
  await expect(page.locator("#profileStats")).toContainText("오전 9:43");
  await expect(page.locator("#profileStats")).toContainText("6.8 m");
  await expect(page.locator("#profileStats")).toContainText("52분");
  await expect(page.locator("#profileStats")).toContainText("200 bar");
  await expect(page.locator("#profileStats")).toContainText("맑음");
  await expect(page.locator("#paperMediaGallery img")).toHaveCount(1);
  const mediaLayout = await page.evaluate(() => {
    const image = document.querySelector("#paperMediaGallery img").getBoundingClientRect();
    const figure = document.querySelector("#paperMediaGallery figure").getBoundingClientRect();
    const stamp = document.querySelector(".paper-logbook-notes > img");
    return { imageWidth: image.width, figureWidth: figure.width, hasStamp: Boolean(stamp) };
  });
  expect(mediaLayout.imageWidth).toBeGreaterThan(mediaLayout.figureWidth * 0.95);
  expect(mediaLayout.hasStamp).toBe(false);
  await page.locator('[data-dive-tab="notes"]').click();
  await expect(page.locator("#diveMediaGallery img")).toHaveCount(1);
  await page.locator('[data-dive-tab="profile"]').click();
  await expect(page.locator("[data-remove-paper-media]")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-remove-paper-media]").click();
  await expect(page.locator("#paperMediaGallery img")).toHaveCount(0);
  await page.locator("#profileDialog .close").click();
  await expect(page.locator("#profileDialog")).not.toHaveAttribute("open", "");
  await card.click();
  await expect(page.locator("#profileDialog")).toHaveAttribute("open", "");
  await expect(page.locator("#paperMediaGallery img")).toHaveCount(0);
  await page.evaluate(() => window.SeaBirdsHandleBack());
  await expect(page.locator("#profileDialog")).not.toHaveAttribute("open", "");
});
