(function(){
  let hlsLoader;
  const loadHls=()=>{
    if(window.Hls)return Promise.resolve(window.Hls);
    if(hlsLoader)return hlsLoader;
    hlsLoader=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='assets/hls.min.js';
      script.onload=()=>resolve(window.Hls);
      script.onerror=()=>reject(new Error('HLS 播放组件加载失败'));
      document.head.append(script);
    });
    return hlsLoader;
  };
  const absolute=value=>!value?'':(/^(https?:\/\/|data:|\/)/.test(value)?value:`assets/${value}`);
  const mobile=()=>matchMedia('(max-width: 800px)').matches;
  const nativeHls=video=>Boolean(video.canPlayType('application/vnd.apple.mpegurl'));

  async function attachSource(video,options){
    if(video.dataset.sourceAttached==='true')return;
    const isMobile=mobile();
    const hasMobileSource=isMobile&&Boolean(options.mobileHlsUrl||options.mobileMp4Url);
    const hlsUrl=absolute(hasMobileSource?options.mobileHlsUrl:options.hlsUrl);
    const fallbackUrl=absolute(hasMobileSource?options.mobileMp4Url:options.mp4Url);
    video.dataset.sourceAttached='true';
    if(hlsUrl&&nativeHls(video)){
      video.src=hlsUrl;
      return;
    }
    if(hlsUrl){
      try{
        const Hls=await loadHls();
        if(Hls?.isSupported()){
          const hls=new Hls({capLevelToPlayerSize:true,startLevel:-1,maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:20});
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR,(_event,data)=>{
            if(!data.fatal)return;
            if(data.type===Hls.ErrorTypes.NETWORK_ERROR)hls.startLoad();
            else if(data.type===Hls.ErrorTypes.MEDIA_ERROR)hls.recoverMediaError();
            else{hls.destroy();if(fallbackUrl)video.src=fallbackUrl;}
          });
          video._redDotHls=hls;
          return;
        }
      }catch(error){console.warn(error)}
    }
    if(fallbackUrl)video.src=fallbackUrl;
  }

  function mount(container,options={}){
    const video=document.createElement('video');
    const prompt=options.clickToPlay?document.createElement('button'):null;
    video.playsInline=true;
    video.preload='none';
    video.controls=Boolean(options.controls);
    video.muted=Boolean(options.muted);
    video.loop=false;
    if(options.poster)video.poster=absolute(options.poster);
    if(options.label)video.setAttribute('aria-label',options.label);
    if(prompt){prompt.type='button';prompt.className='video-play-prompt';prompt.textContent='点击播放并开启声音';container.replaceChildren(video,prompt)}else container.replaceChildren(video);
    let visible=false,userPaused=false,sourceReady=false,recoveringSound=false;
    const ensureSource=async()=>{if(sourceReady)return;await attachSource(video,options);sourceReady=true;};
    const showPrompt=message=>{if(!prompt)return;prompt.textContent=message;container.classList.add('needs-play')};
    const hidePrompt=()=>container.classList.remove('needs-play');
    const play=async(userInitiated=false)=>{
      if(!visible||userPaused||!options.autoplay)return;
      await ensureSource();
      if(userInitiated){userPaused=false;video.muted=false}
      try{await video.play();if(video.muted&&options.clickToPlay&&!options.muted)showPrompt('点击开启视频声音');else hidePrompt()}
      catch(error){
        if(!video.muted&&options.autoplay){
          video.muted=true;
          try{await video.play();showPrompt('点击开启视频声音');return}catch(_fallbackError){}
        }
        showPrompt('点击播放视频')
      }
    };
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      visible=entry.isIntersecting;
      if(visible){ensureSource().then(play);}
      else if(!video.paused){video.pause();userPaused=false;}
    }),{rootMargin:options.rootMargin||'160px 0px',threshold:options.threshold??.35});
    observer.observe(container);
    video.addEventListener('ended',()=>{if(options.loop&&visible){video.currentTime=0;play()}});
    video.addEventListener('play',()=>{container.classList.remove('needs-play')});
    video.addEventListener('pause',()=>{if(recoveringSound)return;if(visible&&!video.ended&&sourceReady){userPaused=true;showPrompt('继续播放并开启声音')}});
    prompt?.addEventListener('click',async()=>{
      visible=true;
      await ensureSource();
      userPaused=false;
      recoveringSound=true;
      video.muted=false;
      try{
        await video.play();
        video.muted=false;
        hidePrompt();
      }catch(error){
        video.muted=true;
        try{await video.play();showPrompt('点击开启视频声音')}
        catch(_fallbackError){showPrompt('点击播放视频')}
      }finally{
        setTimeout(async()=>{
          if(!visible){recoveringSound=false;return}
          if(video.paused){
            video.muted=true;
            userPaused=false;
            try{await video.play();showPrompt('点击开启视频声音')}
            catch(_error){showPrompt('点击播放视频')}
          }
          recoveringSound=false;
        },700);
      }
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else{userPaused=false;play()}});
    return video;
  }

  window.RedDotStreamingVideo={mount,asset:absolute};
})();
