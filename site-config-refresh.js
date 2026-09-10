(async()=>{
  try{
    const settings=(await fetch('/api/public/site',{cache:'no-store'}).then(response=>response.json())).settings;
    const text=(selector,value)=>{const node=document.querySelector(selector);if(node&&value!==undefined)node.textContent=value};
    text('#heroTitle',settings.heroTitle);text('#heroSub',settings.heroSub);text('#aboutText',settings.about);text('#footerIntro',settings.footer);
    const contact=document.querySelector('#contactInfo');if(contact)contact.innerHTML=`联系人：${settings.contact||''}<br>电话：${settings.phone||''}<br>地址：${settings.address||''}`;
  }catch(error){console.warn('未能刷新最新站点配置。',error)}
})();
