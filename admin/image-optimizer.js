(function(){
  const readAsDataUrl=file=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error||new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
  const loadImage=src=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('图片格式无法识别'));
    image.src=src;
  });
  const canvasBlob=(canvas,type,quality)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  const formatBytes=size=>size>=1024*1024?`${(size/1024/1024).toFixed(1)}MB`:`${Math.max(1,Math.round(size/1024))}KB`;
  const optimizedName=name=>`${String(name||'image').replace(/\.[^.]+$/,'')}.webp`;

  async function optimize(file,{maxSide=1600,quality=.82,threshold=500*1024}={}){
    if(!file||!String(file.type||'').startsWith('image/'))throw new Error('请选择图片文件');
    const originalData=await readAsDataUrl(file);
    if(file.type==='image/gif')return {file,dataUrl:originalData,optimized:false,originalSize:file.size,optimizedSize:file.size};
    const source=await loadImage(originalData),longSide=Math.max(source.naturalWidth,source.naturalHeight);
    if(file.size<=threshold&&longSide<=maxSide)return {file,dataUrl:originalData,optimized:false,originalSize:file.size,optimizedSize:file.size,width:source.naturalWidth,height:source.naturalHeight};
    const scale=Math.min(1,maxSide/longSide),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(source.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(source.naturalHeight*scale));
    const context=canvas.getContext('2d',{alpha:true});
    context.imageSmoothingEnabled=true;
    context.imageSmoothingQuality='high';
    context.drawImage(source,0,0,canvas.width,canvas.height);
    const blob=await canvasBlob(canvas,'image/webp',quality);
    if(!blob||blob.size>=file.size)return {file,dataUrl:originalData,optimized:false,originalSize:file.size,optimizedSize:file.size,width:source.naturalWidth,height:source.naturalHeight};
    const output=new File([blob],optimizedName(file.name),{type:'image/webp',lastModified:Date.now()});
    return {file:output,dataUrl:await readAsDataUrl(output),optimized:true,originalSize:file.size,optimizedSize:output.size,width:canvas.width,height:canvas.height};
  }

  const message=result=>result.optimized?`图片已优化：${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)}`:`图片无需压缩（${formatBytes(result.originalSize)}）`;
  window.RedDotImageOptimizer={optimize,readAsDataUrl,formatBytes,message};
})();
