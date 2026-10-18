/* BoxForge geometry: dependency-free and usable both in browser and Node. */
(function (root) {
  'use strict';
  const n = value => Number(value);
  const f = value => Math.round(value * 100) / 100;

  function monitorSize(diagonalInches, ratio) {
    const [rw, rh] = ratio.split(':').map(Number);
    const d = n(diagonalInches) * 25.4;
    const k = d / Math.hypot(rw, rh);
    return { width: f(rw * k), height: f(rh * k) };
  }

  function validate(p) {
    const errors = [];
    if (p.width < 300 || p.width > 1200) errors.push('Larghezza fuori intervallo 300–1200 mm.');
    if (p.height < 350 || p.height > 1600) errors.push('Altezza fuori intervallo 350–1600 mm.');
    if (p.depth < 250 || p.depth > 1000) errors.push('Profondità fuori intervallo 250–1000 mm.');
    if (p.thickness < 2 || p.thickness > 20) errors.push('Spessore fuori intervallo 2–20 mm.');
    if (p.kerf < 0 || p.kerf > 1) errors.push('Kerf fuori intervallo 0–1 mm.');
    if (p.finger < p.thickness * 2) errors.push('Il pettine deve essere almeno il doppio dello spessore.');
    const deckDepth = n(p.deckDepth ?? p.depth * .42);
    const deckOverhang = n(p.deckOverhang ?? 35);
    if (deckDepth < 120 || deckDepth > p.depth * .65) errors.push('Profondità plancia fuori intervallo utile.');
    if (deckOverhang < 10 || deckOverhang > p.depth * .2) errors.push('Sporgenza plancia fuori intervallo utile.');
    const mon = monitorSize(p.monitor, p.ratio);
    if (mon.width + 40 > p.width - 2 * p.thickness) errors.push('Il monitor non entra nella larghezza impostata.');
    return errors;
  }

  function sideProfile(p) {
    const D = p.depth, H = p.height;
    const overhang = n(p.deckOverhang ?? 35);
    return [
      [overhang, H], [D, H], [D, H * .06], [D * .94, 0], [D * .24, 0],
      [D * .13, H * .16], [D * .11, H * .52],
      [0, H * .68], [overhang, H * .82]
    ].map(([x, y]) => [f(x), f(y)]);
  }

  function polygonPath(points, ox = 0, oy = 0) {
    return 'M' + points.map(([x, y]) => `${f(x + ox)},${f(y + oy)}`).join(' L') + ' Z';
  }

  // ponytail: tabs only on mating side edges; add corner tabs if a future cabinet needs load-bearing mitres.
  function tabbedRectPath(x, y, w, h, t, pitch) {
    const bands = Math.max(3, Math.round(h / pitch));
    const step = h / bands;
    let d = `M${x},${y} H${f(x + w)} V${f(y + step)}`;
    for (let i = 1; i < bands; i++) {
      const ext = i % 2 ? t : 0;
      d += ` H${f(x + w + ext)} V${f(y + step * (i + 1))}`;
    }
    d += ` H${x} V${f(y + h - step)}`;
    for (let i = bands - 2; i >= 0; i--) {
      const ext = i % 2 ? -t : 0;
      d += ` H${f(x + ext)} V${f(y + step * i)}`;
    }
    return d + ' Z';
  }

  function slotRects(x, y, length, t, pitch, kerf) {
    const bands = Math.max(3, Math.round(length / pitch));
    const step = length / bands;
    const out = [];
    for (let i = 1; i < bands; i += 2) {
      out.push({ x: f(x + i * step + kerf / 2), y: f(y - kerf / 2), width: f(step - kerf), height: f(t + kerf) });
    }
    return out;
  }

  function slotRectsAlong(x1, y1, x2, y2, t, pitch, kerf) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const bands = Math.max(3, Math.round(length / pitch));
    const step = length / bands;
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const out = [];
    for (let i = 1; i < bands; i += 2) {
      const at = (i + .5) / bands;
      out.push({ cx: f(x1 + (x2 - x1) * at), cy: f(y1 + (y2 - y1) * at), width: f(step - kerf), height: f(t + kerf), angle: f(angle) });
    }
    return out;
  }

  function circle(cx, cy, r) { return `<circle class="cut" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`; }
  function label(x, y, text) { return `<text class="engrave" x="${f(x)}" y="${f(y)}">${text}</text>`; }

  function makePlan(p) {
    const errors = validate(p);
    if (errors.length) return { errors };
    const t = p.thickness, innerW = p.width - 2 * t, gap = 24;
    const svgW = Math.max(1000, p.depth * 2 + gap + 30, p.width * 2 + 100);
    const side = sideProfile(p);
    const mon = monitorSize(p.monitor, p.ratio);
    const parts = [];
    const cuts = [];
    let x = 15, y = 15;

    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      cuts.push(`<path class="cut" d="${polygonPath(side, x, y)}"/>`);
      const slotLines = [
        { sx: x + 18, sy: y + p.height - 28, len: p.depth - 45 },
        { sx: x + p.depth * .22, sy: y + 28, len: p.depth * .48 }
      ];
      slotLines.forEach(line => slotRects(line.sx, line.sy, line.len, t, p.finger, p.kerf)
        .forEach(r => cuts.push(`<rect class="cut" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/>`)));
      const rearX = x + Math.min(p.depth * .62, n(p.deckDepth ?? p.depth * .42));
      slotRectsAlong(x + 4, y + p.height * .68, rearX, y + p.height * .57, t, p.finger, p.kerf)
        .forEach(r => cuts.push(`<rect class="cut" x="${f(r.cx-r.width/2)}" y="${f(r.cy-r.height/2)}" width="${r.width}" height="${r.height}" transform="rotate(${r.angle} ${r.cx} ${r.cy})"/>`));
      cuts.push(label(x + 18, y + p.height - 10, `Fianco ${sideIndex + 1}`));
      parts.push({ name: `Fianco ${sideIndex + 1}`, width: p.depth, height: p.height, qty: 1 });
      x += p.depth + gap;
    }

    y += p.height + 55; x = 15;
    const panels = [
      { name: 'Fondo', h: p.depth - 40 },
      { name: 'Plancia comandi inclinata', h: n(p.deckDepth ?? p.depth * .42), controls: true },
      { name: 'Schiena', h: p.height * .55 },
      { name: 'Tetto', h: p.depth * .46 },
      { name: 'Marquee', h: p.height * .16 },
      { name: 'Fascia anteriore inclinata', h: p.height * .18 }
    ];

    let rowHeight = 0;
    panels.forEach(panel => {
      const ph = f(panel.h);
      if (x + innerW + 40 > svgW) { x = 15; y += rowHeight + 55; rowHeight = 0; }
      cuts.push(`<path class="cut" d="${tabbedRectPath(x, y, innerW, ph, t, p.finger)}"/>`);
      cuts.push(label(x + 12, y + 18, panel.name));

      if (panel.controls) {
        const cy = y + ph * .52;
        const centers = [x + innerW * .26, x + innerW * .72];
        centers.forEach((base, player) => {
          cuts.push(circle(base - 55, cy, 12));
          const bx = base - 5;
          [[0,-18],[34,-24],[68,-18],[0,18],[34,12],[68,18]].forEach(([dx,dy]) => cuts.push(circle(bx + dx, cy + dy, p.button / 2)));
          cuts.push(label(base - 70, y + ph - 10, `P${player + 1}`));
        });
        [-24, 0, 24].forEach(dx => cuts.push(circle(x + innerW * .5 + dx, y + ph * .24, Math.max(6, p.button * .3))));
      }
      parts.push({ name: panel.name, width: innerW, height: ph, qty: 1 });
      x += innerW + gap + t;
      rowHeight = Math.max(rowHeight, ph);
    });

    x = 15; y += rowHeight + 55;
    const bezelH = mon.height + 70;
    cuts.push(`<path class="cut" d="${tabbedRectPath(x, y, innerW, bezelH, t, p.finger)}"/>`);
    cuts.push(`<rect class="cut" x="${f(x + (innerW - mon.width) / 2)}" y="${f(y + 35)}" width="${mon.width}" height="${mon.height}" rx="2"/>`);
    cuts.push(label(x + 12, y + 20, `Cornice monitor ${p.monitor}\" ${p.ratio}`));
    parts.push({ name: 'Cornice monitor', width: innerW, height: f(bezelH), qty: 1 });

    const svgH = y + bezelH + 35;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}mm" height="${f(svgH)}mm" viewBox="0 0 ${svgW} ${f(svgH)}">
<style>.cut{fill:none;stroke:#e23b2e;stroke-width:.2;vector-effect:non-scaling-stroke}.engrave{fill:#147d92;font:7px Arial,sans-serif}.sheet{fill:#f4efe4}</style>
<rect class="sheet" width="100%" height="100%"/>${cuts.join('')}</svg>`;
    return { errors: [], svg, parts, monitor: mon, sheet: { width: svgW, height: f(svgH) } };
  }

  root.BoxForge = { monitorSize, validate, sideProfile, makePlan };
})(typeof globalThis !== 'undefined' ? globalThis : window);
