(() => {
  if (window.PAGE_TYPE !== 'detail') return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function mountSubtitle() {
    try {
      const site = await fetch('/api/public/site', { cache: 'no-store' }).then(response => response.json());
      const id = new URLSearchParams(location.search).get('id');
      const solutions = site.solutions || [];
      const item = solutions.find(entry => entry.id === id) || solutions[Number(id) || 0];
      const subtitle = item?.subtitle || item?.[1] || '';
      const insert = () => {
        const heading = document.querySelector('.detail-hero h1');
        if (!heading) return requestAnimationFrame(insert);
        if (subtitle && !document.querySelector('.detail-hero-subtitle')) {
          heading.insertAdjacentHTML('afterend', `<p class="detail-hero-subtitle">${escapeHtml(subtitle)}</p>`);
        }
      };
      insert();
    } catch (error) {
      console.warn('解决方案副标题加载失败。', error);
    }
  }

  mountSubtitle();
})();
