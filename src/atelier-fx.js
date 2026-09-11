/* SVG effect direction. All geometry is attached to the same pose rig used by
 * collision. No raster sprite sheets, canvas, timers, or per-frame DOM churn.
 * Each effect family has a different silhouette, flow direction and rhythm.
 */
(() => {
'use strict';
const C={ryu:['#489fd8','#a5e8ff','#eefeff'],ken:['#e84d32','#ffac4d','#fff1b2'],chun:['#2f97a7','#94e6df','#f2fff0'],cammy:['#729bad','#bfdce4','#f6ffff'],luke:['#b68d5e','#e7be82','#fff4d4'],juri:['#7a3daa','#d38dec','#fdecff'],mai:['#dc4f42','#ffa366','#fff3cd'],iori:['#613b99','#ae75e6','#f7dfff']};
const mix=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),n=x=>Number(x).toFixed(2),pt=p=>n(p[0])+' '+n(p[1]);
const P=(d,c,o=1,attr='')=>`<path d="${d}" fill="${c}" opacity="${n(o)}" ${attr}/>`;
const L=(d,c,w=1,o=1,attr='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${n(w)}" opacity="${n(o)}" stroke-linecap="round" stroke-linejoin="round" ${attr}/>`;
const E=(x,y,rx,ry,c,w,o=1)=>`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${c}" stroke-width="${n(w)}" opacity="${n(o)}"/>`;
const G=(transform,body,opacity=1)=>`<g transform="${transform}" opacity="${n(opacity)}">${body}</g>`;
const trans=(p,a=0,s=1)=>`translate(${pt(p)}) rotate(${n(a)}) scale(${n(s)})`;
function inverseWorld(f,p,world){const s=f.renderScale||f.ch.scale,r=(p.spin||0)*Math.PI/180,x=(world[0]-f.x)/(s*f.dir*(p.depth||1))-(p.rootShift||0),y=(world[1]-665-f.y)/s-(p.floor||0)+180;return[x*Math.cos(r)+y*Math.sin(r),-x*Math.sin(r)+y*Math.cos(r)-180];}
function point(f,m,p,rig,ctx){const foot=m.contactPart?m.contactPart==='foot':m.pose==='kick';
 let local=foot?rig.frontLeg[2]:rig.frontArm[2],arm=!foot;
 if(m.contactPart==='elbow')local=rig.frontArm[1];
 if(m.contactPart==='body'){local=[44,-255];arm=true;}
 if(m.contactPart==='pillar'){local=[0,-250];arm=true;}
 let world=ctx.poseWorldPoint(f,local,p,arm);
 if(m.contactPart==='fan'){const fan=ctx.poseWeaponGeometry(f,p,rig);if(fan[1])world=fan[1];}
 return inverseWorld(f,f.pose,world);
}
function trail(f,m,t,ctx){const out=[],parts=[];
 for(const offset of [9,6.5,4,2,0]){const age=Math.max(m.startup-3,t-offset),proxy=Object.create(f);proxy.attack={...f.attack,t:age};const p=ctx.desiredPose(proxy),r=ctx.poseRig(proxy,p);out.push(point(f,m,p,r,ctx));
  const leg=[r.frontLeg[1],r.frontLeg[2]].map(v=>inverseWorld(f,f.pose,ctx.poseWorldPoint(f,v,p,false)));parts.push(leg);
 }return {points:out,parts};
}
function flame(warm,light,core,phase=0,long=1){const w=Math.sin(phase)*9;
 return P(`M9 0C-6-21-35-13-54-30Q-42-5-77-17L-139 ${n(-20+w)}Q-95 7-169 18L-107 29Q-112 8-63 13L-91 39Q-47 28-24 26C-2 24 13 15 9 0Z`,warm,.66)+P(`M8 0Q-11-13-44-12L-28-3-77 2-113-5-88 11-130 21-79 22-45 14-55 28Q-8 25 8 0Z`,light,.88)+P('M6 2Q-8-5-38 1L-70 9-32 8-43 16Q-7 13 6 2Z',core,.92)+L(`M-95 ${n(28+w*.3)}L-118 32M-122 ${n(-12+w)}L-147 ${n(-17+w)}`,light,1.1,.72);
}
function crescent(p,angle,r,col,core,phase=0){return G(trans(p,angle),P(`M${-r} ${-r*.4}Q${r*.12} ${-r*.85} ${r*.18} 0Q${r*.02} ${r*.5} ${-r*.8} ${r*.46}Q${r*.15} ${r*.22} ${-r*.2} ${-r*.24}Q${-r*.4} ${-r*.4} ${-r} ${-r*.4}Z`,col,.36)+L(`M${-r*.7} ${-r*.49}Q${r*.22} ${-r*.71} ${r*.16} ${r*.12}`,core,1.5,.84));}
function speed(p,angle,col,scale=1){let s='';for(let j=0;j<5;j++){const y=(j-2)*12; s+=L(`M${-118-j%3*24} ${y}L${-36-j%2*13} ${y*.56}`,col,1+j%2*.5,.4+j%3*.12);}return G(trans(p,angle,scale),s);}
function petals(t,col){let out='';for(let i=0;i<7;i++){const phase=(t*.055+i*.157)%1,x=-32+Math.sin(i*2.37+phase*3)*112,y=-364+phase*205,angle=i*83+phase*90;out+=G(trans([x,y],angle,.7),P('M0 0Q-13-14-19-7Q-15 4 0 0Q-7 15-17 12Q-20 5 0 0Z',col,.34));}return out;}
function pillar(x,t,palette,scale=1){const [shade,col,core]=palette,w=Math.sin(t*.35+x)*14;return G(`translate(${x} -16) scale(${scale} 1)`,
 P(`M-46 0Q-74-38-50-94L-65-137Q-23-108-33-185L-53-213Q-7-173-19-267L-13-319Q8-288 18-258L24-355Q62-279 40-219L62-244Q75-166 47-124L72-137Q79-68 45-28L53 0Z`,shade,.37)+
 P(`M-29 0Q-45-52-20-89L-36-137Q-6-123-13-204L-25-237Q2-215 12-266Q30-223 15-174L37-187Q41-122 24-94Q60-78 26 0Z`,col,.74)+
 P(`M-9 0Q-28-49-4-82L-10-153Q15-127 13-89Q31-56 10 0Z`,core,.85)+L(`M-38-18Q-56-79-34-123M37-59Q57-121 41-163M${n(w)}-288l5-21`,col,1.6,.83));}
function render(f,state,ctx){if(!f.pose)return;const a=f.attack,m=a?.m,t=a?.t||0,drive=f.state==='rush',parry=f.state==='parry',id=f.ch.id,palette=C[id],reduced=state.minimalFX||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stamp=[m?.id,t,f.state,f.stateAge,!!a?.fanCharging,Math.floor(f.install||0),f.flameStock,reduced].join('|');
 if((state.hitstop||state.paused)&&stamp===f._atelierFXStamp)return;f._atelierFXStamp=stamp;
 let extra='',curve='',ribbon='',alpha=1,color=palette[1];
 const visible=m&&t>=Math.min(5,m.startup*.45)&&t<m.startup+m.active+9;
 if(visible){const desc=SF6Motion.describe(f,m),material=desc.material,active=t>=m.startup,q=clamp((t-m.startup)/Math.max(1,m.active)),fade=clamp((m.startup+m.active+9-t)/12),special=m.category!=='normal',rig=ctx.poseRig(f,f.pose),pos=point(f,m,f.pose,rig,ctx),{points,parts}=trail(f,m,t,ctx),prev=points[1],delta=[pos[0]-prev[0],pos[1]-prev[1]],angle=Math.hypot(...delta)>5?Math.atan2(delta[1],delta[0])*180/Math.PI:0;
  alpha=fade;let width=m.super?12:special?7:2.1;
  if(active&&!m.kind.includes('projectile')){curve=ctx.fxCurve(points);ribbon=ctx.fxRibbon(points,width);}
  if(!active&&special){const load=clamp(t/m.startup);
   if(material.includes('sand'))extra+=G(trans(pos),E(0,0,7+load*17,9+load*19,palette[2],1.2,.2+load*.25)+L('M-38-9L-20-4M-42 12L-23 6',palette[1],1,.5));
   else if(material==='fan-cast')extra+=G(trans(pos),L(`M-35-18Q0 ${-33-load*16} 27-9M-26 21Q2 32 26 12`,palette[1],1.5,.45)+(a.fanCharging?E(0,0,34,34,palette[2],2,.65):''));
   else if(/pressure|wave|sphere/.test(material))extra+=G(trans(pos),E(0,0,6+load*17,5+load*13,palette[1],1.4,.6)+L('M-38-16Q-21-14-11-7M-39 16Q-22 15-12 9',palette[2],1.2,.56));
   else if(m.super&&material!=='feng-shui')extra+=G(trans(pos,0,.2+load*.08),flame(...palette,t));
  }
  if(active&&special){
   if(material==='mai-flame-pillar'){
    curve=ribbon='';const bloom=Math.min(1,(q+.12)*4)*fade;
    extra+=pillar(-78,t,palette,bloom*.9)+pillar(114,t+4,palette,bloom*1.12)+E(0,-9,143,22,palette[1],2.4,.72)+L('M-111-19Q9-52 145-19',palette[2],1.4,.8);
   }else if(material==='feng-shui'){
    curve=ribbon='';extra+=G('translate(20 -340)',E(0,0,23,23,palette[1],1.5,.8)+L('M-31 0H-18M18 0H31M0-31V-18M0 18V31',palette[2],1.3,.7))+E(0,-5,106,17,palette[1],1.6,.65);
   }else if(/hundred-legs|jade-phoenix|jade-sky/.test(material)){
    for(let i=0;i<parts.length-1;i++){const [knee,foot]=parts[i];extra+=L('M'+pt(knee)+'L'+pt(foot),palette[1],13,.07+i*.032)+G(trans(foot),L('M-6 3L18 5 28-1',palette[2],2,.2+i*.08));}
    extra+=speed(pos,0,palette[2],.85);
   }else if(material==='jade-rotor'){
    for(let i=0;i<3;i++)extra+=E(0,-181+i*9,183-i*13,26+i*4,palette[i===1?2:1],i===1?1.6:1,.6-i*.12);
    extra+=L('M-205-178Q-147-226-66-215M69-152Q154-137 200-180',palette[2],2,.75);
   }else if(/white-drill|white-spindrive/.test(material)){
    extra+=G(trans(pos,-9),P('M-290-36Q-110-82 25 0Q-113 64-283 38Q-102 41 12 0Q-85-44-290-36Z',palette[1],.1)+L(`M-282-19Q-219-67-181-26T-79-24T26 0M-278 18Q-214 60-177 21T-77 20T26 0`,palette[2],2,.66)+L('M-239-37L-135-25M-274 38L-167 24',palette[1],1,.65));
   }else if(/white-orbit|white-triangle/.test(material)){
    extra+=E(0,-218,118,154,palette[1],1,.42)+L(`M-123-219Q-122-331-28-369M102-132Q56-66-32-83`,palette[2],2.1,.72)+speed(pos,angle,palette[2],.7);
   }else if(/white/.test(material)){
    extra+=speed(pos,angle,palette[2],1.1)+crescent(pos,angle,79,palette[1],palette[2]);
   }else if(material==='flame-ring'||material==='air-ring'){
    const y=pos[1],fiery=material==='flame-ring';
    extra+=E(0,y,203,34,palette[1],fiery?4:1.5,.45)+L(`M-207 ${y+3}Q-107 ${y+64} 79 ${y+29}M-79 ${y-34}Q106 ${y-54} 210 ${y}`,palette[2],fiery?2.6:1.2,.76);
    if(fiery)extra+=G(trans(pos,angle,.43),flame(...palette,t));
   }else if(material==='fire-sweep'){
    extra+=G(trans(pos,angle,.6),flame(...palette,t))+crescent([38,-252],12,162,palette[1],palette[2])+petals(t,palette[2]);
   }else if(material==='fire-backflip'){
    extra+=G(trans(pos,angle,.55),flame(...palette,t))+L(ctx.fxCurve(points),palette[1],9,.36)+L(ctx.fxCurve(points.map(p=>[p[0]+8,p[1]+7])),palette[2],1.5,.8);
   }else if(/fire-elbow|mai-super-bee|fire-body-dive/.test(material)){
    extra+=G(trans(pos,material==='fire-body-dive'?43:0,m.super?.85:.68),flame(...palette,t))+speed(pos,material==='fire-body-dive'?38:0,palette[2],1.2);
   }else if(material==='mai-sakura'){
    extra+=crescent(pos,angle,106,palette[1],palette[2])+petals(t,palette[2]);
    const arm=rig.frontArm,fanPoint=point(f,{contactPart:'fan'},f.pose,rig,ctx);extra+=G(trans(fanPoint,angle,.42),flame(...palette,t));
    if(q>.87)extra+=pillar(136,t,palette,.6);
   }else if(/violet-(claw|grabfire|slam)|iori-eight|iori-final/.test(material)){
    for(let j=-1;j<=1;j++){const off=j*9;extra+=L(ctx.fxCurve(points.map(p=>[p[0],p[1]+off])),j?palette[1]:palette[2],j?2:2.8,.82);}
    extra+=G(trans(pos,angle,.42),flame(...palette,t));
    if(material==='iori-final-flame'&&q>.78)extra+=pillar(126,t,palette,.67);
   }else if(/violet-(wheel|axe|double|annihilation|cutter|collect)|violet-helix/.test(material)){
    extra+=crescent(pos,angle,material==='violet-axe'?127:90,palette[1],palette[2]);
    if(material==='violet-collect')extra+=G(trans(pos),E(-10,0,42,16,palette[2],1.4,.74));
    if(material==='violet-double')extra+=crescent(points[1],angle+23,75,palette[0],palette[1]);
    if(material==='violet-helix')extra+=G(trans(pos,angle,.48),flame(...palette,t));
   }else if(/fire|flame/.test(material)){
    extra+=G(trans(pos,angle,m.super?.7:.48),flame(...palette,t));
    if(/crescent|downarc|kicks|dragonkick/.test(material))extra+=crescent(pos,angle,100,palette[1],palette[2]);
   }else if(/sand/.test(material)){
    const size=material==='sand-explosion'||material==='sand-erasure'?1.45:1;
    extra+=G(trans(pos,angle,size),L('M-5-33Q30 0-5 33M-12-43Q40 0-12 43',palette[2],1.7,.83)+P('M-41-24L15-10 29 0 16 12-45 26-14 5Z',palette[1],.17));
    extra+=speed(pos,angle,palette[1],.95);
    for(let j=0;j<6;j++){const x=pos[0]-26-j*16,y=pos[1]+Math.sin(t*.25+j*4)*27;extra+=P(`M${x} ${y}l-3-1 1 4 3-1Z`,palette[2],.6);}
   }else if(/jade/.test(material)){
    extra+=crescent(pos,angle,85,palette[1],palette[2])+speed(pos,angle,palette[1],.55);
   }else if(/pressure-ring|rising-blue|dragon-blue|pressure-sphere|air-blade/.test(material)){
    extra+=G(trans(pos,angle),E(1,0,17,38,palette[1],1.7,.7)+L('M-51-22Q-13-38 3-29M-55 24Q-13 39 3 28',palette[2],1.7,.86));
    if(material==='pressure-ring')extra+=G(trans(pos),E(14,0,33,62,palette[1],1.5,.43));
   }
  }
  if(m.category==='normal'&&id==='iori'&&m.pose!=='kick'&&active){for(let j=-1;j<=1;j++)extra+=L(ctx.fxCurve(points.map(p=>[p[0],p[1]+j*6])),palette[2],1,.3);}
  if((m.kind==='impact'||m.kind==='reversal')&&active){color='#ffa56c';extra+=G(trans(pos,angle),P('M-192-50L-88-32-139-17-41-13-32 9-142 13-85 35-194 54-125 17-243 23-174-4-231-39-136-23Z',color,.43)+L('M-206-29L-71-12M-192 26L-78 14','#ffe0b2',2,.7));}
 }
 if(drive){color='#77eeaa';extra+=P('M-204-10L-92-38-173-49-78-95-173-114-92-167-129-231-61-270-50-186-66-114-40-63-95-22Z',color,.22)+L('M-217-38L-132-62M-229-151L-139-139M-161-269L-99-244',color,3,.8)+L('M-177-84L-113-95M-129-189L-97-206','#e6ff9f',1.7,.8);}
 if(parry){color='#a0caf4';extra+=L('M112-370Q174-298 123-207',color,2.4,.78)+P('M121-376Q184-298 130-200L125-214Q160-298 121-376Z',color,.14)+E(127,-291,24,57,'#e7f9ff',1,.4);}
 if(f.install>0)extra+=E(0,-6,112,17,palette[1],1.4,.65);
 if(f.ch.id==='mai'&&f.flameStock>0&&!m){for(let i=0;i<f.flameStock;i++)extra+=P(`M${-36+i*18} -188l4-7 4 7-4 5Z`,palette[1],.43);}
 ctx.sa(f.fxArc,'d',curve);ctx.sa(f.fxCore,'d',curve);ctx.sa(f.fxFill,'d',ribbon);ctx.sa(f.fxArc,'stroke',color);ctx.sa(f.fxCore,'stroke',palette[2]);ctx.sa(f.fxFill,'fill',color);ctx.sa(f.fxArc,'stroke-width',m?.super?5:m?.category==='normal'?1.4:3.2);ctx.sa(f.fxCore,'stroke-width',m?.category==='normal'?.65:1.1);
 ctx.sa(f.fxArc,'opacity',curve?alpha*.44:0);ctx.sa(f.fxCore,'opacity',curve?alpha*.66:0);ctx.sa(f.fxFill,'opacity',ribbon?alpha*(reduced?.045:.14):0);
 if(reduced&&m?.category==='normal')extra='';
 if(f._fxExtra!==extra){f._fxExtra=extra;ctx.patchMoveFX(f.fxExtra,extra);}ctx.sa(f.fxExtra,'opacity',reduced?alpha*.55:alpha);
}
function projectile(s){const id=s.owner.ch.id,[shade,col,core]=C[id],sup=!!s.m.super,scale=sup?1.36:1;let art='';
 if(id==='mai'){
  if(s.m.flameEnhanced||s.m.fanCharged)art+=G('translate(-3 0) scale(.53)',flame(shade,col,core,0));
  art+=G('translate(-18 0) scale(.63)',`<g data-spin="fan">${SF6Art.fan(s.owner.ch)}</g>`);
  art+=L('M-88-17Q-48-23-24-16M-90 18Q-49 28-27 17',col,1.3,.7);
 }else if(id==='iori'){
  art=G('translate(0 44) rotate(-90) scale(.9)',flame(shade,col,core,0))+L('M-115 42L-27 42M-88 46H17',col,1.7,.75);
  if(sup)art+=G('translate(-68 44) rotate(-90) scale(.64)',flame(shade,col,core,2));
 }else if(id==='luke'){
  art=P('M-141-25L-30-19 20-3 29 0 17 14-31 26-124 30-58 7Z',col,.22)+L('M-17-28Q31 0-17 28M-27-36Q45 0-27 36',core,2,.95)+L('M-142-19L-54-10M-170 17L-61 9',col,1.8,.8);
 }else if(id==='juri'){
  art=P('M-126 27Q-33-23 21-28Q-7 27-111 40Q-8 11 6-16Q-43-7-126 27Z',col,.76)+L('M-119 23Q-31-22 18-26',core,2,.9)+L('M-151 37Q-74 12-33 9',shade,3,.8);
 }else{
  const r=sup?57:38;
  art=P(`M${-r*3.4}-${r*.64}Q${-r*.78}-${r*.81} 0-${r*.6}Q${r*.85} 0 0 ${r*.6}Q${-r} ${r*.89} ${-r*3.3} ${r*.52}L${-r*1.63} 1Z`,shade,.38)+`<g data-spin="energy">`+P(`M${-r} 0Q${-r*.7} ${-r} 3 ${-r*.83}Q${r} ${-r*.47} ${r*.92} 8Q${r*.46} ${r} -9 ${r*.79}Q${-r*.89} ${r*.6} ${-r} 0Z`,col,.57)+L(`M${-r*.88} -4Q${-r*.47} ${-r*1.04} 12 ${-r*.68}Q${r*.9} ${-r*.4} ${r*.71} 10M${r*.58} ${r*.63}Q${-r*.16} ${r*1.04} ${-r*.7} ${r*.32}`,core,2.1,.87)+P(`M${-r*.63} 0Q${-r*.3} ${-r*.48} ${r*.33} ${-r*.3}L${r*.5} 3Q${r*.04} ${r*.54} ${-r*.52} ${r*.2}Z`,core,.83)+'</g>'+L(`M${-r*2.75} ${-r*.51}Q${-r*1.3} ${-r*.82} ${-r*.72} ${-r*.54}M${-r*2.45} ${r*.55}Q${-r*1.25} ${r*.77} ${-r*.65} ${r*.51}`,col,1.6,.8);
 }
 s.visual.innerHTML=G(`scale(${scale})`,art);s.spin=s.visual.querySelector('[data-spin]');s.spinKind=s.spin?.getAttribute('data-spin');
}
window.SF6FX={render,projectile,palette:C};
})();
