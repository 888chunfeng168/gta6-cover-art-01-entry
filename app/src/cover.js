// Boulevard Cover Studio — the cover engine.
// Draws a multi-panel GTA-style poster on any canvas: photos in panels, a
// sunset or neon colour grade, bold Anton lettering and a Pacifico subtitle.
// Everything is drawn from scratch here; no image is borrowed from a game.

/** The four panel layouts, each a list of panel rects in fractions of the cover. */
export const LAYOUTS = {
  quad: {
    label: 'Four Corners',
    panels: [
      { x: 0.02, y: 0.02, w: 0.47, h: 0.47 },
      { x: 0.51, y: 0.02, w: 0.47, h: 0.47 },
      { x: 0.02, y: 0.51, w: 0.47, h: 0.30 },
      { x: 0.51, y: 0.51, w: 0.47, h: 0.30 },
    ],
  },
  hero: {
    label: 'Hero Left',
    panels: [
      { x: 0.02, y: 0.02, w: 0.58, h: 0.79 },
      { x: 0.62, y: 0.02, w: 0.36, h: 0.25 },
      { x: 0.62, y: 0.29, w: 0.36, h: 0.25 },
      { x: 0.62, y: 0.56, w: 0.36, h: 0.25 },
    ],
  },
  story: {
    label: 'Top Story',
    panels: [
      { x: 0.02, y: 0.02, w: 0.96, h: 0.52 },
      { x: 0.02, y: 0.56, w: 0.31, h: 0.25 },
      { x: 0.345, y: 0.56, w: 0.31, h: 0.25 },
      { x: 0.67, y: 0.56, w: 0.31, h: 0.25 },
    ],
  },
  strip: {
    label: 'Street Strip',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 1.0 },
      { x: 0.03, y: 0.58, w: 0.30, h: 0.21 },
      { x: 0.35, y: 0.58, w: 0.30, h: 0.21 },
      { x: 0.67, y: 0.58, w: 0.30, h: 0.21 },
    ],
  },
};

/** The four colour grades: canvas filter, washes and lettering colours. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.08) brightness(1.02)',
    washTop: 'rgba(255, 110, 60, 0.10)',
    washBottom: 'rgba(220, 30, 120, 0.30)',
    titleTop: '#fff7e8',
    titleBottom: '#ffb347',
    accent: '#ff5e7a',
    scrim: 'rgba(20, 4, 32, 0.72)',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.98)',
    washTop: 'rgba(255, 0, 150, 0.18)',
    washBottom: 'rgba(0, 210, 255, 0.20)',
    titleTop: '#ffffff',
    titleBottom: '#ff5fd2',
    accent: '#2ee6ff',
    scrim: 'rgba(8, 2, 28, 0.74)',
  },
  gold: {
    label: 'Golden Hour',
    filter: 'sepia(0.28) saturate(1.35) contrast(1.06)',
    washTop: 'rgba(255, 190, 60, 0.14)',
    washBottom: 'rgba(180, 80, 10, 0.26)',
    titleTop: '#fffbe6',
    titleBottom: '#ffc93c',
    accent: '#ff9a3d',
    scrim: 'rgba(24, 12, 2, 0.70)',
  },
  noir: {
    label: 'Palm Noir',
    filter: 'grayscale(0.5) contrast(1.22) brightness(1.06)',
    washTop: 'rgba(0, 190, 210, 0.10)',
    washBottom: 'rgba(255, 60, 140, 0.14)',
    titleTop: '#ffffff',
    titleBottom: '#9be8ff',
    accent: '#ff4d8d',
    scrim: 'rgba(4, 8, 14, 0.74)',
  },
};

/** The three post sizes the app exports. */
export const SIZES = {
  '1080x1080': { label: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide · 1920 x 1080', w: 1920, h: 1080 },
};

/** Panel rects in pixels for a layout on a cover of w by h. */
export function panelRects(layout, w, h) {
  return LAYOUTS[layout].panels.map((p) => ({
    x: p.x * w,
    y: p.y * h,
    w: p.w * w,
    h: p.h * h,
  }));
}

/** A small deterministic random generator, so grain matches preview and export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A sunset-gradient placeholder for a panel with no photo yet. */
function drawPlaceholder(ctx, rect, grade, index) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#ff9a5a');
  g.addColorStop(0.55, '#e84393');
  g.addColorStop(1, '#2d1b4e');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `bold ${Math.round(rect.h * 0.22)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+ PHOTO ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Draws one photo into one panel, cover-fit, with its zoom and pan. */
function drawPhotoInPanel(ctx, img, rect, panel, grade) {
  if (!img) {
    drawPlaceholder(ctx, rect, grade, panel.index);
    return;
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const dw = iw * base;
  const dh = ih * base;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.dx || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.dy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** White gutter lines and a thin frame around the panels. */
function drawPanelFrames(ctx, rects, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  for (const r of rects) ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(3, w * 0.008);
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

/** The dark scrim and the bold title plus script subtitle at the foot. */
function drawTitleBlock(ctx, w, h, title, subtitle, grade) {
  const bandH = h * 0.19;
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(10, 2, 24, 0)');
  scrim.addColorStop(0.45, grade.scrim);
  scrim.addColorStop(1, 'rgba(8, 2, 20, 0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.06, w, h * 0.25);

  const words = (title || 'UNTITLED').trim().toUpperCase() || 'UNTITLED';
  let size = h * 0.115;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fit = (s) => {
    ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
    return ctx.measureText(words).width;
  };
  while (fit(size) > w * 0.92 && size > 18) size -= 2;
  const titleGrad = ctx.createLinearGradient(0, h - bandH * 0.85, 0, h - bandH * 0.08);
  titleGrad.addColorStop(0, grade.titleTop);
  titleGrad.addColorStop(1, grade.titleBottom);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(12, 2, 24, 0.9)';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(words, w / 2, h - bandH * 0.14);
  ctx.fillStyle = titleGrad;
  ctx.fillText(words, w / 2, h - bandH * 0.14);
  ctx.restore();

  const sub = (subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.translate(w / 2, h - bandH * 0.72);
    ctx.rotate(-0.02);
    ctx.font = `${Math.round(size * 0.34)}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }

  // A thin accent rule above the title block, clear of the subtitle.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(w * 0.08, bandY - Math.max(2, h * 0.008), w * 0.84, Math.max(2, h * 0.004));
  ctx.font = `bold ${Math.round(h * 0.016)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('★ BOULEVARD COVER STUDIO', w * 0.03, h * 0.035);
  ctx.textAlign = 'right';
  ctx.fillText('EST. 2026', w * 0.97, h * 0.035);
}

/** Film grain and a soft vignette over the whole cover. */
function drawGrainAndVignette(ctx, w, h) {
  const rand = mulberry32(20261121);
  const dots = Math.round((w * h) / 140);
  ctx.save();
  for (let i = 0; i < dots; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Renders the whole cover on `canvas` at its own pixel size.
 * `photos` is an array of images (or nulls); `state` holds layout, grade,
 * title, subtitle and one panel transform per panel.
 */
export function renderCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = { ...(state.panels[i] || {}), index: i };
    // A photo entry is either an image or a {img, name} tray record.
    const entry = photos[panel.photo ?? 0] || null;
    const img = entry && typeof entry === 'object' && 'img' in entry ? entry.img : entry;
    drawPhotoInPanel(ctx, img, rect, panel, grade);
  });
  if (state.layout !== 'strip') drawPanelFrames(ctx, rects, w, h);
  else {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    rects.slice(1).forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
    ctx.strokeStyle = '#0d0518';
    ctx.lineWidth = Math.max(3, w * 0.008);
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }
  drawTitleBlock(ctx, w, h, state.title, state.subtitle, grade);
  drawGrainAndVignette(ctx, w, h);
  return rects;
}

/** A fresh default state for a new cover. */
export function defaultState() {
  return {
    layout: 'quad',
    grade: 'sunset',
    size: '1080x1080',
    title: 'Boulevard Nights',
    subtitle: 'Neon nights on the boulevard',
    panels: [
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
      { photo: 1, zoom: 1, dx: 0, dy: 0 },
      { photo: 2, zoom: 1, dx: 0, dy: 0 },
      { photo: 0, zoom: 1, dx: 0, dy: 0 },
    ],
  };
}
