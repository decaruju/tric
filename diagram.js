/* Tric — live SVG schematic of the sweater (front view, flat, to scale). */

"use strict";

function renderDiagram(svg, input, calc) {
  const NS = "http://www.w3.org/2000/svg";
  svg.innerHTML = "";

  const col = input.col || "#7c9a72";
  const ribCol = shade(col, -22);
  const lineCol = "#3a3a3a";

  // ---- Geometry in cm (front view, flat) ----------------------------------
  const bodyW = calc.chest / 2;
  const hemW = calc.hem / 2;
  const neckW = Math.max(8, calc.front0 / calc.spc);      // flat neck opening width
  const yoke = calc.actual.yokeDepth;
  const frontLen = input.fl;
  const backLen = input.bl;
  const totalH = yoke + frontLen;
  const uaW = calc.upperArm / 2;
  const wrW = Math.max(4, input.wr / 2);
  const slLen = input.sl;
  const bnr = (calc.srPairs * 2) / calc.rpc;

  // Body outline points (x centered on 0, y down from neck line)
  const A = { x: -neckW / 2, y: 0 };                       // left neck edge
  const B = { x: neckW / 2, y: 0 };                        // right neck edge
  const UL = { x: -bodyW / 2, y: yoke };                   // left underarm
  const UR = { x: bodyW / 2, y: yoke };                    // right underarm
  const HL = { x: -hemW / 2, y: totalH };
  const HR = { x: hemW / 2, y: totalH };

  // Sleeves along raglan direction
  function sleevePts(neckPt, underarm, sign) {
    const dx = underarm.x - neckPt.x, dy = underarm.y - neckPt.y;
    const dl = Math.hypot(dx, dy);
    const d = { x: dx / dl, y: dy / dl };
    // normal to the sleeve's top edge, pointing down toward the body side:
    const nn = { x: sign * Math.abs(d.y) * -1, y: Math.abs(d.x) };
    const Ltot = dl + slLen;
    const topEnd = { x: neckPt.x + d.x * Ltot, y: neckPt.y + d.y * Ltot };
    const botEnd = { x: topEnd.x + nn.x * wrW, y: topEnd.y + nn.y * wrW };
    const botUa = { x: neckPt.x + d.x * dl + nn.x * uaW, y: neckPt.y + d.y * dl + nn.y * uaW };
    return { d, nn, dl, Ltot, topEnd, botEnd, botUa };
  }
  const sL = sleevePts(A, UL, -1);
  const sR = sleevePts(B, UR, 1);

  // ---- SVG helpers ----------------------------------------------------------
  const els = [];
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    els.push(e);
    return e;
  }
  const P = (pts) => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  // ---- Shapes ----------------------------------------------------------------
  // Sleeves first (behind body)
  for (const s of [sL, sR]) {
    const neckPt = s === sL ? A : B;
    const ua = s === sL ? UL : UR;
    el("polygon", { points: P([neckPt, s.topEnd, s.botEnd, s.botUa, ua]), fill: col, stroke: lineCol, "stroke-width": 0.6, "stroke-linejoin": "round" });
    // cuff ribbing band
    if (input.crd > 0) {
      const t = 1 - input.crd / s.Ltot;
      const cuffTop = { x: neckPt.x + s.d.x * s.Ltot * t, y: neckPt.y + s.d.y * s.Ltot * t };
      const w = wrW + (uaW - wrW) * (input.crd / (s.Ltot - s.dl));
      const cuffBot = { x: cuffTop.x + s.nn.x * w, y: cuffTop.y + s.nn.y * w };
      el("polygon", { points: P([cuffTop, s.topEnd, s.botEnd, cuffBot]), fill: ribCol, stroke: lineCol, "stroke-width": 0.6 });
    }
  }

  // Body
  el("polygon", { points: P([A, B, UR, HR, HL, UL]), fill: col, stroke: lineCol, "stroke-width": 0.6, "stroke-linejoin": "round" });

  // Back hem (longer back), dashed
  if (backLen - frontLen > 0.4) {
    const ex = backLen - frontLen;
    el("path", {
      d: `M ${HL.x} ${HL.y} C ${HL.x} ${HL.y + ex * 1.3}, ${HR.x} ${HR.y + ex * 1.3}, ${HR.x} ${HR.y}`,
      fill: "none", stroke: lineCol, "stroke-width": 0.6, "stroke-dasharray": "1.5 1.2",
    });
  }

  // Hem ribbing band
  if (input.hrd > 0) {
    const t = (totalH - input.hrd - yoke) / frontLen;
    const w2 = (bodyW / 2) + ((hemW / 2) - (bodyW / 2)) * t;
    el("polygon", { points: P([{ x: -w2, y: totalH - input.hrd }, { x: w2, y: totalH - input.hrd }, HR, HL]), fill: ribCol, stroke: lineCol, "stroke-width": 0.6 });
  }

  // Raglan lines
  el("line", { x1: A.x, y1: A.y, x2: UL.x, y2: UL.y, stroke: lineCol, "stroke-width": 0.9 });
  el("line", { x1: B.x, y1: B.y, x2: UR.x, y2: UR.y, stroke: lineCol, "stroke-width": 0.9 });

  // Neckband
  const nbD = Math.max(0.8, input.nrd * 0.7);
  el("path", {
    d: `M ${A.x} ${A.y} C ${A.x * 0.55} ${nbD * 2.2}, ${B.x * 0.55} ${nbD * 2.2}, ${B.x} ${B.y}`,
    fill: input.nrd > 0 ? ribCol : col, stroke: lineCol, "stroke-width": 0.6,
  });
  // Back neck (raised), dashed arc above
  el("path", {
    d: `M ${A.x} ${A.y} C ${A.x * 0.6} ${-bnr * 1.6 - 0.6}, ${B.x * 0.6} ${-bnr * 1.6 - 0.6}, ${B.x} ${B.y}`,
    fill: "none", stroke: lineCol, "stroke-width": 0.6, "stroke-dasharray": "1.5 1.2",
  });

  // ---- Dimension annotations ---------------------------------------------------
  const fs = Math.max(2.4, totalH / 26); // font size in cm units
  function dim(x1, y1, x2, y2, label, opts = {}) {
    el("line", { x1, y1, x2, y2, stroke: "#a05252", "stroke-width": 0.35, "marker-start": "url(#arr)", "marker-end": "url(#arr)" });
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const t = el("text", {
      x: mx + (opts.dx || 0), y: my + (opts.dy || 0),
      "font-size": fs, fill: "#7a3d3d", "text-anchor": opts.anchor || "middle",
      transform: opts.rotate ? `rotate(${opts.rotate} ${mx + (opts.dx || 0)} ${my + (opts.dy || 0)})` : "",
    }, label);
    t.setAttribute("paint-order", "stroke");
    t.setAttribute("stroke", "#ffffff");
    t.setAttribute("stroke-width", 0.8);
  }
  const stsOn = input.shownums;
  const lb = (cm, sts, unit) => `${fmt(cm)} cm${stsOn && sts != null ? ` · ${sts} ${unit || "sts"}` : ""}`;

  const hemExt = Math.max(0, backLen - frontLen); // dashed back-hem extension
  // chest at underarm
  dim(UL.x, yoke + 2.5, UR.x, yoke + 2.5, lb(calc.actual.chest, calc.bodyTotal), { dy: fs * 1.3 });
  // hem (below the dashed back hem and its note)
  const hemDimY = totalH + hemExt + (hemExt > 0.4 ? fs * 2.2 : 0) + 3;
  dim(HL.x, hemDimY, HR.x, hemDimY, lb(calc.actual.hem, calc.hemRibSts), { dy: fs * 1.3 });
  // neck
  dim(A.x, -bnr * 1.6 - 3.5, B.x, -bnr * 1.6 - 3.5, lb(calc.actual.neck, calc.neckSts), { dy: -fs * 0.5 });
  // yoke depth (left of body)
  dim(A.x - 2 - neckW * 0.1, 0, A.x - 2 - neckW * 0.1, yoke, lb(calc.actual.yokeDepth, calc.yokeRounds, "rnds"), { anchor: "end", dx: -1, rotate: 0, dy: fs * 0.4 });
  // front length (inside the body, right of centre)
  {
    const fx = Math.min(hemW, bodyW) * 0.27;
    dim(fx, yoke + 1, fx, totalH, lb(input.fl, Math.round((input.fl) * calc.rpc), "rnds"), { anchor: "start", dx: 1, dy: fs * 0.4 });
  }
  // sleeve length along top edge
  {
    const m = { x: (B.x + sR.topEnd.x) / 2, y: (B.y + sR.topEnd.y) / 2 };
    const ang = Math.atan2(sR.topEnd.y - B.y, sR.topEnd.x - B.x) * 180 / Math.PI;
    const off = { x: -sR.nn.x * 2.5, y: -sR.nn.y * 2.5 };
    el("line", { x1: UR.x + sR.d.x * 0 + off.x, y1: UR.y + off.y, x2: sR.topEnd.x + off.x, y2: sR.topEnd.y + off.y, stroke: "#a05252", "stroke-width": 0.35, "marker-start": "url(#arr)", "marker-end": "url(#arr)" });
    const t = el("text", { x: m.x + off.x * 2.2, y: m.y + off.y * 2.2, "font-size": fs, fill: "#7a3d3d", "text-anchor": "middle", transform: `rotate(${ang} ${m.x + off.x * 2.2} ${m.y + off.y * 2.2})` }, `${fmt(input.sl)} cm`);
    t.setAttribute("paint-order", "stroke"); t.setAttribute("stroke", "#fff"); t.setAttribute("stroke-width", 0.8);
  }
  // wrist at cuff
  {
    const off = { x: sR.d.x * 2.2, y: sR.d.y * 2.2 };
    dim(sR.topEnd.x + off.x, sR.topEnd.y + off.y, sR.botEnd.x + off.x, sR.botEnd.y + off.y, lb(calc.actual.wrist, calc.wristSts), { anchor: "start", dx: 1.5, dy: 0 });
  }
  // upper arm across sleeve at underarm
  {
    const off = { x: sL.d.x * 1.8, y: sL.d.y * 1.8 };
    dim(A.x + sL.d.x * sL.dl + off.x, A.y + sL.d.y * sL.dl + off.y, sL.botUa.x + off.x, sL.botUa.y + off.y, lb(calc.actual.upperArm, calc.sleeveTotal), { anchor: "end", dx: -1.5 });
  }
  // back raise note
  if (bnr > 0.2) {
    el("text", { x: 0, y: -bnr * 1.6 + fs * 0.2 - 0.8, "font-size": fs * 0.85, fill: "#555", "text-anchor": "middle" }, `back raised ${fmt(bnr)} cm (${calc.srPairs} short-row pairs)`);
  }
  if (hemExt > 0.4) {
    el("text", { x: 0, y: totalH + hemExt + fs * 1.1, "font-size": fs * 0.85, fill: "#555", "text-anchor": "middle" }, `back ${fmt(hemExt)} cm longer (${calc.hemSrPairs} short-row pairs)`);
  }

  // ---- Assemble with computed viewBox --------------------------------------
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `<marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 5 L 10 0 L 10 10 z" fill="#a05252"/></marker>`;
  svg.appendChild(defs);
  for (const e of els) svg.appendChild(e);

  const bb = svg.getBBox ? safeBBox(svg) : null;
  if (bb) {
    const pad = 4;
    svg.setAttribute("viewBox", `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`);
  }
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

function safeBBox(svg) {
  try { return svg.getBBox(); } catch (e) { return null; }
}

function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
