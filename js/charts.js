/* Player Fund Inc - reusable canvas chart classes (brand palette, no dependencies) */

// Categorical series, so the ramp runs across hue rather than down one column of
// blue - five steps of the same teal made neighbouring slices unreadable without
// the legend. Ember carries the lead series; the rest are cold, so the eye lands
// on the one that matters. Mirrors --navy-deep/--ember/--navy/--ember-bright/--glacier.
const CHART_PALETTE = ['#0f2231', '#7a6428', '#16344a', '#b8aa7d', '#a8c0ce'];

function chartDPR(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

function renderLegend(el, items) {
  if (!el) return;
  el.innerHTML = items.map(it =>
    `<li><span class="chart-swatch" style="background:${it.color}"></span>${it.label}</li>`
  ).join('');
}

/** Vertical bar chart with optional +/- error bars. data: [{label, value, range}] (range in same units, e.g. +/-2) */
class BarChart {
  constructor(canvas, { data, colors = CHART_PALETTE, unit = '%', legendEl = null, maxValue = null }) {
    this.canvas = canvas;
    this.data = data;
    this.colors = colors;
    this.unit = unit;
    this.legendEl = legendEl;
    this.maxValue = maxValue;
    this.render();
    new ResizeObserver(() => this.render()).observe(canvas.parentElement);
  }
  render() {
    const wrap = this.canvas.parentElement;
    const cssW = wrap.clientWidth;
    const cssH = Math.max(280, Math.min(360, cssW * 0.42));
    const ctx = chartDPR(this.canvas, cssW, cssH);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { top: 24, right: 16, bottom: 44, left: 40 };
    const plotW = cssW - pad.left - pad.right;
    const plotH = cssH - pad.top - pad.bottom;
    const max = this.maxValue || Math.ceil((Math.max(...this.data.map(d => d.value + (d.range || 0))) + 4) / 5) * 5;

    ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
    ctx.strokeStyle = 'rgba(15,34,49,.14)';
    ctx.fillStyle = '#6b6b6b';
    ctx.lineWidth = 1;
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = pad.top + plotH - (plotH * i) / steps;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(cssW - pad.right, y);
      ctx.stroke();
      const val = Math.round((max * i) / steps);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(val + this.unit, pad.left - 8, y);
    }

    const n = this.data.length;
    const slot = plotW / n;
    const barW = Math.min(64, slot * 0.5);

    this.data.forEach((d, i) => {
      const cx = pad.left + slot * i + slot / 2;
      const barH = (d.value / max) * plotH;
      const y = pad.top + plotH - barH;
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.fillRect(cx - barW / 2, y, barW, barH);

      if (d.range) {
        const rangeH = (d.range / max) * plotH;
        ctx.strokeStyle = 'rgba(34,34,34,.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, y - rangeH);
        ctx.lineTo(cx, y + rangeH);
        ctx.moveTo(cx - 6, y - rangeH);
        ctx.lineTo(cx + 6, y - rangeH);
        ctx.moveTo(cx - 6, y + rangeH);
        ctx.lineTo(cx + 6, y + rangeH);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '600 12px "Schibsted Grotesk",system-ui,sans-serif';
      ctx.fillText(d.value + this.unit, cx, y + 16);

      ctx.fillStyle = '#4a4a4a';
      ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
      wrapLabel(ctx, d.label, cx, pad.top + plotH + 16, slot - 6, 12);
    });
  }
}

/** Donut chart. data: [{label, value}] */
class DonutChart {
  constructor(canvas, { data, colors = CHART_PALETTE, legendEl = null, centerLabel = '' }) {
    this.canvas = canvas;
    this.data = data;
    this.colors = colors;
    this.legendEl = legendEl;
    this.centerLabel = centerLabel;
    this.render();
    new ResizeObserver(() => this.render()).observe(canvas.parentElement);
  }
  render() {
    const wrap = this.canvas.parentElement;
    const size = Math.max(220, Math.min(340, wrap.clientWidth));
    const ctx = chartDPR(this.canvas, size, size);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const rOuter = size * 0.42, rInner = size * 0.26;
    const total = this.data.reduce((s, d) => s + d.value, 0);
    let angle = -Math.PI / 2;

    this.data.forEach((d, i) => {
      const slice = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, angle, angle + slice);
      ctx.closePath();
      ctx.fill();

      const mid = angle + slice / 2;
      const lx = cx + Math.cos(mid) * (rOuter + rInner) / 2;
      const ly = cy + Math.sin(mid) * (rOuter + rInner) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "Schibsted Grotesk",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(d.value) + '%', lx, ly);

      angle += slice;
    });

    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fill();
    if (this.centerLabel) {
      ctx.fillStyle = '#222222';
      ctx.font = '600 12px "Instrument Serif",Georgia,serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapLabel(ctx, this.centerLabel, cx, cy, rInner * 1.7, 14, true);
    }

    renderLegend(this.legendEl, this.data.map((d, i) => ({ label: d.label, color: this.colors[i % this.colors.length] })));
  }
}

/** Stacked bar chart across time/categories. data: [{label, segments:[{key, value}]}], seriesKeys: [key,...] in stack order */
class StackedBarChart {
  constructor(canvas, { data, seriesKeys, colors = CHART_PALETTE, legendEl = null, unit = '%', liquidKeys = [] }) {
    this.canvas = canvas;
    this.data = data;
    this.seriesKeys = seriesKeys;
    this.colors = colors;
    this.legendEl = legendEl;
    this.unit = unit;
    this.liquidKeys = liquidKeys;
    this.render();
    new ResizeObserver(() => this.render()).observe(canvas.parentElement);
  }
  render() {
    const wrap = this.canvas.parentElement;
    const cssW = wrap.clientWidth;
    const cssH = Math.max(300, Math.min(420, cssW * 0.5));
    const ctx = chartDPR(this.canvas, cssW, cssH);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { top: 20, right: 16, bottom: 58, left: 40 };
    const plotW = cssW - pad.left - pad.right;
    const plotH = cssH - pad.top - pad.bottom;
    const max = 100;

    ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
    ctx.strokeStyle = 'rgba(15,34,49,.14)';
    ctx.fillStyle = '#6b6b6b';
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + plotH - (plotH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(cssW - pad.right, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((max * i) / 5) + this.unit, pad.left - 8, y);
    }

    const n = this.data.length;
    const slot = plotW / n;
    const barW = Math.min(70, slot * 0.55);

    this.data.forEach((d, i) => {
      const cx = pad.left + slot * i + slot / 2;
      let yCursor = pad.top + plotH;
      this.seriesKeys.forEach((key, si) => {
        const seg = d.segments.find(s => s.key === key);
        if (!seg) return;
        const h = (seg.value / max) * plotH;
        const y = yCursor - h;
        ctx.fillStyle = this.colors[si % this.colors.length];
        ctx.fillRect(cx - barW / 2, y, barW, h);
        if (this.liquidKeys.includes(key)) {
          ctx.strokeStyle = '#2e7d46';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - barW / 2 + 1, y + 1, barW - 2, h - 2);
        }
        if (h > 14) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(seg.value + this.unit, cx, y + h / 2);
        }
        yCursor = y;
      });

      ctx.fillStyle = '#4a4a4a';
      ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
      wrapLabel(ctx, d.label, cx, pad.top + plotH + 16, slot - 4, 12);
    });

    renderLegend(this.legendEl, this.seriesKeys.map((key, i) => ({
      label: (this.data[0].segments.find(s => s.key === key) || {}).label || key,
      color: this.colors[i % this.colors.length]
    })));
  }
}

/** Correlation heatmap. classes: [label,...]; matrix: lower-triangular (or full) 2D array of correlation values, matrix[row][col] */
class CorrelationMatrix {
  constructor(canvas, { classes, matrix, stats = null }) {
    this.canvas = canvas;
    this.classes = classes;
    this.matrix = matrix;
    this.stats = stats;
    this.render();
    new ResizeObserver(() => this.render()).observe(canvas.parentElement);
  }
  cellColor(v) {
    const t = Math.max(0, Math.min(1, (v + 0.25) / 1.25));
    const c1 = [238, 242, 243], c2 = [29, 54, 62];
    const mix = c1.map((c, i) => Math.round(c + (c2[i] - c) * t));
    return `rgb(${mix.join(',')})`;
  }
  get(row, col) {
    if (this.matrix[row][col] !== undefined) return this.matrix[row][col];
    if (this.matrix[col][row] !== undefined) return this.matrix[col][row];
    return null;
  }
  render() {
    const wrap = this.canvas.parentElement;
    const n = this.classes.length;
    const cssW = Math.max(320, Math.min(560, wrap.clientWidth));
    const labelCol = 150;
    const cell = (cssW - labelCol) / n;
    const statsRowH = this.stats ? 40 : 0;
    const cssH = statsRowH + 30 + cell * n;
    const ctx = chartDPR(this.canvas, cssW, cssH);
    ctx.clearRect(0, 0, cssW, cssH);

    ctx.font = '600 11px "Schibsted Grotesk",system-ui,sans-serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.classes.forEach((label, i) => {
      const x = labelCol + cell * i + cell / 2;
      wrapLabel(ctx, label, x, 12, cell - 6, 12, true);
    });

    for (let row = 0; row < n; row++) {
      const y = statsRowH + 30 + cell * row;
      ctx.fillStyle = '#222222';
      ctx.font = '600 12px "Schibsted Grotesk",system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.classes[row], 4, y + cell / 2);

      for (let col = 0; col < n; col++) {
        const v = this.get(row, col);
        const x = labelCol + cell * col;
        if (v === null) continue;
        ctx.fillStyle = this.cellColor(v);
        ctx.fillRect(x, y, cell - 2, cell - 2);
        ctx.fillStyle = v > 0.6 ? '#ffffff' : '#222222';
        ctx.font = '600 12px "Schibsted Grotesk",system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(v.toFixed(2), x + cell / 2, y + cell / 2);
      }
    }

    if (this.stats) {
      ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
      ctx.fillStyle = '#6b6b6b';
      ctx.textAlign = 'left';
      ctx.fillText('Expected return / standard deviation:', 4, statsRowH - 24);
      this.stats.forEach((s, i) => {
        ctx.fillStyle = '#222222';
        ctx.font = '600 11px "Schibsted Grotesk",system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${s.ret}% / ${s.risk}%`, labelCol + cell * i + cell / 2, statsRowH - 6);
      });
    }
  }
}

/** Bubble chart: circle area proportional to value. data: [{label, value, sub}] */
class BubbleChart {
  constructor(canvas, { data, colors = CHART_PALETTE, unit = '' }) {
    this.canvas = canvas;
    this.data = [...data].sort((a, b) => b.value - a.value);
    this.colors = colors;
    this.unit = unit;
    this.render();
    new ResizeObserver(() => this.render()).observe(canvas.parentElement);
  }
  render() {
    const wrap = this.canvas.parentElement;
    const cssW = wrap.clientWidth;
    const cssH = Math.max(320, Math.min(440, cssW * 0.5));
    const ctx = chartDPR(this.canvas, cssW, cssH);
    ctx.clearRect(0, 0, cssW, cssH);

    const max = Math.max(...this.data.map(d => d.value));
    const maxR = Math.min(cssW, cssH) * 0.16;
    const scale = maxR / Math.sqrt(max);

    const n = this.data.length;
    const cols = Math.min(n, Math.ceil(Math.sqrt(n * (cssW / cssH))));
    const rows = Math.ceil(n / cols);
    const slotW = cssW / cols, slotH = cssH / rows;

    this.data.forEach((d, i) => {
      const r = Math.max(18, Math.sqrt(d.value) * scale);
      const col = i % cols, row = Math.floor(i / cols);
      const cx = slotW * col + slotW / 2;
      const cy = slotH * row + slotH / 2;

      ctx.beginPath();
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.globalAlpha = 0.88;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px "Schibsted Grotesk",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const valLabel = d.value >= 1 ? d.value.toFixed(2) + 'T' : Math.round(d.value * 1000) + 'B';
      ctx.fillText(valLabel, cx, cy - (r > 26 ? 6 : 0));
      if (r > 26) {
        ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
        ctx.fillText('USD GDP', cx, cy + 10);
      }

      ctx.fillStyle = '#222222';
      ctx.font = '600 11px "Schibsted Grotesk",system-ui,sans-serif';
      wrapLabel(ctx, d.label, cx, cy + r + 14, slotW - 8, 12);
      if (d.sub) {
        ctx.fillStyle = '#6b6b6b';
        ctx.font = '11px "Schibsted Grotesk",system-ui,sans-serif';
        wrapLabel(ctx, d.sub, cx, cy + r + 14 + 13, slotW - 8, 11);
      }
    });
  }
}

function wrapLabel(ctx, text, x, y, maxWidth, lineHeight, centerVertically = false) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const startY = centerVertically ? y - ((lines.length - 1) * lineHeight) / 2 : y;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
