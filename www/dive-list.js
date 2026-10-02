(function () {
  "use strict";
  const NS = (window.SeaBirds = window.SeaBirds || {}),
    Core = NS.Core;
  let deviceFilters = new Set(),
    modeFilters = new Set(),
    styleFilters = new Set(),
    typeFilters = new Set(),
    groupFilters = new Set(),
    yearFilters = new Set(),
    monthFilters = new Set(),
    activeTripGroupId = null,
    sort = "date-desc",
    page = 1;
  const source = (d) => {
    if (
      !d.computer &&
      !d.computerModel &&
      !String(d.id || "").startsWith("shearwater-")
    )
      return "Manual";
    const raw = String(d.computer || d.computerModel || "Shearwater")
        .replace(/^Shearwater\s+/i, "")
        .trim(),
      known = {
        perdix: "Perdix",
        "perdix ai": "Perdix AI",
        "perdix 2": "Perdix 2",
        "perdix 3": "Perdix 3",
        teric: "Teric",
        "petrel 2": "Petrel 2",
        "petrel 3": "Petrel 3",
        "nerd 2": "NERD 2",
        peregrine: "Peregrine",
        tern: "Tern",
      };
    return known[raw.toLowerCase()] || raw || "Shearwater";
  };
  const mode = (d) =>
    ({ OC: "Air", CCR: "CC/BO", pSCR: "CC/BO" })[d.diveMode] ||
    d.diveMode ||
    ((d.profile || []).some((point) => point.setpoint != null)
      ? "CC/BO"
      : "Air");
  const style = (d) => d.diveStyle || "N/A";
  const diveType = (d) => d.diveType || "N/A";
  const matchesGroup = (d, group) => {
    if (!group) return false;
    if (group.type === "range") {
      const number = Number(d.diveNumber);
      return Number.isFinite(number) && number >= Number(group.startNumber) && number <= Number(group.endNumber);
    }
    if (group.type === "manual") return (d.groupIds || []).includes(group.id);
    const value = String(d[group.field] || "").trim().toLowerCase();
    return value === String(group.value || "").trim().toLowerCase();
  };
  const MODE_OPTIONS = ["Air", "Nitrox", "3 GasNx", "OC Tec", "Gauge", "CC/BO"];
  const STYLE_OPTIONS = ["Single Tank", "Double tanks", "Sidemount", "N/A"];
  function mostUsed(values, fallback = "—") {
    const counts = new Map();
    values.filter(Boolean).forEach((value) =>
      counts.set(value, (counts.get(value) || 0) + 1),
    );
    return [...counts.entries()].sort(
      ([left, leftCount], [right, rightCount]) =>
        rightCount - leftCount || left.localeCompare(right),
    )[0]?.[0] || fallback;
  }
  const stamp = (d) => `${d.date || ""}T${d.time || "00:00"}`;
  const year = (d) => String(d.date || "").slice(0, 4);
  const month = (d) => String(d.date || "").slice(5, 7);
  const monthLabel = (value) => {
    const number = Number(value);
    return number
      ? new Date(2000, number - 1, 1).toLocaleDateString(undefined, {
          month: "long",
        })
      : "";
  };
  function displayTime(value) {
    if (!value) return "";
    const [hours, minutes] = value.split(":").map(Number);
    if (Core.getState().settings.timeFormat === "24")
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return `${hours >= 12 ? "오후" : "오전"} ${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`;
  }
  function calculatedEndTime(start, duration) {
    if (!start || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return "";
    const [hours, minutes] = start.split(":").map(Number),
      total = (hours * 60 + minutes + (+duration || 0)) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  const tripDateLabel = (value) => {
    if (!value) return "날짜 미입력";
    const date = new Date(`${value}T12:00:00`), weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  };
  const pressureValues = (d) => {
    const recorded = (d.profile || []).map((sample) => Number(sample.pressure)).filter(Number.isFinite);
    return [d.startPressure ?? recorded[0] ?? null, d.endPressure ?? recorded.at(-1) ?? null];
  };
  function renderTripOverview() {
    const target = document.getElementById("tripGroupsOverview"),
      section = document.getElementById("tripGroupsSection"),
      groups = (Core.getState().diveGroups || []).filter((group) => group.type === "range");
    if (!target || !section) return;
    section.hidden = Boolean(activeTripGroupId);
    target.innerHTML = groups.length ? groups.map((group) => {
      const dives = Core.getState().dives.filter((dive) => matchesGroup(dive, group)).sort((a, b) => stamp(a).localeCompare(stamp(b))),
        dates = dives.map((dive) => dive.date).filter(Boolean),
        period = dates.length ? `${Core.formatDate(dates[0]).ymd} — ${Core.formatDate(dates.at(-1)).ymd}` : "일치하는 로그 없음";
      return `<button type="button" class="trip-group-card" data-open-trip-group="${Core.esc(group.id)}"><span class="trip-group-card-title"><b>${Core.esc(group.name)}</b><i>›</i></span><small>${Core.esc(period)}</small><span><em>LOG ${Core.esc(group.startNumber)}—${Core.esc(group.endNumber)}</em><strong>${dives.length}회 다이빙</strong></span></button>`;
    }).join("") : `<button type="button" class="trip-group-empty" data-create-trip-group><b>첫 여행 그룹을 만들어 보세요</b><small>시작·끝 로그번호만 입력하면 날짜와 시간순으로 자동 정리됩니다.</small></button>`;
  }
  function renderTripDetail() {
    const target = document.getElementById("tripGroupDetail"),
      allDives = document.getElementById("allDives"),
      pagination = document.getElementById("divePagination"),
      group = (Core.getState().diveGroups || []).find((item) => item.id === activeTripGroupId && item.type === "range");
    if (!target) return;
    document.getElementById("dives")?.classList.toggle("trip-detail-active", Boolean(group));
    if (!group) { target.hidden = true; allDives.hidden = false; pagination.hidden = false; return; }
    const dives = Core.getState().dives.filter((dive) => matchesGroup(dive, group)).sort((a, b) => stamp(a).localeCompare(stamp(b))),
      byDate = new Map();
    dives.forEach((dive) => { const key = dive.date || "unknown"; if (!byDate.has(key)) byDate.set(key, []); byDate.get(key).push(dive); });
    const dates = dives.map((dive) => dive.date).filter(Boolean),
      period = dates.length ? `${Core.formatDate(dates[0]).ymd} — ${Core.formatDate(dates.at(-1)).ymd}` : "일치하는 로그 없음";
    target.innerHTML = `<header class="trip-detail-hero"><button type="button" data-close-trip-group aria-label="전체 로그로 돌아가기">←</button><span><small>여행별 로그</small><h2>${Core.esc(group.name)}</h2><p>${Core.esc(period)} · 로그 ${Core.esc(group.startNumber)}—${Core.esc(group.endNumber)}</p></span><b>${dives.length}회<br><small>다이빙</small></b><button type="button" class="trip-detail-edit" data-edit-trip-group="${Core.esc(group.id)}" aria-label="여행 그룹 수정">✎</button></header>` +
      (dives.length ? [...byDate.entries()].map(([date, dayDives], index) => `<section class="trip-day-section"><header><span><b>${index + 1}일차 · ${Core.esc(tripDateLabel(date))}</b><small>${Core.esc(dayDives[0]?.location || "지역 미입력")} · ${dayDives.length}회</small></span></header><div>${dayDives.map((dive) => {
        const [startPressure, endPressure] = pressureValues(dive), point = dive.diveSite || dive.site || "포인트 미입력";
        return `<button type="button" class="dive-row trip-dive-row" data-id="${Core.esc(dive.id)}"><time>${Core.esc(displayTime(dive.time) || "--:--")}</time><span><small>로그 ${Core.esc(dive.diveNumber ?? "—")}</small><b>${Core.esc(point)}</b><em>최대 ${Core.converted(+dive.depth).toFixed(1)} ${Core.getState().settings.depth} · ${dive.duration || 0}분</em></span><strong>${startPressure == null ? "—" : Math.round(startPressure)} → ${endPressure == null ? "—" : Math.round(endPressure)} bar</strong><i>›</i></button>`;
      }).join("")}</div></section>`).join("") : '<div class="trip-no-dives"><b>이 범위에 해당하는 로그가 없습니다</b><small>그룹을 수정하거나 다이빙 로그번호를 확인해 주세요.</small></div>');
    target.hidden = false; allDives.hidden = true; pagination.hidden = true;
  }
  function rows(target, dives) {
    if (!target) return;
    const state = Core.getState();
    target.innerHTML = dives.length
      ? dives
          .map((d) => {
            const date = Core.formatDate(d.date),
              diveMode = mode(d),
              diveStyle = style(d),
              classification =
                diveStyle === "N/A"
                  ? diveMode
                  : `${diveMode} / ${diveStyle}`,
              startTime = displayTime(d.time),
              location = d.location || "지역 미입력",
              point = d.diveSite || d.site || "포인트 미입력",
              recordedPressures = (d.profile || []).map((sample) => Number(sample.pressure)).filter(Number.isFinite),
              startPressure = d.startPressure ?? recordedPressures[0] ?? null,
              endPressure = d.endPressure ?? recordedPressures.at(-1) ?? null,
              pressure = `${startPressure == null ? "—" : Math.round(startPressure)} → ${endPressure == null ? "—" : Math.round(endPressure)} bar`;
            return `<button class="dive-row logbook-card" data-id="${Core.esc(d.id)}"><span class="dive-number-cell"><small>LOG</small><b>#${d.diveNumber ?? "—"}</b></span><span class="logbook-card-place"><b>${Core.esc(location)}</b><strong>${Core.esc(point)}</strong></span><span class="logbook-card-summary"><small>${Core.esc(date.ymd)}</small><b>${Core.esc(startTime || "--:--")} · ${Core.converted(+d.depth).toFixed(1)} ${state.settings.depth} · ${d.duration || 0}분</b><span class="logbook-card-pressure">${pressure}</span><em>${Core.esc(classification)}</em></span><i class="logbook-card-arrow" aria-hidden="true">›</i></button>`;
          })
          .join("")
      : '<div class="empty"><b>No dives found</b>Change the search or filters to show more dives.</div>';
  }
  function sources() {
    return [...new Set(Core.getState().dives.map(source))].sort((a, b) =>
      a === "Manual" ? 1 : b === "Manual" ? -1 : a.localeCompare(b),
    );
  }
  function renderGroup(id, label, attribute, available, selected) {
    const target = document.getElementById(id);
    if (!target) return selected;
    const valid = new Set(available);
    selected = new Set([...selected].filter((item) => valid.has(item)));
    target.innerHTML = `<span>${label}:</span><label><input type="checkbox" data-${attribute}="all" ${selected.size ? "" : "checked"}> All</label>${available.map((item) => `<label><input type="checkbox" data-${attribute}="${Core.esc(item)}" ${selected.has(item) ? "checked" : ""}> ${Core.esc(item)}</label>`).join("")}`;
    return selected;
  }
  function filterSummary(id, allLabel, selected) {
    const target = document.getElementById(id);
    if (target)
      target.textContent = !selected.size
        ? allLabel
        : selected.size === 1
          ? [...selected][0]
          : `${selected.size} selected`;
  }
  function renderSortFilters() {
    const target = document.getElementById("sortFilters");
    if (!target) return;
    const options = [
      ["date-desc", "Newest"],
      ["date-asc", "Oldest"],
      ["depth-desc", "Deepest"],
    ];
    target.innerHTML = `<span>Sort:</span>${options.map(([value, label]) => `<label><input type="checkbox" data-sort="${value}" ${sort === value ? "checked" : ""}> ${label}</label>`).join("")}`;
  }
  function renderFilters() {
    const dives = Core.getState().dives;
    deviceFilters = renderGroup(
      "deviceFilters",
      "Computer",
      "device-filter",
      sources(),
      deviceFilters,
    );
    yearFilters = renderGroup(
      "yearFilters",
      "",
      "year-filter",
      [...new Set(dives.map(year).filter(Boolean))].sort().reverse(),
      yearFilters,
    );
    monthFilters = renderGroup(
      "monthFilters",
      "",
      "month-filter",
      [...new Set(dives.map(month).filter(Boolean))].sort().map(monthLabel),
      monthFilters,
    );
    filterSummary("yearFilterSummary", "All", yearFilters);
    filterSummary("monthFilterSummary", "All", monthFilters);
    groupFilters = renderGroup(
      "groupFilters",
      "",
      "group-filter",
      Core.getState().diveGroups.map((group) => group.name),
      groupFilters,
    );
    filterSummary("groupFilterSummary", "All", groupFilters);
    modeFilters = renderGroup(
      "modeFilters",
      "",
      "mode-filter",
      MODE_OPTIONS,
      modeFilters,
    );
    filterSummary("modeFilterSummary", "All", modeFilters);
    renderSortFilters();
    styleFilters = renderGroup(
      "styleFilters",
      "Style",
      "style-filter",
      STYLE_OPTIONS,
      styleFilters,
    );
    typeFilters = renderGroup(
      "typeFilters",
      "Type",
      "type-filter",
      ["Shore/Beach", "Boat", "N/A"],
      typeFilters,
    );
  }
  function renderPagination(total, totalPages) {
    const target = document.getElementById("divePagination");
    if (!target) return;
    target.innerHTML =
      totalPages > 1
        ? `<button type="button" data-page="previous" ${page === 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${totalPages} · ${total} dives</span><button type="button" data-page="next" ${page === totalPages ? "disabled" : ""}>Next</button>`
        : "";
  }
  function filterRows() {
    const state = Core.getState();
    let dives = [...state.dives],
      q = (document.getElementById("search")?.value || "").toLowerCase();
    if (q)
      dives = dives.filter((d) => JSON.stringify(d).toLowerCase().includes(q));
    if (deviceFilters.size)
      dives = dives.filter((d) => deviceFilters.has(source(d)));
    if (yearFilters.size) dives = dives.filter((d) => yearFilters.has(year(d)));
    if (monthFilters.size)
      dives = dives.filter((d) => monthFilters.has(monthLabel(month(d))));
    if (modeFilters.size) dives = dives.filter((d) => modeFilters.has(mode(d)));
    if (styleFilters.size)
      dives = dives.filter((d) => styleFilters.has(style(d)));
    if (typeFilters.size)
      dives = dives.filter((d) => typeFilters.has(diveType(d)));
    if (groupFilters.size)
      dives = dives.filter((d) =>
        state.diveGroups.some(
          (group) => groupFilters.has(group.name) && matchesGroup(d, group),
        ),
      );
    dives.sort(
      sort === "date-asc"
        ? (a, b) => stamp(a).localeCompare(stamp(b))
        : sort === "depth-desc"
          ? (a, b) => b.depth - a.depth
          : (a, b) => stamp(b).localeCompare(stamp(a)),
    );
    const perPage = Math.max(1, Number(state.settings.divesPerPage) || 25),
      totalPages = Math.max(1, Math.ceil(dives.length / perPage));
    page = Math.min(page, totalPages);
    rows(
      document.getElementById("allDives"),
      dives.slice((page - 1) * perPage, page * perPage),
    );
    renderPagination(dives.length, totalPages);
  }
  function render() {
    const state = Core.getState(),
      dives = [...state.dives].sort((a, b) => stamp(b).localeCompare(stamp(a)));
    document.getElementById("diveCount").textContent = dives.length;
    document.getElementById("statDives").textContent = dives.length;
    const mins = dives.reduce((n, d) => n + (+d.duration || 0), 0);
    document.getElementById("statTime").innerHTML =
      (mins / 60).toFixed(mins >= 600 ? 0 : 1) + "<sup>h</sup>";
    const depth = Math.max(0, ...dives.map((d) => +d.depth || 0));
    document.getElementById("statDepth").textContent = dives.length
      ? Core.converted(depth).toFixed(1) + " " + state.settings.depth
      : "—";
    const longest = Math.round(
        Math.max(0, ...dives.map((d) => +d.duration || 0)),
      ),
      hours = Math.floor(longest / 60),
      remainder = longest % 60;
    document.getElementById("statLongest").textContent = dives.length
      ? hours
        ? `${hours}h ${remainder}min`
        : `${remainder}min`
      : "—";
    const computers = [
      ...new Set(dives.map(source).filter((computer) => computer !== "Manual")),
    ];
    document.getElementById("statComputers").textContent = computers.length
      ? computers.join(" · ")
      : "—";
    document.getElementById("statMode").textContent = mostUsed(
      dives.map(mode),
    );
    document.getElementById("statStyle").textContent = mostUsed(
      dives.map(style),
    );
    document.getElementById("statType").textContent = mostUsed(
      dives.map(diveType),
      "N/A",
    );
    renderFilters();
    renderTripOverview();
    renderTripDetail();
    filterRows();
  }
  function bindFilter(id, attribute, getSet, setSet) {
    document.getElementById(id).onchange = (event) => {
      const input = event.target.closest(`[data-${attribute}]`);
      if (!input) return;
      const value =
          input.dataset[
            attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
          ],
        selected = getSet();
      if (value === "all") selected.clear();
      else input.checked ? selected.add(value) : selected.delete(value);
      setSet(selected);
      page = 1;
      renderFilters();
      // Mode is a compact single-purpose menu directly above the remaining
      // filters. Close it after a selection so its list never masks Style or
      // Type controls on narrower desktop layouts. Year, Month and Group stay
      // open because they are deliberately multi-select menus.
      if (id === "modeFilters")
        document.getElementById("modeFilter")?.removeAttribute("open");
      filterRows();
    };
  }
  function init() {
    Core.registerRenderer(render);
    document.getElementById("search").oninput = () => {
      page = 1;
      filterRows();
    };
    document.getElementById("sortFilters").onchange = (event) => {
      const input = event.target.closest("[data-sort]");
      if (!input) return;
      sort = input.dataset.sort;
      page = 1;
      renderSortFilters();
      filterRows();
    };
    bindFilter(
      "deviceFilters",
      "device-filter",
      () => deviceFilters,
      (value) => (deviceFilters = value),
    );
    bindFilter(
      "yearFilters",
      "year-filter",
      () => yearFilters,
      (value) => (yearFilters = value),
    );
    bindFilter(
      "monthFilters",
      "month-filter",
      () => monthFilters,
      (value) => (monthFilters = value),
    );
    bindFilter(
      "modeFilters",
      "mode-filter",
      () => modeFilters,
      (value) => (modeFilters = value),
    );
    bindFilter(
      "styleFilters",
      "style-filter",
      () => styleFilters,
      (value) => (styleFilters = value),
    );
    bindFilter(
      "typeFilters",
      "type-filter",
      () => typeFilters,
      (value) => (typeFilters = value),
    );
    bindFilter(
      "groupFilters",
      "group-filter",
      () => groupFilters,
      (value) => (groupFilters = value),
    );
    const dropdowns = Array.from(
      document.querySelectorAll(".filter-dropdown"),
    );
    dropdowns.forEach((dropdown) => {
      dropdown.addEventListener("toggle", () => {
        if (!dropdown.open) return;
        dropdowns.forEach((other) => {
          if (other !== dropdown) other.removeAttribute("open");
        });
      });
    });
    document.addEventListener("pointerdown", (event) => {
      const clickedDropdown = event
        .composedPath()
        .some((node) => node?.classList?.contains("filter-dropdown"));
      if (clickedDropdown) return;
      dropdowns.forEach((dropdown) => dropdown.removeAttribute("open"));
    });
    document.getElementById("divePagination").onclick = (event) => {
      const direction = event.target.closest("[data-page]")?.dataset.page;
      if (!direction) return;
      page += direction === "next" ? 1 : -1;
      filterRows();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const createTripGroup = () => Core.feature("settings")?.openGroupEditor(null);
    document.getElementById("addTripGroup").onclick = createTripGroup;
    document.getElementById("addTripGroupInline").onclick = createTripGroup;
    document.getElementById("tripGroupsOverview").onclick = (event) => {
      if (event.target.closest("[data-create-trip-group]")) return createTripGroup();
      const id = event.target.closest("[data-open-trip-group]")?.dataset.openTripGroup;
      if (id) { activeTripGroupId = id; renderTripOverview(); renderTripDetail(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    };
    document.getElementById("tripGroupDetail").onclick = (event) => {
      if (event.target.closest("[data-close-trip-group]")) { activeTripGroupId = null; renderTripOverview(); renderTripDetail(); return; }
      const editId = event.target.closest("[data-edit-trip-group]")?.dataset.editTripGroup;
      if (editId) return Core.feature("settings")?.openGroupEditor((Core.getState().diveGroups || []).find((group) => group.id === editId));
    };
    document.addEventListener("click", (event) => {
      const row = event.target.closest(".dive-row");
      if (row) Core.feature("diveEditor")?.open(row.dataset.id);
    });
  }
  Core.registerFeature("diveList", { init, render, filterRows, source, matchesGroup, renderTripDetail });
})();
