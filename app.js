/* Tric — UI wiring, URL state sync, rendering. */

"use strict";

const NUM_FIELDS = ["gs", "gw", "gr", "gh", "nk", "ch", "wa", "es", "fl", "bl", "bnr", "ua", "wr", "sl", "nrd", "hrd", "crd"];
const SEL_FIELDS = ["nrt", "hrt", "crt"];
const OPT_NUM = ["yd"]; // optional numeric (blank = auto)

const DEFAULTS = {
  gs: 22, gw: 10, gr: 30, gh: 10,
  nk: 56, ch: 100, wa: 96, es: 0,
  fl: 38, bl: 40, bnr: 2.5, yd: "",
  ua: 36, wr: 20, sl: 45,
  nrt: "1x1", nrd: 3, hrt: "2x2", hrd: 5, crt: "2x2", crd: 5,
  col: "#7c9a72", shownums: true,
};

function $(id) { return document.getElementById(id); }

function readInput() {
  const input = {};
  for (const k of NUM_FIELDS) {
    const v = parseFloat($(k).value);
    input[k] = Number.isFinite(v) ? v : DEFAULTS[k];
  }
  for (const k of OPT_NUM) {
    const v = parseFloat($(k).value);
    input[k] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  for (const k of SEL_FIELDS) input[k] = $(k).value;
  input.col = $("col").value;
  input.shownums = $("shownums").checked;
  return input;
}

function writeInputsFromParams(params) {
  for (const k of [...NUM_FIELDS, ...OPT_NUM]) {
    if (params.has(k)) $(k).value = params.get(k);
    else if (DEFAULTS[k] !== "") $(k).value = DEFAULTS[k];
  }
  for (const k of SEL_FIELDS) {
    const v = params.get(k);
    $(k).value = v && document.querySelector(`#${k} option[value="${v}"]`) ? v : DEFAULTS[k];
  }
  if (params.has("col") && /^#?[0-9a-fA-F]{6}$/.test(params.get("col"))) {
    $("col").value = params.get("col").startsWith("#") ? params.get("col") : "#" + params.get("col");
  }
  if (params.has("sn")) $("shownums").checked = params.get("sn") !== "0";
}

function paramsFromInput(input) {
  const p = new URLSearchParams();
  for (const k of NUM_FIELDS) {
    if (input[k] !== DEFAULTS[k]) p.set(k, input[k]);
  }
  for (const k of OPT_NUM) if (input[k] > 0) p.set(k, input[k]);
  for (const k of SEL_FIELDS) if (input[k] !== DEFAULTS[k]) p.set(k, input[k]);
  if (input.col !== DEFAULTS.col) p.set("col", input.col.replace("#", ""));
  if (!input.shownums) p.set("sn", "0");
  return p;
}

let urlTimer = null;
function syncURL(input) {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const q = paramsFromInput(input).toString();
    history.replaceState(null, "", q ? "?" + q : location.pathname);
  }, 250);
}

function render() {
  const input = readInput();
  const { calc, warnings, sections } = computePattern(input);

  // gauge hint
  $("gauge-hint").textContent =
    `= ${(calc.spc * 10).toFixed(1)} sts and ${(calc.rpc * 10).toFixed(1)} rows per 10 cm`;

  // warnings
  const wp = $("warnings-panel");
  const wl = $("warnings");
  wl.innerHTML = "";
  if (warnings.length) {
    for (const w of warnings) {
      const li = document.createElement("li");
      li.textContent = w;
      wl.appendChild(li);
    }
    wp.hidden = false;
  } else {
    wp.hidden = true;
  }

  // pattern
  const pat = $("pattern");
  pat.innerHTML = sections
    .map((s) => `<section class="pat-section"><h3>${s.title}</h3>${s.html}</section>`)
    .join("");

  // diagram
  renderDiagram($("diagram"), input, calc);

  syncURL(input);
}

function init() {
  writeInputsFromParams(new URLSearchParams(location.search));

  $("pattern-form").addEventListener("input", render);

  $("copy-link").addEventListener("click", async () => {
    const q = paramsFromInput(readInput()).toString();
    const url = location.origin + location.pathname + (q ? "?" + q : "");
    try {
      await navigator.clipboard.writeText(url);
      flashButton($("copy-link"), "Link copied ✓");
    } catch (e) {
      prompt("Copy this link:", url);
    }
  });

  $("print-btn").addEventListener("click", () => window.print());

  render();
}

function flashButton(btn, msg) {
  const old = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = old; }, 1500);
}

document.addEventListener("DOMContentLoaded", init);
