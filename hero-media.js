(async()=>{
  try{
    const settings=(await fetch('/api/public/site',{cache:'no-store'}).then(response=>response.json())).settings;
    const media=document.querySelector('#heroMedia');if(!media)return;
    const asset=value=>/^https?:\/\//.test(value||'')?value:`assets/${value||''}`;
    const source=asset(settings.heroMediaImage);
    if(settings.heroMediaType==='external'&&settings.heroMediaExternalUrl){if(settings.heroMediaPoster)media.style.backgroundImage=`url('${asset(settings.heroMediaPoster)}')`;const frame=window.RedDotExternalVideo?.iframe(settings.heroMediaExternalUrl,{autoplay:true,muted:true,label:'首页首屏外部视频'});if(frame){media.classList.add('has-external-video');media.replaceChildren(frame)}}
    else if(settings.heroMediaType==='video'&&settings.heroMediaImage){media.innerHTML=`<video autoplay muted loop playsinline preload="metadata" poster="${asset(settings.heroMediaPoster||'')}" aria-label="首页首屏视频"><source src="${source}"></video>`}
    else if(settings.heroMediaImage){media.style.backgroundImage=`url('${source}')`}
  }catch(error){console.warn('首页首屏媒体加载失败，将使用默认背景。',error)}
})();
