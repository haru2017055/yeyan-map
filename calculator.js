'use strict';

(() => {
  const STORAGE_KEY = 'mochirp-yeyan-luna-rossa-order-v1';
  const MAX_QUANTITY = 999;
  const menu = Object.freeze([
    { id: 'pizza', name: '羅莎火腿起司披薩', category: '食品', unit: '份', price: 180 },
    { id: 'pasta', name: '赤月松露奶油寬麵', category: '食品', unit: '份', price: 180 },
    { id: 'berry', name: '玫瑰莓果氣泡飲', category: '飲料', unit: '杯', price: 160 },
    { id: 'lemon', name: '月夜檸檬蘇打', category: '飲料', unit: '杯', price: 160 },
    { id: 'fox', name: '赤狐', english: 'Volpe Rossa', category: '酒品', unit: '杯', price: 150 },
    { id: 'midnight', name: '午夜', english: 'Mezzanotte', category: '酒品', unit: '杯', price: 150 },
    { id: 'rose', name: '赤紅玫瑰', english: 'Rosa Rossa', category: '酒品', unit: '杯', price: 150 },
    { id: 'moon', name: '黑月', english: 'Luna Nera', category: '酒品', unit: '杯', price: 150 }
  ]);
  const ids = new Set(menu.map(item => item.id));
  const root = document.getElementById('calculator-panel');
  const byId = id => root.querySelector(`#${id}`);
  const nodes = new Map();
  const addButtons = new Map();
  let quantities = {};
  let lastRaw = null;
  let readable = true;
  let unsaved = false;
  let conflict = false;
  let revision = 0;
  const amount = value => `$${value.toLocaleString('en-US')}`;
  const count = id => quantities[id] || 0;
  const total = () => menu.reduce((sum, item) => sum + item.price * count(item.id), 0);

  function notice(message, warning = false) {
    byId('calcNotice').textContent = message;
    byId('calcNotice').classList.toggle('warning', warning);
  }
  function quantityError(message = '') {
    byId('calcQuantityError').textContent = message;
    byId('calcQuantityError').hidden = !message;
  }
  function copyStatus(message = '') {
    byId('calcCopyStatus').textContent = message;
    byId('calcCopyStatus').hidden = !message;
  }
  function hideReceiptText() {
    byId('calcCopyLabel').hidden = true;
    byId('calcCopyText').hidden = true;
    copyStatus();
  }
  function parseStored(raw) {
    if (raw === null) return {};
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.quantities || typeof data.quantities !== 'object' || Array.isArray(data.quantities)) throw new Error('Invalid order');
    const result = {};
    for (const [id, value] of Object.entries(data.quantities)) {
      if (!ids.has(id) || !Number.isInteger(value) || value < 0 || value > MAX_QUANTITY) throw new Error('Invalid quantity');
      if (value) result[id] = value;
    }
    return result;
  }
  function loadOrder(external = false) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const next = parseStored(raw);
      quantities = next;
      lastRaw = raw;
      readable = true;
      unsaved = false;
      conflict = false;
      revision++;
      byId('calcReloadOrder').hidden = true;
      quantityError();
      hideReceiptText();
      notice(external ? '已載入另一個分頁更新的訂單。' : raw ? '已載入未結訂單，可繼續點單。' : '本單會保留在此瀏覽器，切換分頁不會清空。');
      return true;
    } catch {
      readable = false;
      notice('無法讀取先前訂單，原紀錄已保留。目前試算只保留在本頁，請複製明細備份。', true);
      byId('calcReloadOrder').hidden = false;
      return false;
    }
  }
  function markConflict() {
    conflict = true;
    byId('calcReloadOrder').hidden = false;
    notice('另一個分頁已更新訂單，這次變更未套用。請先複製目前明細，再載入最新訂單。', true);
  }
  function commit(next) {
    if (conflict) { markConflict(); return false; }
    if (readable) {
      try {
        if (localStorage.getItem(STORAGE_KEY) !== lastRaw) { markConflict(); return false; }
        const raw = JSON.stringify({ version: 1, quantities: next });
        localStorage.setItem(STORAGE_KEY, raw);
        lastRaw = raw;
        unsaved = false;
        notice('本單已儲存，切換分頁或重新整理可繼續點單。');
      } catch {
        unsaved = true;
        notice('瀏覽器無法儲存；目前試算仍可使用，但關閉前請複製明細備份。', true);
      }
    } else {
      unsaved = true;
    }
    quantities = next;
    revision++;
    hideReceiptText();
    return true;
  }
  function setQuantity(item, value, input = null) {
    if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > MAX_QUANTITY) {
      if (input) input.setAttribute('aria-invalid', 'true');
      quantityError(`「${item.name}」數量需為 0–${MAX_QUANTITY} 的整數，金額仍以最後有效數量計算。`);
      hideReceiptText();
      return false;
    }
    const next = { ...quantities };
    if (Number(value) === 0) delete next[item.id];
    else next[item.id] = Number(value);
    if (!commit(next)) { if (input) input.value = count(item.id); return false; }
    if (input) input.removeAttribute('aria-invalid');
    quantityError();
    renderOrder(input);
    return true;
  }
  function makeButton(text, label, className, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.className = className;
    button.addEventListener('click', action);
    return button;
  }
  function buildMenu() {
    for (const category of ['食品', '飲料', '酒品']) {
      const group = document.createElement('section');
      group.className = 'calc-group';
      const title = document.createElement('h3');
      title.textContent = category;
      const grid = document.createElement('div');
      grid.className = 'calc-product-grid';
      for (const item of menu.filter(entry => entry.category === category)) {
        const card = document.createElement('article');
        card.className = 'calc-product';
        const name = document.createElement('h4');
        name.className = 'calc-product-name';
        name.textContent = item.name;
        if (item.english) {
          const english = document.createElement('span');
          english.className = 'calc-product-english';
          english.textContent = item.english;
          name.append(english);
        }
        const buy = document.createElement('div');
        buy.className = 'calc-product-buy';
        const price = document.createElement('span');
        price.className = 'calc-price';
        price.textContent = amount(item.price);
        const add = makeButton('＋ 加入', `加入${item.name}`, 'calc-add', () => setQuantity(item, count(item.id) + 1));
        add.dataset.product = item.id;
        addButtons.set(item.id, add);
        buy.append(price, add);
        card.append(name, buy);
        grid.append(card);
      }
      group.append(title, grid);
      byId('calcMenu').append(group);
    }
  }
  function buildOrderRows() {
    for (const item of menu) {
      const row = document.createElement('div');
      row.className = 'calc-line';
      row.dataset.product = item.id;
      const heading = document.createElement('div');
      heading.className = 'calc-line-heading';
      const name = document.createElement('span');
      name.className = 'calc-line-name';
      name.textContent = item.name;
      const price = document.createElement('span');
      price.className = 'calc-line-price';
      heading.append(name, price);
      const controls = document.createElement('div');
      controls.className = 'calc-line-controls';
      const unit = document.createElement('span');
      unit.className = 'calc-unit';
      unit.textContent = `${amount(item.price)} / ${item.unit}`;
      const stepper = document.createElement('div');
      stepper.className = 'calc-stepper';
      const input = document.createElement('input');
      Object.assign(input, { type: 'number', inputMode: 'numeric', min: '0', max: String(MAX_QUANTITY), step: '1', value: '0', className: 'calc-quantity' });
      input.setAttribute('aria-label', `${item.name}數量`);
      input.setAttribute('aria-describedby', 'calcQuantityError');
      input.addEventListener('input', () => setQuantity(item, input.value, input));
      input.addEventListener('blur', () => {
        if (input.getAttribute('aria-invalid') === 'true') {
          input.value = count(item.id);
          input.removeAttribute('aria-invalid');
          quantityError('未使用無效數量，已還原為最後有效數量。');
        }
      });
      const minus = makeButton('−', `減少${item.name}`, 'calc-step', () => setQuantity(item, count(item.id) - 1));
      const plus = makeButton('＋', `增加${item.name}`, 'calc-step', () => setQuantity(item, count(item.id) + 1));
      stepper.append(minus, input, plus);
      controls.append(unit, stepper);
      row.append(heading, controls);
      byId('calcOrderRows').append(row);
      nodes.set(item.id, { row, price, input, minus, plus });
    }
  }
  function renderOrder(activeInput = null) {
    let itemCount = 0;
    for (const item of menu) {
      const value = count(item.id);
      const entry = nodes.get(item.id);
      itemCount += value;
      if (!value && entry.row.contains(document.activeElement)) addButtons.get(item.id).focus();
      entry.row.hidden = value === 0;
      entry.price.textContent = amount(value * item.price);
      if (entry.input !== activeInput) { entry.input.value = value; entry.input.removeAttribute('aria-invalid'); }
      entry.plus.disabled = value >= MAX_QUANTITY;
      entry.minus.disabled = value === 0;
      addButtons.get(item.id).disabled = value >= MAX_QUANTITY;
    }
    byId('calcItemCount').textContent = `共 ${itemCount} 件`;
    byId('calcTotal').textContent = amount(total());
    byId('calcMobileTotal').textContent = amount(total());
    byId('calcEmpty').hidden = itemCount > 0;
    byId('calcCopy').disabled = itemCount === 0;
    byId('calcNewOrder').disabled = itemCount === 0;
  }
  function receiptText() {
    return [
      '【夜宴赤月餐廳｜點單明細】',
      ...menu.filter(item => count(item.id)).map(item => `${item.name} × ${count(item.id)} ${item.unit}（單價 ${amount(item.price)}）｜${amount(item.price * count(item.id))}`),
      `共 ${menu.reduce((sum, item) => sum + count(item.id), 0)} 件`,
      `應收總額：${amount(total())}`
    ].join('\n');
  }
  byId('calcCopy').addEventListener('click', async () => {
    const text = receiptText();
    const copiedRevision = revision;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      copyStatus(copiedRevision === revision ? '已複製點單明細。' : '訂單已變更，請再次複製最新明細。');
    } catch {
      if (copiedRevision !== revision) { copyStatus('訂單已變更，請再次複製最新明細。'); return; }
      byId('calcCopyText').value = text;
      byId('calcCopyLabel').hidden = false;
      byId('calcCopyText').hidden = false;
      byId('calcCopyText').focus();
      byId('calcCopyText').select();
      copyStatus('請複製下方明細文字。');
    }
  });
  byId('calcNewOrder').addEventListener('click', () => {
    if (!commit({})) return;
    quantityError();
    renderOrder();
    copyStatus('已開始新單。');
  });
  byId('calcJumpOrder').addEventListener('click', () => {
    const top = root.scrollTop + byId('calcReceipt').getBoundingClientRect().top - root.getBoundingClientRect().top - 16;
    root.scrollTo({ top, behavior: 'instant' });
  });
  byId('calcReloadOrder').addEventListener('click', () => { if (loadOrder(true)) renderOrder(); });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (unsaved || document.activeElement?.classList.contains('calc-quantity')) { markConflict(); return; }
    if (loadOrder(true)) renderOrder();
  });
  buildMenu();
  buildOrderRows();
  loadOrder();
  renderOrder();
})();
