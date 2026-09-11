/* Mai's SF6 rules. Timings/damage are deliberately tuned for this SVG game,
 * not a frame-data emulator. Legacy save IDs remain stable:
 * ryuenbu = Hishou Ryuuenjin; hissatsu = Ryuuenbu.
 * Reference: Capcom, 2025-02-06, https://www.capcomfrance.fr/sortie-mai/
 */
(() => {
'use strict';
const fmt=s=>({236:'↓↘→',214:'↓↙←',623:'→↓↘',236236:'↓↘→↓↘→',214214:'↓↙←↓↙←'}[s]||s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const spec={
 kachosen:{name:'花蝶扇',motion:'236',button:'P',contactPart:'fan',kind:'projectile',pose:'wave',note:'按住 P 蓄力：扇子不能被拳脚击落；接触后弹起再落下。OD 蓄力版出手后 → + P 可接乱花蝶扇。'},
 ryuenbu:{name:'飞翔龙炎阵',motion:'623',button:'K',contactPart:'foot',kind:'upper',pose:'upper',note:'收膝起跳、上升踢击、后空翻收势。不是拳升龙，也不是龙炎舞。'},
 hissatsu:{name:'龙炎舞',motion:'214',button:'P',contactPart:'fan',kind:'spin',pose:'punch',note:'横向转身挥扇，火焰围绕扇面铺开；与飞翔龙炎阵的垂直踢击区分。'},
 shinobibachi:{name:'必杀忍蜂',motion:'236',button:'K',contactPart:'elbow',kind:'rush',pose:'punch',note:'侧手翻起势后以肘部前冲。OD 命中后反弹腾空，可以接空中特殊技或 SA2。'},
 musabi:{name:'鼯鼠之舞',motion:'214',button:'P',contactPart:'body',kind:'dive',pose:'punch',air:true,note:'空中 ↓↙← + P；缩身后斜向俯冲，以身体撞击，不是俯冲踢。'}
};
function configure(chars,moves,bases){
 const c=chars.find(c=>c.id==='mai');
 c.trait='FLAME STOCK · 阳炎之舞补充5枚火焰';
 c.style='不知火流忍术 / 扇、火焰、空中肘击';
 for(const d of bases.mai){const v=spec[d[0]];if(!v)continue;d[1]=v.name;d[2]=v.motion;d[3]=v.button;d[4]=v.kind;d[5]=v.pose;d[9]={...(d[9]||{}),contactPart:v.contactPart,air:!!v.air,weaponReach:v.contactPart==='fan'?38:0};}
 for(const m of moves.mai){
  if(m.category==='special'&&spec[m.base]){
   const v=spec[m.base],s=m.strength||0;
   Object.assign(m,v,{name:(m.od?'OD ':['轻·','中·','重·'][s])+v.name,weaponReach:v.contactPart==='fan'?38:0,cmd:(v.air?'空中 ':'')+fmt(v.motion)+' + '+(m.od?v.button+v.button:v.button),air:!!v.air});
   if(m.base==='kachosen')Object.assign(m,{startup:[14,15,16,12][s],active:6,recovery:[18,20,24,21][s],hits:1,damage:[580,640,710,900][s],knockdown:false,fanChargeable:true,fanCharged:false,travel:0,speed:[7.4,11,16.5,12.5][s]});
   if(m.base==='ryuenbu')Object.assign(m,{startup:[5,7,9,6][s],active:[17,20,24,24][s],recovery:[22,25,29,28][s],hits:m.od?3:2,launch:-12,travel:2.1,invuln:m.od?17:0,knockdown:true});
   if(m.base==='hissatsu')Object.assign(m,{startup:[14,14,15,12][s],active:[15,20,25,25][s],recovery:[15,19,21,22][s],hits:[1,2,2,3][s],travel:[1.2,1.7,2.1,2.6][s],knockdown:s>0});
   if(m.base==='shinobibachi')Object.assign(m,{startup:[16,18,20,14][s],active:18,recovery:[22,25,28,23][s],hits:m.od?2:1,travel:[7.5,9.2,11,11.2][s],knockdown:true});
   if(m.base==='musabi')Object.assign(m,{startup:[10,12,14,9][s],active:24,recovery:18,hits:m.od?2:1,travel:0,knockdown:true});
  }
  if(m.super){
   const lv=m.super;
   Object.assign(m,{motion:lv===3?'214214':'236236',button:lv===2?'K':'P',airAllowed:lv===2,air:false,weaponReach:0,projectileStyle:undefined});
   m.name=(m.ca?'CRITICAL ART · ':'')+['','阳炎之舞','超必杀忍蜂','不知火流·炎舞仇樱'][lv];
   m.cmd=(m.ca?'生命≤25% · ':'')+fmt(m.motion)+' + '+m.button+(lv===2?'（地面 / 空中）':'');
   if(lv===1)Object.assign(m,{kind:'burst',pose:'guard',contactPart:'pillar',geometry:'pillar',travel:0,range:230,startup:8,active:42,recovery:27,hits:5,damage:1900,knock:12,launch:0,note:'近身双侧火柱；发动时火焰库存补至5枚。库存强化后续必杀及SA1/SA2，每次消耗1枚。'});
   if(lv===2)Object.assign(m,{kind:'superrush',pose:'punch',contactPart:'elbow',travel:14,range:285,startup:9,active:45,recovery:28,hits:5,damage:2850,projectileImmune:true,note:'地面或空中双波动 + K；翻身接火焰肘击，可穿过飞行道具。'});
   if(lv===3)Object.assign(m,{kind:'superrush',pose:'punch',contactPart:'fan',weaponReach:38,travel:13,range:275,startup:12,active:88,recovery:27,hits:8,damage:m.ca?4600:3900,note:'双反摇 + P；扇舞、交叉切击和升空终结。低生命自动升级CA；不消耗火焰库存。'});
  }
  if(m.category==='branch'){
   // The user's extra routes are retained, but never presented as official SF6 moves.
   m.note='同人扩展派生（非官方招式表）。'+m.note;
   if(m.kind==='upper'){m.contactPart='foot';m.weaponReach=0;}
   if(m.kind==='rush'){m.contactPart='elbow';m.weaponReach=0;}
   if(m.kind==='dive'){m.contactPart='body';m.weaponReach=0;}
  }
  m.total=m.startup+m.active+m.recovery;
 }
 const od=moves.mai.find(m=>m.id==='kachosen_3');
 moves.mai.push({...od,id:'midare',base:'kachosen',name:'乱花蝶扇',category:'followup',cmd:'OD 蓄力花蝶扇出手后 → + P',kind:'fan_follow',fanChargeable:false,cost:0,startup:6,active:14,recovery:20,total:40,hits:1,damage:0,note:'只在 OD 蓄力花蝶扇后开放的追投窗口内使用；分两拍追加两把扇子。'});
}
function start(f,m){
 if(f.ch.id!=='mai')return m;
 if((m.category==='special'||m.super===1||m.super===2)&&f.flameStock>0){
  f.flameStock--;m.flameEnhanced=true;m.damage=Math.round(m.damage*1.12);m.stun+=4;m.blockstun+=2;
  if(m.base==='ryuenbu'||m.base==='hissatsu'||m.base==='shinobibachi')m.hits++;
  if(m.base==='ryuenbu')m.invuln=Math.max(m.invuln||0,8);
 }
 return m;
}
function holdTick(f){
 const a=f.attack,m=a?.m;if(f.ch.id!=='mai'||!m?.fanChargeable||a.projectileSent||a.t<m.startup-2)return false;
 if(a.fanChargeResolved)return false;
 const down=['LP','MP','HP','PP'].some(b=>f.input.held.has(b));
 a.fanChargeTicks=(a.fanChargeTicks||0)+(down?1:0);
 if(down&&a.fanChargeTicks<20){a.fanCharging=true;return true;}
 a.fanCharging=false;a.fanChargeResolved=true;
 if(a.fanChargeTicks>=20){m.fanCharged=true;m.hits=2+(m.flameEnhanced?1:0);m.damage=Math.round(m.damage*1.24);m.knockdown=true;m.stun=Math.max(m.stun,37);m.knock=9;a.fanReady=true;}
 return false;
}
function tick(f,G,spawn,notify){
 if(f.ch.id!=='mai')return;const a=f.attack,m=a?.m;
 if(f.maiFollowUntil&&G.tick>f.maiFollowUntil)f.maiFollowUntil=0;
 if(!a)return;
 if(m.id==='SA1'&&a.t===m.startup&&!a.stockGranted){a.stockGranted=true;f.flameStock=5;notify(f,'FLAME STOCK · 火焰库存 5 / 5');}
 if(m.base==='kachosen'&&m.od&&m.fanCharged&&a.projectileSent&&!a.followOpened){a.followOpened=true;f.maiFollowUntil=G.tick+32;f.maiFollowEnhanced=!!m.flameEnhanced;}
 if(m.id==='midare'&&[m.startup,m.startup+8].includes(a.t))spawn(f,{...m,kind:'projectile',fanCharged:true,fanFollow:true,flameEnhanced:f.maiFollowEnhanced,speed:a.t===m.startup?13:15,hits:1,damage:500});
 if(m.base==='shinobibachi'&&m.od&&a.hitConfirmed&&!a.odBounce&&a.t>=m.startup+Math.max(5,m.active-4)){
  a.odBounce=true;f.vy=-11.8;f.vx=-f.dir*1.8;f.y=Math.min(f.y,-1);f.airLock=false;f.maiAirFollow=G.tick+42;f.attack=null;f.state='idle';f.stateT=0;notify(f,'OD 忍蜂 · 腾空追击');
 }
}
function follow(f,bs,G,getMove,request,relative){
 if(f.ch.id!=='mai'||!bs.some(b=>b.endsWith('P'))||!f.maiFollowUntil||G.tick>f.maiFollowUntil||![3,6,9].includes(relative(f.input.dir,f.dir)))return false;
 const m=getMove(f,'midare');if(!m)return false;
 // This is an explicit cancel window, not a global bypass of recovery.
 f.maiFollowCancel=true;const ok=request(f,m,false);f.maiFollowCancel=false;
 if(ok)f.maiFollowUntil=0;return ok;
}
function initShot(s){
 if(s.owner.ch.id!=='mai'||s.m.base!=='kachosen')return;
 s.isMaiFan=true;s.fanCharged=!!s.m.fanCharged;s.vulnerable=!s.fanCharged;
 s.fanPhase='outbound';s.fanVy=0;s.r=29;s.clashDurability=s.m.flameEnhanced?2:1;
 if(s.m.fanFollow)s.y-=25;
}
function moveShot(s){
 if(!s.isMaiFan||s.fanPhase==='outbound')return false;
 s.lockedTarget=null;s.x+=s.dir*s.v;
 s.y+=s.fanVy;s.fanVy+=.45;
 if(s.fanVy>=0)s.fanPhase='falling';
 if(s.y>650)s.life=0;
 return true;
}
function bounce(s,d){
 if(!s.isMaiFan||!s.fanCharged||s.hits<=0)return;
 s.lockedTarget=null;s.fanPhase='rising';s.fanVy=-7.4;s.v=.7;s.cool=24;
 // The second hit descends physically; it does not attach itself to the opponent.
 s.x=d.x-s.dir*8;
}
function destroyByStrike(s,geometry,overlap){
 if(!s.vulnerable||s.life<=0)return false;
 const b={x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2};
 if(geometry.hit.some(h=>overlap(h,b))){s.life=0;return true;}return false;
}
function clash(s,o){
 if(s.vulnerable&&o.vulnerable){s.life=o.life=0;return true;}
 if(s.vulnerable){s.life=0;return true;}if(o.vulnerable){o.life=0;return true;}return false;
}
window.SF6Mai={configure,start,holdTick,tick,follow,initShot,moveShot,bounce,destroyByStrike,clash,spec};
})();
