/* ATELIER / deterministic keyframe choreography.
 * Pure samplers: one pose drives the SVG skeleton, weapon and hit geometry.
 * Startup -> contact -> follow-through -> recovery are separate timelines.
 * No DOM reads, timers, randomness, or per-frame animation allocations in data.
 * Rotations stay unwrapped across recovery (no reverse-spin snap at 360deg).
 */
'use strict';
window.SF6Motion = (() => {
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const copy=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v.slice():v]));
 const merge=(a,b)=>Object.assign(copy(a),copy(b));
 const blend=(a,b,t)=>{const p=copy(a);for(const k in b){const x=a[k]??(Array.isArray(b[k])?[0,0]:0);p[k]=Array.isArray(b[k])?b[k].map((v,i)=>mix(x[i],v,t)):mix(x,b[k],t);}return p;};
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 function frames(list,t,base){if(t<=list[0][0])return merge(base,list[0][1]);for(let i=1;i<list.length;i++){const [b,p,curve]=list[i],[a,q]=list[i-1];if(t<=b){const u=clamp((t-a)/Math.max(.001,b-a));return blend(merge(base,q),merge(base,p),curve==='strike'?1-(1-u)**3:curve==='linear'?u:curve==='load'?u*u*u:smooth(u));}}return merge(base,list.at(-1)[1]);}
 const neutralData={
  ryu:{lean:-3,head:1,rw:[-1,-291],fw:[102,-298],ra:[-100,-16],fa:[108,-16],re:[-53,-252],fe:[80,-244],open:0},
  ken:{lean:-5,head:3,rw:[-9,-277],fw:[112,-304],ra:[-116,-16],fa:[91,-16],open:0,bob:3},
  chun:{lean:-4,head:2,rw:[-19,-299],fw:[127,-290],ra:[-92,-16],fa:[105,-16],open:1,bob:1,handAngle:-7},
  cammy:{lean:7,head:-4,rw:[9,-314],fw:[86,-323],ra:[-79,-16],fa:[120,-16],open:0,bob:7},
  luke:{lean:4,head:-2,rw:[9,-289],fw:[107,-321],ra:[-97,-16],fa:[114,-16],open:0,bob:1},
  juri:{lean:-9,head:9,rw:[-53,-239],fw:[76,-232],ra:[-77,-16],fa:[68,-110],fk:[109,-178],open:1,bob:2,handAngle:10},
  mai:{lean:-6,head:3,rw:[-23,-285],fw:[113,-313],ra:[-104,-16],fa:[82,-16],open:0,fan:.92,fanAngle:-9,handAngle:-3,bob:1},
  iori:{lean:12,head:-8,rw:[-65,-204],fw:[116,-290],ra:[-122,-16],fa:[107,-16],open:1,bob:10,handAngle:6}
 };
 function neutral(f,time,base){const p=merge(base,neutralData[f.ch.id]),rate={ryu:2.3,ken:3.1,chun:2.5,cammy:3.6,luke:3.3,juri:2.6,mai:2.2,iori:1.9}[f.ch.id],b=Math.sin(time*rate+(f.index||0)*.7);p.bob=(p.bob||0)+b*(f.ch.id==='iori'?.9:1.35);p.head+=(Math.sin(time*rate*.57))*.7;p.fw[1]+=b*1.8;p.rw[1]+=b*1.1;p.turn=0;p.depth=1;p.spin=0;p.floor=0;return p;}
 // Readable aliases are anatomical poses, not generic per-character animations.
 const pose={
  guard:{lean:-9,bob:7,head:6,fw:[68,-330],rw:[12,-318],ra:[-102,-16],fa:[109,-16]},
  crouch:{lean:6,bob:55,head:-5,fw:[106,-286],rw:[-4,-276],ra:[-112,-16],fa:[113,-16]},
  coil:{lean:-14,bob:9,head:6,fw:[23,-258],rw:[-23,-306],fa:[90,-16],ra:[-100,-16],turn:.14},
  jab:{lean:9,head:-6,fw:[167,-299],rw:[-12,-303],ra:[-102,-16],fa:[118,-16]},
  cross:{lean:18,bob:4,head:-11,fw:[161,-282],rw:[-30,-295],ra:[-127,-16],fa:[117,-16],turn:.22},
  hook:{lean:22,bob:2,head:-12,fw:[107,-319],rw:[-33,-275],ra:[-127,-16],fa:[106,-16],turn:.45},
  chamber:{lean:-13,head:8,fw:[67,-315],rw:[-41,-309],fa:[58,-123],ra:[-82,-16],ffoot:7},
  thrust:{lean:-25,head:17,fw:[64,-300],rw:[-82,-289],fa:[221,-225],ra:[-66,-16],ffoot:80},
  round:{lean:-32,head:19,fw:[75,-277],rw:[-94,-284],fa:[176,-337],ra:[-75,-16],ffoot:54},
  sweep:{lean:-24,bob:60,head:14,fw:[102,-270],rw:[-83,-292],ra:[-116,-16],fa:[225,-32],ffoot:72},
  knee:{lean:-5,head:2,fw:[63,-325],rw:[-8,-303],fa:[73,-139],ra:[-82,-16],ffoot:15},
  riseLoad:{lean:17,bob:34,head:-12,fw:[43,-233],rw:[-6,-307],ra:[-107,-16],fa:[114,-16]},
  fistRise:{lean:-12,bob:-6,head:-15,fw:[60,-415],rw:[-16,-276],ra:[-78,-65],fa:[77,-145],ffoot:-21,turn:.17},
  kickRise:{lean:-25,bob:10,head:9,fw:[96,-269],rw:[-87,-279],fa:[124,-385],ra:[-81,-80],ffoot:78},
  waveLoad:{lean:-14,bob:10,head:7,fw:[-2,-242],rw:[-8,-254],ra:[-111,-16],fa:[102,-16],open:1},
  waveRelease:{lean:14,bob:2,head:-9,fw:[152,-266],rw:[108,-263],ra:[-126,-16],fa:[116,-16],open:1},
  roll:{lean:0,bob:20,head:0,fw:[33,-280],rw:[-36,-280],fa:[82,-250],ra:[-71,-254],spin:-165,turn:.7},
  diveKick:{lean:18,bob:10,head:-17,fw:[45,-323],rw:[-91,-295],fa:[181,-40],ra:[-38,-163],ffoot:8},
  elbow:{lean:29,bob:4,head:-17,fw:[44,-338],rw:[-82,-265],fa:[121,-66],ra:[-102,-90],fan:0,open:0},
  floorFire:{lean:28,bob:39,head:-19,fw:[125,-221],rw:[-105,-289],ra:[-134,-16],fa:[125,-16],open:1},
  clawLoad:{lean:15,bob:18,head:-9,fw:[-17,-235],rw:[-99,-302],ra:[-122,-16],fa:[113,-16],open:1,turn:.17},
  clawCut:{lean:20,bob:13,head:-13,fw:[159,-275],rw:[-73,-306],ra:[-124,-16],fa:[132,-16],open:1,turn:.3},
  clawRake:{lean:32,bob:30,head:-17,fw:[126,-207],rw:[-120,-319],ra:[-147,-16],fa:[129,-16],open:1,turn:.48}
 };
 const K=(name,over={})=>Object.assign({},pose[name]||{},over);
 const clips={};
 function add(id,key,wind,active,recover=null,meta={}){clips[id+':'+key]={wind,active,recover,meta};}
 const W=(p)=>[[0,{}],[.55,p],[.77,p]], A=(p)=>[[0,p],[.7,p],[1,p]];
 // RYU: grounded compression, a compact rotation, and a deliberate landing.
 // KEN: loose guard, aggressive lead shoulder, stepped flame arcs.
 // CHUN-LI: open palms counterbalance independently articulated kicks.
 // CAMMY: streamlined silhouettes, held extension instead of random flurries.
 // LUKE: boxing pivots, massive forearm acceleration and visible recoil.
 // JURI: arcing taekwondo, off-axis torso, violet cutting trails.
 // MAI / SF6. Her DP is a knee-to-flipping KICK, never an uppercut with a fan.
 // IORI is intentionally retained as a custom crossover guest, not an SF6 roster claim.
 // 24 super identities. Phases below are full choreography, not one universal loop.
 // Per-character normal gestures: the same button does not mean the same silhouette.
 function normalClip(f,m){const id=f.ch.id,lv=(m.level||1)-1,kick=m.pose==='kick',low=m.normalState==='c',air=m.normalState==='a';let wind,contact,follow;
  if(kick){wind=K('chamber');contact=K(low?'sweep':lv===0?'thrust':lv===1?'thrust':'round');follow=K('chamber');if(lv===0&&!low)Object.assign(contact,{fa:[185,-127],lean:-11,ffoot:55});if(air)Object.assign(contact,{ra:[-81,-150],fa:lv===2?[194,-211]:[211,-161],lean:-18,ffoot:78});}
  else{wind=K(lv===0?'guard':'coil');contact=K(['jab','cross','hook'][lv]);follow=K('guard');if(low)Object.assign(contact,{bob:48,fw:lv===2?[117,-367]:[173,-271],lean:lv===2?-8:14,ra:[-117,-16],fa:[126,-16]});if(air)Object.assign(contact,{fa:[76,-154],ra:[-78,-123],lean:19,fw:lv===2?[146,-253]:[165,-284]});}
  if(id==='ryu'){wind.lean=(wind.lean||0)*.8;contact.lean=(contact.lean||0)*.87;if(!kick){contact.rw=[3,-281];if(lv===2&&!low)contact.fw=[132,-280];}}
  if(id==='ken'){contact.turn=.17+lv*.1;contact.head=-4;if(kick&&!low){contact.fw=[57,-317];contact.rw=[-72,-283];contact.fa[1]-=lv*9;}}
  if(id==='chun'){wind.open=contact.open=follow.open=1;if(kick){contact.fw=[123,-283];contact.rw=[-14,-287];if(lv===2&&!low)contact.fa=[183,-347];}else{contact.fw[1]+=9;contact.rw=[-24,-296];contact.lean-=4;contact.handAngle=lv===2?-25:-8;}}
  if(id==='cammy'){contact.lean+=5;contact.rw=[1,-314];wind.rw=[-3,-307];if(kick&&lv===2&&!low){contact.fa=[167,-351];contact.lean=-40;}if(!kick&&lv===2){contact.fw=[120,-316];contact.turn=.46;}}
  if(id==='luke'){wind.fw[0]-=lv*9;contact.lean+=6;contact.rw=[6,-319];if(!kick){contact.fw[0]+=8;contact.turn=.21+lv*.08;follow.lean=7;}}
  if(id==='juri'){wind.open=contact.open=follow.open=1;contact.head=11;if(kick){wind.fa=[71,-161];contact.fw=[48,-234];contact.rw=[-91,-296];contact.lean-=9;contact.turn=.26;if(lv===2&&!low){wind.fa=[57,-377];contact.fa=[198,-229];}}else{contact.rw=[-89,-252];contact.fw[1]+=20;contact.lean+=7;contact.handAngle=20;}follow.fa=[67,-110];}
  if(id==='mai'){wind.fan=contact.fan=follow.fan=1;wind.fw=kick?[79,-318]:lv===2?[13,-318]:[43,-277];if(kick){contact.fw=[75,-333];contact.rw=[-113,-264];contact.head=7;contact.turn=.22;}else{contact.fw=low?[149,-257]:air?[143,-240]:lv===0?[149,-276]:lv===1?[142,-313]:[134,-246];contact.fanAngle=lv===0?-31:lv===1?10:36;contact.rw=[-89,-297];contact.lean=lv===2?18:7;contact.turn=lv===2?.44:.13;contact.open=0;follow.fw=[89,-302];}}
  if(id==='iori'){wind.open=contact.open=follow.open=1;if(!kick){wind=K('clawLoad',{fw:lv===2?[48,-361]:[-14,-255]});contact=K(lv===2?'clawRake':'clawCut',{fw:low?[163,-244]:lv===2?[154,-231]:[168,-290],lean:low?29:25,bob:low?45:14});follow=K('clawLoad');}else{contact.fw=[103,-241];contact.rw=[-79,-233];contact.lean+=8;contact.head=-7;if(lv===2&&!low){wind.fa=[67,-375];contact.fa=[189,-111];contact.lean=15;}}}
  if(low&&kick){contact.bob=60;contact.ra=[-112,-16];contact.fa[1]=-25;wind.bob=44;follow.bob=39;}
  return {wind:[[0,{}],[.64,wind],[.8,wind]],active:[[0,contact],[.26,contact],[1,merge(contact,low?{bob:(contact.bob||0)+3}:{lean:(contact.lean||0)+2})]],recover:follow,meta:{material:kick?'normal-kick':'normal-hand',line:(low?'下段 / ':air?'空中 / ':'站立 / ')+m.name}};
 }
 function select(f,m){let key=m.id==='CA'?'SA3':m.base||m.id;let clip=clips[f.ch.id+':'+key];if(clip)return clip;if(m.category==='normal')return normalClip(f,m);
  // Custom stance branches remain explicitly labelled adaptations. They inherit a
  // character's appropriate authored family, not a universal punch/kick animation.
  const map={ryu:['hasho','blade','shoryu','tatsu','hadoken','blade'],ken:['hadoken','shoryu','dragonlash','jinrai','dragonlash','tatsu'],chun:['kikoken','legs','tensho','hazan','bird','tensho'],cammy:['knuckle','hooligan','knuckle','arrow','strike','spike'],luke:['sand','rising','flash','avenger','airflash','flash'],juri:['saiha','gooh','tensen','saiha','gooh','anken'],mai:['kachosen','hissatsu','ryuenbu','musabi','shinobibachi','ryuenbu'],iori:['aoihana','aoihana','kototsuki','kototsuki','yamibarai','oniYaki']};
  if(m.category==='branch'){
   let i=parseInt(m.id.split('_')[1])||0;const family=map[f.ch.id][i%6],parent=clips[f.ch.id+':'+family];
   if(!m.from||m.rekkaFrom||m.kind.includes('projectile')||['spin','barrage','burst'].includes(m.kind))return parent;
   // Twelve follow-up paths per original six-person roster. The second action
   // has its own chamber/contact/recoil, rather than replaying the first action.
   const route=i%2,n=Math.floor(i/2),id=f.ch.id;
   const punches=['jab','hook','fistRise','cross','floorFire','clawCut'];
   const kicks=['thrust','round','sweep','knee','kickRise','diveKick'];
   let wind=K(route?'chamber':id==='iori'?'clawLoad':'coil'),impact=K(route?kicks[n%6]:punches[n%6]);
   if(m.kind==='upper')impact=K(route?'kickRise':'fistRise');
   if(m.height==='low')impact=K(route?'sweep':'floorFire');
   if(m.kind==='overhead')impact=K('round',{fa:[173,-325],lean:-28});
   if(id==='chun') {wind.open=1;impact.open=1;impact.rw=[-21,-309];impact.head=(impact.head||0)-2;}
   if(id==='cammy'){wind.rw=[-9,-329];impact.rw=[-7,-316];impact.bob=(impact.bob||0)+6;impact.turn=(impact.turn||0)+.11;}
   if(id==='luke'&&!route){wind.fw=[6,-327];impact.lean=(impact.lean||0)+8;impact.rw=[-45,-286];}
   if(id==='juri'){wind=K('chamber',{fw:[73,-227],rw:[-72,-255],head:11});impact.rw=[-108,-236];impact.open=1;impact.head=(impact.head||0)+9;}
   if(id==='mai'){wind.fan=1;wind.fanAngle=-58;impact.fan=1;impact.fanAngle=route?-16:38;impact.rw=[-65,-302];impact.head=(impact.head||0)+3;}
   if(id==='iori'){wind.open=impact.open=1;impact.rw=[-112,-255];impact.lean=(impact.lean||0)+9;impact.head=(impact.head||0)-7;}
   if(id==='ken'){wind.bob=(wind.bob||0)+9;impact.turn=(impact.turn||0)+.16;}
   const overshoot=merge(impact,{lean:(impact.lean||0)+(route?-4:5),head:(impact.head||0)-2});
   return {wind:W(wind),active:[[0,impact],[.2,overshoot],[.62,merge(impact,{turn:(impact.turn||0)+.17})],[1,K(route?'chamber':'guard')]],recover:K('guard'),meta:{material:parent.meta.material,line:m.name+'：'+(route?'腿系二段 · 收膝、换轴、终结':'拳系二段 · 蓄势、贯穿、回防')+'（同人扩展）'}};
  }
  let w=K('coil'),hit=K('elbow');if(m.kind==='impact'||m.kind==='reversal'){if(f.ch.id==='chun'||f.ch.id==='juri'){w=K('chamber',{bob:12});hit=K('thrust',{fa:[242,-200],lean:-24});}if(f.ch.id==='iori'){w=K('clawLoad',{bob:26});hit=K('clawRake',{fw:[167,-246],lean:31});}if(f.ch.id==='mai'){w=K('coil',{fan:1,fw:[23,-309]});hit={lean:23,fw:[153,-272],rw:[-78,-293],fan:1,turn:.3};}}
  if(['par','stance','denjin','rush'].includes(m.kind)){w=merge(neutralData[f.ch.id],{bob:18,fw:[51,-274],rw:[-11,-275],open:1});hit=merge(w,{bob:9,fw:[81,-316],rw:[-33,-292]});}
  return {wind:W(w),active:A(hit),recover:neutralData[f.ch.id],meta:{material:m.kind,line:m.name}};
 }
 function rotate(f,m,q,p,meta){
  if(meta.spin==='tatsu'){const cycle=(m.strength===3?3.2:2.2)*(f.ch.id==='ken'?1.15:1),ph=q*Math.PI*2*cycle,c=Math.cos(ph);p=merge(p,{lean:-12,bob:6,head:7,fw:[65*c,-309],rw:[-87*c,-296],fa:[205*c,-223-Math.sin(ph)*19],ra:[-47,-118],ffoot:85*c,rfoot:12,turn:(1-c)/2,depth:.8+Math.abs(c)*.2,floor:f.ch.id==='ken'?-43:-27});}
  if(meta.spin==='bird'){const ph=q*Math.PI*2*(m.strength===3?3.5:2.5),c=Math.cos(ph);p=merge(p,{spin:180,floor:-36,lean:0,bob:0,fw:[74,-397],rw:[-74,-397],fa:[216*c,-180-Math.sin(ph)*24],ra:[-216*c,-180+Math.sin(ph)*24],ffoot:90*c,rfoot:-90*c,turn:(1-c)/2,depth:.86+Math.abs(c)*.14});}
  if(meta.spin==='legs'){const ph=q*Math.PI*2*(m.hits+1),cycle=Math.floor(q*(m.hits+1)),u=ph%(Math.PI*2),extension=(Math.cos(u)+1)/2,y=[-175,-220,-267][cycle%3];p=merge(p,{fa:[mix(76,223,extension),mix(-153,y,extension)],ffoot:mix(12,78,extension),lean:-16,fw:[116,-287],rw:[-11,-289],turn:.13+extension*.1,ra:[-78,-16]});}
  if(meta.spin==='arrow'){const ph=q*Math.PI*4;p=merge(p,{turn:(1-Math.cos(ph))/2,depth:.87+Math.abs(Math.cos(ph))*.13,fa:[240,-104+Math.sin(ph)*10],ra:[214,-134-Math.sin(ph)*10],spin:Math.sin(ph)*3});}
  return p;
 }
 function sample(f,m,t,base){const clip=select(f,m),s=Math.max(1,m.startup||1),a=Math.max(1,m.active||1),r=Math.max(1,m.recovery||1);let p;
  const first=clip.active[0][1];
  if(t<s)p=frames([...clip.wind,[1,first,'strike']],t/s,base);
  else if(t<s+a){const q=(t-s)/a;p=frames(clip.active,q,base);p=rotate(f,m,q,p,clip.meta);}
  else {let last=rotate(f,m,1-1e-5,frames(clip.active,1-1e-5,base),clip.meta),rest=copy(base);const turn=Math.round((last.spin||0)/360)*360;rest.spin=turn;const fold=merge(rest,clip.recover||pose.guard);if(!('spin' in (clip.recover||{})))fold.spin=turn;
   p=frames([[0,last],[.29,fold],[.76,blend(fold,rest,.84)],[1,rest]],(t-s-a)/r,base);
  }
  // Weak/medium/heavy retain their move's identity but differ in loading and extension.
  const strength=m.strength??((m.level||1)-1);if(m.category==='special'&&strength<3){p.lean*=.9+strength*.05;if(t<s)p.bob+=(strength-1)*Math.sin(t/s*Math.PI)*3;}
  if(f.attack?.holding){const pulse=Math.sin((f.attack.holdTicks||0)*.24);p.bob+=pulse*.7;p.head+=pulse*.4;}
  return p;
 }
 function describe(f,m){const c=select(f,m);return {name:m.name,identity:c.meta.line,material:c.meta.material,key:f.ch.id+':'+(m.id==='CA'?'SA3':m.base||m.id),phases:['预备','发力','命中','收势']};}
 return {neutral,sample,describe,clips,register:add,author:{K,W,A,neutralData},version:'5.0.0'};
})();
