'use strict';

(() => {
  const views = ['map', 'calculator'];
  let active = 'map';
  function show(view, updateUrl = false) {
    if (!views.includes(view)) return;
    document.dispatchEvent(new CustomEvent('yeyan:beforeviewchange', { detail: { from: active, to: view } }));
    for (const name of views) {
      const selected = name === view;
      const tab = document.getElementById(`tab-${name}`);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(`${name}-panel`).hidden = !selected;
    }
    active = view;
    document.title = view === 'calculator' ? '赤月計算機｜夜宴' : '夜宴｜MochiRP 地圖';
    document.getElementById('appEdition').textContent = view === 'calculator' ? '赤月餐廳點單' : '黑幫專用地圖';
    if (updateUrl) {
      try { history.replaceState(null, '', `#${view}`); } catch { /* The tabs also work without history access. */ }
    }
    document.dispatchEvent(new CustomEvent('yeyan:viewchange', { detail: { view } }));
  }
  for (const [index, view] of views.entries()) {
    const tab = document.getElementById(`tab-${view}`);
    tab.addEventListener('click', () => show(view, true));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length;
      if (event.key === 'ArrowRight') next = (index + 1) % views.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = views.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      show(views[next], true);
      document.getElementById(`tab-${views[next]}`).focus();
    });
  }
  window.addEventListener('hashchange', () => show(location.hash === '#calculator' ? 'calculator' : 'map'));
  show(location.hash === '#calculator' ? 'calculator' : 'map');
})();
