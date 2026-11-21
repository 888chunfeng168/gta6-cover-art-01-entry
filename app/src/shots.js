// Fixed scenes for screenshots: ?shot=editor shows the page with photos loaded;
// ?shot=cover shows the cover alone, drawn by the app at export size;
// ?shot=exporttest also runs the real PNG export and reports it in the DOM.
// `photo` picks which sample leads, `layout`, `grade`, `size`, `title` and
// `subtitle` set the scene. window.__shotReady is set once painted.
import { SIZES, renderCover } from './cover.js';

/** Applies the scene's query values to the shared editor state. */
function applyScene(query, state) {
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const title = query.get('title');
  if (title !== null) state.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
}

/** Reorders the sample photos so the named one leads panel one. */
function leadPhoto(query, photos) {
  const lead = query.get('photo');
  if (!lead) return photos;
  const at = photos.findIndex((p) => p.name.toLowerCase().includes(lead.toLowerCase()));
  if (at <= 0) return photos;
  const [first] = photos.splice(at, 1);
  return [first, ...photos];
}

export async function runShot(shot, query, api) {
  const { loadSamples, state } = api;
  applyScene(query, state);
  api.syncChoices();
  await loadSamples();
  const photos = leadPhoto(query, api.getPhotos());
  api.setPhotos(photos);
  // Panels follow the reordered tray: hero, then the rest, then hero again.
  state.panels[0].photo = 0;
  state.panels[1].photo = 1 % photos.length;
  state.panels[2].photo = 2 % photos.length;
  state.panels[3].photo = 0;
  // `panel` picks which panel the editor scene has selected (1-based).
  const panel = Number(query.get('panel') || '1');
  if (Number.isInteger(panel) && panel >= 1 && panel <= 4) api.selectPanel(panel - 1);
  // `zoom` crops the selected panel in, so an editor scene can show a crop.
  const zoom = Number(query.get('zoom') || '1');
  if (Number.isFinite(zoom) && zoom >= 1 && zoom <= 3) {
    state.panels[panel - 1].zoom = zoom;
  }

  const canvas = document.getElementById('cover');
  if (shot === 'cover' || shot === 'exporttest') {
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size] || SIZES['1920x1080'];
    canvas.width = size.w;
    canvas.height = size.h;
    renderCover(canvas, photos, state);
  } else {
    document.getElementById('title').value = state.title;
    document.getElementById('subtitle').value = state.subtitle;
    api.render();
  }

  if (shot === 'exporttest') {
    const info = document.getElementById('shotinfo');
    try {
      const result = await api.exportCover();
      if (info) {
        info.textContent = result
          ? `export ok ${result.width}x${result.height} ${result.blob.size} bytes`
          : 'export failed';
      }
      window.__exportInfo = result
        ? { width: result.width, height: result.height, bytes: result.blob.size }
        : null;
    } catch (error) {
      if (info) info.textContent = `export error: ${error.message}`;
      window.__exportInfo = null;
    }
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
