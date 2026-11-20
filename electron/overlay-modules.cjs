const PANELS = ['comp', 'champions', 'duo', 'status'];
const SIZES = { comp: [960, 740], champions: [460, 700], duo: [480, 700], status: [400, 500] };
const MIN_HEIGHTS = { comp: 450, champions: 320, duo: 360, status: 300 };
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: Math.round(value.x), y: Math.round(value.y) } : null;
function normalizeOverlayLayout(value) {
  const activePanel = PANELS.includes(value?.activePanel) ? value.activePanel : null;
  const pinnedPanel = PANELS.includes(value?.pinnedPanel) && value.pinnedPanel !== activePanel ? value.pinnedPanel : null;
  const panels = {};
  for (const panel of PANELS) {
    const position = point(value?.panels?.[panel]);
    if (position) panels[panel] = position;
  }
  const layout = { version: 1, activePanel, pinnedPanel, summaryCollapsed: value?.summaryCollapsed === true, launcherPosition: point(value?.launcherPosition) || { x: 16, y: 68 }, panels };
  if(value?.presentation === 'integrated'){
    layout.presentation = 'integrated';
    layout.pinnedPanel = null;
    if(value.detachedLayout)layout.detachedLayout = normalizeOverlayLayout({...value.detachedLayout,presentation:undefined,detachedLayout:undefined});
  }
  return layout;
}
function overlayAction(layout, action) {
  const next = normalizeOverlayLayout(layout);
  const panel = action?.panel;
  if(action?.type === 'setPresentation'){
    if(action.value === 'floating' && next.presentation === 'integrated')return normalizeOverlayLayout(next.detachedLayout || {...next,presentation:undefined});
    if(action.value === 'integrated' && next.presentation !== 'integrated')return {...next,presentation:'integrated',detachedLayout:next,activePanel:null,pinnedPanel:null,summaryCollapsed:false};
    return next;
  }
  if(next.presentation === 'integrated' && ['pin','unpin'].includes(action?.type))return next;
  if (['open', 'toggle', 'close', 'pin'].includes(action?.type) && !PANELS.includes(panel)) return next;
  if (action?.type === 'summaryToggle') {
    next.summaryCollapsed = !next.summaryCollapsed;
    if(next.presentation === 'integrated')next.activePanel = null;
  }
  else if (action?.type === 'details' || action?.type === 'library') {
    if (next.pinnedPanel !== 'comp') next.activePanel = 'comp';
  } else if (action?.type === 'open' || action?.type === 'toggle') {
    if (next.pinnedPanel === panel) {
      if (action.type === 'toggle') next.pinnedPanel = null;
    } else next.activePanel = action.type === 'toggle' && next.activePanel === panel ? null : panel;
  } else if (action?.type === 'close') {
    if (next.activePanel === panel) next.activePanel = null;
    if (next.pinnedPanel === panel) next.pinnedPanel = null;
  } else if (action?.type === 'pin') {
    next.pinnedPanel = panel;
    if (next.activePanel === panel) next.activePanel = null;
  } else if (action?.type === 'unpin') {
    if(next.pinnedPanel)next.activePanel=next.pinnedPanel;
    next.pinnedPanel = null;
  }
  else if (action?.type === 'hidePanels') { next.activePanel = null; next.pinnedPanel = null; }
  if(next.presentation === 'integrated' && next.activePanel)next.summaryCollapsed = false;
  return next;
}
function moduleBounds(display, layout, panel = null, safeTop = 0.82, { summaryChampions = 0 } = {}) {
  const normalized = normalizeOverlayLayout(layout);
  const margin = 12;
  const availableHeight = Math.max(48, Math.floor(display.height * Math.min(0.9, Math.max(0.2, safeTop))) - margin * 2);
  const area = { x: margin, y: margin, width: Math.max(48, display.width - margin * 2), height: availableHeight };
  const expanded = Number.isFinite(summaryChampions) && summaryChampions > 0 && !normalized.summaryCollapsed;
  if(normalized.presentation === 'integrated'){
    const width = normalized.summaryCollapsed ? 244 : Math.min(740,Math.max(568,Math.round(summaryChampions || 0)*58+44));
    const compactHeight = expanded ? 196 : 42;
    const anchor = fitBounds(area,normalized.launcherPosition,width,Math.min(800,availableHeight));
    const height = normalized.activePanel ? Math.max(compactHeight,area.y+area.height-anchor.y) : compactHeight;
    const bounds = {...anchor,height:Math.min(height,area.height)};
    return {...bounds,x:display.x+bounds.x,y:display.y+bounds.y};
  }
  const launcherWidth = expanded ? Math.min(740, Math.max(568, Math.round(summaryChampions) * 58 + 44)) : 204;
  const order = [...new Set([normalized.pinnedPanel, normalized.activePanel, panel].filter(Boolean))];
  const launcherPosition = expanded && order.length > 1 && area.height < 700 ? { ...normalized.launcherPosition, y: margin } : normalized.launcherPosition;
  const launcher = fitBounds(area, launcherPosition, launcherWidth, expanded ? 234 : 48);
  const bounds = { launcher };
  const occupied = [launcher];
  for (const current of order) {
    const [preferredWidth, preferredHeight] = SIZES[current] || SIZES.comp;
    const preferred = normalized.panels[current] || { x: expanded ? launcher.x + launcher.width + 12 : launcher.x, y: expanded ? launcher.y : launcher.y + launcher.height + 12 };
    let free = [area];
    for (const obstacle of occupied) free = free.flatMap(rectangle => subtractBounds(rectangle, obstacle, 12));
    const candidates = free.filter(rectangle => rectangle.width >= 160 && rectangle.height >= 120).map(rectangle => {
      const candidate = fitBounds(rectangle, preferred, preferredWidth, preferredHeight);
      const coverage = candidate.width * candidate.height / (preferredWidth * preferredHeight);
      const distance = Math.hypot(candidate.x - preferred.x, candidate.y - preferred.y);
      const minimumHeight = MIN_HEIGHTS[current] || 300;
      const heightShortfall = Math.max(0, minimumHeight - candidate.height);
      return { candidate, score: coverage * 100000 - distance - heightShortfall * 100000 };
    });
    candidates.sort((first, second) => second.score - first.score);
    const selected = candidates[0]?.candidate || { x: area.x, y: area.y, width: 48, height: 48 };
    bounds[current] = selected;
    occupied.push(selected);
  }
  const selected = bounds[panel || 'launcher'];
  return { ...selected, x: display.x + selected.x, y: display.y + selected.y };
}
function fitBounds(area, position, preferredWidth, preferredHeight) {
  const width = Math.min(preferredWidth, area.width), height = Math.min(preferredHeight, area.height);
  return { x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, position.x))), y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, position.y))), width, height };
}
function subtractBounds(area, obstacle, gap) {
  const left = obstacle.x - gap, right = obstacle.x + obstacle.width + gap;
  const top = obstacle.y - gap, bottom = obstacle.y + obstacle.height + gap;
  const areaRight = area.x + area.width, areaBottom = area.y + area.height;
  if (right <= area.x || left >= areaRight || bottom <= area.y || top >= areaBottom) return [area];
  return [
    { x: area.x, y: area.y, width: Math.max(0, left - area.x), height: area.height },
    { x: Math.max(area.x, right), y: area.y, width: Math.max(0, areaRight - right), height: area.height },
    { x: area.x, y: area.y, width: area.width, height: Math.max(0, top - area.y) },
    { x: area.x, y: Math.max(area.y, bottom), width: area.width, height: Math.max(0, areaBottom - bottom) }
  ].filter(rectangle => rectangle.width > 0 && rectangle.height > 0);
}
module.exports = { PANELS, normalizeOverlayLayout, overlayAction, moduleBounds };
