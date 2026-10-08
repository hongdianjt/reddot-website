(async()=>{
  const d=await fetch('/api/public/site',{cache:'no-store'}).then(response=>response.json());
  const list=document.querySelector('#list');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const img=value=>/^(https?:|data:|\/)/i.test(value||'')?value:`assets/${value||''}`;
  const param=new URLSearchParams(location.search).get('id');
  const pick=items=>items.find(item=>item.id===param)||(/^\d+$/.test(param||'')?items[Number(param)]:null);
  const notFound=label=>`<section class="inner-banner page-hero"><div class="container"><p class="eyebrow">CONTENT NOT FOUND</p><h1>${label}不存在</h1><p>该内容可能已删除或链接已失效。</p></div></section><section class="section"><div class="container"><a class="text-link" href="${PAGE_TYPE==='detail'?'solutions.html':'news.html'}">返回${label}列表 →</a></div></section>`;
  const newestFirst=(a,b)=>Number(Boolean(b.publishedAt))-Number(Boolean(a.publishedAt))||String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))||String(b.date||'').localeCompare(String(a.date||''));
  const lazyBackgrounds=root=>{
    const items=[...root.querySelectorAll('[data-bg]')];
    const load=item=>{item.style.backgroundImage=`url("${item.dataset.bg.replace(/"/g,'%22')}")`;item.removeAttribute('data-bg')};
    if(!('IntersectionObserver'in window)){items.forEach(load);return}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){load(entry.target);observer.unobserve(entry.target)}}),{rootMargin:'500px 0px'});
    items.forEach(item=>observer.observe(item));
  };

  if(PAGE_TYPE==='solutions'){
    list.innerHTML=d.solutions.filter(item=>item.enabled!==false).sort(newestFirst).map((item,index)=>`<a class="solution" href="solution.html?id=${encodeURIComponent(item.id||index)}" data-bg="${esc(img(item.image||item[2]))}"><div><h3>${esc(item.title||item[0])}</h3><p>${esc(item.subtitle||item[1])}</p></div></a>`).join('');
    lazyBackgrounds(list);
  }
  if(PAGE_TYPE==='brands')list.innerHTML=d.brands.filter(item=>item.enabled!==false).map(item=>`<div class="brand-card">${esc(item.code||item[1])}<small>${esc(item.name||item[0])}</small></div>`).join('');
  if(PAGE_TYPE==='news'){
    list.innerHTML=d.news.filter(item=>item.enabled!==false).sort(newestFirst).map((item,index)=>`<a class="listing-card" href="news-detail.html?id=${encodeURIComponent(item.id||index)}"><div class="image" data-bg="${esc(img(item.image||item[3]))}"></div><div><small>${esc(item.category||item[0])} · ${esc(item.date||item[2])}</small><h2>${esc(item.title||item[1])}</h2><p>${esc(item.subtitle||'关注红点创芯在汽车芯片国产化与工程交付领域的最新动态。')}</p></div></a>`).join('');
    lazyBackgrounds(list);
  }
  if(PAGE_TYPE==='detail'){
    const item=pick(d.solutions);
    if(!item){document.querySelector('#detail').innerHTML=notFound('解决方案');return}
    document.querySelector('#detail').innerHTML=`<section class="detail-hero page-hero" aria-label="${esc(item.title||item[0])}" style="background-image:url('${img(item.image||item[2])}')"></section><article class="detail-body"><h1 class="detail-content-title">${esc(item.title||item[0])}</h1><div>${item.content||'<p>方案详情正在完善中。</p>'}</div></article>`;
  }
  if(PAGE_TYPE==='news-detail'){
    const item=pick(d.news);
    if(!item){document.querySelector('#detail').innerHTML=notFound('新闻资讯');return}
    document.querySelector('#detail').innerHTML=`<section class="detail-hero page-hero" style="background-image:url('${img(item.image||item[3])}')"><div class="container"><p class="eyebrow">${esc(item.category||item[0])}</p><h1>${esc(item.title||item[1])}</h1></div></section><article class="detail-body"><p>${esc(item.date||item[2])}</p><div>${item.content||`<p>${esc(item.subtitle||'')}</p>`}</div></article>`;
  }
})();
