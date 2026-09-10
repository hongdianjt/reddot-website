(async()=>{
  const $=selector=>document.querySelector(selector);
  if(!$('#homeChinaMap')||!window.echarts)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const companyName=company=>company?.name||company?.[0]||'';
  const companyType=company=>company?.type||company?.[1]||'';
  let data, map, filter='all', query='', selected='', hovered='';
  try{data=await fetch('/api/public/site',{cache:'no-store'}).then(response=>response.json())}catch(error){return}
  const distribution=Array.isArray(data.distribution)?data.distribution:[];
  const available=()=>distribution.filter(city=>city.enabled!==false&&Number.isFinite(Number(city.longitude))&&Number.isFinite(Number(city.latitude)));
  const cities=()=>available().filter(city=>!query||`${city.name}${(city.companies||[]).map(companyName).join('')}`.includes(query)).filter(city=>filter==='all'||(city.companies||[]).some(company=>companyType(company).includes(filter)));
  const getCity=id=>distribution.find(city=>city.id===id);
  const showPopover=city=>{const popover=$('#homeMapPopover');if(!city){popover.hidden=true;return}popover.hidden=false;popover.innerHTML=`<h3>${hovered?'悬浮查看 · ':''}${esc(city.name)} · ${(city.companies||[]).length} 家公司</h3><ul>${(city.companies||[]).map(company=>`<li>${esc(companyName(company))}｜${esc(companyType(company))}</li>`).join('')}</ul>`};
  const points=items=>items.map(city=>({name:city.name,value:[Number(city.longitude),Number(city.latitude),(city.companies||[]).length],city}));
  const render=()=>{
    const items=cities();if(!items.some(city=>city.id===selected))selected=items[0]?.id||'';
    $('#homeCityList').innerHTML=items.map(city=>`<button class="home-city-card ${city.id===selected?'active':''}" data-city-card="${esc(city.id)}"><header><span>${esc(city.name)}${city.level==='province'?'（省级）':''}</span><b>${(city.companies||[]).length}</b></header><p>${(city.companies||[]).map(company=>esc(companyName(company))).join('<br>')}</p></button>`).join('')||'<p>未找到匹配城市</p>';
    $('#homeCityCount').textContent=`显示 ${items.length} / 共 ${available().length} 个城市`;
    const selectedCity=getCity(selected), currentCity=getCity(hovered||selected);showPopover(currentCity);
    map.setOption({series:[{type:'map',map:'home-china',silent:true,roam:true,label:{show:false},selectedMode:'single',itemStyle:{areaColor:'#f1f3f5',borderColor:'#cfd4da',borderWidth:1},emphasis:{itemStyle:{areaColor:'#ffe1e4'}},regions:selectedCity?.province?[{name:selectedCity.province,itemStyle:{areaColor:'#e50012',borderColor:'#bd0010',borderWidth:1.2}}]:[],select:{itemStyle:{areaColor:'#e50012',borderColor:'#bd0010',borderWidth:1.2}}},{type:'effectScatter',coordinateSystem:'geo',data:points(items),symbolSize:value=>18+Math.min(value[2]*3,12),showEffectOn:'render',rippleEffect:{scale:3,brushType:'stroke'},itemStyle:{color:'#e50012',shadowBlur:12,shadowColor:'#e50012aa'},label:{show:true,formatter:param=>`${param.data.city.name}  ${param.value[2]}`,position:'right',color:'#282b30',fontWeight:700,fontSize:12,backgroundColor:'#ffffffdc',padding:[5,7],borderRadius:12}}]},{notMerge:true});
    if(selectedCity?.province)map.dispatchAction({type:'select',seriesIndex:0,name:selectedCity.province});
    document.querySelectorAll('[data-city-card]').forEach(card=>card.onclick=()=>{selected=card.dataset.cityCard;hovered='';render()});
  };
  try{const geo=await fetch('assets/china.json').then(response=>response.json());echarts.registerMap('home-china',geo);map=echarts.init($('#homeChinaMap'))}catch(error){return}
  map.on('mouseover',event=>{if(!event.data?.city)return;hovered=event.data.city.id;showPopover(event.data.city)});map.on('mouseout',event=>{if(!event.data?.city)return;hovered='';showPopover(getCity(selected))});map.on('click',event=>{if(!event.data?.city)return;selected=event.data.city.id;hovered='';render()});
  $('#homeCitySearch').oninput=event=>{query=event.target.value.trim();render()};$('#homeFilters').onclick=event=>{const next=event.target.dataset.filter;if(!next)return;filter=next;document.querySelectorAll('#homeFilters [data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===filter));render()};addEventListener('resize',()=>map.resize());render();
})();
