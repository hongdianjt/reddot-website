import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';

const root=path.dirname(fileURLToPath(import.meta.url));
function loadEnvironment(file){
  if(!fs.existsSync(file))return;
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(!match||process.env[match[1]]!==undefined)continue;
    process.env[match[1]]=match[2].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/,'$1$2');
  }
}
loadEnvironment(path.join(root,'.env'));
const dbPath=path.join(root,'data','site.json');
const app=express();
const sessions=new Map();
const sessionDuration=8*60*60*1000;
const loginWindow=15*60*1000;
const maxLoginAttempts=5;
const loginAttempts=new Map();
const adminUsername=process.env.ADMIN_USERNAME;
const adminPasswordHash=process.env.ADMIN_PASSWORD_HASH;
if(!adminUsername||!adminPasswordHash)throw Error('缺少 ADMIN_USERNAME 或 ADMIN_PASSWORD_HASH，请在 .env 或服务器环境变量中配置后台凭据。');
const uploadDir=path.join(root,'assets','uploads');
const mediaTypes={
  images:['image/jpeg','image/png','image/webp','image/gif'],
  videos:['video/mp4','video/webm','video/quicktime']
};
const mediaExtensions=/\.(jpe?g|png|webp|gif|mp4|webm|mov)$/i;
const upload=multer({
  storage:multer.diskStorage({destination:(req,file,done)=>{fs.mkdirSync(uploadDir,{recursive:true});done(null,uploadDir)},filename:(req,file,done)=>{const ext=path.extname(file.originalname).toLowerCase()||'.bin';done(null,`upload-${Date.now()}-${crypto.randomUUID().slice(0,8)}${ext}`)}}),
  limits:{fileSize:100*1024*1024},
  fileFilter:(req,file,done)=>done(null,[...mediaTypes.images,...mediaTypes.videos].includes(file.mimetype)||mediaExtensions.test(file.originalname))
});
const defaults={settings:{heroTitle:'让国产车规芯片，稳定走向量产',heroSub:'红点创芯面向汽车电子产业，提供国产车规芯片选型、应用方案设计、软件适配、测试验证与供应链协同服务，帮助客户降低开发风险，推动芯片从选型导入到稳定量产。',about:'红点创芯总部位于杭州，专注于汽车芯片国产化与车规级产业链能力建设。公司围绕客户项目真实需求，协同芯片选型、应用设计、基础软件、测试验证和供应链交付资源，为整车企业、Tier 1、汽车零部件企业及产业合作伙伴提供覆盖项目全周期的技术与交付支持。',footer:'红点创芯专注于汽车芯片国产化与车规级产业链能力建设，为客户提供从芯片选型、应用方案、软件适配、测试验证到供应链交付的协同服务。',phone:'19016956183',contact:'尉丽',address:'浙江省杭州市萧山区盈丰街道欧镁创新城3幢905室'},capabilities:[['01','国产化选型','结合应用场景、性能指标、车规要求和供应保障需求开展评估。'],['02','方案设计','提供软硬件协同的应用方案与工程支持。'],['03','软件适配','覆盖 AUTOSAR、基础软件、集成配置与驱动适配。'],['04','测试验证','通过适配、调试与验证支持尽早识别项目风险。'],['05','供应链交付','协同样品、供货节奏与量产交付过程。']],solutions:[['国产车规芯片导入','从需求评估到量产供货，降低国产化导入风险。','hero-chip-city.png'],['整车热管理','面向压缩机、水泵、风扇等热管理控制场景。','hero-vehicle-network.png'],['汽车照明','围绕 LED 驱动、控制与智能照明方案展开。','hero-data-matrix.png'],['新能源汽车电源','聚焦电源管理、功率控制与系统适配。','hero-wafer-portal.png'],['智能底盘控制','提供底盘控制器相关芯片与工程协同能力。','hero-vehicle-network.png'],['AUTOSAR 基础软件','咨询、设计、集成、测试验证与工具链支持。','hero-data-matrix.png']],platforms:[['安徽兮有芯科技有限公司','前端销售平台','客户需求与项目推进'],['浙江红点智芯科技有限公司','前端销售平台','国产芯片导入与供应协同'],['浙江红点传动科技有限公司','前端销售平台','市场拓展与交付支持'],['杭州红点创芯软件技术有限公司','AUTOSAR 软件平台','基础软件与集成适配'],['华峻科技（北京）有限公司','方案解决平台','系统方案与工程验证']],brands:[['车规 MCU','MCU'],['功率器件','POWER'],['传感器','SENSOR'],['模拟芯片','ANALOG'],['连接与通信','CONNECT'],['软件工具链','TOOLS']],news:[['公司动态','红点创芯与生态伙伴共建车规芯片供应协同能力','2026-08-20','hero-wafer-portal.png'],['技术洞察','国产 MCU 在热管理控制器中的应用与挑战','2026-08-10','hero-chip-city.png'],['行业资讯','汽车芯片国产化进程持续加速','2026-08-01','hero-data-matrix.png']],culture:[['企业使命','助力客户用中国芯做世界级好车。'],['企业愿景','成为中国领先的汽车芯片国产化解决方案平台。'],['企业价值观','为科技赋能，为创新赋能，为产业赋能。'],['企业服务','红点创芯面向汽车电子产业，提供国产车规芯片选型、应用方案设计、软件适配、测试验证及供应链协同服务，帮助客户降低开发风险，推动芯片从选型导入到稳定量产。']]};
const slug=(prefix,index)=>`${prefix}-${index+1}`;
const companyDescriptions={
  '浙江红点创芯科技发展有限公司':'集团中台，统筹汽车芯片国产化解决方案与量产资源协同。',
  '安徽兮有芯科技有限公司':'前端销售平台，连接客户需求与项目推进。',
  '浙江红点智芯科技有限公司':'前端销售平台，支持国产芯片导入与供应协同。',
  '浙江红点传动科技有限公司':'前端销售平台，提供市场拓展与交付支持。',
  '杭州红点创芯软件技术有限公司':'AUTOSAR 软件平台，提供基础软件与集成适配支持。',
  '华峻科技（北京）有限公司':'解决方案平台，提供系统方案与工程验证支持。'
};
const processCapabilities=[
  ['01','需求与项目定义','明确应用场景、功能边界、性能、安全、成本和周期目标。','项目立项 · 需求澄清 · 风险识别'],
  ['02','方案设计与选型','完成系统架构、器件选型及国产化替代方案的综合评估。','系统方案 · 芯片选型 · 技术评审'],
  ['03','软硬件协同开发','同步推进硬件设计、基础软件、驱动适配与应用功能开发。','硬件 · AUTOSAR · MCAL/CDD'],
  ['04','集成与测试验证','开展模块、系统及整车级联调，验证功能、可靠性与安全机制。','集成调试 · DV验证 · PV验证'],
  ['05','工程化与试生产','完成样件迭代、工艺验证、质量控制及小批量试生产。','量产准备 · 工艺验证 · PPAP'],
  ['06','量产交付与持续支持','保障供应、质量与版本一致性，持续支持量产问题与产品迭代。','SOP · 供应保障 · 生命周期服务']
];
function normalizeContent(data){
  const asObject=(value,fields,prefix)=>Array.isArray(value)?value.map((item,index)=>Array.isArray(item)?Object.fromEntries([['id',slug(prefix,index)],...fields.map((field,i)=>[field,item[i]??''])]):{id:item.id||slug(prefix,index),...item}):[];
  return {...data,capabilities:Array.isArray(data.capabilities)&&data.capabilities[0]?.[1]==='需求与项目定义'?data.capabilities:processCapabilities,
    solutions:asObject(data.solutions,['title','subtitle','image'],'solution').map(item=>({content:'',layout:'图文卡片',enabled:true,...item})),
    news:asObject(data.news,['category','title','date','image'],'news').map(item=>({subtitle:'',content:'',layout:'左图右文',enabled:true,...item})),
    brands:asObject(data.brands,['name','code'],'brand').map(item=>({subtitle:'',image:'',content:'',layout:'品牌卡片',enabled:true,...item})),
    platforms:asObject(data.platforms,['name','type','comment'],'platform').map(item=>({attribute:'子公司',city:'',province:'',enabled:true,...item})),
  };
}
function normalizeDistribution(data){
  return (data.distribution||[]).map(city=>({...city,companies:(city.companies||[]).map((company,index)=>Array.isArray(company)?{id:`${city.id}-company-${index+1}`,name:company[0],type:company[1],attribute:company[1]==='集团中台'?'集团':'子公司',comment:'',description:companyDescriptions[company[0]]||''}:{id:company.id||`${city.id}-company-${index+1}`,attribute:'子公司',comment:'',description:companyDescriptions[company.name]||'',...company})}));
}
function hydrate(data){
  data=normalizeContent(data);
  const settings={heroMediaType:'image',heroMediaImage:'home-hero-vehicle-system-v3.png',heroMediaPoster:'home-hero-vehicle-system-v3.png',homeAboutMediaType:'image',homeAboutMediaImage:'home-intro-chip-v2.png',homeAboutMediaPoster:'home-intro-chip-v2.png',aboutBannerTitle:'关于我们',aboutBannerSub:'连接国产芯片与汽车应用，让可靠方案走向量产。',aboutBannerImage:'hero-vehicle-network.png',aboutIntroTitle:'让国产化方案，真正走向量产',aboutMediaType:'image',aboutMediaImage:'hero-data-matrix.png',aboutMediaPoster:'hero-data-matrix.png',aboutMediaCaption:'企业介绍图片 · 后台可配置',...data.settings};
  const defaultsDistribution=[
    {id:'hangzhou',name:'杭州',level:'city',longitude:120.1551,latitude:30.2741,enabled:true,companies:[['浙江红点创芯科技发展有限公司','集团中台'],['浙江红点智芯科技有限公司','前端销售平台'],['浙江红点传动科技有限公司','前端销售平台'],['杭州红点创芯软件技术有限公司','AUTOSAR 软件平台']]},
    {id:'beijing',name:'北京',level:'city',longitude:116.4074,latitude:39.9042,enabled:true,companies:[['华峻科技（北京）有限公司','方案解决平台']]},
    {id:'anhui',name:'安徽',level:'province',longitude:117.2830,latitude:31.8612,enabled:true,companies:[['安徽兮有芯科技有限公司','前端销售平台']]}
  ];
  const known=Object.fromEntries(defaultsDistribution.map(item=>[item.id,item]));
  const source=Array.isArray(data.distribution)?data.distribution:defaultsDistribution;
  const distribution=source.map(raw=>{const {x,y,...item}=raw;return {...known[item.id],...item,longitude:Number.isFinite(Number(item.longitude))?Number(item.longitude):known[item.id]?.longitude,latitude:Number.isFinite(Number(item.latitude))?Number(item.latitude):known[item.id]?.latitude}});
  return {...data,settings,distribution:normalizeDistribution({distribution})};
}
function db(){if(!fs.existsSync(dbPath)){fs.mkdirSync(path.dirname(dbPath),{recursive:true});fs.writeFileSync(dbPath,JSON.stringify(defaults,null,2));}const raw=JSON.parse(fs.readFileSync(dbPath,'utf8'));const data=hydrate(raw);if(JSON.stringify(raw)!==JSON.stringify(data))fs.writeFileSync(dbPath,JSON.stringify(data,null,2));return data;}
function save(data){fs.writeFileSync(dbPath,JSON.stringify(data,null,2));}
function verifyPassword(password,encodedHash){
  const [algorithm,salt,storedHash]=String(encodedHash).split(':');
  if(algorithm!=='scrypt'||!salt||!/^[a-f0-9]{128}$/i.test(storedHash||''))return false;
  const actualHash=crypto.scryptSync(String(password),salt,64);
  const expectedHash=Buffer.from(storedHash,'hex');
  return expectedHash.length===actualHash.length&&crypto.timingSafeEqual(expectedHash,actualHash);
}
function sanitizeContent(value){
  return sanitizeHtml(String(value||''),{
    allowedTags:['p','br','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','blockquote','a','img'],
    allowedAttributes:{a:['href','target','rel'],img:['src','alt','title','width','height']},
    allowedSchemes:['http','https'],
    allowedSchemesByTag:{img:['http','https']},
    transformTags:{a:(tag,attrs)=>({tagName:'a',attribs:{...attrs,rel:'noopener noreferrer'}})}
  });
}
function sanitizeCollection(value){
  return Array.isArray(value)?value.map(item=>item&&typeof item==='object'&&!Array.isArray(item)?{...item,content:sanitizeContent(item.content)}:item):value;
}
function clientAddress(req){return req.ip||req.socket.remoteAddress||'unknown';}
function checkLoginRate(req,res,next){
  const address=clientAddress(req),now=Date.now(),state=loginAttempts.get(address);
  if(state?.blockedUntil>now)return res.status(429).json({message:'登录尝试过于频繁，请 15 分钟后再试'});
  if(state&&now-state.startedAt>loginWindow)loginAttempts.delete(address);
  req.loginAddress=address;
  next();
}
function recordFailedLogin(address){
  const now=Date.now(),previous=loginAttempts.get(address);
  const state=!previous||now-previous.startedAt>loginWindow?{startedAt:now,count:0,blockedUntil:0}:previous;
  state.count+=1;
  if(state.count>=maxLoginAttempts)state.blockedUntil=now+loginWindow;
  loginAttempts.set(address,state);
}
function auth(req,res,next){
  const token=req.get('x-admin-token'),expiresAt=token&&sessions.get(token);
  if(!expiresAt||expiresAt<Date.now()){
    if(token)sessions.delete(token);
    return res.status(401).json({message:'未登录或会话已失效'});
  }
  next();
}
app.use(express.json({limit:'12mb'}));
app.use((req,res,next)=>{
  const pathname=decodeURIComponent(req.path);
  const blockedFiles=new Set(['/server.js','/package.json','/package-lock.json','/ecosystem.config.cjs','/.env','/.env.example']);
  const blockedDirectories=['/data/','/node_modules/','/deploy/','/design/'];
  if(blockedFiles.has(pathname)||blockedDirectories.some(prefix=>pathname.startsWith(prefix)))return res.status(404).end();
  next();
});
app.get('/api/public/site',(req,res)=>res.set('Cache-Control','no-store, no-cache, must-revalidate').json(db()));
app.post('/api/admin/login',checkLoginRate,(req,res)=>{
  const username=String(req.body?.username||''),password=String(req.body?.password||'');
  if(username.length>128||password.length>512||username!==adminUsername||!verifyPassword(password,adminPasswordHash)){
    recordFailedLogin(req.loginAddress);
    return res.status(401).json({message:'账号或密码错误'});
  }
  loginAttempts.delete(req.loginAddress);
  const token=crypto.randomUUID();
  sessions.set(token,Date.now()+sessionDuration);
  res.json({token});
});
app.get('/api/admin/site',auth,(req,res)=>res.json(db()));
app.put('/api/admin/settings',auth,(req,res)=>{const data=db();data.settings={...data.settings,...req.body};save(data);res.json(data.settings);});
app.post('/api/admin/upload-file',auth,upload.single('file'),(req,res)=>{if(!req.file)return res.status(400).json({message:'仅支持 JPG、PNG、WEBP、GIF、MP4、WEBM、MOV 文件'});res.json({url:`uploads/${req.file.filename}`,type:mediaTypes.videos.includes(req.file.mimetype)?'video':'image',size:req.file.size});});
app.use((error,req,res,next)=>{if(error instanceof multer.MulterError&&error.code==='LIMIT_FILE_SIZE')return res.status(400).json({message:'文件大小超过 100MB 限制'});if(error)return res.status(400).json({message:error.message||'上传失败'});next();});
app.post('/api/admin/upload',auth,(req,res)=>{
  const match=String(req.body?.data||'').match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if(!match)return res.status(400).json({message:'请选择 PNG、JPG、WEBP 或 GIF 图片'});
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>8*1024*1024)return res.status(400).json({message:'图片不能超过 8MB'});
  const ext=match[1]==='jpeg'?'jpg':match[1];
  const name=`upload-${Date.now()}-${crypto.randomUUID().slice(0,8)}.${ext}`;
  const dir=path.join(root,'assets','uploads');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name),bytes);
  res.json({url:`uploads/${name}`});
});
app.put('/api/admin/:collection',auth,(req,res)=>{const c=req.params.collection;if(!Array.isArray(db()[c]))return res.status(404).json({message:'未知内容类型'});const data=db();data[c]=sanitizeCollection(req.body);save(data);res.json(data[c]);});
app.post('/api/admin/reset',auth,(req,res)=>{save(hydrate(defaults));res.json({message:'已恢复默认演示数据'});});
app.use(express.static(root));
app.get('/{*path}',(req,res)=>res.sendFile(path.join(root,'index.html')));
app.listen(process.env.PORT||3000,()=>console.log(`Red Dot website running at http://localhost:${process.env.PORT||3000}`));
