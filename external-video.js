(()=>{
  const safeUrl=value=>{
    try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)?url:null}catch{return null}
  };
  const withParams=(url,params)=>{Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));return url.toString()};
  function embedUrl(value,{autoplay=false,muted=false}={}){
    const url=safeUrl(value);if(!url)return '';
    const host=url.hostname.replace(/^www\./,'').toLowerCase(),path=decodeURIComponent(url.pathname);
    if(host==='bilibili.com'||host.endsWith('.bilibili.com')){
      if(host==='player.bilibili.com')return withParams(url,{autoplay:autoplay?'1':'0',muted:muted?'1':'0',danmaku:'0',high_quality:'1'});
      const bvid=path.match(/\/(BV[0-9A-Za-z]+)/i)?.[1],aid=path.match(/\/av(\d+)/i)?.[1],page=url.searchParams.get('p')||'1';
      if(bvid||aid){const player=new URL('https://player.bilibili.com/player.html');player.searchParams.set(bvid?'bvid':'aid',bvid||aid);player.searchParams.set('page',page);return withParams(player,{autoplay:autoplay?'1':'0',muted:muted?'1':'0',danmaku:'0',high_quality:'1'});}
    }
    if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com')){
      const id=host==='youtu.be'?path.split('/').filter(Boolean)[0]:url.searchParams.get('v')||path.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      if(id)return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=${autoplay?1:0}&mute=${muted?1:0}&playsinline=1&rel=0`;
    }
    if(host==='v.qq.com'){
      const vid=path.match(/\/([^/]+)\.html$/)?.[1];
      if(vid)return `https://v.qq.com/txp/iframe/player.html?vid=${encodeURIComponent(vid)}&auto=${autoplay?1:0}`;
    }
    if(host==='player.youku.com')return url.toString();
    if(host==='youku.com'||host.endsWith('.youku.com')){
      const id=path.match(/id_([^/.]+)/i)?.[1];if(id)return `https://player.youku.com/embed/${encodeURIComponent(id)}`;
    }
    return url.toString();
  }
  function iframe(value,{autoplay=false,muted=false,label='外部视频'}={}){
    const src=embedUrl(value,{autoplay,muted});if(!src)return null;
    const node=document.createElement('iframe');node.src=src;node.title=label;node.loading='eager';node.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';node.referrerPolicy='strict-origin-when-cross-origin';node.allowFullscreen=true;return node;
  }
  window.RedDotExternalVideo={embedUrl,iframe};
})();
