'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const mapEl = byId('map');
  const SHARED = {
    yellow: { format: 'yeyan-yellow-points', label: '黃點', name: '黃色點', color: '#ffd34d' },
    green: { format: 'yeyan-green-points', label: '綠點', name: '綠色點', color: '#3ddc84' }
  };
  const MAX_POINTS = 1000;
  const basePoints = (typeof YEYAN_MAP_MARKERS === 'undefined' ? [] : YEYAN_MAP_MARKERS).map(({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius, note: '' }));
  const baseIds = new Set(basePoints.map(point => point.id));
  // Each color has its own storage key, file format and marker collection.
  const layers = {
    normal: { key: 'mochirp-yeyan-map-local-v1', raw: null, valid: true, value: { version: 1, added: [], overrides: [], hidden: [] } },
    yellow: { key: 'mochirp-yeyan-map-yellow-v1', raw: null, valid: true, value: { format: SHARED.yellow.format, version: 1, markers: [] } },
    green: { key: 'mochirp-yeyan-map-green-v1', raw: null, valid: true, value: { format: SHARED.green.format, version: 1, markers: [] } }
  };
  const pins = new Map();
  let map = null;
  let savedMapView = null;
  let bounds = null;
  let selectedId = null;
  let placement = null;
  let editOperation = null;
  let deleteOperation = null;
  let toastTimer;
  const kindOf = id => id.startsWith('green-') ? 'green' : id.startsWith('yellow-') ? 'yellow' : 'normal';
  const newId = kind => `${kind === 'normal' ? 'custom' : kind}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const colorOf = id => SHARED[kindOf(id)]?.color || '#e7314a';
  const snapshot = data => JSON.stringify(data);

  function allPoints() {
    const { added, overrides, hidden } = layers.normal.value;
    const edits = new Map(overrides.map(point => [point.id, point]));
    return [...basePoints.filter(point => !hidden.includes(point.id)).map(point => edits.get(point.id) || point), ...added, ...layers.yellow.value.markers, ...layers.green.value.markers];
  }
  const pointById = id => allPoints().find(point => point.id === id);
  function notify(message) {
    clearTimeout(toastTimer);
    byId('toast').textContent = message;
    byId('toast').hidden = false;
    toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 6000);
  }
  function fieldError(id, message = '') {
    byId(id).textContent = message;
    byId(id).hidden = !message;
  }
  function storageStatus() {
    const invalid = Object.entries(layers).filter(([, layer]) => !layer.valid).map(([kind]) => SHARED[kind]?.name || '一般地標');
    byId('storageStatus').textContent = invalid.length ? `${invalid.join('、')}資料無法讀取，已保留原資料並停止該組寫入。` : '黃點、綠點各自儲存與分享，互不影響。';
    byId('storageStatus').classList.toggle('warning', invalid.length > 0);
  }
  function failure(message) {
    byId('mapStatus').hidden = false;
    byId('statusText').textContent = message;
    byId('retry').hidden = false;
  }
  byId('retry').addEventListener('click', () => window.location.reload());

  function normalizePoint(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || typeof data.id !== 'string' || data.id.length > 100
      || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 60
      || (data.note !== undefined && (typeof data.note !== 'string' || data.note.length > 500))
      || !Number.isFinite(data.lat) || !Number.isFinite(data.lng) || !bounds?.contains([data.lat, data.lng])
      || !Number.isInteger(data.radius) || data.radius < 0 || data.radius > 1000) {
      throw new Error('地標資料無效，請檢查名稱、位置或範圍。未套用任何變更。');
    }
    return { id: data.id, name: data.name.trim(), lat: data.lat, lng: data.lng, radius: data.radius, note: (data.note || '').trim() };
  }
  function unique(points) {
    if (new Set(points.map(point => point.id)).size !== points.length) throw new Error('資料包含重複編號，未套用任何變更。');
    return points;
  }
  function normalizeLayer(kind, data) {
    if (!data || data.version !== 1) throw new Error('不支援這個資料版本。');
    if (SHARED[kind]) {
      const group = SHARED[kind];
      if (data.format !== group.format || !Array.isArray(data.markers) || data.markers.length > MAX_POINTS) throw new Error(`請使用夜宴${group.label}檔案，最多 1,000 個點。`);
      const markers = unique(data.markers.map(normalizePoint));
      const idPattern = new RegExp(`^${kind}-[a-zA-Z0-9-]{1,80}$`);
      if (markers.some(point => !idPattern.test(point.id))) throw new Error(`${group.name}編號無效。`);
      return { format: group.format, version: 1, markers };
    }
    if (!Array.isArray(data.added) || !Array.isArray(data.overrides) || !Array.isArray(data.hidden)
      || data.added.length > MAX_POINTS || data.overrides.length > basePoints.length || data.hidden.length > basePoints.length) throw new Error('一般地標資料格式無效。');
    const added = unique(data.added.map(normalizePoint));
    const overrides = unique(data.overrides.map(normalizePoint));
    if (added.some(point => !/^custom-[a-zA-Z0-9-]{1,80}$/.test(point.id)) || overrides.some(point => !baseIds.has(point.id)) || data.hidden.some(id => !baseIds.has(id))) throw new Error('一般地標編號無效。');
    return { version: 1, added, overrides, hidden: [...new Set(data.hidden)] };
  }
  function loadLayer(kind) {
    const layer = layers[kind];
    try {
      const raw = localStorage.getItem(layer.key);
      const empty = SHARED[kind] ? { format: SHARED[kind].format, version: 1, markers: [] } : { version: 1, added: [], overrides: [], hidden: [] };
      const value = normalizeLayer(kind, raw === null ? empty : JSON.parse(raw));
      Object.assign(layer, { raw, value, valid: true });
      storageStatus();
      return true;
    } catch {
      layer.valid = false;
      storageStatus();
      return false;
    }
  }
  function writeLayer(kind, next, errorId) {
    const layer = layers[kind];
    try {
      if (!layer.valid) throw new Error('此組資料無法讀取，已停止寫入以保留原資料。請檢查瀏覽器儲存設定。');
      if (localStorage.getItem(layer.key) !== layer.raw) {
        loadLayer(kind);
        syncPins(kind);
        throw new Error('另一個分頁已更新這組地標，資料已重新讀取。請確認後重試。');
      }
      const value = normalizeLayer(kind, next);
      const raw = JSON.stringify(value);
      localStorage.setItem(layer.key, raw);
      Object.assign(layer, { raw, value });
    } catch (error) {
      const message = ['QuotaExceededError', 'SecurityError'].includes(error.name)
        ? '瀏覽器無法儲存，這次變更尚未套用。請檢查儲存空間或權限，再重試。' : error.message;
      if (errorId) fieldError(errorId, message);
      else notify(message);
      return false;
    }
    syncPins(kind);
    return true;
  }
  function unchanged(operation) {
    if (operation.before && snapshot(pointById(operation.point.id)) !== operation.before) throw new Error('這個點已在另一個分頁變更或刪除，請取消後重新操作。');
  }
  function savePoint(data, operation, errorId) {
    try {
      unchanged(operation);
      const point = normalizePoint(data);
      const kind = kindOf(point.id);
      if (SHARED[kind]) {
        const value = layers[kind].value;
        const markers = operation.before ? value.markers.map(item => item.id === point.id ? point : item) : [...value.markers, point];
        return writeLayer(kind, { ...value, markers }, errorId);
      }
      const value = layers.normal.value;
      if (baseIds.has(point.id)) return writeLayer(kind, { ...value, overrides: [...value.overrides.filter(item => item.id !== point.id), point] }, errorId);
      const added = operation.before ? value.added.map(item => item.id === point.id ? point : item) : [...value.added, point];
      return writeLayer(kind, { ...value, added }, errorId);
    } catch (error) {
      if (errorId) fieldError(errorId, error.message);
      else notify(error.message);
      return false;
    }
  }

  function updateCircle(id, hovered = false) {
    const pin = pins.get(id);
    if (!pin) return;
    const visible = hovered || selectedId === id;
    pin.circle.setStyle({ fillOpacity: visible ? 0.16 : 0, opacity: visible ? 0.75 : 0 });
    pin.marker.getTooltip()?.getElement()?.classList.toggle('is-hovered', visible);
  }
  function selectPoint(point, recenter) {
    if (!map || !pins.has(point.id)) return;
    const previousId = selectedId;
    selectedId = point.id;
    updateCircle(previousId);
    updateCircle(point.id);
    byId('results').querySelectorAll('.place').forEach(button => {
      const selected = button.dataset.id === point.id;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (recenter) map.setView([point.lat, point.lng], Math.max(map.getZoom(), -0.5), { animate: false });
    pins.get(point.id).marker.openPopup();
  }
  function renderResults() {
    const all = allPoints();
    const query = byId('search').value.trim().toLocaleLowerCase();
    const visible = all.filter(point => point.name.toLocaleLowerCase().includes(query));
    byId('count').textContent = `${visible.length} / ${all.length} 處`;
    byId('results').replaceChildren();
    visible.forEach(point => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'place';
      button.dataset.id = point.id;
      button.disabled = !pins.has(point.id);
      button.classList.toggle('active', point.id === selectedId);
      button.setAttribute('aria-pressed', String(point.id === selectedId));
      button.setAttribute('aria-label', `定位${point.name}`);
      const number = document.createElement('span');
      number.className = 'place-number';
      number.textContent = String(all.indexOf(point) + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.className = 'place-name';
      name.textContent = point.name;
      const badge = document.createElement('span');
      badge.className = 'custom-tag';
      badge.style.color = colorOf(point.id);
      badge.textContent = SHARED[kindOf(point.id)]?.label || (baseIds.has(point.id) ? '↗' : '自訂');
      button.append(number, name, badge);
      button.addEventListener('click', () => selectPoint(point, true));
      byId('results').append(button);
    });
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = '找不到這個地點，請換個關鍵字。';
      byId('results').append(empty);
    }
  }
  function addPin(point) {
    const kind = kindOf(point.id);
    const color = colorOf(point.id);
    const dot = document.createElement('div');
    dot.className = 'marker-dot';
    dot.style.backgroundColor = color;
    const icon = L.divIcon({ className: 'custom-map-icon', html: dot, iconSize: [13, 13], iconAnchor: [6.5, 6.5] });
    const marker = L.marker([point.lat, point.lng], { icon, title: point.name, alt: point.name, keyboard: true });
    const circle = L.circle([point.lat, point.lng], { color, fillColor: color, fillOpacity: 0, opacity: 0, weight: 1.5, radius: point.radius, interactive: false });
    const label = document.createElement('span');
    label.textContent = point.name;
    marker.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10], className: 'map-label' });
    const popup = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'popup-title';
    title.textContent = point.name;
    popup.append(title);
    if (point.note) {
      const note = document.createElement('p');
      note.className = 'popup-note';
      note.textContent = point.note;
      popup.append(note);
    }
    const actions = document.createElement('div');
    actions.className = 'popup-actions';
    for (const [text, action] of [
      ['編輯', () => openEditor(point, true)],
      ['更換位置', () => setPlacement({ mode: 'move', point: { ...point }, before: snapshot(point) })],
      ['刪除', () => {
        setPlacement(null);
        deleteOperation = { point: { ...point }, before: snapshot(point) };
        byId('deleteMessage').textContent = `確定刪除「${point.name}」？${SHARED[kind] ? `如需備份，請先取消並匯出${SHARED[kind].label}。` : '此操作只影響這份夜宴地圖。'}`;
        fieldError('deleteError');
        byId('deleteDialog').showModal();
        byId('cancelDelete').focus();
      }]
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action';
      button.textContent = text;
      button.addEventListener('click', action);
      actions.append(button);
    }
    popup.append(actions);
    marker.bindPopup(popup, { minWidth: 235 });
    marker.on('mouseover', () => updateCircle(point.id, true));
    marker.on('mouseout', () => updateCircle(point.id));
    marker.on('click', event => {
      if (placement) applyPlacement(event.latlng);
      else selectPoint(point, false);
    });
    const group = L.layerGroup([circle, marker]).addTo(map);
    pins.set(point.id, { marker, circle, group, kind });
  }
  function syncPins(kind) {
    if (!map) return;
    for (const [id, pin] of pins) {
      if (pin.kind === kind) { map.removeLayer(pin.group); pins.delete(id); }
    }
    allPoints().filter(point => kindOf(point.id) === kind).forEach(addPin);
    if (!pins.has(selectedId)) selectedId = null;
    updateCircle(selectedId);
    renderResults();
  }
  function setPlacement(operation) {
    placement = operation;
    byId('placeBanner').hidden = !operation;
    byId('addPoint').setAttribute('aria-pressed', String(operation?.mode === 'add' && operation.kind === 'normal'));
    byId('addYellow').setAttribute('aria-pressed', String(operation?.mode === 'add' && operation.kind === 'yellow'));
    byId('addGreen').setAttribute('aria-pressed', String(operation?.mode === 'add' && operation.kind === 'green'));
    mapEl.closest('.map-section').classList.toggle('placing', Boolean(operation));
    if (operation) {
      byId('placeBanner').querySelector('span').textContent = operation.mode === 'move'
        ? `更換「${operation.point.name}」的位置：直接點選地圖上的新位置。`
        : `點選地圖上的位置，新增${SHARED[operation.kind]?.name || '一般地標'}。`;
      map.closePopup();
    }
  }
  function openEditor(point, existing = false) {
    setPlacement(null);
    editOperation = { point: { ...point }, before: existing ? snapshot(point) : null };
    byId('pointDialogTitle').textContent = existing ? '編輯地標' : '新增地標';
    byId('pointKind').textContent = SHARED[kindOf(point.id)] ? `${SHARED[kindOf(point.id)].name} · 可獨立匯入／匯出` : '一般地標 · 不會包含在黃點或綠點匯入／匯出中';
    byId('pointName').value = point.name;
    byId('pointNote').value = point.note;
    byId('pointRadius').value = point.radius;
    fieldError('pointError');
    byId('pointDialog').showModal();
    byId('pointName').focus();
  }
  function applyPlacement(latlng) {
    if (!placement) return;
    if (!bounds.contains(latlng)) { notify('請選擇底圖範圍內的位置。'); return; }
    const position = { lat: Number(latlng.lat.toFixed(2)), lng: Number(latlng.lng.toFixed(2)) };
    if (placement.mode === 'move') {
      const point = { ...placement.point, ...position };
      if (!savePoint(point, placement)) return;
      setPlacement(null);
      selectPoint(point, false);
      notify('位置已更換並儲存。');
    } else {
      openEditor({ id: newId(placement.kind), ...position, name: '', note: '', radius: 50 });
    }
  }
  byId('pointForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!editOperation) return;
    const point = { ...editOperation.point, name: byId('pointName').value.trim(), note: byId('pointNote').value.trim(), radius: Number(byId('pointRadius').value) };
    if (!savePoint(point, editOperation, 'pointError')) return;
    byId('pointDialog').close();
    byId('search').value = '';
    renderResults();
    selectPoint(point, false);
    notify('地標已儲存於此瀏覽器。');
  });
  byId('cancelPoint').addEventListener('click', () => byId('pointDialog').close());
  byId('cancelDelete').addEventListener('click', () => byId('deleteDialog').close());
  byId('confirmDelete').addEventListener('click', () => {
    if (!deleteOperation) return;
    try {
      unchanged(deleteOperation);
      const id = deleteOperation.point.id;
      const kind = kindOf(id);
      const value = layers[kind].value;
      const next = SHARED[kind] ? { ...value, markers: value.markers.filter(point => point.id !== id) }
        : baseIds.has(id) ? { ...value, hidden: [...value.hidden, id], overrides: value.overrides.filter(point => point.id !== id) }
        : { ...value, added: value.added.filter(point => point.id !== id) };
      if (writeLayer(kind, next, 'deleteError')) { byId('deleteDialog').close(); notify('地標已刪除。'); }
    } catch (error) { fieldError('deleteError', error.message); }
  });
  for (const [id, kind] of [['addPoint', 'normal'], ['addYellow', 'yellow'], ['addGreen', 'green']]) byId(id).addEventListener('click', () => setPlacement(placement?.mode === 'add' && placement.kind === kind ? null : { mode: 'add', kind }));
  byId('cancelPlacement').addEventListener('click', () => setPlacement(null));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && placement) setPlacement(null); });
  byId('search').addEventListener('input', renderResults);

  for (const [kind, importId, exportId, fileId] of [
    ['yellow', 'importPoints', 'exportPoints', 'importFile'],
    ['green', 'importGreen', 'exportGreen', 'importGreenFile']
  ]) {
    const group = SHARED[kind];
    byId(exportId).addEventListener('click', () => {
      try {
        const layer = layers[kind];
        const raw = localStorage.getItem(layer.key);
        // Export only this color's key; never read or write another group.
        const content = raw ?? JSON.stringify(layer.value, null, 2);
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `yeyan-${kind}-points-${Date.now()}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify(layer.valid ? `已匯出${group.name}，未包含其他地標。` : `已匯出原始${group.label}備份，內容需要修復後才能重新匯入。`);
      } catch { notify(`無法讀取${group.label}資料，請檢查瀏覽器儲存權限。`); }
    });
    byId(importId).addEventListener('click', () => byId(fileId).click());
    byId(fileId).addEventListener('change', async () => {
      const file = byId(fileId).files[0];
      if (!file) return;
      try {
        if (file.size > 4 * 1024 * 1024) throw new Error(`檔案超過 4 MB，請選擇夜宴${group.label} JSON 檔案。`);
        const parsed = JSON.parse(await file.text());
        // A plain marker array is also accepted; every point joins the selected color.
        const incoming = Array.isArray(parsed)
          ? parsed.map(data => normalizePoint({ ...data, id: newId(kind), radius: data?.radius ?? 50 }))
          : normalizeLayer(kind, parsed).markers;
        if (incoming.length > MAX_POINTS) throw new Error(`每次最多匯入 1,000 個${group.name}。`);
        const next = [...layers[kind].value.markers];
        const contentKey = ({ name, lat, lng, radius, note }) => JSON.stringify([name, lat, lng, radius, note]);
        const existingContent = new Set(next.map(contentKey));
        const ids = new Set(next.map(point => point.id));
        let added = 0;
        let skipped = 0;
        for (const point of incoming) {
          if (existingContent.has(contentKey(point))) { skipped++; continue; }
          const data = ids.has(point.id) ? { ...point, id: newId(kind) } : point;
          next.push(data);
          ids.add(data.id);
          existingContent.add(contentKey(data));
          added++;
        }
        if (!added) { notify(`沒有新增${group.label}，${skipped} 個相同的點已略過。`); return; }
        if (!writeLayer(kind, { ...layers[kind].value, markers: next })) return;
        byId('search').value = '';
        renderResults();
        notify(`已匯入 ${added} 個${group.name}${skipped ? `，略過 ${skipped} 個重複點` : ''}；其他地標保持不變。`);
      } catch (error) {
        notify(error instanceof SyntaxError ? 'JSON 檔案格式不正確，未匯入任何資料。' : error.message);
      } finally { byId(fileId).value = ''; }
    });
  }
  window.addEventListener('storage', event => {
    if (!bounds) return;
    for (const [kind, layer] of Object.entries(layers)) {
      if (event.key === layer.key || event.key === null) {
        if (loadLayer(kind)) { syncPins(kind); notify('已讀取另一個分頁的地標更新。'); }
      }
    }
  });

  renderResults();
  if (typeof L === 'undefined' || !basePoints.length) {
    failure('地圖程式或地標資料載入失敗，請確認整個夜宴地圖資料夾都已完整複製。');
    return;
  }
  const imageUrl = 'assets/map.png';
  const img = new Image();
  img.onerror = () => failure('底圖載入失敗，請確認資料夾內的 assets/map.png 存在，再重新載入。');
  img.onload = () => {
    bounds = L.latLngBounds([[0, 0], [img.naturalHeight, img.naturalWidth]]);
    loadLayer('normal');
    loadLayer('yellow');
    loadLayer('green');
    map = L.map(mapEl, { crs: L.CRS.Simple, zoomControl: true, minZoom: -4, maxZoom: 3, zoomSnap: 0.1, maxBounds: bounds, maxBoundsViscosity: 0.7 });
    const overlay = L.imageOverlay(imageUrl, bounds, { alt: '洛聖都與周邊地區底圖' });
    overlay.on('error', () => failure('底圖顯示失敗，請重新載入。'));
    overlay.addTo(map);
    function cityView() {
      map.closePopup();
      selectedId = null;
      pins.forEach((pin, id) => updateCircle(id));
      renderResults();
      map.setView([img.naturalHeight * 0.25, img.naturalWidth * 0.5], -2.3, { animate: false });
    }
    cityView();
    savedMapView = { center: map.getCenter(), zoom: map.getZoom() };
    allPoints().forEach(addPin);
    map.on('click', event => applyPlacement(event.latlng));
    byId('city').addEventListener('click', cityView);
    byId('overview').addEventListener('click', () => map.fitBounds(bounds, { padding: [18, 18], animate: false }));
    byId('labels').addEventListener('click', () => {
      const show = !mapEl.classList.contains('show-labels');
      mapEl.classList.toggle('show-labels', show);
      byId('labels').setAttribute('aria-pressed', String(show));
      byId('labels').textContent = show ? '隱藏地名' : '顯示地名';
    });
    for (const id of ['city', 'overview', 'labels', 'addPoint', 'addYellow', 'addGreen', 'importPoints', 'exportPoints', 'importGreen', 'exportGreen']) byId(id).disabled = false;
    byId('mapStatus').hidden = true;
    renderResults();
    document.addEventListener('yeyan:beforeviewchange', event => {
      if (event.detail.from === 'map' && !document.getElementById('map-panel').hidden) {
        savedMapView = { center: map.getCenter(), zoom: map.getZoom() };
        setPlacement(null);
        map.closePopup();
      }
    });
    document.addEventListener('yeyan:viewchange', event => {
      if (event.detail.view !== 'map') return;
      requestAnimationFrame(() => {
        if (document.getElementById('map-panel').hidden) return;
        map.invalidateSize({ pan: false });
        map.setView(savedMapView.center, savedMapView.zoom, { animate: false });
      });
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
      if (!mapEl.clientWidth || !mapEl.clientHeight) return;
      const center = map.getCenter();
      map.invalidateSize({ pan: false });
      map.setView(center, map.getZoom(), { animate: false });
    }).observe(mapEl);
  };
  img.src = imageUrl;
})();
