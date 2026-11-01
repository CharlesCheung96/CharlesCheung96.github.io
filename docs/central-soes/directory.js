(() => {
  const search = document.querySelector('#search');
  const cards = [...document.querySelectorAll('.company')];
  const sections = [...document.querySelectorAll('.industry')];
  const categories = [...document.querySelectorAll('[data-category-filter]')];
  const scopes = [...document.querySelectorAll('[data-scope-filter]')];
  let category = '', scope = '';
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if (categories.some(button => button.dataset.categoryFilter === params.get('industry'))) category = params.get('industry') || '';
  if (scopes.some(button => button.dataset.scopeFilter === params.get('scope'))) scope = params.get('scope') || '';

  function update() {
    const terms = search.value.trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);
    let count = 0;
    sections.forEach(section => {
      let visible = 0;
      section.querySelectorAll('.company').forEach(card => {
        const match = (!category || section.dataset.category === category) && (!scope || card.dataset.scope === scope) && terms.every(term => card.dataset.search.includes(term));
        card.hidden = !match;
        if (match) visible++;
      });
      section.hidden = !visible;
      section.querySelector('.group-count').textContent = `${visible} 家`;
      count += visible;
    });
    categories.forEach(button => {
      const active = button.dataset.categoryFilter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    scopes.forEach(button => {
      const active = button.dataset.scopeFilter === scope;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#results').textContent = `显示 ${count} / ${cards.length} 家企业${category ? ' · ' + category : ' · 按行业分类'}`;
    document.querySelector('#empty').hidden = count !== 0;
    const next = new URLSearchParams();
    if (search.value.trim()) next.set('q', search.value.trim());
    if (category) next.set('industry', category);
    if (scope) next.set('scope', scope);
    history.replaceState(null, '', location.pathname + (next.size ? '?' + next : '') + location.hash);
  }
  categories.forEach(button => button.addEventListener('click', () => {category = button.dataset.categoryFilter; update();}));
  scopes.forEach(button => button.addEventListener('click', () => {scope = button.dataset.scopeFilter; update();}));
  search.addEventListener('input', update);
  document.querySelector('#reset').addEventListener('click', () => {category = ''; scope = ''; search.value = ''; update(); search.focus();});
  update();
})();
