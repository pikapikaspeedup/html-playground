/* ATELIER / vector character art. Original, editable SVG paths; no raster assets.
   Coordinates: shoulder y=-292, pelvis y=-191, sole y=0. Every attachment is
   rendered on the same articulated rig used by combat collision. */
'use strict';
window.SF6Art = (() => {
  const INK = '#201e2b';
  const P = (d, fill, w=1.35, extra='') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const F = (d, fill, extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const L = (d, stroke, w=1.1, extra='') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const E = (cx,cy,rx,ry,fill,extra='')=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
  const G = (content,transform='')=>`<g${transform?` transform="${transform}"`:''}>${content}</g>`;
  const palette = {
    ryu:{skin:['#ffe0b1','#cd9975','#8c5549'],cloth:['#f4edda','#cecbbd','#858892'],dark:['#845050','#4d2d3a','#251e2c'],hair:['#675256','#292633','#171924'],trim:'#c93c48',eye:'#663e2c'},
    ken:{skin:['#ffe3bd','#d4a077','#956051'],cloth:['#dfb787','#ad815d','#725849'],dark:['#51454b','#302c36','#1a1e2b'],hair:['#ffe5a2','#d6a65b','#8f673e'],trim:'#d8453e',eye:'#698380'},
    chun:{skin:['#ffe6d0','#e2b299','#aa7169'],cloth:['#66d4e5','#2586ab','#194467'],dark:['#f4f5ed','#d1dadd','#7c8d9e'],hair:['#56505b','#211f31','#141a2b'],trim:'#e7c482',eye:'#603c38'},
    cammy:{skin:['#ffead5','#ddba9f','#a6736b'],cloth:['#94c8d8','#4d819f','#2b4969'],dark:['#4f5b67','#283642','#171e30'],hair:['#fff0b1','#d6b367','#967642'],trim:'#c93647',eye:'#60877d'},
    luke:{skin:['#ffdcac','#d59b6c','#986151'],cloth:['#ffb274','#ed764e','#a8403c'],dark:['#8fc9e8','#4387bc','#27466e'],hair:['#efc17e','#b0804d','#63483b'],trim:'#e9e8dc',eye:'#588484'},
    juri:{skin:['#ffe3d7','#dbb0a5','#aa7887'],cloth:['#fff7f1','#c9c4d6','#79738d'],dark:['#635367','#32253f','#181a2a'],hair:['#695164','#2d2237','#191725'],trim:'#e2529f',eye:'#b270bc'},
    mai:{skin:['#ffe8d0','#e4b19a','#a86865'],cloth:['#ff8580','#d3324a','#7e2338'],dark:['#fff7e9','#e8d7c9','#a98d99'],hair:['#a46343','#5a322e','#292130'],trim:'#ffe2b5',eye:'#805333'},
    iori:{skin:['#fae1d0','#cfaca1','#917280'],cloth:['#d56670','#a7334b','#5c273c'],dark:['#5e5363','#282533','#171b2a'],hair:['#ec7276','#a62d48','#581e35'],trim:'#e9d8ce',eye:'#73919e'}
  };
  const color=(c,k)=>`url(#atelier-${c.id||c}-${k})`;
  const shade=c=>palette[c.id].skin[2];
  function configure(chars,defs){
    for(const c of chars){
      const p=palette[c.id];
      Object.assign(c, {legacyArt:false,headScale:c.female?.72:.77,headY:-339,headX:6,headSquash:1,handScale:c.id==='luke'?.87:c.female?.7:.81,footScale:c.female?.83:.92,limbStroke:1.45});
      c.rigRearShoulder=[c.female?-33:-42,-292]; c.rigFrontShoulder=[c.female?34:42,-290];
      c.armWidths=c.female?[15.8,10,7.3]:c.id==='luke'?[26,17,12]:c.id==='iori'?[19,12,8.6]:[24,15.5,10];
      c.legWidths=c.id==='chun'?[34,21,11.5]:c.id==='mai'?[27,16.5,9]:c.id==='cammy'?[28,17,10]:c.id==='iori'?[29,21,12]:c.id==='juri'?[32,22,12]:[32,22,13];
      for(const k of ['skin','cloth','dark','hair'])defs.insertAdjacentHTML('beforeend',`<linearGradient id="atelier-${c.id}-${k}" x1="0" y1="0" x2=".92" y2=".75"><stop offset="0" stop-color="${p[k][0]}"/><stop offset=".44" stop-color="${p[k][1]}"/><stop offset="1" stop-color="${p[k][2]}"/></linearGradient>`);
    }
    defs.insertAdjacentHTML('beforeend','<linearGradient id="atelier-scarlet" x2=".85" y2="1"><stop stop-color="#f86a5f"/><stop offset=".5" stop-color="#bb2e44"/><stop offset="1" stop-color="#601e38"/></linearGradient><linearGradient id="atelier-gold" x2=".6" y2="1"><stop stop-color="#fff0b2"/><stop offset=".47" stop-color="#d9ac69"/><stop offset="1" stop-color="#866140"/></linearGradient>');
  }
  function eyes(c,mood){
    const p=palette[c.id],female=c.female;
    if(mood==='hurt')return L('M-11-9l8 4-8 3M9-5l12-5-8 8',p.hair[2],1.9)+P('M4 18Q13 13 21 18L18 25 7 24Z','#4d2937',.9)+F('M8 21L18 21 17 24 8 24Z','#cd7780');
    let o='';
    const y=mood==='power'?1:0;
    o+=P(`M-14 ${-10+y}Q-7 ${-15+y}0 ${-9+y}Q-6 ${-4+y}-12 ${-7+y}Z`,'#f8e6da',.8);
    o+=P(`M8 ${-8+y}Q18 ${-16+y}27 ${-10+y}Q22 ${-3+y}11 ${-5+y}Z`,'#fff4df',.8);
    o+=E(-4,-9+y,2.1,3.05,p.eye)+E(20,-8+y,2.7,3.7,p.eye)+E(-3.5,-9+y,1.1,2.4,'#24222e')+E(20.5,-8+y,1.35,2.8,'#22232b');
    o+=E(21,-9.5+y,.75,.9,'#fff3db')+E(-3.4,-10+y,.55,.7,'#fff1dc');
    o+=L(female?'M-14-10Q-7-15 0-9M8-8Q18-16 27-10l3-2':'M-14-12L-3-11M8-10L27-13',p.hair[2],female?1.5:1.8);
    o+=L(mood==='power'?'M-15-18L-2-13M8-13L27-20':female?'M-15-19Q-8-22 0-17M9-18Q18-23 28-20':'M-16-22L-2-18M7-18L29-23',p.hair[1],female?1.6:3.2);
    if(mood==='power')o+=P('M4 18Q12 13 22 16L19 26 8 27Z','#492634',.8)+F('M7 17L20 17 19 20 8 20Z','#fff0d8');
    else o+=L(c.id==='juri'?'M4 17Q15 23 25 13':c.id==='mai'?'M6 18Q14 22 21 16':'M5 18Q14 16 22 18',c.female?'#985061':'#693e3c',1.1)+L('M10 23L17 23',p.skin[0],1.05);
    return o;
  }
  
  
  function hands(c,open=false){
    const p=palette[c.id],id=c.id,gloved=!['mai','iori','chun','juri'].includes(id),fill=gloved?(id==='luke'?color(c,'dark'):id==='ken'?'#38343d':'url(#atelier-scarlet)'):color(c,'skin');let o='';
    if(open){
      o+=P('M-12-10L1-12 10-20 21-26Q26-28 25-23L17-14 33-18Q38-19 37-15L21-8 38-10Q43-10 41-6L23-2 39 0Q44 1 40 4L23 6 32 11Q35 15 31 16L16 10 6 13-9 9Z',color(c,'skin'),1.25);
      o+=L('M14-11L10-4 16 4M21-7L14-6M23-1L16 0M21 6L17 5',p.skin[2],.85);
    }else{
      o+=P('M-11-11L1-12 6-17 20-18Q26-18 29-12L33-3 31 11 21 16 5 13-11 8Z',fill,1.35);
      o+=F('M3-11L8-15 20-15 26-9 26-3 12-2 4-5Z',gloved?(id==='luke'?'#a2d0e7':'#eb8c78'):p.skin[0],'opacity=".62"');
      o+=P('M0-2Q3-9 9-5L19 2Q24 5 20 9L11 10 3 5Z',color(c,'skin'),.85)+L('M9-13L10-7M16-15L17-7M23-12L24-6M9 4L17 6',gloved?'#583142':p.skin[2],.9);
      o+=F('M29 1L29 9 20 14 5 11 6 7 15 10 24 6Z',gloved?'#272536':p.skin[2],'opacity=".4"');
    }
    const cuff=id==='chun'?'#322938':id==='mai'?p.dark[0]:id==='iori'?p.trim:id==='juri'?'#382337':fill;
    o+=P('M-17-12L-3-12-3 10-17 9Z',cuff,1.1)+L('M-14-7L-6-7M-14-1L-6 0',id==='mai'?'#cda79a':id==='luke'?'#d9eced':'#a7857b',.95);
    if(id==='chun'){o+=P('M-16-12L-12-23-8-12M-18 7L-24 12-14 10',p.trim,.95)+L('M-15-10L-6-10M-16 7L-6 8',p.trim,1.5);}
    if(id==='iori')o+=P('M-16-13L-12-19-3-16-2-11Z','#5d4157',.8);
    return o;
  }
  function feet(c){
    const id=c.id,p=palette[id],bare=['ryu','juri','luke'].includes(id),mai=id==='mai';let o='';
    if(bare||mai){o+=P('M-10-17L8-16 12-5 22 1 35 5Q43 7 42 15L38 19Q9 24-16 14L-17 5Z',color(c,'skin'),1.2)+F('M-16 9Q6 18 38 13L40 17Q11 25-16 15Z',p.skin[2],'opacity=".7"')+L('M32 6L32 14M26 5L27 15M20 3L21 14M14 1L15 12M-8-7Q0-1 7-5',p.skin[2],.85);
      if(mai)o+=P('M-12-24L9-24 11-4 23 2 17 12 2 6-13 0Z',color(c,'dark'),1)+L('M-11-19L8-18M-11-14L9-13M-11-9L10-8M6 2L14 7',p.dark[2],.9);
      if(id==='juri')o+=P('M-12-23L9-23 11-8-13-8Z',color(c,'dark'),1)+L('M-10-20L9-17M-11-13L10-11',p.trim,2);
      if(id==='luke')o+=P('M-13-25L10-25 11-12-14-12Z','#577487',1)+L('M-11-21L9-19M-12-15L10-14','#bccacf',1.2);
    }else{
      const C=id==='chun'?color(c,'dark'):id==='ken'?'#856753':id==='iori'?'#242333':color(c,'dark');
      o+=P('M-14-27L10-28 13-9 23-1 34 2Q43 4 45 14L41 22Q12 26-19 18L-20 8Z',C,1.4)+P('M-19 13Q11 21 44 12L44 20Q14 29-20 21Z',id==='chun'?'#687885':'#24212d',1)+F('M-9-23L5-24 8-7-11-4Z',id==='chun'?'#fff9e9':id==='iori'?'#625160':'#be9a77');
      o+=L('M-8-18L7-19M-7-12L8-13M-6-6L11-7M22 2L22 13M27 4L37 8',id==='chun'?'#a4a8a6':id==='iori'?'#978b96':'#d2b993',1.2);
      if(id==='cammy')o+=P('M-13-28L9-28 12-13-13-12Z','url(#atelier-scarlet)',1)+L('M-10-23L7-23M-10-18L8-18','#f39487',1);
    }return o;
  }
  function fan(){let o=P('M15 0L34-75Q58-74 75-57 96-38 101-11 88 19 59 53 35 67Z','#fff0d4',1.3)+P('M34-75Q65-72 84-47 99-29 101-11L89-6Q87-32 69-48 53-61 31-61Z','url(#atelier-scarlet)',1);
    for(const [x,y]of[[34,-75],[52,-69],[69,-57],[84,-40],[96,-21],[99,-5],[88,19],[74,38],[55,56],[35,67]])o+=L(`M15 0L${x} ${y}`,'#aa8a6b',1.2);
    o+=L('M36-58Q68-48 85-24M42 42L60 32','#d15858',1.5)+P('M9-4L25-6 25 6 11 9Z','#d7b782',1)+E(18,1,2,2,'#694e47');return G(o);
  }
  function attachments(c){
    const id=c.id,p=palette[id];let head='',coat='',trail='';
    if(id==='ryu'){head=P('M-14-354Q-50-366-88-343L-114-332-98-352Q-54-379-16-364Z','url(#atelier-scarlet)',1.2)+P('M-15-361Q-59-343-77-350L-98-360-87-344Q-51-328-12-353Z','#a92d45',1)+L('M-26-360Q-66-362-98-341','#ff9c7d',1);coat=P('M-5-181L-18-128-4-135 8-177Z','#3d3542',1)+P('M9-179L38-145 40-130 51-143 21-185Z','#4e424c',1)+L('M-10-144L-4-144M-12-137L-6-137','#c4a772',1.5);}
    if(id==='ken'){trail=P('M-44-223L-65-125-56-98-34-119-6-188Z',color(c,'cloth'),1.4)+P('M30-218L51-201 75-99 57-113 46-111 11-191Z',color(c,'cloth'),1.4)+F('M-42-210L-52-127-45-116-19-180Z',p.cloth[2],'opacity=".5"')+L('M-40-194L-52-124M43-187L61-124',p.cloth[0],1.4);}
    if(id==='chun'){head=P('M-15-369Q-38-342-67-322L-80-323-60-337-22-374Z',p.dark[0],1)+P('M21-370Q35-346 27-319L20-307 22-330 12-365Z',p.dark[0],1);coat=P('M-27-208L-42-149-28-93-15-115 3-187Z',color(c,'cloth'),1.2)+P('M18-208L39-183 43-123 28-89 18-128-3-191Z',color(c,'cloth'),1.2)+L('M-29-195L-34-149-27-110M25-191L34-134 28-105',p.trim,2)+P('M-6-210L-12-157 0-139 8-184 6-210Z',color(c,'dark'),1);}
    if(id==='juri')coat=P('M-6-193L-30-144-18-131 12-188Z',color(c,'dark'),1)+P('M8-191L24-145 39-134 32-162 16-199Z',color(c,'dark'),1)+L('M-13-155L-17-143M23-161L27-148',p.trim,2);
    if(id==='mai'){
      head=P('M-10-377Q-50-403-60-377Q-55-352-66-326-80-297-56-276L-38-272Q-57-298-43-328-24-351-27-370L-9-367Z',color(c,'hair'),1.4)+F('M-35-377Q-46-380-44-365L-48-332Q-70-301-51-283-68-299-57-320-34-348-35-377Z',p.hair[0],'opacity=".65"')+L('M-48-371Q-45-353-53-334M-53-304Q-55-290-45-281',p.hair[2],1.5);
      coat=P('M-20-214Q-43-233-57-211L-35-194-24-200-3-211 17-212 38-195 53-207Q40-231 16-216Z',color(c,'dark'),1.3)+P('M-9-208L-19-153-31-124-19-101 2-127 11-168 8-209Z',color(c,'cloth'),1.3)+L('M-5-199L-9-156-22-124-17-115',p.cloth[0],1.5);
      trail=P('M-24-209Q-80-205-62-162-42-136-57-102L-78-71-55-77Q-12-119-41-155-61-187-19-194Z',color(c,'dark'),1.3)+E(-72,-73,12,12,p.dark[0])+L('M-70-81L-70-65M-77-75L-65-69',p.dark[2],.9);
    }
    if(id==='iori')coat=P('M-29-220L-37-169-54-134-25-143 0-194 12-149 35-137 30-205Z','#f3e4da',1.2)+F('M-22-207L-30-169-40-147-25-153-9-190Z','#c7b3b5')+L('M-21-198L-29-158M18-197L23-154','#947e8e',1.1);
    return {head,coat,trail};
  }
  function attach(f){const a=attachments(f.ch);f.headTails.innerHTML=a.head;f.coatTails.innerHTML=a.coat;f.trailing.innerHTML=a.trail;if(f.fan){f.fan.innerHTML=fan();f.frontArm.fist.innerHTML=hands(f.ch);f.frontArm.palm.innerHTML=hands(f.ch);}}
  // Continuous anatomy surfaces. Four tones and structural creases explain the
  // deltoid/biceps/elbow and thigh/knee/calf without tube joints or bitmap skins.
  function limb(l,a,b,c,f,ctx){
    const {sa,pt,vadd,vmul,vsub,vnorm,vperp,lerp2,limbSurface,limbContour,limbCelShade,morphSVG,rigLimbWidths}=ctx;
    const ch=f.ch,id=ch.id,p=palette[id],leg=l.type==='leg',widths=rigLimbWidths(ch,leg,l.rear),[w0,w1,w2]=widths;
    const stamp=[...a,...b,...c,...widths].map(n=>Math.round(n*100)/100).join(',');if(l._atelierStamp===stamp)return;
    l._atelierStamp=stamp;
    const skin=leg?['mai','luke'].includes(id):!['ken','cammy','iori'].includes(id),base=skin?color(ch,'skin'):leg?(id==='chun'?color(ch,'dark'):id==='cammy'?color(ch,'dark'):id==='ken'?'url(#atelier-scarlet)':color(ch,'cloth')):(id==='ken'?color(ch,'cloth'):id==='iori'?color(ch,'dark'):color(ch,'cloth'));
    const surface=limbSurface(a,b,c,...widths),n=vperp(vnorm(vsub(b,a))),m=vperp(vnorm(vsub(c,b))),Q=(v,n,t)=>pt(vadd(v,vmul(n,t))),cont=limbContour(a,b,c,...widths,surface);
    sa(l.contour,'d',cont);sa(l.contour,'fill',base);sa(l.contour,'stroke',INK);sa(l.contour,'stroke-width',1.35);
    sa(l.shade,'d',limbCelShade(surface));sa(l.shade,'fill',skin?p.skin[2]:p.dark[2]);sa(l.shade,'opacity',l.rear?.44:.27);
    const highlight=`M${Q(lerp2(a,b,.13),n,w0*.38)}Q${Q(lerp2(a,b,.43),n,w0*.72)} ${Q(lerp2(a,b,.8),n,w1*.46)}L${Q(lerp2(a,b,.79),n,w1*.16)}Q${Q(lerp2(a,b,.42),n,w0*.25)} ${Q(lerp2(a,b,.16),n,w0*.03)}Z`;
    sa(l.light,'d',highlight);sa(l.light,'fill',skin?p.skin[0]:'#fff1cd');sa(l.light,'opacity',l.rear?.15:.32);
    const q=lerp2(b,c,.08),mid=lerp2(a,b,.68),lower=lerp2(b,c,.25);
    let detail=`M${Q(mid,n,-w1*.6)}Q${Q(lerp2(a,b,.87),n,-w1*.85)} ${Q(b,n,-w1*.24)}M${Q(q,m,-w1*.45)}Q${Q(lerp2(b,c,.12),m,0)} ${Q(lerp2(b,c,.1),m,w1*.43)}M${Q(lower,m,w1*.4)}Q${Q(lerp2(b,c,.48),m,w1*.63)} ${Q(lerp2(b,c,.77),m,w2*.2)}`;
    sa(l.details,'d',detail);sa(l.details,'stroke',skin?p.skin[2]:p.dark[2]);sa(l.details,'opacity',.65);sa(l.details,'stroke-width',.95);
    sa(l.rim,'d',`M${Q(lerp2(a,b,.1),n,w0*.94)}Q${Q(lerp2(a,b,.37),n,w0)} ${Q(lerp2(a,b,.67),n,w1*.92)}`);sa(l.rim,'stroke','#d9edf2');sa(l.rim,'opacity',l.rear?.16:.38);sa(l.rim,'stroke-width',1);
    let cloth='';
    const sleeve=(start,end,W0,W1,W2,fill)=>P(limbContour(start,lerp2(start,end,.5),end,W0,W1,W2),fill,1.1);
    if(!leg){
      if(id==='luke'){
        cloth+=F(limbContour(lerp2(b,c,.14),lerp2(b,c,.45),lerp2(b,c,.8),w1*.97,w1*.8,w2*1.1),p.skin[0],'opacity=".2"');
        cloth+=L(`M${Q(lerp2(b,c,.26),m,w1*.45)}l-7 6 4 6-8 7M${Q(lerp2(b,c,.55),m,w1*.6)}l-6 5 3 4`,'#5e5253',1.6);
      }
      if(id==='ryu'&&l.rear)cloth+=sleeve(a,lerp2(a,b,.38),w0+1,w0,w0*.84,color(ch,'dark'));
      if(id==='cammy')cloth+=sleeve(lerp2(b,c,.23),c,w1*1.08,w1*.98,w2+2,'url(#atelier-scarlet)')+L(`M${Q(lerp2(b,c,.45),m,w1*.68)}L${Q(lerp2(b,c,.82),m,w2*.73)}`,'#ff9d88',2);
      if(id==='iori')cloth+=sleeve(lerp2(b,c,.87),c,w2+4,w2+4,w2+4,p.trim)+L(`M${Q(lerp2(a,b,.8),n,-w1*.5)}L${Q(b,n,w1*.5)}M${Q(lerp2(b,c,.14),m,-w1*.5)}L${Q(lerp2(b,c,.34),m,w1*.25)}`,p.dark[0],1.1);
      if(id==='ken')cloth+=L(`M${Q(lerp2(a,b,.25),n,w0*.5)}L${Q(lerp2(a,b,.7),n,w1*.54)}M${Q(lerp2(b,c,.15),m,-w1*.7)}L${Q(lerp2(b,c,.3),m,w1*.5)}M${Q(lerp2(b,c,.85),m,-w2)}L${Q(lerp2(b,c,.85),m,w2)}`,p.cloth[2],1.4);
      if(id==='chun'||id==='mai')cloth+=sleeve(lerp2(b,c,.82),c,w2+2,w2+1.7,w2+2,id==='chun'?'#383045':color(ch,'dark'))+L(`M${Q(lerp2(b,c,.86),m,-w2-1)}L${Q(lerp2(b,c,.86),m,w2+1)}`,id==='chun'?p.trim:p.dark[2],1.4);
    }else{
      if(id==='luke'){
        const end=lerp2(a,b,.81);cloth+=sleeve(a,end,w0+1,w0*.96,w1+4,color(ch,'cloth'));
        cloth+=L(`M${Q(lerp2(a,b,.15),n,w0*.55)}L${Q(lerp2(a,b,.7),n,w1*.73)}M${Q(end,n,-w1-4)}Q${Q(lerp2(a,b,.84),n,0)} ${Q(end,n,w1+4)}`,p.trim,2.6);
        cloth+=G(F('M-8-8L8-8 4-1 10-1-2 9 0 1-7 1Z','#f9ead4'),`translate(${pt(lerp2(a,b,.48))})`);
      }
      if(id==='chun')cloth+=sleeve(lerp2(b,c,.43),c,w1*.86,w1*.74,w2+2,color(ch,'dark'))+L(`M${Q(lerp2(b,c,.48),m,-w1*.78)}Q${Q(lerp2(b,c,.54),m,0)} ${Q(lerp2(b,c,.48),m,w1*.78)}`,p.trim,1.8);
      if(id==='cammy')cloth+=sleeve(lerp2(b,c,.49),c,w1*.92,w1*.79,w2+2,'#262b3a')+L(`M${Q(lerp2(a,b,.07),n,w0*.68)}Q${Q(lerp2(a,b,.6),n,w1*.94)} ${Q(lerp2(b,c,.12),m,w1*.72)}`,'#69827f',2.5);
      if(id==='juri'){if(l.rear)sa(l.contour,'fill',color(ch,'dark'));cloth+=L(`M${Q(lerp2(a,b,.14),n,w0*.55)}Q${Q(lerp2(a,b,.52),n,w0*.54)} ${Q(b,n,w1*.5)}Q${Q(lerp2(b,c,.3),m,w1*.5)} ${Q(lerp2(b,c,.72),m,w2*.7)}`,p.trim,3);}
      if(id==='ryu'||id==='ken'||id==='iori')cloth+=L(`M${Q(lerp2(a,b,.26),n,w0*.15)}L${Q(lerp2(a,b,.76),n,w1*.3)}M${Q(lerp2(b,c,.1),m,-w1*.7)}L${Q(lerp2(b,c,.26),m,w1*.25)}M${Q(lerp2(b,c,.24),m,-w1*.52)}L${Q(lerp2(b,c,.37),m,w1*.36)}M${Q(lerp2(b,c,.9),m,-w2)}Q${Q(lerp2(b,c,.87),m,0)} ${Q(lerp2(b,c,.9),m,w2)}`,id==='ryu'?'#7c7d82':p.cloth[2],1.1);
      if(id==='mai')cloth+=sleeve(lerp2(b,c,.72),c,w2+2.2,w2+1.6,w2+1,color(ch,'dark'))+L(`M${Q(lerp2(b,c,.79),m,-w2-1)}L${Q(lerp2(b,c,.79),m,w2+1)}M${Q(lerp2(b,c,.9),m,-w2-1)}L${Q(lerp2(b,c,.9),m,w2+1)}`,p.dark[2],.9);
    }
    morphSVG(l.cloth,cloth);
  }
  return {configure,head:null,torso:null,hands,feet,fan,attach,limb,palette,vector:{P,F,L,E,G,color,shade,eyes,palette}};
})();
