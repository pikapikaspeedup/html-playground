/* Authoring UI. No network calls, eval, animation-library or runtime dependency. */
'use strict';
(() => {
 const $=id=>document.getElementById(id),{copy,clamp,mat,Clip,Player,FixedClock,Rig}=INK,{node,assign}=INK.SVG;
 const profiles=INK.assets.profiles.map(c=>({...c}));SF6Art.configure(profiles,$('artDefs'));
 const registry={...INK.motion.library},clock=new FixedClock(60,8),stage=$('stage');
 let selected=profiles.find(c=>c.id==='mai'),active=registry['mai:hishou-ryuuenjin'],player=new Player(active),renderer=null,ghostRenderers=[],playing=false,mode='skin',facing=1,overrides={},undoStack=[],lastPose=null,zoom=1.19,lastFrame=-1,toastTimer=null,loopDelay=0;
 const rows={},controls={},ghostRoots=[],fxPaths=[],eventLog=[];
 const trail=node('path',{class:'trail-line'},$('fxLayer'));const contactDot=node('circle',{r:6,fill:'none',stroke:'#d29857','stroke-width':2,opacity:0},$('fxLayer'));
 const projectile=node('g',{},$('fxLayer'));projectile.innerHTML='<path fill="#9ebeb0" opacity=".28" d="M-40-22Q-15-44 31-20L54 0 31 20Q-15 44-40 22L-17 0Z"/><path fill="#f9ffeb" stroke="#6f9e88" stroke-width="1.5" d="M-18-14Q12-26 32 0Q12 26-18 14L-6 0Z"/>';
 const tossedFan=node('g',{},$('fxLayer'));tossedFan.innerHTML=SF6Art.fan(selected);
 for(let i=0;i<2;i++)ghostRoots.push(node('g',{opacity:i?.1:.065},$('ghosts')));
 const handNames={rw:'后手',fw:'前手',ra:'后脚',fa:'前脚'};
 for(const key of Object.keys(handNames)){
  const g=node('g',{'data-handle':key},$('handles')),circle=node('circle',{r:8,class:'ik-handle',tabindex:0,'aria-label':handNames[key]+'控制点'},g),label=node('text',{x:12,y:4,class:'ik-label'},g);label.textContent=handNames[key];controls[key]={g,circle};
  circle.addEventListener('pointerdown',e=>beginDrag(e,key));
 }
 for(const [i,c]of profiles.entries()){
  const b=document.createElement('button');b.className='roster-item';b.dataset.character=c.id;b.setAttribute('aria-label','选择'+c.cn);const pic=node('svg',{viewBox:'-46 -55 98 105'});pic.innerHTML=INK.assets.head(c);b.append(pic);const names=document.createElement('span');const n=document.createElement('strong');n.textContent=c.name;const cn=document.createElement('small');cn.textContent=c.cn;names.append(n,cn);const num=document.createElement('span');num.className='num';num.textContent=String(i+1).padStart(2,'0');b.append(names,num);$('rosterList').append(b);rows[c.id]=b;b.addEventListener('click',()=>selectCharacter(c.id));
 }
 function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
 function rebuildActor(){
  renderer?.destroy();for(const r of ghostRenderers)r.destroy();renderer=new INK.Renderer($('actorRoot'),selected);renderer.setMode(mode);renderer.setStyle(selected.previewStyle||{volume:1,head:1});
  ghostRenderers=ghostRoots.map(root=>{const r=new INK.Renderer(root,selected);r.setMode('silhouette');r.setStyle(renderer.style);return r;});
  for(const [id,row]of Object.entries(rows)){row.classList.toggle('selected',id===selected.id);row.setAttribute('aria-pressed',String(id===selected.id));}
  $('watermark').textContent=selected.name;$('characterTag').textContent=selected.name+' / ANIMATION STUDY';
  $('volume').value=Math.round(renderer.style.volume*100);$('headSize').value=Math.round(renderer.style.head*100);$('headValue').textContent=$('headSize').value+'%';$('volumeValue').textContent=$('volume').value+'%';
 }
 function updateOptions(){const s=$('clipSelect');s.replaceChildren();for(const clip of Object.values(registry).filter(c=>c.data.character===selected.id)){const o=document.createElement('option');o.value=clip.id;o.textContent=clip.data.name||clip.id;s.append(o);}s.value=active.id;}
 function selectCharacter(id){const c=profiles.find(c=>c.id===id);if(!c)throw Error('Unknown character');selected=c;rebuildActor();const first=Object.values(registry).find(c=>c.data.character===id);selectClip(first.id);}
 function selectClip(id){const clip=registry[id];if(!clip)throw Error('Unknown clip');if(clip.data.character!==selected.id){selected=profiles.find(c=>c.id===clip.data.character);rebuildActor();}active=clip;player=new Player(active);overrides={};undoStack=[];playing=false;loopDelay=0;clock.reset();updateOptions();updateTimeline();draw(0);updatePlayButton();}
 function phases(){const d=active.duration,s=clamp(Number(active.data.phases?.startup?.[1]??d*.25),1,d-1),e=clamp(Number(active.data.phases?.active?.[1]??d*.6),s,d);return{s,e,d};}
 function updateTimeline(){
  const {s,e,d}=phases();$('clipName').textContent=active.data.name||active.id;$('clipDescription').textContent=active.data.meta?.note||'导入的独立动画数据';$('command').textContent=active.data.command||'自定义编排';
  $('startupMetric').innerHTML=Math.round(s)+'<small>f</small>';$('activeMetric').innerHTML=Math.round(e-s)+'<small>f</small>';$('recoveryMetric').innerHTML=Math.round(d-e)+'<small>f</small>';
  $('scrubber').max=d;const tracks=$('phaseTrack');tracks.replaceChildren();for(const[n,v,label]of [['startup',s,'预备'],['active',e-s,'发力 / 命中'],['recovery',d-e,'收势']]){const span=document.createElement('span');span.className='phase-'+n;span.style.width=(v/d*100)+'%';span.textContent=label;tracks.append(span);}
  $('ruler').replaceChildren();for(let i=0;i<=8;i++){const t=document.createElement('span');t.textContent=String(Math.round(i*d/8)).padStart(2,'0');$('ruler').append(t);}
  $('eventTrack').replaceChildren();const unique=[...new Set(Object.values(active.tracks).flatMap(keys=>keys.map(k=>k[0])))];for(const f of unique){const dot=document.createElement('i');dot.className='event-key pose-key';dot.style.left=clamp(f/d*100,0,99)+'%';dot.title='姿势帧 '+f;$('eventTrack').append(dot);}
  for(const event of active.events.filter(e=>e.type==='contact')){const dot=document.createElement('i');dot.className='event-key';dot.style.left=event.frame/d*100+'%';dot.title='命中标记 '+event.frame;$('eventTrack').append(dot);}
  $('keyCount').textContent=unique.length;$('eventCount').textContent=active.events.length;$('editStatus').textContent=undoStack.length?'已编辑 '+undoStack.length+' 次 · 导出后保存':'原始动作未修改';
 }
 function stageMatrix(p){return mat.multiply(mat.compose(458+(p.rootX||0)*zoom,554+(p.rootY||0)*zoom,0,zoom*facing*(p.depth||1),zoom),mat.multiply(mat.compose(p.rootShift||0,(p.floor||0)-180,p.spin||0),mat.compose(0,180)));}
 function fullPose(p){return Object.assign(p,copy(overrides));}
 function sample(t){return active.sample(t,INK.motion.base(selected.id));}
 function socket(p){const rig=Rig.solveAnimation(selected,p),all=Rig.sockets(p,rig),name=active.data.meta?.socket||'frontArm';const target=all[name]||all.frontArm;return mat.point(stageMatrix(p),Array.isArray(target[0])?target[2]:target);}
 function draw(alpha=0){
  const p=fullPose(player.sample(alpha)),frame=clamp(player.frame+(player.frozen?0:alpha),0,active.duration),{s,e,d}=phases();lastPose=p;
  const transform=mat.svg(stageMatrix(p));assign($('actorRoot'),'transform',transform);const impulses=active.events.filter(e=>e.type==='impulse');
  renderer.render(p,{frame,impulses,secondary:$('secondary').checked,expression:frame>=s&&frame<e?'power':'rest'});
  const ghost=$('onion').checked;assign($('ghosts'),'visibility',ghost?'visible':'hidden');
  if(ghost)ghostRenderers.forEach((r,i)=>{const t=clamp(frame+(i?7:-7),0,d),p=sample(t);assign(ghostRoots[i],'transform',mat.svg(stageMatrix(p)));r.render(p,{frame:t,secondary:false});});
  assign($('groundShadow'),'cx',458+(p.rootX||0)*zoom);assign($('groundShadow'),'rx',132*clamp(1+(p.rootY||0)/500,.38,1));assign($('groundShadow'),'opacity',clamp(.11+(p.rootY||0)/2000,.025,.11));
  const showHandles=$('editPose').checked&&!playing;assign($('handles'),'visibility',showHandles?'visible':'hidden');if(showHandles){const sockets=Rig.sockets(p,renderer.lastRig),lookup={rw:sockets.rearArm[2],fw:sockets.frontArm[2],ra:sockets.rearLeg[2],fa:sockets.frontLeg[2]};for(const[k,q]of Object.entries(lookup)){const at=mat.point(stageMatrix(p),q);assign(controls[k].g,'transform',`translate(${at})`);}}
  const traces=$('showTrail').checked;assign(trail,'visibility',traces?'visible':'hidden');if(traces){const points=[];for(let t=Math.max(0,frame-12);t<=frame;t+=1)points.push(socket(sample(t)));assign(trail,'d',points.length?'M'+points.map(p=>p.join(' ')).join('L'):'');}
  const recent=active.events.filter(a=>a.type==='contact'&&frame>=a.frame&&frame<a.frame+5).at(-1);if(recent&&traces){const q=socket(sample(recent.frame));assign(contactDot,'cx',q[0]);assign(contactDot,'cy',q[1]);assign(contactDot,'r',4+(frame-recent.frame)*2);assign(contactDot,'opacity',(1-(frame-recent.frame)/5)*.65);}else assign(contactDot,'opacity',0);
  const kind=active.data.meta?.kind,age=frame-s,isShot=['projectile','groundwave','fan'].includes(kind)&&age>=0&&age<31;assign(projectile,'visibility',isShot&&kind!=='fan'&&traces?'visible':'hidden');assign(tossedFan,'visibility',isShot&&kind==='fan'&&traces?'visible':'hidden');
  if(isShot&&traces){const q=socket(sample(s)),x=q[0]+(age*13+24)*facing,y=kind==='groundwave'?541:q[1];assign(projectile,'transform',`translate(${x} ${y}) scale(${facing} .67)`);assign(projectile,'opacity',clamp((31-age)/8));assign(tossedFan,'transform',`translate(${x} ${y}) rotate(${age*23}) scale(.6)`);assign(tossedFan,'opacity',clamp((31-age)/8));}
  $('scrubber').value=player.frame;$('frameBadge').textContent='FRAME '+String(player.frame).padStart(3,'0')+' / '+String(d).padStart(3,'0');$('timeReadout').innerHTML=String(player.frame).padStart(3,'0')+'<span> / '+String(d).padStart(3,'0')+' f</span>';$('phaseLabel').textContent=player.frozen?'命中停顿':player.frame<s?'预备':player.frame<e?'发力':'收势';
  if(!document.querySelector('.slider-label input:active')){$('chest').value=p.chest||0;$('lean').value=p.lean||0;}$('chestValue').textContent=Math.round(p.chest||0)+'°';$('leanValue').textContent=Math.round(p.lean||0)+'°';
  $('stageState').textContent=showHandles?'编辑视图 · 拖动四个手脚控制点':player.frozen?'命中停顿 · 模拟与画面同步冻结':playing?'播放 · 固定 60 Hz 事件时间轴':'暂停 · 逐帧检查形体和动作';
  if(player.frame!==lastFrame||!playing){$('drawStats').textContent=renderer.group.querySelectorAll('*').length+' SVG NODES / '+renderer.stats.cpuMs.toFixed(2)+' ms UPDATE';lastFrame=player.frame;}
 }
 function setPlaying(value){playing=value;overrides={};clock.reset();loopDelay=0;if(value&&player.ended)player.seek(0);updatePlayButton();draw(0);}
 function updatePlayButton(){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-pressed',String(playing));$('systemStatus').textContent=playing?'RUNNING · FIXED 60 Hz':'READY · LOCAL SVG RUNTIME';}
 function seek(frame){playing=false;player.seek(frame);overrides={};clock.reset();updatePlayButton();draw(0);}
 function tick(){if(player.ended){if($('loop').checked){if(++loopDelay>=23){player.play(active);loopDelay=0;}}else setPlaying(false);return;}const events=player.step();for(const e of events){eventLog.push(e);if(eventLog.length>1000)eventLog.shift();if(e.type==='contact')player.freeze(3);}}
 function frame(now){if(playing){const alpha=clock.advance(now,tick,Number($('speed').value));draw(alpha);}else clock.reset();requestAnimationFrame(frame);}
 function commitPose(){
  if(!Object.keys(overrides).length){notify('先暂停并拖动控制点，或调整胸廓与倾角');return false;}
  undoStack.push(active.toJSON());if(undoStack.length>30)undoStack.shift();const data=active.toJSON(),time=player.frame;
  for(const[k,v]of Object.entries(overrides)){const keys=data.tracks[k]||[[0,INK.motion.base(selected.id)[k]??0]],index=keys.findIndex(q=>q[0]===time),entry=[time,Array.isArray(v)?v.slice():v,'smooth'];if(index>=0)keys[index]=entry;else keys.push(entry);keys.sort((a,b)=>a[0]-b[0]);data.tracks[k]=keys;}
  active=registry[active.id]=new Clip(data);player=new Player(active);player.seek(time);overrides={};updateTimeline();draw(0);notify('已写入第 '+time+' 帧 · 请导出 JSON 保存');return true;
 }
 function undo(){const data=undoStack.pop();if(!data)return notify('没有可撤销的关键帧编辑');const t=player.frame;active=registry[data.id]=new Clip(data);player=new Player(active);player.seek(t);overrides={};updateTimeline();draw(0);notify('已撤销上一次关键帧编辑');}
 let drag=null;
 function beginDrag(e,key){if(!$('editPose').checked)return;playing=false;updatePlayButton();drag={key,id:e.pointerId};e.target.setPointerCapture(e.pointerId);e.preventDefault();}
 stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const pt=stage.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const local=pt.matrixTransform($('actorRoot').getScreenCTM().inverse());let q=[local.x,local.y];if(drag.key.endsWith('w'))q=mat.point(mat.inverse(INK.bodyMatrix(lastPose)),q);overrides[drag.key]=q.map(n=>Math.round(clamp(n,-650,650)*10)/10);draw(0);$('editStatus').textContent='未写入 · '+handNames[drag.key]+'目标 '+overrides[drag.key].join(', ');});
 const endDrag=()=>{drag=null};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',endDrag);
 function download(name,text,mime){const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function importClip(data){
  INK.validateClip(data);const c=profiles.find(p=>p.id===data.character);if(!c)throw Error('动作必须指定八个已支持角色之一');const clip=new Clip(data);registry[clip.id]=clip;if(selected.id!==c.id){selected=c;rebuildActor();}selectClip(clip.id);notify('已导入 '+(clip.data.name||clip.id));return clip;
 }

 // Character profiles are separate from motions. Import only scalar/vector data;
 // SVG markup, scripts and unknown fields never enter the renderer from JSON.
 function exportProfile(){
  const male=!selected.female;
  return {version:1,kind:'ink-character-profile',character:selected.id,
   arm:renderer.c.arm.slice(),leg:renderer.c.leg.slice(),headScale:renderer.c.headScale,
   rigLengths:(selected.rigLengths||[selected.id==='iori'?67:male?68:64,selected.id==='iori'?76:male?71:67,selected.id==='chun'?100:96,98]).slice(),
   rigRearShoulder:(selected.rigRearShoulder||[-42,-292]).slice(),rigFrontShoulder:(selected.rigFrontShoulder||[42,-290]).slice(),
   style:{...renderer.style}};
 }
 function importProfile(data){
  if(!data||data.version!==1||data.kind!=='ink-character-profile')throw Error('角色设置版本或类型无效');
  const target=profiles.find(c=>c.id===data.character);if(!target)throw Error('未知角色');
  const vector=(key,size,min,max)=>{const v=data[key];if(!Array.isArray(v)||v.length!==size||v.some(n=>!Number.isFinite(n)||n<min||n>max))throw Error('角色参数 '+key+' 超出允许范围');return v.slice();};
  const arm=vector('arm',3,2,65),leg=vector('leg',3,2,70),rigLengths=vector('rigLengths',4,15,220),rigRearShoulder=vector('rigRearShoulder',2,-500,150),rigFrontShoulder=vector('rigFrontShoulder',2,-500,150);
  if(!Number.isFinite(data.headScale)||data.headScale<.5||data.headScale>1.3)throw Error('头部绑定比例超出范围');
  const style=data.style||{volume:1,head:1};if(!Number.isFinite(style.volume)||style.volume<.75||style.volume>1.3||!Number.isFinite(style.head)||style.head<.8||style.head>1.25)throw Error('预览比例超出范围');
  // All validation happens before mutating the active profile.
  Object.assign(target,{arm,leg,rigLengths,rigRearShoulder,rigFrontShoulder,headScale:data.headScale,previewStyle:{volume:style.volume,head:style.head}});
  if(selected.id!==target.id)selectCharacter(target.id);else{playing=false;rebuildActor();updatePlayButton();draw(0);}
  notify('已导入 '+target.cn+' 的形体设置 · 动作数据不变');return exportProfile();
 }
 $('clipSelect').addEventListener('change',e=>selectClip(e.target.value));$('play').onclick=()=>setPlaying(!playing);$('restart').onclick=()=>seek(0);$('prevFrame').onclick=()=>seek(player.frame-1);$('nextFrame').onclick=()=>seek(player.frame+1);$('scrubber').addEventListener('input',e=>seek(+e.target.value));$('speed').onchange=()=>clock.reset();
 $('mirror').onclick=()=>{facing*=-1;draw(0);};$('resetView').onclick=()=>{facing=1;zoom=1.19;seek(0);};
 $('viewModes').addEventListener('click',e=>{const m=e.target.dataset.mode;if(!m)return;setMode(m);});
 function setMode(m){mode=m;renderer.setMode(m);for(const b of $('viewModes').children){b.classList.toggle('selected',b.dataset.mode===m);b.setAttribute('aria-pressed',String(b.dataset.mode===m));}draw(0);}
 for(const id of ['onion','showTrail','secondary','editPose'])$(id).addEventListener('change',()=>{if(id==='editPose'&&$(id).checked){playing=false;updatePlayButton();}draw(0);});
 for(const id of ['volume','headSize'])$(id).addEventListener('input',()=>{const value=+$(id).value;renderer.setStyle(id==='volume'?{volume:value/100}:{head:value/100});selected.previewStyle={...renderer.style};for(const r of ghostRenderers)r.setStyle(renderer.style);$(id==='volume'?'volumeValue':'headValue').textContent=value+'%';draw(0);});
 for(const id of ['chest','lean'])$(id).addEventListener('input',()=>{playing=false;updatePlayButton();overrides[id]=+$(id).value;draw(0);$('editStatus').textContent='姿势预览已修改 · 写入后保存到动作';});
 $('commitPose').onclick=commitPose;$('undo').onclick=undo;
 $('exportClip').onclick=()=>download(active.id.replace(':','-')+'.ink.json',JSON.stringify(active.toJSON(),null,2),'application/json');$('importClip').onclick=()=>$('fileInput').click();
 $('fileInput').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>1_000_000)throw Error('JSON 文件不能超过 1 MB');const data=JSON.parse(await f.text());if(data.kind==='ink-character-profile')importProfile(data);else importClip(data);}catch(err){notify('导入失败：'+err.message);}finally{e.target.value='';}});
 $('exportSVG').onclick=()=>{const svg=node('svg',{xmlns:INK.SVG.NS,viewBox:'0 0 1040 650',width:1040,height:650});const defs=$('artDefs').cloneNode(true),background=node('rect',{width:1040,height:650,fill:'#ede8dc'});svg.append(defs,background,$('actorRoot').cloneNode(true));const style=node('style',{},svg);style.textContent='[data-ink-mode="silhouette"] [data-ink-layer="art"] path:not([fill="none"]),[data-ink-mode="silhouette"] [data-ink-layer="art"] ellipse{fill:#283f3a!important;stroke:#283f3a!important;opacity:1!important}';download(selected.id+'-frame-'+player.frame+'.svg',new XMLSerializer().serializeToString(svg),'image/svg+xml');};
 $('exportPack').onclick=()=>download(selected.id+'-profile.json',JSON.stringify(exportProfile(),null,2),'application/json');
 $('helpButton').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
 document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||$('helpDialog').open)return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}if(e.code==='ArrowLeft'){e.preventDefault();seek(player.frame-1);}if(e.code==='ArrowRight'){e.preventDefault();seek(player.frame+1);}if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}});
 document.addEventListener('visibilitychange',()=>clock.reset());
 window.INKStudio={get active(){return active},get player(){return player},get renderer(){return renderer},get character(){return selected},get pose(){return lastPose},get playing(){return playing},get events(){return eventLog.slice()},registry,selectCharacter,selectClip,seek,setPlaying,tick,draw,setMode,commitPose,undo,importClip,importProfile,exportProfile,override(p){overrides=copy(p);draw(0);},snapshot(){return player.snapshot();},benchmark(n=240){const samples=[];playing=false;for(let i=0;i<n;i++){const p=sample(i%active.duration);samples.push(renderer.render(p,{frame:i}).cpuMs);}samples.sort((a,b)=>a-b);draw(0);return{n,median:samples[Math.floor(n*.5)],p95:samples[Math.floor(n*.95)],max:samples.at(-1),nodes:renderer.group.querySelectorAll('*').length};}};
 rebuildActor();selectClip('mai:hishou-ryuuenjin');requestAnimationFrame(frame);
})();
