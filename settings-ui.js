(function () {
  "use strict";
  const NS = (window.SeaBirds = window.SeaBirds || {}), Core = NS.Core;
  const settingFields = [["depthUnit", "depth"], ["tempUnit", "temp"], ["volumeUnit", "volume"], ["weightUnit", "weight"], ["pressureUnit", "pressure"], ["dateFormat", "dateFormat"], ["timeFormat", "timeFormat"], ["divesPerPage", "divesPerPage"]];
  const GROUP_FIELDS = ["location", "diveSite", "diveStyle", "diveMode", "diveType"];
  let activeGroupId = null;

  function renderGroups() {
    const target = document.getElementById("diveGroupsLibrary");
    if (!target) return;
    const groups = Core.getState().diveGroups || [];
    target.innerHTML = groups.length
      ? groups.map((group) => `<article class="dive-group-card"><span><b>${Core.esc(group.name)}</b><small>${group.type === "range" ? `로그 #${Core.esc(group.startNumber)}—${Core.esc(group.endNumber)}` : group.type === "rule" ? `Automatic: ${Core.esc(group.field)} = ${Core.esc(group.value)}` : "Manual collection"}</small></span><span class="dive-group-card-actions"><button type="button" class="edit-dive-group" data-group-id="${Core.esc(group.id)}" title="Edit group" aria-label="Edit group">&#9998;</button><button type="button" class="remove-dive-group" data-group-id="${Core.esc(group.id)}" title="Delete group" aria-label="Delete group">&#215;</button></span></article>`).join("")
      : "<small>No groups yet. Create a group to organize your logbook.</small>";
  }
  function render() {
    const state = Core.getState();
    settingFields.forEach(([id, key]) => { const node = document.getElementById(id); if (node) node.value = state.settings[key]; });
    const baseline = document.getElementById("manualLogBaseline");
    if (baseline) {
      baseline.hidden = state.dives.length > 0;
      document.getElementById("manualLastLogNumber").value = state.settings.manualLastLogNumber || "";
      document.getElementById("manualLastLogDate").value = state.settings.manualLastLogDate || "";
      document.getElementById("manualLastLogTime").value = state.settings.manualLastLogTime || "";
      const status = document.getElementById("manualLogBaselineStatus");
      status.textContent = state.settings.manualLastLogNumber && state.settings.manualLastLogDate
        ? `저장된 기준: 로그 #${state.settings.manualLastLogNumber} · ${state.settings.manualLastLogDate}${state.settings.manualLastLogTime ? ` ${state.settings.manualLastLogTime}` : " (해당 날짜 이후)"}`
        : "아직 기준이 저장되지 않았습니다.";
    }
    renderGroups();
    Core.feature("equipment")?.renderMaster();
  }
  function showPage(page = "main") {
    const main = document.getElementById("settingsMain"), gear = document.getElementById("masterGearPage"), groups = document.getElementById("diveGroupsPage"), viewName = document.getElementById("viewName");
    main.hidden = page !== "main"; gear.hidden = page !== "gear"; groups.hidden = page !== "groups";
    if (viewName) viewName.textContent = page === "gear" ? "Equipment lists" : page === "groups" ? "Dive groups" : "Settings";
    if (page === "gear") Core.feature("equipment")?.renderMaster();
    if (page === "groups") renderGroups();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showMasterGear(show) { showPage(show ? "gear" : "main"); }
  function selectedGroup() { return (Core.getState().diveGroups || []).find((group) => group.id === activeGroupId); }
  function syncGroupType() {
    const type = document.getElementById("diveGroupType").value,
      rule = type === "rule",
      range = type === "range";
    document.getElementById("diveGroupRuleFields").hidden = !rule;
    document.getElementById("diveGroupRangeFields").hidden = !range;
    document.getElementById("diveGroupHelp").textContent = range
      ? "시작·끝 로그번호 사이의 기록을 날짜별 일차와 입수 시간순으로 자동 정리합니다."
      : rule ? "Automatic groups include every dive whose selected field exactly matches the value."
      : "Manual groups are assigned from the Groups section inside each dive entry.";
  }
  function populateRangeChoices(group = null) {
    const numbered = [...Core.getState().dives]
        .filter((dive) => Number.isFinite(Number(dive.diveNumber)))
        .sort((a, b) => Number(a.diveNumber) - Number(b.diveNumber) || String(a.date || "").localeCompare(String(b.date || ""))),
      unique = [...new Map(numbered.map((dive) => [Number(dive.diveNumber), dive])).values()],
      start = document.getElementById("diveGroupStartNumber"),
      end = document.getElementById("diveGroupEndNumber"),
      option = (dive) => `<option value="${Core.esc(dive.diveNumber)}">#${Core.esc(dive.diveNumber)} · ${Core.esc(dive.diveSite || dive.site || "제목 없는 다이빙")}</option>`;
    const choices = unique.map(option).join("");
    start.innerHTML = choices || '<option value="">로그번호가 있는 기록 없음</option>';
    end.innerHTML = choices || '<option value="">로그번호가 있는 기록 없음</option>';
    const ensure = (select, value) => {
      if (value == null || value === "") return;
      if (![...select.options].some((item) => item.value === String(value)))
        select.insertAdjacentHTML("beforeend", `<option value="${Core.esc(value)}">#${Core.esc(value)} · 현재 목록에 없는 로그</option>`);
      select.value = String(value);
    };
    if (group) {
      ensure(start, group.startNumber);
      ensure(end, group.endNumber);
    } else if (unique.length) {
      start.value = String(unique[0].diveNumber);
      end.value = String(unique.at(-1).diveNumber);
    }
  }
  function fillGroupEditor(group = selectedGroup()) {
    activeGroupId = group?.id || null;
    document.getElementById("diveGroupEditorTitle").textContent = group ? "Edit dive group" : "New dive group";
    document.getElementById("diveGroupName").value = group?.name || "";
    document.getElementById("diveGroupType").value = group?.type || "range";
    document.getElementById("diveGroupField").value = GROUP_FIELDS.includes(group?.field) ? group.field : "location";
    document.getElementById("diveGroupValue").value = group?.value || "";
    populateRangeChoices(group);
    document.getElementById("deleteDiveGroup").hidden = !group;
    syncGroupType();
  }
  function openGroupEditor(group = null) {
    fillGroupEditor(group);
    const dialog = document.getElementById("diveGroupDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  async function saveGroup() {
    const name = document.getElementById("diveGroupName").value.trim();
    const type = document.getElementById("diveGroupType").value;
    const field = document.getElementById("diveGroupField").value;
    const value = document.getElementById("diveGroupValue").value.trim();
    const startNumber = Number.parseInt(document.getElementById("diveGroupStartNumber").value, 10),
      endNumber = Number.parseInt(document.getElementById("diveGroupEndNumber").value, 10);
    if (!name) return Core.showError("여행 그룹 이름을 입력하세요.", "그룹 이름 확인");
    if (type === "rule" && !value) return Core.showError("Enter the value this automatic group should match.", "Match value required");
    if (type === "range" && (!Number.isInteger(startNumber) || !Number.isInteger(endNumber) || startNumber < 1 || endNumber > 9999 || startNumber > endNumber))
      return Core.showError("시작 로그번호와 끝 로그번호를 올바른 순서로 입력하세요.", "로그 범위 확인");
    if (type === "range") {
      const overlap = (Core.getState().diveGroups || []).find((item) => item.id !== activeGroupId && item.type === "range" && startNumber <= Number(item.endNumber) && endNumber >= Number(item.startNumber));
      if (overlap && !confirm(`“${overlap.name}” 그룹과 로그 범위가 겹칩니다. 그래도 저장할까요?`)) return;
    }
    const group = { id: activeGroupId || `group-${crypto.randomUUID()}`, name, type, ...(type === "range" ? { startNumber, endNumber } : type === "rule" ? { field, value } : {}) };
    await Core.commit((state) => {
      const index = (state.diveGroups || []).findIndex((item) => item.id === group.id);
      if (index >= 0) state.diveGroups[index] = group;
      else state.diveGroups = [...(state.diveGroups || []), group];
    });
    activeGroupId = group.id;
    renderGroups();
    document.getElementById("diveGroupDialog")?.close();
    Core.notify(`“${name}” 그룹을 저장했습니다`);
  }
  async function deleteGroup(id = activeGroupId) {
    const group = (Core.getState().diveGroups || []).find((item) => item.id === id);
    if (!group || !confirm(`Delete group "${group.name}"? Dives will not be deleted.`)) return;
    await Core.commit((state) => {
      state.diveGroups = (state.diveGroups || []).filter((item) => item.id !== id);
      state.dives.forEach((dive) => { dive.groupIds = (dive.groupIds || []).filter((groupId) => groupId !== id); });
    });
    activeGroupId = null;
    renderGroups();
    document.getElementById("diveGroupDialog")?.close();
    Core.notify("Group deleted");
  }
  function bindMaster() {
    document.querySelector(".master-gear").onclick = async (event) => {
      const addCard = event.target.closest("#addMasterGearCard"), addItem = event.target.closest(".add-master-item"), renameCard = event.target.closest(".rename-master-card"), removeCard = event.target.closest(".remove-master-card"), renameItem = event.target.closest(".rename-master-item"), removeItem = event.target.closest(".remove-master-item");
      if (!addCard && !addItem && !renameCard && !removeCard && !renameItem && !removeItem) return;
      await Core.commit((state) => {
        const library = state.gearLibrary = state.gearLibrary || Core.defaultGearLibrary();
        if (addCard) { const name = prompt("New equipment list name (for example: Photo dive)")?.trim(); if (name) library[name] = library[name] || []; }
        else if (addItem) { const name = prompt(`Add equipment to ${addItem.dataset.category}`)?.trim(); if (name) library[addItem.dataset.category] = [...new Set([...(library[addItem.dataset.category] || []), name])]; }
        else if (renameCard) { const original = renameCard.dataset.category, name = prompt("Rename master equipment list", original)?.trim(); if (name && name !== original) { library[name] = library[original]; delete library[original]; } }
        else if (removeCard && confirm(`Delete the master list "${removeCard.dataset.category}"? Existing dives will not be changed.`)) delete library[removeCard.dataset.category];
        else if (renameItem) { const category = renameItem.dataset.category, original = renameItem.dataset.item, name = prompt("Rename master equipment item", original)?.trim(); if (name) library[category] = library[category].map((item) => item === original ? name : item); }
        else if (removeItem && confirm(`Delete "${removeItem.dataset.item}" from the ${removeItem.dataset.category} master list?`)) library[removeItem.dataset.category] = (library[removeItem.dataset.category] || []).filter((item) => item !== removeItem.dataset.item);
      }, { sync: false });
      Core.notify("Master list changed · Save to sync");
    };
    document.getElementById("saveMasterGear").onclick = () => Core.commit(() => {}).then(() => Core.notify("Master equipment lists saved"));
  }
  function init() {
    Core.registerRenderer(render);
    settingFields.forEach(([id, key]) => document.getElementById(id).onchange = (event) => Core.commit((state) => { state.settings[key] = event.target.value; if (key === "depth") window.units = event.target.value === "ft" ? "imperial" : "metric"; }));
    document.getElementById("demoToggle").onchange = (event) => Core.commit((state) => { state.dives = event.target.checked ? [...Core.demo, ...state.dives.filter((d) => !d.id.startsWith("demo-"))] : state.dives.filter((d) => !d.id.startsWith("demo-")); });
    document.getElementById("saveManualLogBaseline").onclick = async () => {
      const number = Number.parseInt(document.getElementById("manualLastLogNumber").value, 10);
      const date = document.getElementById("manualLastLogDate").value;
      const time = document.getElementById("manualLastLogTime").value;
      if (!Number.isInteger(number) || number < 1 || number > 9999)
        return Core.showError("마지막 로그번호를 1부터 9999 사이의 숫자로 입력하세요.", "로그번호 확인");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return Core.showError("마지막 수기 로그의 날짜를 입력하세요.", "날짜 확인");
      await Core.commit((state) => {
        state.settings.manualLastLogNumber = String(number);
        state.settings.manualLastLogDate = date;
        state.settings.manualLastLogTime = time;
      });
      Core.notify(`수기 로그 #${number} 기준을 저장했습니다`);
    };
    document.getElementById("clearData").onclick = () => { if (confirm("Delete all locally stored SeaBirds dives and reset device exclusions?")) Core.commit((state) => { state.dives = []; state.deletedDiveIds = []; }).then(() => Core.notify("Local log cleared")); };
    document.getElementById("googleSignIn").onclick = () => window.SeaBirdsSync?.signIn().catch((error) => Core.notify(error?.message || String(error) || "Google sign-in failed"));
    document.getElementById("openMasterGear").onclick = () => showPage("gear");
    document.getElementById("closeMasterGear").onclick = () => showPage();
    document.getElementById("openDiveGroups").onclick = () => showPage("groups");
    document.getElementById("closeDiveGroups").onclick = () => showPage();
    document.querySelector('.nav[data-view="settings"]').addEventListener("click", () => showPage());
    document.getElementById("newDiveGroup").onclick = () => openGroupEditor();
    document.getElementById("diveGroupType").onchange = syncGroupType;
    document.getElementById("saveDiveGroup").onclick = saveGroup;
    document.getElementById("deleteDiveGroup").onclick = () => deleteGroup();
    document.getElementById("diveGroupsLibrary").onclick = (event) => {
      const edit = event.target.closest(".edit-dive-group"), remove = event.target.closest(".remove-dive-group");
      if (edit) return openGroupEditor((Core.getState().diveGroups || []).find((group) => group.id === edit.dataset.groupId));
      if (remove) deleteGroup(remove.dataset.groupId);
    };
    bindMaster();
  }
  Core.registerFeature("settings", { init, render, showMasterGear, showPage, openGroupEditor });
})();
