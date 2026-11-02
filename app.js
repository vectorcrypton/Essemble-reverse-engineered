import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const STORE_KEY = 'morgen-outfit-planner-v1';
const categoryNames = { top: 'Oberteil', bottom: 'Hose / Rock', outerwear: 'Jacke', shoes: 'Schuhe', accessory: 'Accessoire' };
const colorNames = { cream: 'Creme', black: 'Schwarz', blue: 'Blau', red: 'Rot', green: 'Grün', pink: 'Rosa', yellow: 'Gelb', multi: 'Mehrfarbig' };
const colorValues = { cream: '#e8dfd0', black: '#333332', blue: '#698da5', red: '#c95b4b', green: '#778b69', pink: '#d9a8ad', yellow: '#d9bc63', multi: '#a69c85' };
const photoUrls = [
  'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=82',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=82',
  'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=82',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=82',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=82',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=82'
];
const initialItems = [
  { id: 'i1', name: 'Leinenhemd', category: 'top', color: 'cream', brand: 'ARKET', note: 'Locker geschnitten', image: photoUrls[0], wears: 4, added: 1 },
  { id: 'i2', name: 'Straight Jeans', category: 'bottom', color: 'blue', brand: 'Weekday', note: '', image: photoUrls[1], wears: 7, added: 2 },
  { id: 'i3', name: 'Trenchcoat', category: 'outerwear', color: 'cream', brand: 'COS', note: 'Für Übergangswetter', image: photoUrls[2], wears: 3, added: 3 },
  { id: 'i4', name: 'Loafer', category: 'shoes', color: 'black', brand: 'Vagabond', note: '', image: photoUrls[3], wears: 5, added: 4 },
  { id: 'i5', name: 'Stricktop', category: 'top', color: 'green', brand: 'Secondhand', note: 'Lieblingsstück', image: photoUrls[4], wears: 9, added: 5 },
  { id: 'i6', name: 'Midi-Rock', category: 'bottom', color: 'red', brand: '& Other Stories', note: '', image: photoUrls[5], wears: 2, added: 6 },
  { id: 'i7', name: 'Goldene Creolen', category: 'accessory', color: 'yellow', brand: '', note: 'Leicht & schlicht', image: photoUrls[0], wears: 11, added: 7 },
  { id: 'i8', name: 'Blazer', category: 'outerwear', color: 'blue', brand: 'Mango', note: '', image: photoUrls[2], wears: 2, added: 8 }
];
const initialOutfits = [
  { id: 'o1', name: 'Einfach gut angezogen', items: ['i1', 'i2', 'i4', 'i7'], favorite: true, wears: 3 },
  { id: 'o2', name: 'Ein Hauch Farbe', items: ['i5', 'i6', 'i4'], favorite: false, wears: 1 },
  { id: 'o3', name: 'Locker durch den Tag', items: ['i1', 'i2', 'i3'], favorite: true, wears: 2 }
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && Array.isArray(saved.items) && Array.isArray(saved.outfits) && saved.plans) return saved;
  } catch (error) { console.warn('Lokale Garderobe konnte nicht geladen werden.', error); }
  const now = new Date();
  const plans = {};
  const upcoming = [1, 3, 5];
  upcoming.forEach((offset, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    plans[dateKey(date)] = `o${index + 1}`;
  });
  return { items: initialItems, outfits: initialOutfits, plans, nextAdded: 9 };
}
let state = loadState();
state.context ||= { weather: 'mild', occasion: 'everyday', mood: 'relaxed', note: 'Wähle Wetter, Anlass und Stimmung für einen persönlichen Vorschlag.' };
let currentView = 'today';
let closetFilter = 'all';
let lookFilter = 'all';
let searchTerm = '';
let calendarDate = new Date();
let toastTimer;

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseDate(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function getItem(id) { return state.items.find(item => item.id === id); }
function getOutfit(id) { return state.outfits.find(outfit => outfit.id === id); }
function itemImage(item, extra = '') { return `<img class="${extra}" src="${escapeHtml(item.image || photoUrls[0])}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='${photoUrls[0]}'">`; }
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}
function formatShortDate(date) { return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }).format(date); }

function renderAll() {
  document.querySelector('#item-count').textContent = state.items.length;
  document.querySelector('#all-count').textContent = state.items.length;
  renderToday(); renderCloset(); renderLooks(); renderCalendar();
}
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const titles = { today: 'HEUTE', closet: 'KLEIDERSCHRANK', looks: 'OUTFITS', calendar: 'KALENDER' };
  document.querySelector('#topbar-title').textContent = titles[view];
  if (view === 'calendar') renderCalendar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderToday() {
  const today = new Date();
  document.querySelector('#context-weather').value = state.context.weather;
  document.querySelector('#context-occasion').value = state.context.occasion;
  document.querySelector('#context-mood').value = state.context.mood;
  document.querySelector('#recommendation-note').textContent = state.context.note;
  document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(today).toUpperCase();
  document.querySelector('#week-strip').innerHTML = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 1 + index);
    const current = dateKey(day) === dateKey(today);
    return `<button class="week-day ${current ? 'current' : ''}" data-date="${dateKey(day)}"><strong>${new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(day).replace('.', '')}</strong><em>${day.getDate()}</em></button>`;
  }).join('');
  const outfit = getOutfit(state.plans[dateKey(today)]) || state.outfits[0];
  const feature = document.querySelector('#today-feature');
  if (!outfit) {
    feature.innerHTML = `<div class="feature-content"><span class="feature-tag">DEIN LOOK FÜR HEUTE</span><h2>Heute ist Platz für etwas Neues.</h2><p>Stelle ein Outfit zusammen und plane es direkt für deinen Tag.</p><div class="feature-items"><button class="primary-button" id="feature-create">Outfit erstellen</button></div></div>`;
    document.querySelector('#feature-create')?.addEventListener('click', openLookDialog);
  } else {
    const pieces = outfit.items.map(getItem).filter(Boolean);
    const hero = pieces[0] || state.items[0];
    feature.innerHTML = `${itemImage(hero, 'feature-photo')}<div class="feature-content"><div class="feature-topline"><span class="feature-tag">DEIN LOOK FÜR HEUTE</span><span class="feature-weather">${escapeHtml(state.context.occasion)} · ${escapeHtml(state.context.mood)}</span></div><h2>${escapeHtml(outfit.name)}</h2><p>${pieces.map(piece => `${escapeHtml(piece.name)}${piece.brand ? ` · ${escapeHtml(piece.brand)}` : ''}`).join(' &nbsp; · &nbsp; ')}</p><div class="feature-items">${pieces.slice(0, 4).map(piece => `<span class="feature-item-pill">${escapeHtml(piece.name)}</span>`).join('')}</div></div><div class="feature-actions"><button class="feature-action ${outfit.favorite ? 'favorite-on' : ''}" id="feature-favorite" title="Favorit umschalten" aria-label="Favorit umschalten">♥</button><button class="feature-action" id="feature-change" title="Outfit ändern" aria-label="Outfit ändern">↻</button></div>`;
    document.querySelector('#feature-favorite').addEventListener('click', () => toggleFavorite(outfit.id));
    document.querySelector('#feature-change').addEventListener('click', () => openPlanDialog(dateKey(today)));
  }
  const plans = Object.entries(state.plans).map(([key, id]) => ({ date: parseDate(key), outfit: getOutfit(id) })).filter(plan => plan.date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && plan.outfit).sort((a, b) => a.date - b.date).slice(0, 2);
  document.querySelector('#next-plans').innerHTML = plans.length ? plans.map(({ date, outfit }) => `<div class="next-plan"><div class="next-date">${new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date)}<strong>${date.getDate()}</strong></div><div class="next-info"><strong>${escapeHtml(outfit.name)}</strong><small>${outfit.items.map(getItem).filter(Boolean).map(item => escapeHtml(item.name)).slice(0, 2).join(' · ')}</small></div><span class="next-swatch" style="background:${colorValues[getItem(outfit.items[0])?.color] || '#dcece3'}"></span></div>`).join('') : '<p class="intro-copy">Noch keine Outfits geplant.</p>';
  const todaysPieces = outfit ? outfit.items.map(getItem).filter(Boolean).slice(0, 4) : state.items.slice(0, 4);
  document.querySelector('#today-items').innerHTML = todaysPieces.map(item => `<div class="today-item">${itemImage(item, 'mini-item-image')}<div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(categoryNames[item.category])} · ${escapeHtml(colorNames[item.color])}</small></div></div>`).join('') || '<p class="intro-copy">Füge Teile zu deinem Kleiderschrank hinzu.</p>';
}

function renderCloset() {
  const items = state.items.filter(item => (closetFilter === 'all' || item.category === closetFilter) && `${item.name} ${item.brand} ${item.note}`.toLowerCase().includes(searchTerm.toLowerCase()));
  items.sort((a, b) => document.querySelector('#sort-items').value === 'name' ? a.name.localeCompare(b.name, 'de') : b.added - a.added);
  document.querySelector('#closet-grid').innerHTML = items.map((item, index) => `<article class="closet-card" style="animation-delay:${Math.min(index * 30, 180)}ms"><div class="closet-image-wrap" style="--item-bg:${colorValues[item.color] || '#e8e4dc'}">${itemImage(item, 'closet-image')}<span class="item-category">${escapeHtml(categoryNames[item.category])}</span><button class="item-menu" data-item-detail="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} Details">···</button></div><div class="closet-card-info"><h3>${escapeHtml(item.name)}</h3><div class="item-meta"><i class="color-dot" style="background:${colorValues[item.color] || '#ccc'}"></i>${escapeHtml(colorNames[item.color] || 'Farbe')}${item.brand ? ` · ${escapeHtml(item.brand)}` : ''}</div><div class="closet-card-footer"><span class="wear-count">${item.wears || 0}× getragen</span><button class="wear-plus" data-wear="${escapeHtml(item.id)}">+ getragen</button></div></div></article>`).join('');
  document.querySelector('#closet-empty').classList.toggle('hidden', items.length > 0);
  document.querySelector('#closet-grid').classList.toggle('hidden', items.length === 0);
  document.querySelectorAll('#closet-filters .filter-chip').forEach(button => button.classList.toggle('selected', button.dataset.filter === closetFilter));
}

function renderLooks() {
  const outfits = state.outfits.filter(outfit => (lookFilter !== 'favorite' || outfit.favorite) && `${outfit.name} ${outfit.items.map(id => getItem(id)?.name || '').join(' ')}`.toLowerCase().includes(searchTerm.toLowerCase()));
  document.querySelector('#look-count').textContent = `${outfits.length} ${outfits.length === 1 ? 'Outfit' : 'Outfits'}`;
  document.querySelector('#looks-grid').innerHTML = outfits.map(outfit => {
    const pieces = outfit.items.map(getItem).filter(Boolean);
    return `<article class="look-card"><div class="look-images">${pieces.slice(0, 4).map(item => itemImage(item)).join('')}<button class="look-heart ${outfit.favorite ? 'favorite' : ''}" data-favorite="${escapeHtml(outfit.id)}" aria-label="Favorit umschalten">♥</button></div><div class="look-card-body"><h3>${escapeHtml(outfit.name)}</h3><p>${pieces.map(item => escapeHtml(item.name)).join(' · ')}</p><div class="look-card-bottom"><span>${outfit.wears || 0}× getragen</span><button data-plan-outfit="${escapeHtml(outfit.id)}">Im Kalender planen ↗</button></div></div></article>`;
  }).join('');
  document.querySelector('#looks-empty').classList.toggle('hidden', outfits.length > 0);
  document.querySelector('#looks-grid').classList.toggle('hidden', outfits.length === 0);
  document.querySelectorAll('#look-filters .filter-chip').forEach(button => button.classList.toggle('selected', button.dataset.filter === lookFilter));
}

function renderCalendar() {
  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  document.querySelector('#calendar-month').textContent = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(calendarDate);
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const todayKey = dateKey(new Date());
  const labels = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  let html = labels.map(label => `<div class="calendar-weekday">${label}</div>`).join('');
  for (let index = 0; index < 42; index++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const key = dateKey(day), outfit = getOutfit(state.plans[key]);
    html += `<button class="calendar-day ${day.getMonth() !== month ? 'outside' : ''} ${key === todayKey ? 'today' : ''}" data-calendar-day="${key}"><span class="day-number">${day.getDate()}</span>${outfit ? `<span class="calendar-look"><i class="legend-dot planned"></i>${escapeHtml(outfit.name)}</span>` : '<span class="add-plan-hint">＋</span>'}</button>`;
  }
  document.querySelector('#calendar-grid').innerHTML = html;
}

function openItemDialog(item = null) {
  const form = document.querySelector('#item-form');
  form.reset();
  form.elements.itemId.value = item?.id || '';
  form.elements.cameraPhoto.value = '';
  const preview = form.querySelector('#item-photo-preview');
  preview.hidden = !item;
  if (item) {
    form.elements.name.value = item.name;
    form.elements.category.value = item.category;
    form.elements.color.value = item.color;
    form.elements.brand.value = item.brand || '';
    form.elements.note.value = item.note || '';
    preview.src = item.image;
  }
  form.querySelector('h2').textContent = item ? 'Teil bearbeiten' : 'Teil hinzufügen';
  form.querySelector('[type="submit"]').textContent = item ? 'Änderungen speichern' : 'Teil speichern';
  document.querySelector('#item-dialog').showModal();
}
function initializePhotoCapture() {
  const form = document.querySelector('#item-form');
  const photoInput = form.querySelector('input[name="photo"]');
  const cameraData = document.createElement('input');
  cameraData.type = 'hidden';
  cameraData.name = 'cameraPhoto';
  form.append(cameraData);
  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.className = 'secondary-button camera-capture-button';
  captureButton.textContent = 'Kamera öffnen';
  const preview = document.createElement('img');
  preview.id = 'item-photo-preview';
  preview.className = 'item-photo-preview';
  preview.alt = 'Vorschau des Kleidungsfotos';
  preview.hidden = true;
  photoInput.parentElement.insertAdjacentElement('afterend', captureButton);
  captureButton.insertAdjacentElement('afterend', preview);
  photoInput.addEventListener('change', () => {
    cameraData.value = '';
    const file = photoInput.files?.[0];
    if (!file) { preview.hidden = true; return; }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });
  captureButton.addEventListener('click', async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1200,
        height: 1200,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      cameraData.value = photo.dataUrl || '';
      photoInput.value = '';
      preview.src = cameraData.value;
      preview.hidden = !cameraData.value;
    } catch (error) {
      if (!String(error).toLowerCase().includes('cancel')) showToast('Kamera oder Fotoauswahl konnte nicht geöffnet werden.');
    }
  });
}
function readResizedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function openLookDialog() {
  if (state.items.length === 0) { showToast('Füge zuerst ein Kleidungsstück hinzu.'); setView('closet'); return; }
  const groupOrder = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];
  document.querySelector('#look-form').reset();
  document.querySelector('#look-picker').innerHTML = groupOrder.map(category => {
    const items = state.items.filter(item => item.category === category);
    if (!items.length) return '';
    return `<div class="picker-group-title">${escapeHtml(categoryNames[category]).toUpperCase()}${category === 'top' || category === 'bottom' ? ' · EMPFOHLEN' : ''}</div>${items.map(item => `<label class="picker-item">${itemImage(item)}<span>${escapeHtml(item.name)}${item.brand ? ` <small>· ${escapeHtml(item.brand)}</small>` : ''}</span><input type="checkbox" name="items" value="${escapeHtml(item.id)}"></label>`).join('')}`;
  }).join('');
  document.querySelector('#look-dialog').showModal();
}
function openPlanDialog(date = dateKey(new Date()), outfitId = '') {
  if (!state.outfits.length) { showToast('Erstelle zuerst ein Outfit.'); setView('looks'); return; }
  const form = document.querySelector('#plan-form');
  form.reset();
  form.elements.date.value = date;
  form.elements.outfit.innerHTML = state.outfits.map(outfit => `<option value="${escapeHtml(outfit.id)}" ${outfit.id === outfitId ? 'selected' : ''}>${escapeHtml(outfit.name)}</option>`).join('');
  document.querySelector('#plan-dialog').showModal();
}
function toggleFavorite(id) {
  const outfit = getOutfit(id);
  if (!outfit) return;
  outfit.favorite = !outfit.favorite; saveState(); renderAll(); showToast(outfit.favorite ? 'Zu deinen Favoriten hinzugefügt.' : 'Aus deinen Favoriten entfernt.');
}
function recommendOutfit() {
  const { weather, occasion, mood } = state.context;
  const ranked = state.outfits.map(outfit => {
    const pieces = outfit.items.map(getItem).filter(Boolean);
    if (!pieces.length) return null;
    const categories = new Set(pieces.map(item => item.category));
    const colors = new Set(pieces.map(item => item.color));
    const labels = pieces.map(item => `${item.name} ${item.note || ''}`).join(' ').toLowerCase();
    let score = outfit.favorite ? 1 : 0;
    const reasons = [];
    if (weather === 'cold' && categories.has('outerwear')) { score += 4; reasons.push('wärmende Schicht'); }
    if (weather === 'rainy' && categories.has('outerwear')) { score += 2; reasons.push('Jacke für wechselhaftes Wetter'); }
    if (weather === 'warm' && !categories.has('outerwear')) { score += 2; reasons.push('leichte Kombination'); }
    if (occasion === 'office') {
      if (categories.has('outerwear')) score += 2;
      if (categories.has('bottom')) score += 1;
      if (categories.has('shoes')) score += 1;
      reasons.push('passt zum Büro');
    }
    if (occasion === 'date') {
      if (pieces.some(item => ['red', 'pink'].includes(item.color))) { score += 3; reasons.push('kleiner Farbakzent'); }
      if (categories.has('accessory')) score += 1;
      reasons.push('passt zu einem Date');
    }
    if (occasion === 'event') {
      if (categories.has('accessory')) score += 2;
      if (pieces.some(item => ['red', 'pink', 'yellow'].includes(item.color))) score += 1;
      reasons.push('hat das gewisse Extra');
    }
    if (occasion === 'travel') {
      if (categories.has('bottom')) score += 2;
      if (labels.includes('jeans') || labels.includes('strick') || labels.includes('locker')) { score += 2; reasons.push('bequem unterwegs'); }
    }
    if (mood === 'elegant') {
      if (categories.has('shoes')) score += 1;
      if (categories.has('accessory')) score += 2;
      if (categories.has('outerwear')) score += 1;
      reasons.push('ein eleganter Akzent');
    }
    if (mood === 'bold' && colors.size > 1) { score += 2; reasons.push('mehr Farbe, mehr Ausdruck'); }
    if (mood === 'minimal' && pieces.every(item => ['cream', 'black', 'blue'].includes(item.color))) { score += 2; reasons.push('ruhige Farben'); }
    if (mood === 'relaxed' && (labels.includes('locker') || labels.includes('jeans') || labels.includes('strick'))) { score += 1; reasons.push('entspannt kombiniert'); }
    score += 1 / (1 + (outfit.wears || 0));
    return { outfit, score, reasons };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}
function styleHarmony(firstColor, secondColor) {
  if (firstColor === secondColor) return firstColor === 'black' ? 0 : 1;
  const pair = [firstColor, secondColor].sort().join('-');
  const harmonious = new Set([
    'black-cream', 'black-blue', 'black-green', 'black-pink', 'black-red', 'black-yellow',
    'blue-cream', 'blue-green', 'blue-pink', 'blue-red', 'blue-yellow', 'cream-green',
    'cream-multi', 'cream-pink', 'cream-red', 'cream-yellow', 'black-multi'
  ]);
  return harmonious.has(pair) ? 2 : -1;
}
function scoreCombination(items) {
  let score = 0;
  for (let first = 0; first < items.length; first++) {
    for (let second = first + 1; second < items.length; second++) {
      score += styleHarmony(items[first].color, items[second].color);
    }
  }
  score -= items.reduce((total, item) => total + (item.wears || 0), 0) * 0.06;
  const categories = new Set(items.map(item => item.category));
  const { weather, occasion, mood } = state.context;
  if (weather === 'cold' && categories.has('outerwear')) score += 4;
  if (weather === 'rainy' && categories.has('outerwear')) score += 3;
  if (weather === 'warm' && !categories.has('outerwear')) score += 2;
  if (['office', 'travel'].includes(occasion) && categories.has('shoes')) score += 1;
  if (['date', 'event'].includes(occasion) && categories.has('accessory')) score += 2;
  if (mood === 'elegant' && categories.has('accessory')) score += 2;
  if (mood === 'bold' && new Set(items.map(item => item.color)).size > 2) score += 2;
  if (mood === 'minimal' && items.every(item => ['cream', 'black', 'blue'].includes(item.color))) score += 2;
  return score;
}
function createWardrobeOutfit() {
  const tops = state.items.filter(item => item.category === 'top').sort((a, b) => (a.wears || 0) - (b.wears || 0)).slice(0, 20);
  const bottoms = state.items.filter(item => item.category === 'bottom').sort((a, b) => (a.wears || 0) - (b.wears || 0)).slice(0, 20);
  if (!tops.length || !bottoms.length) {
    showToast('Für einen Look brauchst du mindestens ein Oberteil und eine Hose oder einen Rock.');
    setView('closet');
    return;
  }
  let best = null;
  for (const top of tops) {
    for (const bottom of bottoms) {
      const pieces = [top, bottom];
      const useOuterwear = ['cold', 'rainy'].includes(state.context.weather) || ['office', 'travel'].includes(state.context.occasion);
      const useAccessory = ['date', 'event'].includes(state.context.occasion) || state.context.mood === 'elegant';
      for (const category of ['shoes', ...(useOuterwear ? ['outerwear'] : []), ...(useAccessory ? ['accessory'] : [])]) {
        const addition = state.items.filter(item => item.category === category).sort((a, b) => scoreCombination([...pieces, b]) - scoreCombination([...pieces, a]))[0];
        if (addition) pieces.push(addition);
      }
      const score = scoreCombination(pieces);
      if (!best || score > best.score) best = { pieces, score };
    }
  }
  const itemIds = best.pieces.map(item => item.id);
  const signature = [...itemIds].sort().join('|');
  const existing = state.outfits.find(outfit => [...outfit.items].sort().join('|') === signature);
  if (existing) {
    setView('looks');
    showToast(`Diese passende Kombination gibt es schon: ${existing.name}.`);
    return;
  }
  const occasionNames = { everyday: 'Alltag', office: 'Büro', date: 'Date', event: 'Event', travel: 'Reise' };
  const topColor = colorNames[best.pieces[0].color] || 'Dein Stil';
  const outfit = { id: `o${Date.now()}`, name: `${occasionNames[state.context.occasion] || 'Neuer Look'} in ${topColor}`, items: itemIds, favorite: false, wears: 0 };
  state.outfits.unshift(outfit);
  saveState();
  renderAll();
  setView('looks');
  showToast('Neues Outfit aus deinem Schrank zusammengestellt.');
}
function showItemDetails(id) {
  const item = getItem(id);
  if (!item) return;
  const dialog = document.querySelector('#detail-dialog');
  dialog.innerHTML = `${itemImage(item, 'detail-hero')}<div class="detail-dialog-content"><div class="dialog-header"><div><p class="eyebrow">${escapeHtml(categoryNames[item.category]).toUpperCase()}</p><h2>${escapeHtml(item.name)}</h2></div><button class="dialog-close" data-close-detail aria-label="Schließen">×</button></div><p>${escapeHtml(colorNames[item.color])}${item.brand ? ` · ${escapeHtml(item.brand)}` : ''}</p>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ''}<p>${item.wears || 0}× getragen</p><div class="detail-actions"><button class="delete" data-delete-item="${escapeHtml(item.id)}">Teil löschen</button><button data-edit-item="${escapeHtml(item.id)}">Bearbeiten</button><button data-wear="${escapeHtml(item.id)}">+ Als getragen markieren</button></div></div>`;
  dialog.showModal();
}
function planDatePrompt(date) { openPlanDialog(date); }

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelector('#quick-add').addEventListener('click', openItemDialog);
document.querySelector('#add-item').addEventListener('click', openItemDialog);
document.querySelector('#empty-add').addEventListener('click', openItemDialog);
document.querySelector('#create-look').addEventListener('click', openLookDialog);
document.querySelector('#empty-look').addEventListener('click', openLookDialog);
document.querySelector('#mix-closet').addEventListener('click', createWardrobeOutfit);
document.querySelector('#plan-today').addEventListener('click', () => openPlanDialog(dateKey(new Date())));
document.querySelector('#calendar-plan').addEventListener('click', () => openPlanDialog(dateKey(new Date())));
document.querySelector('#recommend-look').addEventListener('click', () => {
  const recommendation = recommendOutfit();
  if (!recommendation) { showToast('Füge erst Teile zu einem Outfit hinzu.'); return; }
  state.plans[dateKey(new Date())] = recommendation.outfit.id;
  const reasons = recommendation.reasons.length ? recommendation.reasons.slice(0, 2).join(' · ') : 'aus deinen Lieblingskombinationen ausgewählt';
  state.context.note = `${recommendation.outfit.name}: ${reasons}.`;
  saveState(); renderAll(); showToast('Dein persönlicher Look ist für heute eingeplant.');
});
['weather', 'occasion', 'mood'].forEach(key => {
  document.querySelector(`#context-${key}`).addEventListener('change', event => {
    state.context[key] = event.target.value;
    state.context.note = 'Kriterien aktualisiert. Lass dir jetzt einen passenden Look empfehlen.';
    saveState();
    document.querySelector('#recommendation-note').textContent = state.context.note;
  });
});
document.querySelector('#global-search').addEventListener('input', event => { searchTerm = event.target.value.trim(); renderCloset(); renderLooks(); });
document.querySelector('#global-search').addEventListener('keydown', event => { if (event.key === 'Enter') setView('closet'); });
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#global-search').focus(); } });
document.querySelector('#closet-filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; closetFilter = button.dataset.filter; renderCloset(); });
document.querySelector('#look-filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; lookFilter = button.dataset.filter; renderLooks(); });
document.querySelector('#sort-items').addEventListener('change', renderCloset);
document.querySelector('#closet-grid').addEventListener('click', event => {
  const detail = event.target.closest('[data-item-detail]');
  const wear = event.target.closest('[data-wear]');
  if (detail) showItemDetails(detail.dataset.itemDetail);
  if (wear) { const item = getItem(wear.dataset.wear); item.wears = (item.wears || 0) + 1; saveState(); renderAll(); showToast('Als getragen markiert.'); }
});
document.querySelector('#looks-grid').addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  const plan = event.target.closest('[data-plan-outfit]');
  if (favorite) toggleFavorite(favorite.dataset.favorite);
  if (plan) openPlanDialog(dateKey(new Date()), plan.dataset.planOutfit);
});
document.querySelector('#week-strip').addEventListener('click', event => { const day = event.target.closest('[data-date]'); if (day) openPlanDialog(day.dataset.date); });
document.querySelector('#calendar-grid').addEventListener('click', event => { const day = event.target.closest('[data-calendar-day]'); if (day) planDatePrompt(day.dataset.calendarDay); });
document.querySelector('#prev-month').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); });
document.querySelector('#next-month').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); });
document.querySelector('#today-month').addEventListener('click', () => { calendarDate = new Date(); renderCalendar(); });
document.querySelector('#item-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form);
  const itemId = values.get('itemId');
  const existing = itemId ? getItem(itemId) : null;
  const photo = values.get('photo');
  let image = existing?.image || photoUrls[(state.nextAdded || 1) % photoUrls.length];
  const cameraPhoto = values.get('cameraPhoto');
  if (cameraPhoto) image = cameraPhoto;
  else if (photo?.size) {
    try { image = await readResizedImage(photo); }
    catch { showToast('Das Foto konnte nicht geladen werden.'); return; }
  }
  const item = { id: existing?.id || `i${Date.now()}`, name: values.get('name').trim(), category: values.get('category'), color: values.get('color'), brand: values.get('brand').trim(), note: values.get('note').trim(), image, wears: existing?.wears || 0, added: existing?.added || state.nextAdded++ };
  if (existing) state.items[state.items.indexOf(existing)] = item;
  else state.items.push(item);
  saveState(); form.closest('dialog').close(); renderAll(); setView('closet'); showToast(existing ? 'Änderungen gespeichert.' : 'Teil wurde deinem Kleiderschrank hinzugefügt.');
});
document.querySelector('#look-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form), itemIds = values.getAll('items');
  if (!itemIds.length) { showToast('Wähle mindestens ein Kleidungsstück.'); return; }
  state.outfits.unshift({ id: `o${Date.now()}`, name: values.get('name').trim(), items: itemIds, favorite: false, wears: 0 });
  saveState(); form.closest('dialog').close(); renderAll(); setView('looks'); showToast('Outfit gespeichert.');
});
document.querySelector('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget, values = new FormData(form);
  state.plans[values.get('date')] = values.get('outfit');
  const outfit = getOutfit(values.get('outfit'));
  if (outfit) outfit.wears = (outfit.wears || 0) + 1;
  saveState(); form.closest('dialog').close(); renderAll(); showToast('Outfit ist eingeplant.');
});
document.querySelector('#detail-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget || event.target.closest('[data-close-detail]')) event.currentTarget.close();
  const wear = event.target.closest('[data-wear]');
  const remove = event.target.closest('[data-delete-item]');
  const edit = event.target.closest('[data-edit-item]');
  if (edit) { const item = getItem(edit.dataset.editItem); event.currentTarget.close(); openItemDialog(item); }
  if (wear) { const item = getItem(wear.dataset.wear); item.wears = (item.wears || 0) + 1; saveState(); event.currentTarget.close(); renderAll(); showToast('Als getragen markiert.'); }
  if (remove) {
    const id = remove.dataset.deleteItem;
    state.items = state.items.filter(item => item.id !== id);
    state.outfits.forEach(outfit => outfit.items = outfit.items.filter(itemId => itemId !== id));
    saveState(); event.currentTarget.close(); renderAll(); showToast('Teil wurde entfernt.');
  }
});
document.querySelector('#export-data').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'morgen-kleiderschrank.json'; anchor.click(); URL.revokeObjectURL(url); showToast('Deine Daten wurden exportiert.');
});
document.querySelector('#profile-button').addEventListener('click', () => showToast('Deine Daten bleiben auf diesem Gerät.'));

initializePhotoCapture();
renderAll();