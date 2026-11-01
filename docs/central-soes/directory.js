(() => {
  const search = document.querySelector('#search');
  const cards = [...document.querySelectorAll('.company')];
  const sections = [...document.querySelectorAll('.industry')];
  const majors = [...document.querySelectorAll('.major-category')];
  const categories = [...document.querySelectorAll('[data-category-filter]')];
  const scopes = [...document.querySelectorAll('[data-scope-filter]')];
  let category = '', scope = '';
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if (categories.some(button => button.dataset.categoryFilter === params.get('industry'))) category = params.get('industry') || '';
  if (scopes.some(button => button.dataset.scopeFilter === params.get('scope'))) scope = params.get('scope') || '';
  // Older industry-only links still open in the matching parent category.
  if (category && !scope && !params.has('scope')) {
    const parents = majors.filter(major => [...major.querySelectorAll('.industry')].some(section => section.dataset.category === category));
    if (parents.length === 1) scope = parents[0].dataset.major;
  }

  function update() {
    const industryCounts = new Map();
    sections.forEach(section => {
      if (scope && section.closest('.major-category').dataset.major !== scope) return;
      industryCounts.set(section.dataset.category, (industryCounts.get(section.dataset.category) || 0) + section.querySelectorAll('.company').length);
    });
    if (category && !industryCounts.has(category)) category = '';
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
    majors.forEach(major => {
      const visibleSections = [...major.querySelectorAll('.industry')].filter(section => !section.hidden);
      const visibleCount = major.querySelectorAll('.company:not([hidden])').length;
      major.hidden = visibleSections.length === 0;
      major.querySelector('.major-count').textContent = `${visibleCount} 家 · ${visibleSections.length} 个小类`;
    });
    categories.forEach(button => {
      const name = button.dataset.categoryFilter;
      button.hidden = !!name && !industryCounts.has(name);
      if (name) button.querySelector('span').textContent = industryCounts.get(name) || 0;
      const active = button.dataset.categoryFilter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    scopes.forEach(button => {
      const active = button.dataset.scopeFilter === scope;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#subcategory-context').textContent = scope ? `${scope}下的行业` : '全部大类下的行业';
    document.querySelector('#results').textContent = `显示 ${count} / ${cards.length} 家企业${scope ? ' · ' + scope : ''}${category ? ' · ' + category : ' · 按大类与小类分组'}`;
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
