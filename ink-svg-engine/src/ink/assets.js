/* INK asset pack. Costume/hair designs adapt the repository's editable SVGs.
 * New anatomical contours, hands, facial planes and deformation bindings.
 * Runtime code knows nothing about these names or palettes.
 */
'use strict';
(() => {
 const {clamp,lerp}=INK;
 const NS='http://www.w3.org/2000/svg';
 const profiles=[
  {id:'ryu',name:'RYU',cn:'隆',female:false,accent:'#73bdce',arm:[21.8,9.8,8.1],leg:[30,15.5,10.7],headScale:.88,style:'沉肩 · 蓄势 · 贯穿'},
  {id:'ken',name:'KEN',cn:'肯',female:false,accent:'#ed9167',arm:[22,10.9,8.8],leg:[29,16.2,11.5],headScale:.87,style:'前压 · 蹬地 · 火焰回旋'},
  {id:'chun',name:'CHUN-LI',cn:'春丽',female:true,accent:'#57c7bb',arm:[12.8,6.7,5.8],leg:[29,15.8,9.2],headScale:.85,style:'开掌 · 换轴 · 腿部连打'},
  {id:'cammy',name:'CAMMY',cn:'嘉米',female:true,accent:'#79b8d0',arm:[14,7.3,6.1],leg:[24.8,13.8,9.2],headScale:.85,style:'低姿 · 拉伸 · 轴向突进'},
  {id:'luke',name:'LUKE',cn:'卢克',female:false,accent:'#e9b96e',arm:[24,12.8,9.8],leg:[29,15.4,10.5],headScale:.89,style:'转肩 · 拳峰 · 反冲'},
  {id:'juri',name:'JURI',cn:'蛛俐',female:true,accent:'#be90d6',arm:[12.4,6.8,5.8],leg:[27,16.5,9],headScale:.84,style:'偏轴 · 挂腿 · 弧形切割'},
  {id:'mai',name:'MAI',cn:'不知火舞',female:true,accent:'#e78591',arm:[13.4,7,5.8],leg:[24.7,13.3,8.4],headScale:.84,style:'扇面 · 身体旋转 · 翻身踢'},
  {id:'iori',name:'IORI',cn:'八神庵',female:false,accent:'#a28bcc',arm:[17.8,9.4,7.7],leg:[27,17.5,10.3],headScale:.87,style:'前伏 · 爪切 · 紫焰 / 同人客串'}
 ];
 for(const p of profiles){p.rigRearShoulder=[p.female?-33:-42,-292];p.rigFrontShoulder=[p.female?34:42,-290];}
 const byID=Object.fromEntries(profiles.map(p=>[p.id,p]));
 const P=(d,f,w=1.4,extra='')=>`<path d="${d}" fill="${f}" stroke="#302735" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
 const F=(d,f,extra='')=>`<path d="${d}" fill="${f}" ${extra}/>`;
 const L=(d,f,w=1,extra='')=>`<path d="${d}" fill="none" stroke="${f}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
 const ellipse=(x,y,rx,ry,f)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
 function face(c,mood='rest',profile=false){
  const p=SF6Art.palette[c.id],female=c.female,angry=mood==='power',hurt=mood==='hurt';
  if(hurt)return L('M-12-6l9 3-8 3M9-5l12-3-8 7',p.hair[2],1.5)+P('M5 16Q13 12 20 16L18 21 8 22Z','#64383f',.7);
  let s='';
  if(!profile){
   s+=P(female?'M-14-7Q-8-12-2-7Q-8-3-13-5Z':'M-15-7L-7-10-2-6-7-4-13-5Z','#fff6e6',.8);
   s+=ellipse(-5,-6,1.6,2.1,p.eye)+ellipse(-4.8,-6,0.7,1.7,'#242630');
  }
  s+=P(female?'M7-6Q16-14 26-8Q19-1 11-3Z':'M7-7L18-11 26-8 22-3 11-3Z','#fff8ee',.95);
  s+=ellipse(19,-6,2.4,3,p.eye)+ellipse(19.7,-6,1.05,2.2,'#242630')+ellipse(20.4,-7.1,.65,.7,'#ffffff');
  s+=L(female?'M7-6Q17-14 26-8l2-2':'M7-7L18-11 26-8',p.hair[2],female?1.6:1.8);
  s+=L(angry?'M-16-17L-2-12M7-12L28-20':female?'M-16-16Q-8-20-1-15M9-16Q18-20 27-17':'M-16-17L-2-15M7-15L28-19',p.hair[1],female?1.4:2.8);
  s+=L('M10-4L8 4 13 6M21 5L24 5',p.skin[2],.9);
  s+=F('M15-1L16 4 22 5 17 7 12 5Z',p.skin[2],'opacity=".42"');
  if(angry)s+=P('M4 15Q12 11 21 15L19 24 8 25Z','#59333d',.8)+F('M7 15L19 15 18 18 8 18Z','#fff4e8');
  else s+=L(c.id==='juri'?'M4 16Q14 22 24 13':female?'M6 15Q13 18 20 14':'M5 16L12 15 20 16',female?'#a35565':'#7b4a44',1.1)+L('M10 20L16 20',p.skin[0],1);
  return s;
 }
 function head(c,view='front') {
  const p=SF6Art.palette[c.id],female=c.female,skin=`url(#atelier-${c.id}-skin)`,hair=`url(#atelier-${c.id}-hair)`;
  if(view==='back')return SF6Art.head(c,true);
  const side=view==='profile';
  let s=P('M-13 13L-16 39-23 46Q1 56 25 44L15 34 17 11Z',skin,1.1);
  s+=F('M-12 20L3 31 15 23 15 34 7 41-9 35Z',p.skin[2],'opacity=".4"');
  s+=P(side?'M-24-27Q-8-49 16-37Q28-32 29-16L27-4 34 3 27 7 24 20 9 31-7 28-23 15Z':female?'M-24-26Q-13-44 9-40Q28-37 29-18L28-5 33 2 28 7 25 20Q18 29 8 32L-5 29-19 15-24-4Z':'M-27-26Q-15-43 10-40L26-31 29-17 28-4 34 3 28 8 26 22 12 33-3 31-20 17-26-5Z',skin,1.3);
  s+=F('M-23-15L-13-6-13 8-5 23 7 31-4 28-19 14Z',p.skin[2],'opacity=".28"');
  s+=F('M17 11L26 7 24 19 17 24 11 22Z',p.skin[0],'opacity=".33"');
  s+=P('M-23-4Q-32-11-31 1L-25 10-21 8-19-1Z',skin,.9)+L('M-27-3Q-21-4-23 4L-26 4',p.skin[2],.8);
  for(const mood of ['rest','power','hurt'])s+=`<g data-expression="${mood}"${mood==='rest'?'':' visibility="hidden"'}>${face(c,mood,side)}</g>`;
  // Keep each character's individually authored hair contour, not the old face.
  const tmp=document.createElementNS(NS,'g');tmp.innerHTML=SF6Art.head(c);
  let after=false;for(const node of tmp.children){if(after)s+=node.outerHTML;if(node.getAttribute('data-face-state')==='hurt')after=true;}
  return s;
 }
 function hand(c,open=false) {
  const p=SF6Art.palette[c.id],gloves=['ryu','ken','cammy','luke'].includes(c.id),base=gloves?(c.id==='ken'?'#51434a':c.id==='luke'?'#5683aa':'#cb4252'):`url(#atelier-${c.id}-skin)`,light=gloves?'#f18c82':p.skin[0],shade=gloves?'#773440':p.skin[2];
  if(open){return P('M-9-8L3-11 14-17 25-18Q28-17 26-14L17-11 32-13Q36-12 33-9L20-6 36-7Q40-5 35-3L20 0 32 1Q36 3 32 5L17 5 24 10Q25 14 21 13L8 7-1 11-9 7Z',base,1.15)+L('M7-7L13-1 7 5M19-6L24-7M18 0L26 1',shade,.8);}
  return P('M-9-9L2-12 10-16 22-15 30-10 31-1 25 7 13 11 2 9-9 6Z',base,1.15)+F('M4-10L12-13 24-12 27-8 16-8 12-3 3-4Z',light,'opacity=".65"')+P('M3-5Q8-12 13-6L18 0 13 7 6 5 2 0Z',base,.85)+L('M15-12L16-7M22-11L23-6M27-8L28-3M17 5L23 4',shade,.85);
 }
 function torso(c,back=false) {
  let s=SF6Art.torso(c,back);
  if(c.id==='ryu'&&!back){
   const p=SF6Art.palette[c.id];
   // Pectoral planes, rib cage and obliques use continuous anatomy, not squares.
   s=s.replace(/<path[^>]+d="M-7-291[^>]+>/g,'');
   s+=L('M4-298Q15-307 34-292M3-296Q-1-283 1-268M3-266Q20-258 35-269M8-259Q13-250 28-252M12-244L26-240M18-231L28-228',p.skin[2],1.25,'opacity=".8"');
  }
  return s;
 }
 function pack(c) {
  const p=byID[c.id]||profiles[0],proxy={ch:c,headTails:document.createElementNS(NS,'g'),coatTails:document.createElementNS(NS,'g'),trailing:document.createElementNS(NS,'g')};SF6Art.attach(proxy);
  return {profile:{...p,...c,arm:(c.arm||p.arm).slice(),leg:(c.leg||p.leg).slice(),headScale:c.headScale??p.headScale},torso:torso(c),torsoBack:torso(c,true),heads:{front:head(c),profile:head(c,'profile'),back:head(c,'back')},hands:{fist:hand(c),palm:hand(c,true)},foot:SF6Art.feet(c),fan:SF6Art.fan(c),hair:proxy.headTails.innerHTML,coat:proxy.coatTails.innerHTML,trail:proxy.trailing.innerHTML};
 }
 INK.assets={profiles,byID,pack,head,hand,torso,P,F,L};
})();
