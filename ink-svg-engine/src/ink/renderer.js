/* Retained SVG renderer. DOM is retained after mount / first-draw decal initialization.
 * Paths are analytical anatomical pieces plus three-influence torso skinning.
 * Face/hand/back views are attachment swaps, not faded copies of a face.
 */
'use strict';
(() => {
 const {clamp,lerp,rad,mat,vec,Rig,WeightedPath,followThrough}=INK;
 const NS='http://www.w3.org/2000/svg',INKLINE='#302735';
 function node(tag,attrs={},parent=null){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.appendChild(n);return n;}
 function assign(n,k,v,stats){if(k==='visibility'){if(n.hasAttribute('visibility'))n.removeAttribute('visibility');k='display';v=v==='hidden'?'none':'inline';}v=String(v);if(!n._inkAttrs)n._inkAttrs={};if(n._inkAttrs[k]===v)return;n._inkAttrs[k]=v;n.setAttribute(k,v);if(stats)stats.writes++;}
 function setTransform(n,m,s){assign(n,'transform',mat.svg(m),s);}
 function transform(text=''){
  let m=mat.identity();for(const[,name,v]of text.matchAll(/(matrix|translate|rotate|scale|skewX|skewY)\s*\(([^)]*)\)/g)){
   const a=v.trim().split(/[\s,]+/).map(Number);let q;
   if(name==='matrix')q=a;
   if(name==='translate')q=mat.compose(a[0],a[1]||0);
   if(name==='scale')q=mat.compose(0,0,0,a[0],a[1]??a[0]);
   if(name==='rotate')q=mat.multiply(mat.compose(a[1]||0,a[2]||0,a[0]),mat.compose(-(a[1]||0),-(a[2]||0)));
   if(name==='skewX')q=[1,0,Math.tan(rad(a[0])),1,0,0];if(name==='skewY')q=[1,Math.tan(rad(a[0])),0,1,0,0];
   m=mat.multiply(m,q);
  }return m;
 }
 const bind=[mat.compose(0,-191),mat.compose(0,-246),mat.compose(0,-295)];
 function torsoWeights(q){const y=q[1];if(y>=-246){const t=INK.easing(clamp((-191-y)/55));return[1-t,t,0];}const t=INK.easing(clamp((-246-y)/49));return[0,1-t,t];}
 function ellipsePath(cx,cy,rx,ry){const k=.55228475;return `M${cx+rx} ${cy}C${cx+rx} ${cy+ry*k} ${cx+rx*k} ${cy+ry} ${cx} ${cy+ry}C${cx-rx*k} ${cy+ry} ${cx-rx} ${cy+ry*k} ${cx-rx} ${cy}C${cx-rx} ${cy-ry*k} ${cx-rx*k} ${cy-ry} ${cx} ${cy-ry}C${cx+rx*k} ${cy-ry} ${cx+rx} ${cy-ry*k} ${cx+rx} ${cy}Z`;}
 class SkinGroup {
  constructor(parent,markup){
   this.group=node('g',{'data-ink-part':'weighted-torso'},parent);this.paths=[];const tmp=node('g');tmp.innerHTML=markup;
   const walk=(n,m,inherited={})=>{
    const current=mat.multiply(m,transform(n.getAttribute?.('transform')||'')),attrs={...inherited};
    for(const a of n.attributes||[])if(!['transform','d','cx','cy','rx','ry','r','x','y'].includes(a.name))attrs[a.name]=a.value;
    let d=n.getAttribute?.('d');if(['ellipse','circle'].includes(n.tagName)){const num=(a,def=0)=>+(n.getAttribute(a)||def);d=ellipsePath(num('cx'),num('cy'),num('rx',num('r')),num('ry',num('r')));}
    if(d){const path=INK.compilePath(d);for(let i=0;i<path.values.length;i+=2){const q=mat.point(current,[path.values[i],path.values[i+1]]);path.values[i]=q[0];path.values[i+1]=q[1];}
     const dom=node('path',attrs,this.group),skin=new WeightedPath(INK.pathString(path),torsoWeights,bind);this.paths.push({dom,skin,rest:INK.pathString(path)});
    }else for(const c of n.children||[])walk(c,current,attrs);
   };for(const c of tmp.children)walk(c,mat.identity());
  }
  render(p,stats){
   if(!p.chest&&!p.pelvis){
    setTransform(this.group,INK.bodyMatrix(p),stats);if(!this.rigid){for(const {dom,rest}of this.paths)assign(dom,'d',rest,stats);this.rigid=true;}return;
   }
   this.rigid=false;assign(this.group,'transform','',stats);const matrices=Rig.torsoMatrices(p);
   for(const {dom,skin}of this.paths)assign(dom,'d',skin.deform(matrices),stats);
  }
 }
 function segmentShape(length,top,bottom,bulge=1,lower=false){
  const L=length,w=top,b=bottom,peak=w*bulge;
  return `M${-w*.67} ${-w*.3}C${-w*1.03} ${-w*.1} ${-peak} ${L*.15} ${-peak*.92} ${L*.33}C${-peak*.86} ${L*.59} ${-b*.96} ${L*.82} ${-b} ${L}Q0 ${L+b*.74} ${b} ${L}C${b*1.04} ${L*.77} ${peak*(lower?.83:1.07)} ${L*.51} ${peak*(lower?.96:1.05)} ${L*.28}Q${w*.91} ${-w*.36} ${w*.57} ${-w*.39}Q0 ${-w*.78} ${-w*.67} ${-w*.3}Z`;
 }
 function segmentShadow(L,w,b,lower){return `M${-w*.68} ${w*.06}Q${-w*.9} ${L*.2} ${-w*.76} ${L*.44}L${-b*.84} ${L*.95}Q${-b*.35} ${L*1.02} ${b*.2} ${L*.96}L${-b*.28} ${L*.72}Q${-w*.32} ${L*.38} ${-w*.1} ${L*.18}Z`;}
 function segmentLight(L,w,b){return `M${w*.16} ${w*.04}Q${w*.69} ${L*.03} ${w*.73} ${L*.28}Q${w*.67} ${L*.47} ${w*.4} ${L*.6}L${w*.2} ${L*.48}Q${w*.38} ${L*.25} ${w*.16} ${w*.04}Z`;}
 function boneMatrix(a,b,outer=mat.identity()) {const d=vec.sub(b,a);return mat.multiply(outer,mat.compose(a[0],a[1],Math.atan2(d[1],d[0])*180/Math.PI-90));}
 function material(c,leg,rear){
  const id=c.id,p=SF6Art.palette[id];let skin=leg?['mai','luke'].includes(id):!['ken','cammy','iori'].includes(id),key='skin';
  if(!skin)key=leg?(id==='chun'||id==='cammy'||(id==='juri'&&rear)?'dark':id==='iori'?'cloth':'cloth'):(id==='iori'?'dark':'cloth');
  const colors=p[key],base=id==='ken'&&leg?'#cc4c50':`url(#atelier-${id}-${key})`;
  return {base,shade:skin?p.skin[2]:colors[2],light:skin?p.skin[0]:colors[0],skin};
 }

 let serial=0;
 // One uninterrupted anatomical envelope. Bone-local shading is clipped into it;
 // knees and elbows are not two outlined cylinders meeting at a visible seam.
 function envelope(chain,widths,outer,flex=0){
  const [a,b,c]=chain,[w,e,z]=widths,u=vec.normal(vec.sub(b,a)),v=vec.normal(vec.sub(c,b));
  const normal=t=>[-t[1],t[0]],n0=normal(u),n1=normal(v),nj=vec.normal(vec.add(n0,n1));
  const cross=[{q:vec.sub(a,vec.mul(u,w*.45)),n:n0,w:w*.58}];
  for(const t of [0,.2,.5,.78])cross.push({q:vec.mix(a,b,t),n:n0,w:lerp(w,e,t)+(Math.sin(t*Math.PI)*w*(.075+flex*.06))});
  cross.push({q:b,n:nj,w:e});
  for(const t of [.2,.5,.8,1])cross.push({q:vec.mix(b,c,t),n:n1,w:lerp(e,z,t)+Math.sin(t*Math.PI)*e*.16});
  cross.push({q:vec.add(c,vec.mul(v,z*.45)),n:n1,w:z*.6});
  const pts=[...cross.map(q=>mat.point(outer,vec.add(q.q,vec.mul(q.n,q.w)))),...cross.slice().reverse().map(q=>mat.point(outer,vec.sub(q.q,vec.mul(q.n,q.w*.95))))];
  let d='M'+pts[0].join(' ');const N=pts.length;for(let i=0;i<N;i++){const a=pts[(i-1+N)%N],b=pts[i],c=pts[(i+1)%N],e=pts[(i+2)%N];d+='C'+vec.add(b,vec.mul(vec.sub(c,a),.15)).join(' ')+' '+vec.sub(c,vec.mul(vec.sub(e,b),.15)).join(' ')+' '+c.join(' ');}return d+'Z';
 }
 class Limb {
  constructor(parent,c,leg,rear,profile){
   this.c=c;this.leg=leg;this.rear=rear;this.widths=leg?profile.leg:profile.arm;this.material=material(c,leg,rear);
   this.group=node('g',{'data-ink-part':(rear?'rear-':'front-')+(leg?'leg':'arm')},parent);
   this.surface=node('path',{fill:this.material.base,stroke:INKLINE,'stroke-width':1.25,'stroke-linejoin':'round'},this.group);this.clip=node('clipPath',{id:'ink-limb-'+(++serial),clipPathUnits:'userSpaceOnUse'},this.group);this.clipShape=node('path',{},this.clip);this.details=node('g',{'clip-path':'url(#'+this.clip.id+')'},this.group);
   this.pieces=[0,1].map(()=>{const group=node('g',{},this.details);return {group,outline:node('path',{fill:this.material.base,stroke:'none','stroke-width':0,'stroke-linejoin':'round'},group),shade:node('path',{fill:this.material.shade,opacity:rear?.46:.28},group),light:node('path',{fill:this.material.light,opacity:rear?.17:.52},group),line:node('path',{fill:'none',stroke:this.material.shade,'stroke-width':1,'stroke-linecap':'round',opacity:.68},group),cloth:node('g',{},group)};});
   this.joint=node('ellipse',{fill:this.material.base},this.group);
   this.crease=node('path',{fill:'none',stroke:this.material.shade,'stroke-width':.95,'stroke-linecap':'round',opacity:.7},this.group);
   this.end=node('g',{},this.group);
   if(leg)this.end.innerHTML=SF6Art.feet(c);else{
    this.fist=node('g',{},this.end);this.fist.innerHTML=INK.assets.hand(c);this.palm=node('g',{},this.end);this.palm.innerHTML=INK.assets.hand(c,true);
    if(c.id==='mai'&&!rear){this.fan=node('g',{},this.end);this.fan.innerHTML=SF6Art.fan(c);this.end.insertBefore(this.fan,this.fist);}
   }
   this.decalsReady=false;
  }
  decals(lengths){
   if(this.decalsReady)return;this.decalsReady=true;const c=this.c,id=c.id,p=SF6Art.palette[id],[w,e,a]=this.widths,[u,l]=lengths,{P,F,L}=INK.assets;
   const band=(top,bottom,width,fill)=>P(`M${-width} ${top}Q0 ${top+4} ${width} ${top}L${width*.78} ${bottom}Q0 ${bottom+4} ${-width*.78} ${bottom}Z`,fill,1);
   let upper='',lower='';
   if(!this.leg){
    if(id==='ryu'&&this.rear)upper+=P(segmentShape(u*.36,w+2,w*.81),`url(#atelier-${id}-dark)`,1.2)+L(`M${-w*.6} 2L${-w*.7} ${u*.19}`,'#bd8c78',1.3);
    if(id==='cammy')lower+=P(segmentShape(l*.92,e*1.43,a*1.05,1.05,true),'#cb4153',1.2)+L(`M${e*.35} 3L${e*.44} ${l*.56}`,'#ff9e90',2.2);
    if(['mai','chun','iori'].includes(id)){lower+=band(l*.81,l,a+2,id==='chun'?'#3e3446':p.trim)+L(`M${-a-1} ${l*.91}L${a+1} ${l*.91}`,p.dark[2],.9);if(id==='chun')for(const x of [-a*.7,0,a*.7])lower+=P(`M${x-1.5} ${l*.88}l2-3 2 4-2 2Z`,p.trim,.45);}
    if(id==='luke')lower+=L(`M${e*.4} ${l*.22}l-6 7 3 5-5 7M${e*.44} ${l*.52}l-5 5 2 5`,p.skin[2],1.7);
    if(['ken','iori'].includes(id)){upper+=L(`M${-w*.36} ${u*.38}L${-e*.2} ${u*.87}M${e*.1} ${u*.7}l8-7`,p.dark[2],1.2);lower+=L(`M${-e*.6} ${l*.2}l9 8-6 4M${a*.6} ${l*.88}L${-a*.7} ${l*.88}`,p.dark[2],1.1);}
   }else{
    if(id==='luke')upper+=P(segmentShape(u*.72,w+1.5,e+5),`url(#atelier-luke-cloth)`,1.2)+L(`M${-w*.43} 2L${-e*.8} ${u*.63}M${-e-4} ${u*.72}Q0 ${u*.77} ${e+4} ${u*.72}`,p.trim,2.5);
    if(id==='cammy')lower+=band(l*.38,l,e*.89,'#292d3c')+L(`M${e*.4} ${l*.51}L${a*.47} ${l*.94}`,'#6c727f',1.4);
    if(id==='chun')lower+=band(l*.48,l,e*.81,'#e9e4d9')+L(`M${-e*.72} ${l*.49}Q0 ${l*.57} ${e*.72} ${l*.49}`,p.trim,1.7);
    if(id==='mai')lower+=band(l*.76,l,a+2,'#f7e9d8')+L(`M${-a-1} ${l*.8}L${a+1} ${l*.84}M${-a-1} ${l*.9}L${a+1} ${l*.94}`,'#b99994',1);
    if(id==='juri'){upper+=L(`M${w*.66} ${u*.08}Q${w*.7} ${u*.4} ${e*.65} ${u*.92}`,p.trim,2.4);lower+=L(`M${e*.61} 0Q${e*.8} ${l*.4} ${a*.66} ${l*.82}`,p.trim,2.4);}
    if(['ryu','ken','iori'].includes(id)){upper+=L(`M${w*.21} ${u*.22}Q${w*.38} ${u*.5} ${e*.12} ${u*.91}M${-e*.7} ${u*.78}l7 12`,p.cloth[2],1.15);lower+=L(`M${-e*.6} ${l*.14}l8 9-8 10M${a*.8} ${l*.8}l-9 9M${-a*.8} ${l*.93}Q0 ${l*.97} ${a*.8} ${l*.93}`,p.cloth[2],1.05);}
   }
   this.pieces[0].cloth.innerHTML=upper;this.pieces[1].cloth.innerHTML=lower;
  }
  render(chain,p,stats,style={}) {
   const[a,b,c]=chain,outer=this.leg?mat.identity():INK.bodyMatrix(p),ab=vec.sub(b,a),bc=vec.sub(c,b),lengths=[vec.length(ab),vec.length(bc)];
   const dot=clamp((ab[0]*bc[0]+ab[1]*bc[1])/(lengths[0]*lengths[1]),-1,1),flex=(1-dot)*.5;
   const volume=style.volume??1,baseWidths=this.widths.map(w=>w*volume*(this.rear?.94:1));
   const[w,e,z]=baseWidths;
   this.decals(lengths);
   const contour=envelope(chain,baseWidths,outer,flex);assign(this.surface,'d',contour,stats);assign(this.clipShape,'d',contour,stats);
   for(let i=0;i<2;i++){
    const part=this.pieces[i],L=lengths[i],top=i?e*(this.leg?1.05:1.14):w,bottom=i?z:e;
    const bulge=i?(this.leg?1.19:this.c.id==='luke'?1.47:1.24):(this.material.skin?1+flex*.1:1.015);
    setTransform(part.group,boneMatrix(i?b:a,i?c:b,outer),stats);
    assign(part.outline,'d',segmentShape(L,top,bottom,bulge,!!i),stats);
    assign(part.shade,'d',segmentShadow(L,top,bottom,!!i),stats);assign(part.light,'d',segmentLight(L,top,bottom),stats);
    assign(part.line,'d',this.material.skin?`M${top*.35} ${L*.36}Q${top*.47} ${L*.56} ${bottom*.23} ${L*.76}`:'',stats);
   }
   const joint=mat.point(outer,b),ang=Math.atan2(bc[1],bc[0])*180/Math.PI;
   assign(this.joint,'cx',joint[0],stats);assign(this.joint,'cy',joint[1],stats);assign(this.joint,'rx',e*.82,stats);assign(this.joint,'ry',e*.71,stats);
   // Only skin joints need a patch; trousers retain their authored fold.
   assign(this.joint,'visibility','hidden',stats);
   const n=[-bc[1]/lengths[1],bc[0]/lengths[1]],q0=mat.point(outer,[b[0]+n[0]*e*.55,b[1]+n[1]*e*.55]),q1=mat.point(outer,[b[0]-n[0]*e*.4,b[1]-n[1]*e*.4]);
   assign(this.crease,'d',`M${q0}Q${joint[0]+3} ${joint[1]+2} ${q1}`,stats);
   const at=mat.point(outer,c),rot=this.leg?((this.rear?p.rfoot:p.ffoot)||clamp((ang-90)*.24,-26,30)):ang+(p.lean||0);
   const scale=this.leg?(this.c.female?.79:.88):(this.c.female?.7:this.c.id==='luke'?.88:.82);
   setTransform(this.end,mat.compose(at[0],at[1],rot,scale,scale),stats);
   if(!this.leg){const open=p.open>.45;assign(this.palm,'visibility',open?'visible':'hidden',stats);assign(this.fist,'visibility',open?'hidden':'visible',stats);
    if(this.fan){const openness=clamp(p.fan??.9,.07,1);assign(this.fan,'transform',`translate(16 0) rotate(${-18+(1-openness)*9+(p.fanAngle||0)}) scale(1 ${openness}) translate(-16 0)`,stats);assign(this.fan,'visibility',p.fan===0?'hidden':'visible',stats);}
   }
  }
 }
 class Renderer {
  constructor(parent,character){
   if(!parent?.ownerSVGElement&&parent?.tagName!=='svg')throw TypeError('Renderer requires an SVG parent');
   this.assets=INK.assets.pack(character);this.c=this.assets.profile;this.stats={writes:0,frames:0,mountNodes:0};this.style={volume:1,head:1};
   this.group=node('g',{'data-ink-character':character.id,'data-ink-mode':'skin'},parent);
   this.art=node('g',{'data-ink-layer':'art'},this.group);
   const a=this.assets;
   this.trail=node('g',{'data-ink-part':'cloth-followthrough'},this.art);this.trail.innerHTML=a.trail;
   this.rearLeg=new Limb(this.art,this.c,true,true,this.c);this.frontLeg=new Limb(this.art,this.c,true,false,this.c);
   this.hair=node('g',{'data-ink-part':'hair-followthrough'},this.art);this.hair.innerHTML=a.hair;
   this.rearArm=new Limb(this.art,this.c,false,true,this.c);
   this.torso=new SkinGroup(this.art,a.torso);this.torsoBack=new SkinGroup(this.art,a.torsoBack);
   this.coat=node('g',{'data-ink-part':'coat-followthrough'},this.art);this.coat.innerHTML=a.coat;
   this.strap=node('path',{fill:'none',stroke:'#a23c56','stroke-width':5,'stroke-linecap':'round'},this.art);
   this.head=node('g',{'data-ink-part':'head-slot'},this.art);this.heads={};
   for(const [name,markup]of Object.entries(a.heads)){this.heads[name]=node('g',{'data-ink-attachment':name},this.head);this.heads[name].innerHTML=markup;}
   this.expressions=[...this.head.querySelectorAll('[data-expression]')];
   this.frontArm=new Limb(this.art,this.c,false,false,this.c);
   this.debug=node('g',{'data-ink-layer':'rig','pointer-events':'none'},this.group);
   this.bones=Array.from({length:11},()=>node('line',{stroke:'#3a8f87','stroke-width':1.35,'stroke-dasharray':'4 3'},this.debug));
   this.joints=Array.from({length:15},()=>node('circle',{r:3.4,fill:'#f6fbeb',stroke:'#238b81','stroke-width':1.4},this.debug));
   this.debug.setAttribute('display','none');this._order='';this.mode='skin';this.destroyed=false;
   this.stats.mountNodes=this.group.querySelectorAll('*').length;
  }
  setMode(mode){if(!['skin','rig','silhouette','overlay'].includes(mode))throw Error('Unknown mode');this.mode=mode;assign(this.group,'data-ink-mode',mode,this.stats);assign(this.art,'visibility',mode==='rig'?'hidden':'visible',this.stats);assign(this.debug,'visibility',['rig','overlay'].includes(mode)?'visible':'hidden',this.stats);}
  setStyle(style){if(style.volume!==undefined)this.style.volume=clamp(style.volume,.75,1.3);if(style.head!==undefined)this.style.head=clamp(style.head,.8,1.25);}
  render(p,{rig=null,frame=0,expression='rest',impulses=[],secondary=true}={}) {
   if(this.destroyed)throw Error('Renderer already destroyed');const start=performance.now();this.stats.writes=0;this.stats.frames++;
   const signature=JSON.stringify([p,rig,secondary?frame:0,expression,impulses,this.style,this.mode]);if(signature===this.signature){this.stats.cpuMs=performance.now()-start;return this.stats;}this.signature=signature;
   const inputRig=rig||Rig.solveAnimation(this.c,p),r={...inputRig},s=this.stats,back=p.turn>.64;
   // The legacy game can hand us a collapsed chain when target == shoulder.
   // Repair the drawing only; authoritative gameplay geometry remains untouched.
   for(const [name,chain]of Object.entries(r))if(vec.length(vec.sub(chain[1],chain[0]))<1e-5||vec.length(vec.sub(chain[2],chain[1]))<1e-5){const leg=name.includes('Leg'),male=!this.c.female,upper=leg?(this.c.id==='chun'?100:96):this.c.id==='iori'?67:male?68:64,lower=leg?98:this.c.id==='iori'?76:male?71:67;r[name]=INK.twoBone(chain[0],chain[2],upper,lower,leg&&name.startsWith('front')?-1:1,1);}
   this.inputRig=inputRig;
   for(const name of ['rearLeg','frontLeg','rearArm','frontArm'])this[name].render(r[name],p,s,this.style);
   this.torso.render(p,s);this.torsoBack.render(p,s);
   assign(this.torso.group,'visibility',back?'hidden':'visible',s);assign(this.torsoBack.group,'visibility',back?'visible':'hidden',s);
   const rearInFront=!back&&p.rw[0]>-37&&p.rw[1]<-258;const order=(back?'back':'front')+(rearInFront?'guard':'');if(order!==this._order){this._order=order;
    const ordered=back?[this.trail,this.frontLeg.group,this.rearLeg.group,this.hair,this.frontArm.group,this.torso.group,this.torsoBack.group,this.coat,this.head,this.rearArm.group]:[this.trail,this.rearLeg.group,this.frontLeg.group,this.hair,this.rearArm.group,this.torso.group,this.torsoBack.group,this.coat,this.head,this.frontArm.group];
    for(const n of ordered)this.art.appendChild(n);this.art.insertBefore(this.strap,this.torso.group);if(rearInFront)this.art.insertBefore(this.rearArm.group,this.head);
   }
   if(this.c.id==='iori'){const a=vec.mix(r.rearLeg[0],r.rearLeg[1],.69),b=vec.mix(r.frontLeg[0],r.frontLeg[1],.69);assign(this.strap,'d',`M${a}Q${(a[0]+b[0])/2} ${Math.max(a[1],b[1])+55} ${b}`,s);}
   const body=INK.bodyMatrix(p),h=Rig.sockets(p,r).head,headScale=this.c.headScale*this.style.head;
   setTransform(this.head,mat.compose(h[0],h[1],(p.lean||0)+(p.head||0)+(p.chest||0),headScale,headScale),s);
   const view=back?'back':p.turn>.27?'profile':'front';for(const[k,n]of Object.entries(this.heads))assign(n,'visibility',k===view?'visible':'hidden',s);
   for(const e of this.expressions)assign(e,'visibility',e.dataset.expression===expression?'visible':'hidden',s);
   const lag=secondary?followThrough(frame,impulses,1.15):0;
   setTransform(this.hair,mat.multiply(body,mat.multiply(mat.compose(-14,-365,lag*.7+(p.head||0)*.4),mat.compose(14,365))),s);
   setTransform(this.coat,mat.multiply(body,mat.multiply(mat.compose(0,-205,lag*.8-(p.lean||0)*.12),mat.compose(0,205))),s);
   setTransform(this.trail,mat.multiply(mat.compose(0,(p.bob||0)*.6),mat.multiply(mat.compose(0,-200,lag-(p.lean||0)*.19),mat.compose(0,200))),s);
   if(['rig','overlay'].includes(this.mode)){
    const sockets=Rig.sockets(p,r),lines=[],points=[];for(const name of ['rearLeg','frontLeg','rearArm','frontArm']){const q=sockets[name];lines.push([q[0],q[1]],[q[1],q[2]]);points.push(...q);}
    lines.push([sockets.pelvis,sockets.chest],[sockets.chest,sockets.neck],[sockets.neck,sockets.head]);points.push(sockets.pelvis,sockets.chest,sockets.head);
    lines.forEach(([a,b],i)=>{assign(this.bones[i],'x1',a[0],s);assign(this.bones[i],'y1',a[1],s);assign(this.bones[i],'x2',b[0],s);assign(this.bones[i],'y2',b[1],s);});
    points.forEach((q,i)=>{assign(this.joints[i],'cx',q[0],s);assign(this.joints[i],'cy',q[1],s);});
   }
   this.lastPose=p;this.lastRig=r;this.stats.cpuMs=performance.now()-start;return this.stats;
  }
  destroy(){this.group.remove();this.destroyed=true;this.heads={};this.expressions=[];}
 }
 INK.SVG={NS,node,assign,transform};INK.SkinGroup=SkinGroup;INK.Renderer=Renderer;
})();
