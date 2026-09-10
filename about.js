(async()=>{
  const d=await fetch('/api/public/site').then(r=>r.json()),s=d.settings,$=q=>document.querySelector(q);
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mediaUrl=value=>/^(https?:)?\/\//.test(value||'')?value:`assets/${value||''}`;
  $('#bannerTitle').textContent=s.aboutBannerTitle; $('#bannerSub').textContent=s.aboutBannerSub;
  $('#aboutHero').style.backgroundImage=`linear-gradient(90deg,#101216eb,#1012165d),url('${mediaUrl(s.aboutBannerImage)}')`;
  $('#introTitle').textContent=s.aboutIntroTitle;
  $('#introText').innerHTML=s.about.split(/\n\s*\n+/).filter(Boolean).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join('');
  const aboutMedia=$('#aboutMedia'),sharedMediaType=s.homeAboutMediaType||s.aboutMediaType,sharedMediaImage=s.homeAboutMediaImage||s.aboutMediaImage,sharedMediaPoster=s.homeAboutMediaPoster||s.aboutMediaPoster||sharedMediaImage;
  if(sharedMediaType==='video'&&sharedMediaImage) aboutMedia.innerHTML=`<video controls playsinline preload="metadata" poster="${esc(mediaUrl(sharedMediaPoster))}"><source src="${esc(mediaUrl(sharedMediaImage))}">当前浏览器不支持视频播放。</video>`;
  else aboutMedia.style.backgroundImage=`url('${mediaUrl(sharedMediaImage)}')`;
  $('#footerIntro').textContent=s.footer;
  $('#contactInfo').innerHTML=`联系人：${esc(s.contact)}<br>电话：${esc(s.phone)}<br>地址：${esc(s.address)}`;


  let filter='all',query='',selected='hangzhou',hovered=null,map;
  const companyName=company=>company.name||company[0],companyType=company=>company.type||company[1];
  function cities(){return d.distribution.filter(city=>city.enabled!==false&&Number.isFinite(Number(city.longitude))&&Number.isFinite(Number(city.latitude))).filter(city=>!query||(`${city.name}${city.companies.map(companyName).join('')}`).includes(query)).filter(city=>filter==='all'||city.companies.some(company=>companyType(company).includes(filter)))}
  function showPopover(city){const pop=$('#mapPopover');if(!city){pop.hidden=true;return}pop.hidden=false;pop.innerHTML=`<h3>${hovered?'悬浮查看 · ':''}${esc(city.name)} · ${city.companies.length} 家公司</h3><ul>${city.companies.map(company=>`<li>${esc(companyName(company))}｜${esc(companyType(company))}</li>`).join('')}</ul>`}
  function mapPoints(items){return items.map(city=>({name:city.name,value:[city.longitude,city.latitude,city.companies.length],city}))}
  function renderMap(){const items=cities();if(!items.some(city=>city.id===selected))selected=items[0]?.id||'';$('#cityList').innerHTML=items.map(city=>`<button class="city-card ${city.id===selected?'active':''}" data-city-card="${city.id}"><header><span>${esc(city.name)}${city.level==='province'?'（省级）':''}</span><b>${city.companies.length}</b></header><p>${city.companies.map(company=>esc(companyName(company))).join('<br>')}</p></button>`).join('')||'<p>未找到匹配城市</p>';$('#cityCount').textContent=`显示 ${items.length} / 共 ${d.distribution.filter(city=>city.enabled!==false).length} 个城市`;
    const selectedCity=d.distribution.find(city=>city.id===selected),current=d.distribution.find(city=>city.id===(hovered||selected));showPopover(current);
    map.setOption({series:[{type:'map',map:'china',silent:true,roam:true,label:{show:false},selectedMode:'single',itemStyle:{areaColor:'#f1f3f5',borderColor:'#cfd4da',borderWidth:1},emphasis:{itemStyle:{areaColor:'#ffe1e4'}},regions:selectedCity?.province?[{name:selectedCity.province,itemStyle:{areaColor:'#e50012',borderColor:'#bd0010',borderWidth:1.2}}]:[],select:{itemStyle:{areaColor:'#e50012',borderColor:'#bd0010',borderWidth:1.2}}},{type:'effectScatter',coordinateSystem:'geo',data:mapPoints(items),symbolSize:value=>18+Math.min(value[2]*3,12),showEffectOn:'render',rippleEffect:{scale:3,brushType:'stroke'},itemStyle:{color:'#e50012',shadowBlur:12,shadowColor:'#e50012aa'},label:{show:true,formatter:param=>`${param.data.city.name}  ${param.value[2]}`,position:'right',color:'#282b30',fontWeight:700,fontSize:12,backgroundColor:'#ffffffdc',padding:[5,7],borderRadius:12}}]},{notMerge:true});if(selectedCity?.province)map.dispatchAction({type:'select',seriesIndex:0,name:selectedCity.province});
    document.querySelectorAll('[data-city-card]').forEach(card=>card.onclick=()=>{selected=card.dataset.cityCard;hovered=null;renderMap()});
  }
  const geo=await fetch('assets/china.json').then(r=>r.json());echarts.registerMap('china',geo);map=echarts.init($('#chinaMap'));map.on('mouseover',event=>{if(!event.data?.city)return;hovered=event.data.city.id;showPopover(event.data.city)});map.on('mouseout',event=>{if(!event.data?.city)return;hovered=null;showPopover(d.distribution.find(city=>city.id===selected))});map.on('click',event=>{if(!event.data?.city)return;selected=event.data.city.id;hovered=null;renderMap()});
  $('#citySearch').oninput=e=>{query=e.target.value;renderMap()};$('#filters').onclick=e=>{if(!e.target.dataset.filter)return;filter=e.target.dataset.filter;document.querySelectorAll('[data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===filter));renderMap()};addEventListener('resize',()=>map.resize());renderMap();
})();
