(()=>{
  const contentFormat=document.createElement('link');contentFormat.rel='stylesheet';contentFormat.href='content-format.css?v=1';document.head.append(contentFormat);
  const header=document.querySelector('.page-header');if(!header)return;
  const hero=document.querySelector('.page-hero');
  const sync=()=>header.classList.toggle('scrolled',window.scrollY>Math.max(80,(hero?.offsetHeight||0)-header.offsetHeight));
  addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync);sync();
  const button=header.querySelector('.menu-toggle'),nav=header.querySelector('nav');
  button?.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});
})();
