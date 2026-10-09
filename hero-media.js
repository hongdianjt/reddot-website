(async()=>{
  try{
    const settings=(await fetch('/api/public/site',{cache:'no-store'}).then(response=>response.json())).settings;
    const media=document.querySelector('#heroMedia');if(!media)return;
    const asset=value=>/^(https?:\/\/|data:|\/)/.test(value||'')?value:`assets/${value||''}`;
    const afterPageLoad=()=>new Promise(resolve=>{const ready=()=>setTimeout(resolve,350);if(document.readyState==='complete')ready();else addEventListener('load',ready,{once:true})});
    const source=asset(settings.heroMediaImage);
    if(settings.heroMediaType==='external'&&settings.heroMediaExternalUrl){const frame=window.RedDotExternalVideo?.iframe(settings.heroMediaExternalUrl,{autoplay:true,muted:true,label:'首页首屏外部视频'});if(frame){media.classList.add('has-external-video');media.replaceChildren(frame)}}
    else if(settings.heroMediaType==='video'&&(settings.heroMediaImage||settings.heroMediaHlsUrl)){await afterPageLoad();window.RedDotStreamingVideo?.mount(media,{hlsUrl:settings.heroMediaHlsUrl,mp4Url:settings.heroMediaImage,mobileHlsUrl:settings.heroMediaHlsUrl,mobileMp4Url:settings.heroMediaImage,autoplay:true,muted:true,loop:true,threshold:.2,rootMargin:'240px 0px',label:'首页首屏视频'})}
    else if(settings.heroMediaType==='image'&&settings.heroMediaImage){media.style.backgroundImage=`url('${source}')`}
    else{media.style.backgroundImage="url('assets/home-hero-vehicle-system-v3.jpg')"}
  }catch(error){const media=document.querySelector('#heroMedia');if(media)media.style.backgroundImage="url('assets/home-hero-vehicle-system-v3.jpg')";console.warn('首页首屏媒体加载失败，将使用默认背景。',error)}
})();
