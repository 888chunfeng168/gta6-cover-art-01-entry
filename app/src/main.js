// Boulevard Cover Studio — wires the editor page: photos, panels, caption,
// layout, grade, size and the PNG export. A `?shot=` query instead sets up
// a fixed scene for a screenshot (see ./shots.js).
import { GRADES, LAYOUTS, SIZES, defaultState, panelRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

// Surface any script error in the status line, so a broken cover is visible
// instead of a blank canvas.
window.addEventListener('error', (event) => {
  const info = document.getElementById('shotinfo');
  if (info) {
    info.hidden = false;
    info.textContent = `JS error: ${event.message}`;
  }
  const status = document.getElementById('status');
  if (status && !status.textContent) status.textContent = `Error: ${event.message}`;
});

window.addEventListener('unhandledrejection', (event) => {
  const info = document.getElementById('shotinfo');
  if (info) {
    info.hidden = false;
    info.textContent = `Promise error: ${event.reason?.message ?? event.reason}`;
  }
});

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const tray = document.getElementById('tray');
const state = defaultState();
let photos = [];
let selectedPanel = 0;
let dragging = null;

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Waits until the two display fonts are ready, so canvas text is exact. */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // The fallback fonts still draw; the cover just looks plainer.
  }
}

/** Redraws the preview canvas at a screen-friendly size. */
function redraw() {
  const size = SIZES[state.size];
  const maxSide = 760;
  const scale = Math.min(1, maxSide / Math.max(size.w, size.h));
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  renderCover(canvas, photos, state);
  drawSelection();
  updatePanelControls();
}

/** Outlines the selected panel on the preview, in preview pixels. */
function drawSelection() {
  const ctx = canvas.getContext('2d');
  const size = SIZES[state.size];
  const sx = canvas.width / size.w;
  const sy = canvas.height / size.h;
  const rects = panelRects(state.layout, size.w, size.h);
  const r = rects[selectedPanel];
  if (!r) return;
  ctx.save();
  ctx.strokeStyle = '#2ee6ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(r.x * sx - 2, r.y * sy - 2, r.w * sx + 4, r.h * sy + 4);
  ctx.setLineDash([]);
  ctx.fillStyle = '#2ee6ff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  // Bottom-left, so the tag never covers the cover's masthead at the top.
  ctx.fillText(`PANEL ${selectedPanel + 1}`, r.x * sx + 6, (r.y + r.h) * sy - 8);
  ctx.restore();
}

/** Builds the layout, grade and size buttons from the engine's tables. */
function buildChoiceButtons() {
  const layoutBox = document.getElementById('layouts');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = layout.label;
    b.dataset.value = key;
    b.addEventListener('click', () => {
      state.layout = key;
      markActive(layoutBox, key);
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('grades');
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = grade.label;
    b.dataset.value = key;
    b.addEventListener('click', () => {
      state.grade = key;
      markActive(gradeBox, key);
      redraw();
    });
    gradeBox.appendChild(b);
  }
  const sizeBox = document.getElementById('sizes');
  for (const [key, size] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = size.label;
    b.dataset.value = key;
    b.addEventListener('click', () => {
      state.size = key;
      markActive(sizeBox, key);
      redraw();
    });
    sizeBox.appendChild(b);
  }
  markActive(layoutBox, state.layout);
  markActive(gradeBox, state.grade);
  markActive(sizeBox, state.size);
}

/** Re-marks the choice buttons from the current state (used after a scene sets it). */
function syncChoiceButtons() {
  markActive(document.getElementById('layouts'), state.layout);
  markActive(document.getElementById('grades'), state.grade);
  markActive(document.getElementById('sizes'), state.size);
}

function markActive(box, value) {
  for (const b of box.querySelectorAll('.choice')) {
    b.classList.toggle('active', b.dataset.value === value);
  }
}

/** The photo tray: one thumbnail per loaded photo, click to pick it up. */
function renderTray() {
  tray.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    thumb.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = photo.name;
    thumb.appendChild(tag);
    thumb.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      setStatus(`Panel ${selectedPanel + 1} now shows ${photo.name}.`);
      redraw();
    });
    tray.appendChild(thumb);
  });
  if (photos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tray-empty';
    empty.textContent = 'No photos yet — add your own, or try the samples.';
    tray.appendChild(empty);
  }
}

/** The panel controls for the selected panel: photo, zoom, reset. */
function updatePanelControls() {
  const select = document.getElementById('panel-photo');
  const panel = state.panels[selectedPanel];
  select.innerHTML = '';
  photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${photo.name}`;
    select.appendChild(opt);
  });
  select.value = String(panel.photo ?? 0);
  document.getElementById('panel-label').textContent = `Panel ${selectedPanel + 1}`;
  document.getElementById('zoom').value = String(panel.zoom || 1);
  document.getElementById('zoom-value').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
}

/** Adds photos from File objects, keeping the tray in order. */
async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      photos.push({ img, name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo' });
      added++;
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  if (added > 0) {
    // Panels that pointed at a missing photo fall back to the first new one.
    state.panels.forEach((p) => {
      if (photos[p.photo] === undefined) p.photo = 0;
    });
    setStatus(`Added ${added} photo${added === 1 ? '' : 's'}. Click a panel, then a photo, to place it.`);
    renderTray();
    redraw();
  }
}

/** Loads the three bundled sample photos (AI-generated, free to use). */
async function loadSamples() {
  const samples = [
    ['samples/boulevard.jpg', 'Boulevard'],
    ['samples/balcony.jpg', 'Balcony'],
    ['samples/alley.jpg', 'Neon Alley'],
  ];
  photos = [];
  for (const [url, name] of samples) {
    try {
      photos.push({ img: await loadImage(url), name });
    } catch {
      // A missing sample just leaves the tray shorter.
    }
  }
  state.panels[0].photo = 0;
  state.panels[1].photo = 1;
  state.panels[2].photo = 2;
  state.panels[3].photo = 0;
  setStatus('Sample photos loaded. Replace them with your own any time.');
  renderTray();
  redraw();
}

/** Renders the cover at full export size and downloads it as a PNG. */
async function exportCover() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  await loadFonts();
  renderCover(off, photos, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — try again.');
        resolve(null);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `boulevard-cover-${size.w}x${size.h}.png`;
      a.click();
      setStatus(`Saved boulevard-cover-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KB).`);
      resolve({ blob, width: size.w, height: size.h });
    }, 'image/png');
  });
}

/** Clicking the preview picks a panel; dragging pans the photo inside it. */
function bindCanvas() {
  const toState = (event) => {
    const rect = canvas.getBoundingClientRect();
    const size = SIZES[state.size];
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.w,
      y: ((event.clientY - rect.top) / rect.height) * size.h,
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const p = toState(event);
    const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit === -1) return;
    selectedPanel = hit;
    const panel = state.panels[hit];
    dragging = { x: p.x, y: p.y, dx: panel.dx || 0, dy: panel.dy || 0, moved: false };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = toState(event);
    const rects = panelRects(state.layout, SIZES[state.size].w, SIZES[state.size].h);
    const r = rects[selectedPanel];
    const panel = state.panels[selectedPanel];
    panel.dx = dragging.dx + (p.x - dragging.x) / r.w;
    panel.dy = dragging.dy + (p.y - dragging.y) / r.h;
    panel.dx = Math.max(-0.5, Math.min(0.5, panel.dx));
    panel.dy = Math.max(-0.5, Math.min(0.5, panel.dy));
    if (Math.abs(p.x - dragging.x) + Math.abs(p.y - dragging.y) > 4) dragging.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (event.deltaY < 0 ? 1.08 : 0.93)));
    redraw();
  }, { passive: false });
}

/** Binds every control on the page. */
function bindControls() {
  document.getElementById('photos').addEventListener('change', (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  });
  document.getElementById('samples').addEventListener('click', loadSamples);
  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('panel-photo').addEventListener('change', (e) => {
    state.panels[selectedPanel].photo = Number(e.target.value);
    redraw();
  });
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('fill-all').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    setStatus(`Every panel now shows ${photos[photo]?.name ?? 'that photo'}.`);
    redraw();
  });
  document.getElementById('reset-panels').addEventListener('click', () => {
    state.panels.forEach((p) => {
      p.zoom = 1;
      p.dx = 0;
      p.dy = 0;
    });
    setStatus('Panel crops reset.');
    redraw();
  });
  document.getElementById('shuffle').addEventListener('click', () => {
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    markActive(document.getElementById('layouts'), state.layout);
    markActive(document.getElementById('grades'), state.grade);
    setStatus(`Shuffled to ${LAYOUTS[state.layout].label} + ${GRADES[state.grade].label}.`);
    redraw();
  });
  document.getElementById('export').addEventListener('click', exportCover);
  bindCanvas();
}

const shot = new URLSearchParams(location.search).get('shot');
loadFonts().then(() => {
  buildChoiceButtons();
  bindControls();
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  if (shot) {
    // Screenshot scenes: load fonts and photos, then paint once and signal.
    runShot(shot, new URLSearchParams(location.search), {
      loadImage,
      loadSamples,
      render: () => redraw(),
      state,
      getPhotos: () => photos,
      setPhotos: (list) => { photos = list; },
      selectPanel: (i) => { selectedPanel = i; },
      syncChoices: syncChoiceButtons,
      exportCover,
      setStatus,
    });
  } else {
    renderTray();
    redraw();
  }
});

// Test hooks for the local check run: the real export path, observed in the DOM.
window.__boulevard = { state, getPhotos: () => photos, exportCover, redraw };
