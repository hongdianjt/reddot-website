(function(){
  const api=(...args)=>window.RedDotAdmin.api(...args);
  const notify=(...args)=>window.RedDotAdmin.notify(...args);
  const isVideo=file=>file&&(/\.(mp4|webm|mov)$/i.test(file.name)||file.type.startsWith('video/'));
  const asset=value=>!value?'':(/^(https?:\/\/|data:|\/)/.test(value)?value:`/assets/${value}`);
  const fileNameFrom=value=>{
    const name=String(value||'').split(/[\\/]/).pop();
    try{return decodeURIComponent(name)}catch(_error){return name}
  };

  const markup=()=>`<fieldset class="hero-media-config" id="heroMediaConfig">
    <legend>首页首屏媒体</legend>
    <p>上传一次即同步用于电脑端和移动端。视频会在服务器自动生成分片，前端优先流式播放，不需要手工填写 HLS 地址。</p>
    <div class="field-grid">
      <label>媒体类型<select name="heroMediaType" id="heroMediaType"><option value="image">图片</option><option value="video">本地视频</option><option value="external">外部视频地址</option></select></label>
      <div class="full hero-media-file-row">
        <span class="field-caption">已上传文件</span>
        <div class="hero-media-file-control">
          <input name="heroMediaFileName" id="heroMediaFileName" readonly placeholder="尚未上传文件">
          <label class="hero-media-upload-button" id="heroMediaUploadButton"><span>选择并上传</span><input type="file" id="heroMediaFile"></label>
          <button class="hero-media-preview-button" id="heroMediaPreview" type="button" disabled>查看当前媒体</button>
        </div>
        <small class="hero-media-sync-note">移动端自动使用同一个文件，无需重复上传。</small>
      </div>
      <label class="full hero-external-row" hidden>外部视频地址<input type="url" name="heroMediaExternalUrl" id="heroMediaExternalUrl" placeholder="例如：https://www.bilibili.com/video/BV..."><small>支持哔哩哔哩、YouTube、腾讯视频和优酷等可嵌入地址。</small></label>
      <input type="hidden" name="heroMediaImage" id="heroMediaImage">
      <input type="hidden" name="heroMediaHlsUrl" id="heroMediaHlsUrl">
      <input type="hidden" name="heroMediaMobileImage" id="heroMediaMobileImage">
      <input type="hidden" name="heroMediaMobileHlsUrl" id="heroMediaMobileHlsUrl">
      <input type="hidden" name="heroMediaPoster" id="heroMediaPoster" value="">
    </div>
    <div class="hero-stream-state" id="heroStreamState" hidden></div>
    <div class="media-rules"><b>上传规则</b><span>图片：JPG / PNG / WEBP / GIF，最大 8MB；大图自动缩放并转为 WEBP</span><span>视频：MP4 / WEBM / MOV，最大 100MB</span></div>
    <small class="hero-upload-status" id="heroUploadStatus"></small>
  </fieldset>`;

  const valuesOf=form=>{
    const values=Object.fromEntries(new FormData(form));
    form.querySelectorAll('input[type="checkbox"]').forEach(input=>values[input.name]=input.checked);
    if(values.heroMediaType==='external'){
      values.heroMediaImage='';
      values.heroMediaHlsUrl='';
      values.heroMediaMobileImage='';
      values.heroMediaMobileHlsUrl='';
      values.heroMediaFileName='';
    }else{
      values.heroMediaExternalUrl='';
      values.heroMediaMobileImage=values.heroMediaImage||'';
      values.heroMediaMobileHlsUrl=values.heroMediaHlsUrl||'';
    }
    values.heroMediaPoster='';
    return values;
  };

  async function save(form,status,successMessage='首页配置已保存，官网刷新后立即生效'){
    const values=valuesOf(form);
    if(values.heroMediaType!=='external'&&!values.heroMediaImage){
      const message='请先选择并上传图片或视频';
      status.textContent=message;
      status.className='hero-upload-status error';
      notify(message,'error');
      return false;
    }
    if(values.heroMediaType==='external'&&!values.heroMediaExternalUrl){
      const message='请填写外部视频地址';
      status.textContent=message;
      status.className='hero-upload-status error';
      notify(message,'error');
      return false;
    }
    status.textContent='正在保存首页配置…';
    status.className='hero-upload-status';
    try{
      const saved=await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(values)});
      window.RedDotAdmin.updateSettings(saved);
      status.textContent=successMessage;
      status.className='hero-upload-status success';
      notify('保存成功：首页媒体已发布');
      return true;
    }catch(error){
      const message=error.message||'保存失败，请稍后重试';
      status.textContent=message;
      status.className='hero-upload-status error';
      notify(`保存失败：${message}`,'error');
      return false;
    }
  }

  function openPreview(type,mediaUrl,externalUrl,fileName){
    if(type==='external'){
      if(externalUrl)window.open(externalUrl,'_blank','noopener,noreferrer');
      return;
    }
    if(!mediaUrl)return;
    const modal=document.createElement('div');
    modal.className='hero-preview-modal';
    const source=asset(mediaUrl);
    const safeName=String(fileName||fileNameFrom(mediaUrl)).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    modal.innerHTML=`<div class="hero-preview-mask" data-preview-close></div><section class="hero-preview-dialog"><header><div><b>媒体预览</b><span>${safeName}</span></div><button type="button" data-preview-close aria-label="关闭预览">×</button></header><div class="hero-preview-content">${type==='video'?`<video src="${source}" controls autoplay playsinline></video>`:`<img src="${source}" alt="首页媒体预览">`}</div></section>`;
    document.body.append(modal);
    const close=()=>{modal.querySelector('video')?.pause();modal.remove();document.removeEventListener('keydown',onKey)};
    const onKey=event=>{if(event.key==='Escape')close()};
    modal.querySelectorAll('[data-preview-close]').forEach(node=>node.onclick=close);
    document.addEventListener('keydown',onKey);
    modal.querySelector('video')?.play().catch(()=>{});
  }

  async function upload(file,form,fields){
    if(!file)return;
    const video=isVideo(file),max=video?100:8;
    if(file.size>max*1024*1024){
      fields.status.textContent=`${video?'视频':'图片'}不能超过 ${max}MB`;
      fields.status.className='hero-upload-status error';
      return;
    }
    fields.type.value=video?'video':'image';
    fields.refresh();
    fields.fileName.value=file.name;
    fields.uploadButton.classList.add('uploading');
    fields.uploadButton.querySelector('span').textContent=video?'正在上传并生成分片…':'正在上传图片…';
    fields.file.disabled=true;
    fields.status.textContent=video?'正在上传并生成流式分片，请勿关闭页面…':'正在上传图片…';
    fields.status.className='hero-upload-status';
    try{
      const optimized=video?null:await window.RedDotImageOptimizer.optimize(file);
      const uploadFile=optimized?.file||file,body=new FormData();
      body.append('file',uploadFile,uploadFile.name);
      const result=await api('/api/admin/upload-file',{method:'POST',body});
      fields.media.value=result.url||'';
      fields.hls.value=video?(result.hlsUrl||''):'';
      fields.mobile.value=result.url||'';
      fields.mobileHls.value=video?(result.hlsUrl||''):'';
      fields.fileName.value=video?(result.originalName||file.name):file.name;
      fields.external.value='';
      fields.poster.value='';
      fields.preview.disabled=!result.url;
      fields.streamState.hidden=!video;
      fields.streamState.textContent=video?(result.segmented?'已生成流式分片，电脑端和移动端将自动使用。':'分片未生成，已自动改用原视频播放。') : '';
      const imageMessage=optimized?`图片上传并发布成功，${window.RedDotImageOptimizer.message(optimized)}`:'图片上传并发布成功';
      const saved=await save(form,fields.status,result.message||(video?'视频上传并发布成功':imageMessage));
      if(saved&&video&&result.segmented===false)fields.status.className='hero-upload-status warning';
    }catch(error){
      fields.status.textContent=error.message||'上传失败';
      fields.status.className='hero-upload-status error';
      notify(`上传失败：${fields.status.textContent}`,'error');
    }finally{
      fields.file.disabled=false;
      fields.uploadButton.classList.remove('uploading');
      fields.uploadButton.querySelector('span').textContent='选择并上传';
      fields.file.value='';
    }
  }

  async function mount(){
    const form=document.querySelector('#settingsForm');
    if(!form||document.querySelector('#heroMediaConfig'))return;
    form.insertAdjacentHTML('afterbegin',markup());
    const box=document.querySelector('#heroMediaConfig');
    const fields={
      type:box.querySelector('#heroMediaType'),file:box.querySelector('#heroMediaFile'),fileName:box.querySelector('#heroMediaFileName'),
      uploadButton:box.querySelector('#heroMediaUploadButton'),preview:box.querySelector('#heroMediaPreview'),media:box.querySelector('#heroMediaImage'),
      hls:box.querySelector('#heroMediaHlsUrl'),mobile:box.querySelector('#heroMediaMobileImage'),mobileHls:box.querySelector('#heroMediaMobileHlsUrl'),
      external:box.querySelector('#heroMediaExternalUrl'),poster:box.querySelector('#heroMediaPoster'),status:box.querySelector('#heroUploadStatus'),
      streamState:box.querySelector('#heroStreamState')
    };
    fields.refresh=()=>{
      const externalType=fields.type.value==='external',videoType=fields.type.value==='video';
      fields.file.accept=videoType?'.mp4,.webm,.mov,video/*':'.jpg,.jpeg,.png,.webp,.gif,image/*';
      box.querySelector('.hero-media-file-row').hidden=externalType;
      box.querySelector('.hero-external-row').hidden=!externalType;
      fields.preview.textContent=externalType?'打开视频地址':'查看当前媒体';
      fields.preview.disabled=externalType?!fields.external.value:!fields.media.value;
      fields.streamState.hidden=!videoType||!fields.media.value;
      if(videoType&&fields.media.value)fields.streamState.textContent=fields.hls.value?'已生成流式分片，电脑端和移动端将自动使用。':'当前使用原视频播放。';
    };
    fields.type.onchange=fields.refresh;
    fields.external.oninput=fields.refresh;
    fields.file.onchange=()=>upload(fields.file.files[0],form,fields);
    fields.preview.onclick=()=>openPreview(fields.type.value,fields.media.value,fields.external.value,fields.fileName.value);
    form.onsubmit=event=>{event.preventDefault();save(form,fields.status)};
    try{
      const site=await api('/api/admin/site'),s=site.settings;
      fields.type.value=s.heroMediaType||'image';
      fields.media.value=s.heroMediaImage||'';
      fields.hls.value=s.heroMediaHlsUrl||'';
      fields.mobile.value=s.heroMediaImage||'';
      fields.mobileHls.value=s.heroMediaHlsUrl||'';
      fields.external.value=s.heroMediaExternalUrl||'';
      fields.poster.value='';
      fields.fileName.value=s.heroMediaFileName||fileNameFrom(s.heroMediaImage)||'';
      fields.refresh();
    }catch(error){
      fields.status.textContent=error.message||'媒体配置加载失败';
      fields.status.className='hero-upload-status error';
    }
  }

  const observer=new MutationObserver(()=>mount());
  observer.observe(document.body,{childList:true,subtree:true});
  mount();
})();
