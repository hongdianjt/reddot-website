(()=>{
  if(!document.querySelector('link[rel="icon"]')){const favicon=document.createElement('link');favicon.rel='icon';favicon.type='image/png';favicon.sizes='64x64';favicon.href='assets/reddot-favicon-64.png?v=1';document.head.append(favicon)}
  if(!document.querySelector('link[rel="apple-touch-icon"]')){const touchIcon=document.createElement('link');touchIcon.rel='apple-touch-icon';touchIcon.sizes='180x180';touchIcon.href='assets/reddot-apple-touch-icon.png?v=1';document.head.append(touchIcon)}
  const contentFormat=document.createElement('link');contentFormat.rel='stylesheet';contentFormat.href='content-format.css?v=1';document.head.append(contentFormat);
  const header=document.querySelector('.page-header');if(!header)return;
  const hero=document.querySelector('.page-hero');
  const sync=()=>header.classList.toggle('scrolled',window.scrollY>Math.max(80,(hero?.offsetHeight||0)-header.offsetHeight));
  addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync);sync();
  const button=header.querySelector('.menu-toggle'),nav=header.querySelector('nav');
  button?.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});
})();
