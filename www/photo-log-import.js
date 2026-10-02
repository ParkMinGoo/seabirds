(function () {
  "use strict";
  const NS = (window.SeaBirds = window.SeaBirds || {}), Core = NS.Core;

  function compactImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image(), url = URL.createObjectURL(file);
      image.onload = () => {
        const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 열 수 없습니다.")); };
      image.src = url;
    });
  }

  const numberNear = (lines, labels) => {
    const index = lines.findIndex(line => labels.some(label => line.toLowerCase().includes(label.toLowerCase())));
    if (index < 0) return null;
    const sameLine = labels.reduce((value, label) => value.replace(new RegExp(label, "ig"), ""), lines[index]);
    const value = sameLine.match(/\d+(?:[.,]\d+)?/) || lines[index + 1]?.match(/\d+(?:[.,]\d+)?/);
    return value ? Number(value[0].replace(",", ".")) : null;
  };
  const textNear = (lines, labels) => {
    const index = lines.findIndex(line => labels.some(label => line.toLowerCase().includes(label.toLowerCase())));
    if (index < 0) return "";
    const stripped = labels.reduce((value, label) => value.replace(new RegExp(label, "ig"), ""), lines[index]).replace(/[:：]/g, "").trim();
    return stripped || lines[index + 1]?.trim() || "";
  };
  function parse(text) {
    const clean = String(text || "").replace(/\r/g, ""), lines = clean.split("\n").map(x => x.trim()).filter(Boolean);
    const dateMatch = clean.match(/(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})/);
    const times = [...clean.matchAll(/(?:^|\s)([0-2]?\d)\s*[:：]\s*([0-5]\d)(?=\s|$)/gm)].map(m => `${m[1].padStart(2,"0")}:${m[2]}`);
    const logArea = lines.slice(0, 12).join("\n");
    const labeledLog = logArea.match(/(?:로그\s*(?:번호)?|dive\s*#?)\D{0,8}(\d{1,4})/i);
    const topNumber = lines.slice(0, 8).map(line => line.match(/^\s*(\d{1,4})\s*$/)?.[1]).find(value => value && value !== "2025");
    const depth = numberNear(lines, ["최대수심", "최대 수심", "max depth", "maxdepth"]);
    const duration = numberNear(lines, ["총 다이빙 시간", "total dive time", "dive time"]);
    const temp = numberNear(lines, ["수중온도", "수중 온도", "bottom temp", "lowest temperature"]);
    const location = textNear(lines, ["지역", "location"]);
    const diveSite = textNear(lines, ["포인트", "dive site"]);
    const recognized = [
      "[사진 인식 원문 — 저장 전에 내용을 확인해 주세요]",
      clean,
    ].join("\n");
    return {
      date: dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,"0")}-${dateMatch[3].padStart(2,"0")}` : "",
      time: times[0] || "", endTime: times[1] || "",
      diveNumber: labeledLog ? Number(labeledLog[1]) : topNumber ? Number(topNumber) : null,
      site: diveSite || location || "사진에서 인식한 다이빙",
      diveSite, location, depth, duration, temp, notes: recognized,
    };
  }

  async function recognize(file) {
    if (!file) return;
    const plugin = window.Capacitor?.Plugins?.PhotoLogOcr;
    if (!plugin) throw new Error("사진 글자 인식은 안드로이드 앱에서 사용할 수 있습니다.");
    Core.notify("사진의 글자를 인식하는 중입니다…");
    const result = await plugin.recognize({ image: await compactImage(file) });
    if (!result?.text?.trim()) throw new Error("글자를 찾지 못했습니다. 로그북을 밝고 수직으로 다시 촬영해 주세요.");
    Core.feature("diveEditor").createFromPhoto(parse(result.text));
    Core.notify("인식 결과를 확인한 뒤 저장해 주세요");
  }

  function init() {
    const dialog = document.getElementById("addDiveDialog"), input = document.getElementById("photoLogFile");
    document.getElementById("choosePhotoDive").onclick = () => { dialog.close(); input.click(); };
    input.onchange = event => recognize(event.target.files[0])
      .catch(error => Core.showError(error.message, "사진 로그 인식 실패"))
      .finally(() => { input.value = ""; });
  }
  Core.registerFeature("photoLogImport", { init, parse });
})();
