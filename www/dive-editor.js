(function () {
  "use strict";
  const NS = (window.SeaBirds = window.SeaBirds || {}),
    Core = NS.Core;
  let activeId = null,
    draft = null,
    lastGraph = null,
    mediaObjectUrls = [],
    currentPersisted = true;
  const graphLayers = { temperature: true, ndl: true, gf99: true };
  const normalizeDiveMode = (value, profile = []) => {
    const legacy = { OC: "Air", CCR: "CC/BO", pSCR: "CC/BO" };
    return (
      legacy[value] ||
      value ||
      (profile.some((point) => point.setpoint != null) ? "CC/BO" : "Air")
    );
  };
  function getDraft() {
    return draft;
  }
  function displayTime(value) {
    if (!value) return "";
    const [hours, minutes] = value.split(":").map(Number);
    if (Core.getState().settings.timeFormat === "24")
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const suffix = hours >= 12 ? "오후" : "오전";
    return `${suffix} ${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`;
  }
  function calculatedEndTime(start, duration) {
    if (!start || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return "";
    const [hours, minutes] = start.split(":").map(Number),
      total = (hours * 60 + minutes + (+duration || 0)) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  function diveStartTimestamp(dive) {
    if (!dive?.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dive.time || "")) return null;
    const value = new Date(`${dive.date}T${dive.time}:00`).getTime();
    return Number.isFinite(value) ? value : null;
  }
  function diveEndTimestamp(dive) {
    const start = diveStartTimestamp(dive);
    if (start == null) return null;
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(dive.endTime || "")) {
      let end = new Date(`${dive.date}T${dive.endTime}:00`).getTime();
      if (end < start) end += 24 * 60 * 60 * 1000;
      return end;
    }
    return start + Math.max(0, Number(dive.duration) || 0) * 60 * 1000;
  }
  function calculatedSurfaceInterval(dive) {
    const currentStart = diveStartTimestamp(dive);
    if (currentStart == null) return null;
    const previous = Core.getState().dives
      .filter((item) => item.id !== dive.id)
      .map((item) => ({ item, start: diveStartTimestamp(item) }))
      .filter(({ start }) => start != null && start < currentStart)
      .sort((a, b) => b.start - a.start)[0]?.item;
    const previousEnd = diveEndTimestamp(previous);
    if (previousEnd == null || previousEnd > currentStart) return null;
    return Math.round((currentStart - previousEnd) / 60000);
  }
  function nextDiveNumber() {
    const state = Core.getState(),
      baseline = Number.parseInt(state.settings.manualLastLogNumber, 10),
      maximum = Math.max(
        Number.isInteger(baseline) ? baseline : 0,
        ...state.dives.map((item) => Number.parseInt(item.diveNumber, 10) || 0),
      );
    return maximum < 9999 ? maximum + 1 : null;
  }
  // GF99 is a calculated display value, not data that has to be present in a
  // Shearwater log.  Calculate it before rendering so stored downloads from
  // before the GF99 overlay was added get the same graph as new downloads.
  function profileWithGf99(profile, dive) {
    const engine = window.SeaBirdsZhlProfile;
    if (!engine?.annotate || profile.length < 2) return profile;
    const fallbackGas =
      (dive.gases || []).find(Boolean) ||
      profile.find((point) => point.gas)?.gas ||
      dive.gasUsed ||
      "21/0";
    return engine.annotate(profile, {
      gas: fallbackGas,
      // Do not infer CCR from a generic PPO2 telemetry field: original
      // Perdix/Teric OC logs can carry one as well.  The dive mode is the
      // authoritative source for this display calculation.
      closedCircuit: /^(CC\/BO|CCR)$/i.test(String(dive.diveMode || "")),
    });
  }
  function renderHeader(d) {
    const date = Core.formatDate(d.date).ymd || d.date || "—",
      number = d.diveNumber ?? "—";
    document.getElementById("profileTitle").innerHTML =
      `<span class="dive-entry-primary"><span class="dive-entry-number">#${Core.esc(number)}</span><span class="dive-entry-title">${Core.esc(d.diveSite || d.site || "포인트 미입력")}</span></span><span class="dive-entry-meta">${Core.esc(date)}</span>`;
  }
  function renderGroupChoices(d) {
    const target = document.getElementById("editDiveGroups"),
      groups = Core.getState().diveGroups || [],
      matches = Core.feature("diveList")?.matchesGroup;
    if (!target) return;
    target.innerHTML = `<legend>Groups</legend>${groups.length ? `<div class="dive-group-choice-list">${groups.map((group) => {
      const automatic = group.type === "rule" || group.type === "range";
      const checked = automatic ? matches?.(d, group) : (d.groupIds || []).includes(group.id);
      const detail = group.type === "range" ? `로그 #${group.startNumber}—${group.endNumber}` : automatic ? `${group.field}: ${group.value}` : "Manual";
      return `<label class="dive-group-choice${automatic ? " is-automatic" : ""}"><input type="checkbox" data-dive-group="${Core.esc(group.id)}" ${checked ? "checked" : ""} ${automatic ? "disabled" : ""}><span><b>${Core.esc(group.name)}</b><small>${Core.esc(detail)}</small></span></label>`;
    }).join("")}</div>` : '<small class="dive-group-empty">Create dive groups in Settings to organize this logbook.</small>'}`;
  }
  function drawProfileGraph() {
    if (!lastGraph) return;
    const { dive, profile } = lastGraph;
    const ceiling = profile
      .map((p) => ({ t: +(p.t ?? p.time), ceil: +(p.stopDepth || 0) }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.ceil));
    drawDiveProfile("seaBirdsProfileCanvas", profile, {
      maxDepth: +dive.depth,
      totalTime: +dive.duration,
      isLight: true,
      ceilingWps: ceiling,
      showDecoCeiling: true,
      showTemperature: graphLayers.temperature,
      showNDL: graphLayers.ndl,
      showGF99: graphLayers.gf99,
      // Preserve the same breathing-gas assumptions if plot-core has to
      // redraw the graph after zooming or panning.
      gf99Options: {
        gas: (dive.gases || []).find(Boolean) || dive.gasUsed || "21/0",
        closedCircuit: /^(CC\/BO|CCR)$/i.test(String(dive.diveMode || "")),
      },
    });
  }
  function fill(d) {
    const state = Core.getState(),
      rawProfile = d.profile?.length
        ? d.profile.map((point) => ({ ...point, t: point.t ?? point.time }))
        : Core.sampleProfile(+d.depth, +d.duration),
      profile = profileWithGf99(rawProfile, d),
      temps = profile
        .map((p) => p.temperature ?? p.temp)
        .filter(Number.isFinite),
      tts = profile.map((p) => p.tts).filter(Number.isFinite),
      gases = [
        ...new Set([
          ...(d.gases || []),
          ...profile.map((p) => p.gas).filter(Boolean),
        ]),
      ].map(Core.formatGas),
      cns = profile.map((p) => p.cns).filter(Number.isFinite),
      depths = profile.map((p) => +p.depth).filter(Number.isFinite),
      average =
        d.avgDepth ||
        (depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : 0),
      minimumTemp = temps.length
        ? Core.temperature(Math.min(...temps)).toFixed(1) +
          "°" +
          state.settings.temp.toUpperCase()
        : d.temp != null
          ? Core.temperature(+d.temp).toFixed(1) +
            "°" +
            state.settings.temp.toUpperCase()
          : null,
      maximumTemp = temps.length
        ? Core.temperature(Math.max(...temps)).toFixed(1) +
          "°" +
          state.settings.temp.toUpperCase()
        : d.temp != null
          ? Core.temperature(+d.temp).toFixed(1) +
            "°" +
            state.settings.temp.toUpperCase()
          : null,
      averageTemp = temps.length
        ? Core.temperature(
            temps.reduce((a, b) => a + b, 0) / temps.length,
          ).toFixed(1) +
          "°" +
          state.settings.temp.toUpperCase()
        : d.temp != null
          ? Core.temperature(+d.temp).toFixed(1) +
            "°" +
            state.settings.temp.toUpperCase()
          : null,
      detectedGas = gases.length
        ? gases.join(" · ")
        : profile.some((p) => p.setpoint != null)
          ? null
          : "Air",
      gas = d.gasUsed || detectedGas,
      mode = normalizeDiveMode(d.diveMode, profile),
      formattedDate = Core.formatDate(d.date).full,
      formattedTime = displayTime(d.time);
    const recordedPressures = profile.map((point) => Number(point.pressure)).filter(Number.isFinite),
      startPressure = d.startPressure ?? recordedPressures[0] ?? null,
      endPressure = d.endPressure ?? recordedPressures.at(-1) ?? null;
    document.getElementById("profileTitle").textContent =
      d.site +
      " · " +
      formattedDate +
      (formattedTime ? " · " + formattedTime : "");
    document.getElementById("telemetryNotice").hidden =
      profile.some((p) => p.ndl != null || p.tts != null || p.gas) ||
      !String(d.id).startsWith("shearwater-");
    const location = d.location === "Downloaded from Shearwater" ? "" : d.location || "지역 미입력",
      point = d.diveSite || d.site || "포인트 미입력",
      endTime = displayTime(d.endTime || calculatedEndTime(d.time, d.duration)) || "—",
      depthUnit = state.settings.depth,
      surfaceTemp = d.surfaceTemp == null ? "—" : Core.temperature(+d.surfaceTemp).toFixed(1) + "°" + state.settings.temp.toUpperCase(),
      avgDepthText = average ? Core.converted(average).toFixed(1) + " " + depthUnit : "—",
      maxDepthText = Core.converted(+d.depth).toFixed(1) + " " + depthUnit,
      visibilityText = d.visibility == null ? "—" : Core.converted(+d.visibility).toFixed(1) + " " + depthUnit,
      safetyText = d.safetyStop === 0 ? "안 함" : d.safetyStop ? d.safetyStop + "분" : "미기록",
      pressureText = (value) => value == null ? "—" : Math.round(value) + " bar",
      condition = (label, value, field) => {
        const levels = { "맑음": 1, "구름 조금": 2, "흐림": 3, "비": 4, "눈": 5, "없음": 1, "약함": 2, "보통": 3, "강함": 5 },
          active = levels[value] || 0;
        return `<span class="paper-condition quick-edit-target" data-edit-field="${field}" data-edit-label="${label}"><small>${label}</small><b>${Core.esc(value || "미기록")}</b><i>${[1,2,3,4,5].map((level) => `<u class="${level <= active ? "active" : ""}"></u>`).join("")}</i></span>`;
      },
      technical = [
        ["다이빙 모드", mode], ["염도", d.salinity || "—"], ["사용 기체", gas || "—"],
        ["최대 TTS", tts.length ? Math.max(...tts) + "분" : "—"],
        ["최대 CNS", cns.length ? Math.max(...cns) + "%" : "—"],
        ["기기 GF", d.gfLow != null ? d.gfLow + "/" + d.gfHigh : "—"],
      ],
      checked = (active) => `<i class="paper-check${active ? " checked" : ""}">${active ? "✓" : ""}</i>`,
      hasTag = (value) => (d.tags || []).some((tag) => String(tag).toLowerCase().includes(value)),
      isShore = /shore|beach/i.test(d.diveType || "") || hasTag("해안") || hasTag("shore"),
      isBoat = /boat/i.test(d.diveType || "") || hasTag("보트") || hasTag("boat");
    document.getElementById("profileStats").innerHTML =
      `<header class="paper-logbook-heading"><span class="paper-log-number quick-edit-target" data-edit-field="editDiveNumber" data-edit-label="로그 번호"><small>LOG</small><b>${Core.esc(d.diveNumber ?? "—")}</b></span><span class="quick-edit-target" data-edit-field="editDiveDate" data-edit-label="날짜"><small>날짜</small><b>${Core.esc(formattedDate)}</b></span><span class="quick-edit-target" data-edit-field="editDiveLocation" data-edit-label="지역"><small>지역</small><b>${Core.esc(location)}</b></span><span class="quick-edit-target" data-edit-field="editDiveSpot" data-edit-label="포인트"><small>포인트</small><b>${Core.esc(point)}</b></span></header>` +
      `<section class="paper-conditions">${condition("날씨", d.weather, "editDiveWeather")}${condition("파도", d.wave, "editDiveWave")}${condition("조류", d.current, "editDiveCurrent")}</section>` +
      `<section class="paper-tank-flow"><div class="paper-tank"><i></i><span><small>입수 시간</small><b class="quick-edit-target" data-edit-field="editDiveTime" data-edit-label="입수 시간">${Core.esc(formattedTime || "—")}</b><em class="quick-edit-target" data-edit-field="editDiveStartPressure" data-edit-label="시작 공기압">${pressureText(startPressure)}</em></span></div><strong aria-hidden="true">›››</strong><div class="paper-tank outgoing"><i></i><span><small>출수 시간</small><b class="quick-edit-target" data-edit-field="editDiveEndTime" data-edit-label="출수 시간">${Core.esc(endTime)}</b><em class="quick-edit-target" data-edit-field="editDiveEndPressure" data-edit-label="종료 공기압">${pressureText(endPressure)}</em></span></div></section>` +
      `<section class="paper-temperature-summary"><span><small>최저 수온</small><b>${minimumTemp || "—"}</b></span><span><small>최고 수온</small><b>${maximumTemp || "—"}</b></span><span><small>평균 수온</small><b>${averageTemp || "—"}</b></span></section>` +
      `<section class="paper-dive-metrics"><div><small>수면 수온</small><b class="quick-edit-target" data-edit-field="editDiveSurfaceTemp" data-edit-label="수면 수온">${surfaceTemp}</b><small>시야</small><b class="quick-edit-target" data-edit-field="editDiveVisibility" data-edit-label="시야">${visibilityText}</b></div><div class="paper-time"><small>수면 휴식</small><b class="quick-edit-target" data-edit-field="editDiveSurfaceInterval" data-edit-label="수면 휴식">${d.surfaceInterval == null ? "—" : d.surfaceInterval + "분"}</b><small>총 다이빙 시간</small><strong class="quick-edit-target" data-edit-field="editDiveDuration" data-edit-label="총 다이빙 시간">${d.duration || 0}<em>분</em></strong></div><div><small>안전 정지</small><b class="quick-edit-target" data-edit-field="editDiveSafetyStop" data-edit-label="안전 정지">${safetyText}</b><small>평균 수심</small><b class="quick-edit-target" data-edit-field="editDiveAvgDepth" data-edit-label="평균 수심">${avgDepthText}</b><small>최대 수심</small><b class="quick-edit-target" data-edit-field="editDiveDepth" data-edit-label="최대 수심">${maxDepthText}</b></div></section>` +
      `<section class="paper-weight-row quick-edit-target" data-edit-field="editDiveWeight" data-edit-label="웨이트"><small>웨이트</small><b>${d.weight == null ? "미기록" : Core.esc(d.weight) + " kg"}</b></section>` +
      `<section class="paper-dive-checks"><span data-toggle-dive-tag="shore">${checked(isShore)}해안</span><span data-toggle-dive-tag="boat">${checked(isBoat)}보트</span><span data-toggle-dive-tag="night">${checked(hasTag("night") || hasTag("야간"))}야간</span><span data-toggle-dive-tag="drift">${checked(hasTag("drift") || hasTag("드리프트"))}드리프트</span></section>` +
      `<section class="paper-logbook-notes quick-edit-target" data-edit-field="editDiveNotes" data-edit-label="다이빙 기록"><small>✎　다이빙 기록</small><div class="paper-log-actions"><button type="button" class="paper-drawing-add" data-open-dive-drawing>✍ 그림 그리기</button><button type="button" class="paper-media-add" data-add-dive-media>📷 사진·영상 추가</button></div><p>${Core.esc(d.notes || "기록된 메모가 없습니다.")}</p><div id="paperMediaGallery" class="paper-media-preview"></div></section>` +
      `<details class="paper-computer-details"><summary>다이빙 컴퓨터 데이터 보기</summary><section class="paper-technical">${technical.map(([label, value]) => `<span><small>${label}</small><b>${Core.esc(value)}</b></span>`).join("")}</section><section class="paper-extra"><span><small>장비 구성</small><b>${Core.esc(d.diveStyle || "—")}</b></span><span><small>버디</small><b>${Core.esc(d.buddy || "—")}</b></span></section></details>`;
    document.getElementById("editDiveNumber").value = d.diveNumber ?? "";
    document.getElementById("editDiveDate").value = d.date || "";
    document.getElementById("editDiveTime").value = d.time || "";
    document.getElementById("editDiveDepth").value = d.depth ?? "";
    document.getElementById("editDiveDuration").value = d.duration ?? "";
    document.getElementById("editDiveTemp").value = d.temp ?? "";
    document.getElementById("editDiveAvgDepth").value = d.avgDepth ?? (average || "");
    document.getElementById("editDiveSurfaceTemp").value = d.surfaceTemp ?? "";
    document.getElementById("editDiveVisibility").value = d.visibility ?? "";
    document.getElementById("editDiveWeight").value = d.weight ?? "";
    document.getElementById("editDiveSurfaceInterval").value = d.surfaceInterval ?? "";
    document.getElementById("editDiveSafetyStop").value = d.safetyStop ?? "";
    document.getElementById("editDiveStartPressure").value = startPressure == null ? "" : Math.round(startPressure);
    document.getElementById("editDiveEndPressure").value = endPressure == null ? "" : Math.round(endPressure);
    document.getElementById("editDiveWeather").value = d.weather || "";
    document.getElementById("editDiveWave").value = d.wave || "";
    document.getElementById("editDiveCurrent").value = d.current || "";
    document.getElementById("editDiveTitle").value = d.site || "";
    document.getElementById("editDiveLocation").value =
      d.location === "Downloaded from Shearwater" ? "" : d.location || "";
    document.getElementById("editDiveSpot").value = d.diveSite || "";
    document.getElementById("editDiveBuddy").value = d.buddy || "";
    document.getElementById("editDiveType").value = d.diveType || "";
    document.getElementById("editDiveTags").value = (d.tags || []).join(", ");
    document.getElementById("editDiveMode").value = mode;
    document.getElementById("editDiveStyle").value = d.diveStyle || "";
    document.getElementById("editDiveGas").value = gas === "Air" ? "공기" : gas || "";
    document.getElementById("editDiveSalinity").value = d.salinity || "";
    document.getElementById("editDiveNotes").value =
      d.notes === "Downloaded from Perdix" ? "" : d.notes || "";
    renderGroupChoices(d);
    Core.feature("equipment")?.renderDive(d);
    const isComputerDive = String(d.id).startsWith("shearwater-"),
      serialFallback = isComputerDive ? String(d.id).split("-")[1] : null,
      info = [
        ["Model", d.computer || "Shearwater Perdix"],
        ["Serial", d.computerSerial || serialFallback || "—"],
        ["Firmware", d.computerFirmware || "Refresh from computer"],
        [
          "Log version",
          d.logVersion != null
            ? d.logVersion + " (PNF)"
            : "Refresh from computer",
        ],
        [
          "Decompression model",
          d.gfLow != null
            ? `Bühlmann GF ${d.gfLow}/${d.gfHigh}`
            : "Refresh from computer",
        ],
        ["Log fingerprint", String(d.id).split("-").pop()],
      ];
    document.getElementById("diveInformation").innerHTML =
      `<h3 class="info-section-title">Dive computer</h3>${info.map(([label, value]) => `<div class="info-cell"><b>${Core.esc(value)}</b>${Core.esc(label)}</div>`).join("")}`;
    document
      .querySelectorAll("[data-dive-tab]")
      .forEach((node) =>
        node.classList.toggle("active", node.dataset.diveTab === "profile"),
      );
    document
      .querySelectorAll("[data-dive-panel]")
      .forEach((node) =>
        node.classList.toggle("active", node.dataset.divePanel === "profile"),
      );
    lastGraph = { dive: d, profile };
    requestAnimationFrame(() =>
      requestAnimationFrame(drawProfileGraph),
    );
  }
  function showEntry(entry, isNew = false) {
    activeId = entry.id;
    currentPersisted = !isNew;
    draft = Core.clone(entry);
    if (draft.surfaceInterval == null)
      draft.surfaceInterval = calculatedSurfaceInterval(draft);
    fill(draft);
    renderMedia(draft);
    renderHeader(draft);
    const endTime =
      draft.endTime || calculatedEndTime(draft.time, draft.duration);
    draft.endTime = endTime;
    document.getElementById("editDiveEndTime").value = endTime;
    document.getElementById("deleteDive").hidden = isNew;
    document.getElementById("profileDialog").classList.remove("editing-profile");
    document.getElementById("profileEditFields").hidden = true;
    document.getElementById("profileStats").hidden = false;
    document.querySelector(".paper-profile-details").hidden = false;
    document.getElementById("paperEdit").textContent = "수정";
    document.getElementById("profileDialog").showModal();
    if (isNew) document.getElementById("paperEdit").click();
  }
  function open(id) {
    const found = Core.getState().dives.find((item) => item.id === id);
    if (found) showEntry(found);
  }
  function createManual() {
    const now = new Date(),
      local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    showEntry(
      {
        id: `manual-${crypto.randomUUID()}`,
        diveNumber: nextDiveNumber(),
        date: local.toISOString().slice(0, 10),
        time: local.toTimeString().slice(0, 5),
        site: "제목 없는 다이빙",
        location: "",
        buddy: "",
        diveType: "",
        tags: [],
        notes: "",
        diveMode: "Air",
        diveStyle: "",
        gasUsed: "",
        salinity: "",
        depth: 0,
        duration: 0,
        temp: null,
        avgDepth: null,
        surfaceTemp: null,
        visibility: null,
        weight: null,
        surfaceInterval: null,
        safetyStop: null,
        startPressure: null,
        endPressure: null,
        weather: "",
        wave: "",
        current: "",
        profile: [],
        equipment: [],
        equipmentCards: [],
        equipmentCategories: {},
        updatedAt: now.toISOString(),
      },
      true,
    );
  }
  function clearMediaUrls() {
    mediaObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    mediaObjectUrls = [];
  }
  async function renderMedia(dive) {
    const gallery = document.getElementById("diveMediaGallery"),
      paperGallery = document.getElementById("paperMediaGallery");
    if (!gallery || !dive) return;
    clearMediaUrls();
    gallery.innerHTML = '<p class="dive-media-empty">첨부 파일을 불러오는 중…</p>';
    if (paperGallery) paperGallery.innerHTML = "";
    try {
      const items = await window.SeaBirdsStorage.getMedia(dive.id);
      if (!items.length) {
        gallery.innerHTML = '<p class="dive-media-empty">등록된 사진이나 동영상이 없습니다.</p>';
        paperGallery?.closest(".paper-logbook-notes")?.classList.remove("has-media");
        return;
      }
      const previews = items.map((item) => {
        const url = URL.createObjectURL(item.blob);
        mediaObjectUrls.push(url);
        const preview = String(item.type).startsWith("video/")
          ? `<video src="${url}" controls preload="metadata"></video>`
          : `<img src="${url}" alt="${Core.esc(item.name || "다이빙 사진")}">`;
        return { item, preview };
      });
      gallery.innerHTML = previews.map(({ item, preview }) => `<article class="dive-media-item" data-media-id="${Core.esc(item.id)}">${preview}<footer><span>${Core.esc(item.name || "첨부 파일")}</span><button type="button" data-remove-media="${Core.esc(item.id)}" aria-label="첨부 파일 삭제">×</button></footer></article>`).join("");
      if (paperGallery) {
        paperGallery.innerHTML = previews.map(({ item, preview }) => `<figure title="${Core.esc(item.name || "첨부 파일")}">${preview}<button type="button" data-remove-paper-media="${Core.esc(item.id)}" aria-label="첨부 사진 또는 동영상 삭제">×</button></figure>`).join("");
        paperGallery.closest(".paper-logbook-notes")?.classList.add("has-media");
      }
    } catch (error) {
      gallery.innerHTML = `<p class="dive-media-empty">첨부 파일을 불러오지 못했습니다: ${Core.esc(error.message)}</p>`;
      if (paperGallery) paperGallery.innerHTML = '<small>첨부 파일을 표시하지 못했습니다.</small>';
    }
  }
  async function addMedia(files) {
    if (!draft || !files?.length) return;
    for (const file of files) {
      const limit = file.type.startsWith("video/") ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
      if (!file.type.match(/^(image|video)\//)) continue;
      if (file.size > limit) {
        Core.showError(`${file.name} 파일이 너무 큽니다. 사진은 25MB, 동영상은 250MB 이하만 추가할 수 있습니다.`, "첨부 파일 용량 초과");
        continue;
      }
      const item = { id: `media-${crypto.randomUUID()}`, diveId: draft.id, name: file.name, type: file.type, size: file.size, createdAt: new Date().toISOString(), blob: file };
      await window.SeaBirdsStorage.putMedia(item);
      draft.media = [...(draft.media || []), { id: item.id, name: item.name, type: item.type, size: item.size, createdAt: item.createdAt }];
    }
    await renderMedia(draft);
    Core.notify("사진·동영상이 추가되었습니다. 로그를 저장해 주세요");
  }
  async function removeMedia(id) {
    if (!id || !draft || !confirm("이 사진 또는 동영상을 삭제할까요?")) return;
    await window.SeaBirdsStorage.deleteMedia(id);
    draft.media = (draft.media || []).filter((item) => item.id !== id);
    await renderMedia(draft);
    Core.notify("첨부 파일을 삭제했습니다");
  }
  function initDrawingBoard() {
    const dialog = document.getElementById("diveDrawingDialog"),
      canvas = document.getElementById("diveDrawingCanvas"),
      context = canvas.getContext("2d"),
      color = document.getElementById("diveDrawingColor"),
      size = document.getElementById("diveDrawingSize"),
      eraser = document.getElementById("diveDrawingEraser"),
      history = [];
    let drawing = false, erasing = false, changed = false;
    const whiteBackground = () => { context.save(); context.fillStyle = "#fffef8"; context.fillRect(0, 0, canvas.width, canvas.height); context.restore(); };
    const snapshot = () => { history.push(context.getImageData(0, 0, canvas.width, canvas.height)); if (history.length > 20) history.shift(); };
    const reset = () => { context.clearRect(0, 0, canvas.width, canvas.height); whiteBackground(); history.length = 0; changed = false; erasing = false; eraser.setAttribute("aria-pressed", "false"); };
    const point = (event) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    const finish = () => { drawing = false; context.beginPath(); };
    canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); snapshot(); drawing = true; changed = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); });
    canvas.addEventListener("pointermove", (event) => { if (!drawing) return; event.preventDefault(); const p = point(event); context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = Number(size.value); context.strokeStyle = erasing ? "#fffef8" : color.value; context.lineTo(p.x, p.y); context.stroke(); });
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    const open = () => { if (!draft) return; reset(); dialog.showModal(); };
    document.querySelector("[data-open-dive-drawing]")?.addEventListener("click", open);
    eraser.onclick = () => { erasing = !erasing; eraser.setAttribute("aria-pressed", String(erasing)); };
    document.getElementById("diveDrawingUndo").onclick = () => { const previous = history.pop(); if (previous) context.putImageData(previous, 0, 0); changed = history.length > 0; };
    document.getElementById("diveDrawingClear").onclick = () => { if (changed && !confirm("그림을 모두 지울까요?")) return; reset(); };
    const close = () => dialog.close();
    dialog.querySelector(".close").onclick = close;
    document.getElementById("cancelDiveDrawing").onclick = close;
    document.getElementById("saveDiveDrawing").onclick = () => {
      if (!changed) { Core.showError("먼저 그림을 그려 주세요.", "저장할 그림이 없습니다"); return; }
      canvas.toBlob(async (blob) => {
        if (!blob) { Core.showError("그림 파일을 만들지 못했습니다.", "그림 저장 실패"); return; }
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await addMedia([new File([blob], `다이빙-그림-${stamp}.png`, { type: "image/png" })]);
        close();
        Core.notify("그림을 다이빙 로그에 추가했습니다");
      }, "image/png");
    };
    reset();
    return { dialog, open, close };
  }
  function createFromPhoto(fields = {}) {
    const now = new Date(),
      local = new Date(now.getTime() - now.getTimezoneOffset() * 60000),
      duration = Math.max(0, Number(fields.duration) || 0),
      depth = Math.max(0, Number(fields.depth) || 0);
    showEntry({
      id: `photo-${crypto.randomUUID()}`,
      date: fields.date || local.toISOString().slice(0, 10),
      time: fields.time || "",
      endTime: fields.endTime || "",
      diveNumber: fields.diveNumber || nextDiveNumber(),
      site: fields.site || "사진에서 인식한 다이빙",
      location: fields.location || "",
      diveSite: fields.diveSite || "",
      buddy: "",
      diveType: "",
      tags: ["사진 로그북"],
      notes: fields.notes || "",
      diveMode: "Air",
      diveStyle: "",
      gasUsed: "",
      salinity: "",
      depth,
      duration,
      temp: fields.temp == null ? null : Number(fields.temp),
      weight: fields.weight == null ? null : Number(fields.weight),
      profile: depth && duration ? Core.sampleProfile(depth, duration) : [],
      equipment: [], equipmentCards: [], equipmentCategories: {},
      updatedAt: now.toISOString(),
    }, true);
  }
  function close() {
    const abandonedId = !currentPersisted ? activeId : null;
    clearMediaUrls();
    draft = null;
    activeId = null;
    document.getElementById("deleteDive").hidden = false;
    if (abandonedId) window.SeaBirdsStorage.deleteDiveMedia(abandonedId).catch(() => {});
  }
  async function save(keepOpen = false) {
    if (!draft) return;
    const rawDiveNumber = document
        .getElementById("editDiveNumber")
        .value.trim(),
      date = document.getElementById("editDiveDate").value,
      time = document.getElementById("editDiveTime").value;
    if (
      rawDiveNumber &&
      (!/^\d{1,4}$/.test(rawDiveNumber) ||
        +rawDiveNumber < 1 ||
        +rawDiveNumber > 9999)
    ) {
      Core.showError(
        "Dive # must be a whole number from 1 to 9999.",
        "Invalid dive number",
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Core.showError("Choose a valid dive date.", "Invalid dive date");
      return;
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Core.showError("Choose a valid dive time.", "Invalid dive time");
      return;
    }
    draft.diveNumber = rawDiveNumber ? +rawDiveNumber : null;
    draft.date = date;
    draft.time = time;
    draft.endTime = document.getElementById("editDiveEndTime").value;
    draft.depth = Math.max(0, Number(document.getElementById("editDiveDepth").value) || 0);
    draft.duration = Math.max(0, Number(document.getElementById("editDiveDuration").value) || 0);
    const enteredTemp = document.getElementById("editDiveTemp").value;
    draft.temp = enteredTemp === "" ? null : Number(enteredTemp);
    const optionalNumber = (id) => {
      const value = document.getElementById(id).value;
      return value === "" ? null : Math.max(0, Number(value));
    };
    draft.avgDepth = optionalNumber("editDiveAvgDepth");
    draft.surfaceTemp = document.getElementById("editDiveSurfaceTemp").value === "" ? null : Number(document.getElementById("editDiveSurfaceTemp").value);
    draft.visibility = optionalNumber("editDiveVisibility");
    draft.weight = optionalNumber("editDiveWeight");
    draft.surfaceInterval = optionalNumber("editDiveSurfaceInterval");
    draft.safetyStop = optionalNumber("editDiveSafetyStop");
    draft.startPressure = optionalNumber("editDiveStartPressure");
    draft.endPressure = optionalNumber("editDiveEndPressure");
    draft.weather = document.getElementById("editDiveWeather").value;
    draft.wave = document.getElementById("editDiveWave").value;
    draft.current = document.getElementById("editDiveCurrent").value;
    if (!String(draft.id).startsWith("shearwater-") && draft.depth && draft.duration)
      draft.profile = Core.sampleProfile(draft.depth, draft.duration);
    draft.site =
      document.getElementById("editDiveTitle").value.trim() || draft.site;
    draft.location = document.getElementById("editDiveLocation").value.trim();
    draft.diveSite = document.getElementById("editDiveSpot").value.trim();
    draft.buddy = document.getElementById("editDiveBuddy").value.trim();
    draft.diveType = document.getElementById("editDiveType").value;
    draft.tags = document
      .getElementById("editDiveTags")
      .value.split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    draft.groupIds = [...document.querySelectorAll("#editDiveGroups [data-dive-group]:checked")]
      .filter((input) => !input.disabled)
      .map((input) => input.dataset.diveGroup);
    draft.diveMode = document.getElementById("editDiveMode").value;
    draft.diveStyle = document.getElementById("editDiveStyle").value;
    draft.gasUsed = document.getElementById("editDiveGas").value.trim().replace(/^공기$/, "Air");
    draft.salinity = document.getElementById("editDiveSalinity").value;
    draft.notes = document.getElementById("editDiveNotes").value.trim();
    draft.userEdited = true;
    draft.updatedAt = new Date().toISOString();
    const saved = Core.clone(draft);
    await Core.commit((state) => {
      const index = state.dives.findIndex((item) => item.id === activeId);
      if (index >= 0) state.dives[index] = saved;
      else state.dives.push(saved);
    });
    currentPersisted = true;
    if (keepOpen) {
      fill(saved);
      renderHeader(saved);
    } else document.getElementById("profileDialog").close();
    Core.notify("다이빙 기록을 저장했습니다");
  }
  async function remove() {
    const current = draft;
    if (
      !current ||
      !confirm(
        `Delete "${current.site}" from your logbook? It will stay excluded from future device downloads.`,
      )
    )
      return;
    await Core.commit((state) => {
      state.deletedDiveIds = [
        ...new Set([...(state.deletedDiveIds || []), activeId]),
      ];
      state.dives = state.dives.filter((item) => item.id !== activeId);
    });
    await window.SeaBirdsStorage.deleteDiveMedia(activeId);
    document.getElementById("profileDialog").close();
    Core.notify("Dive deleted");
  }
  function init() {
    const profileDialog = document.getElementById("profileDialog");
    const quickEditDialog = document.getElementById("quickEditDialog");
    const drawingBoard = initDrawingBoard();
    const profileEditFields = document.querySelector("#profileEditFields .edit-grid");
    ["editDiveNumber", "editDiveTitle", "editDiveDate", "editDiveTime", "editDiveEndTime",
      "editDiveDepth", "editDiveDuration", "editDiveTemp", "editDiveAvgDepth", "editDiveSurfaceTemp",
      "editDiveVisibility", "editDiveWeight", "editDiveSurfaceInterval", "editDiveSafetyStop", "editDiveStartPressure",
      "editDiveEndPressure", "editDiveWeather", "editDiveWave", "editDiveCurrent", "editDiveType",
      "editDiveLocation", "editDiveSpot", "editDiveBuddy", "editDiveMode", "editDiveStyle",
      "editDiveGas", "editDiveSalinity"].forEach((id) => {
      const field = document.getElementById(id)?.closest("label");
      if (field) profileEditFields.appendChild(field);
    });
    document.querySelectorAll("[data-dive-tab]").forEach(
      (button) =>
        (button.onclick = () => {
          document
            .querySelectorAll("[data-dive-tab]")
            .forEach((node) =>
              node.classList.toggle("active", node === button),
            );
          document
            .querySelectorAll("[data-dive-panel]")
            .forEach((node) =>
              node.classList.toggle(
                "active",
                node.dataset.divePanel === button.dataset.diveTab,
              ),
            );
        }),
    );
    document.getElementById("editDiveEndTime").oninput = (event) => {
      if (draft) draft.endTime = event.target.value;
    };
    document.getElementById("saveDiveDetails").onclick = () => save();
    document.getElementById("deleteDive").onclick = remove;
    document.getElementById("editDiveMedia").onchange = (event) => {
      const input = event.currentTarget;
      addMedia([...input.files]).catch((error) => Core.showError(error.message, "첨부 실패")).finally(() => { input.value = ""; });
    };
    document.getElementById("diveMediaGallery").onclick = (event) => {
      const id = event.target.closest("[data-remove-media]")?.dataset.removeMedia;
      if (id) removeMedia(id).catch((error) => Core.showError(error.message, "첨부 삭제 실패"));
    };
    document.querySelectorAll("[data-graph-layer]").forEach((input) => {
      input.onchange = () => {
        graphLayers[input.dataset.graphLayer] = input.checked;
        drawProfileGraph();
      };
    });
    const closeProfile = () => { if (profileDialog.open) profileDialog.close(); };
    profileDialog.querySelector(".close").onclick = closeProfile;
    document.getElementById("paperBack").onclick = closeProfile;
    const setProfileEditing = (editing) => {
      profileDialog.classList.toggle("editing-profile", editing);
      document.getElementById("profileEditFields").hidden = !editing;
      document.getElementById("profileStats").hidden = editing;
      document.querySelector(".paper-profile-details").hidden = editing;
      document.getElementById("paperEdit").textContent = editing ? "저장" : "수정";
    };
    document.getElementById("paperEdit").onclick = () => {
      if (profileDialog.classList.contains("editing-profile")) save();
      else setProfileEditing(true);
    };
    document.getElementById("paperExport").onclick = () =>
      document.getElementById("openDiveExport").click();
    let quickEditSource = null;
    const closeQuickEdit = () => { if (quickEditDialog.open) quickEditDialog.close(); };
    document.getElementById("profileStats").onclick = async (event) => {
      const removeId = event.target.closest("[data-remove-paper-media]")?.dataset.removePaperMedia;
      if (removeId) {
        await removeMedia(removeId).catch((error) => Core.showError(error.message, "첨부 삭제 실패"));
        return;
      }
      if (event.target.closest("[data-add-dive-media]")) {
        document.getElementById("editDiveMedia").click();
        return;
      }
      if (event.target.closest("[data-open-dive-drawing]")) {
        drawingBoard.open();
        return;
      }
      const toggle = event.target.closest("[data-toggle-dive-tag]");
      if (toggle && draft) {
        const key = toggle.dataset.toggleDiveTag,
          definitions = {
            shore: { label: "해안", matches: (tag) => /해안|shore|beach/i.test(tag), type: /shore|beach/i },
            boat: { label: "보트", matches: (tag) => /보트|boat/i.test(tag), type: /boat/i },
            night: { label: "야간", matches: (tag) => /야간|night/i.test(tag) },
            drift: { label: "드리프트", matches: (tag) => /드리프트|drift/i.test(tag) },
          },
          definition = definitions[key],
          tags = (document.getElementById("editDiveTags").value || "").split(",").map((tag) => tag.trim()).filter(Boolean),
          typeInput = document.getElementById("editDiveType"),
          active = tags.some(definition.matches) || Boolean(definition.type?.test(typeInput.value));
        const nextTags = tags.filter((tag) => !definition.matches(tag));
        if (!active) nextTags.push(definition.label);
        if (active && definition.type?.test(typeInput.value)) typeInput.value = "";
        document.getElementById("editDiveTags").value = nextTags.join(", ");
        await save(true);
        return;
      }
      const target = event.target.closest("[data-edit-field]");
      if (!target) return;
      const source = document.getElementById(target.dataset.editField);
      if (!source) return;
      quickEditSource = source;
      const control = source.cloneNode(true);
      control.id = "quickEditInput";
      control.value = source.value;
      document.getElementById("quickEditTitle").textContent = `${target.dataset.editLabel} 수정`;
      document.getElementById("quickEditControl").replaceChildren(control);
      quickEditDialog.showModal();
      requestAnimationFrame(() => control.focus());
    };
    document.getElementById("quickEditSave").onclick = async () => {
      if (!quickEditSource) return;
      quickEditSource.value = document.getElementById("quickEditInput").value;
      closeQuickEdit();
      await save(true);
    };
    quickEditDialog.querySelector(".close").onclick = closeQuickEdit;
    document.getElementById("quickEditCancel").onclick = closeQuickEdit;
    document.getElementById("cancelProfileEdit").onclick = () => {
      fill(draft);
      setProfileEditing(false);
    };
    window.SeaBirdsHandleBack = () => {
      if (drawingBoard.dialog.open) {
        drawingBoard.close();
        return true;
      }
      if (quickEditDialog.open) {
        closeQuickEdit();
        return true;
      }
      if (!profileDialog.open) return false;
      closeProfile();
      return true;
    };
    profileDialog.addEventListener("close", close);
  }
  Core.registerFeature("diveEditor", { init, open, createManual, createFromPhoto, getDraft });
})();
