(()=>{
  const token=()=>sessionStorage.getItem('reddot-admin-token');
  const decorate=root=>root.querySelectorAll('.rich-tools:not([data-image-ready])').forEach(toolbar=>{
    toolbar.dataset.imageReady='true';
    const button=document.createElement('button');
    button.type='button';button.dataset.insertImage='true';button.textContent='插入图片';
    toolbar.append(button);
  });
  const upload=async file=>{
    if(!file.type.startsWith('image/'))throw Error('请选择图片文件');
    if(file.size>8*1024*1024)throw Error('图片不能超过 8MB');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
    const response=await fetch('/api/admin/upload',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token()},body:JSON.stringify({data})});
    const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.message||'图片上传失败');return `/assets/${body.url}`;
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-insert-image]');if(!button)return;
    const editor=button.closest('.rich-field, label')?.querySelector('.rich-editor');if(!editor)return;
    const selection=window.getSelection();let range=null;
    if(selection?.rangeCount)range=selection.getRangeAt(0).cloneRange();
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;document.body.append(input);
    input.onchange=async()=>{if(!input.files[0]){input.remove();return}try{const src=await upload(input.files[0]);const image=document.createElement('img');image.src=src;image.alt='正文图片';image.loading='lazy';if(range){range.insertNode(image);range.setStartAfter(image);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}else editor.append(image);editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertImage'}));}catch(error){alert(error.message)}finally{input.remove()}};
    input.click();
  });
  decorate(document);new MutationObserver(()=>decorate(document)).observe(document.body,{childList:true,subtree:true});
})();
