/* INK authoring studies. Timings are animation studies, not Capcom frame data.
 * Full-body keys remain sparse and editable; no sampled video or raster sprites.
 * Artwork, choreography and gameplay resource rules are deliberately separate.
 */
'use strict';
(() => {
 const {copy,basePose,Clip}=INK;
 const neutral={
  ryu:{lean:-3,head:1,rw:[-1,-291],fw:[102,-298],ra:[-100,-16],fa:[108,-16]},
  ken:{lean:-5,head:3,rw:[-9,-277],fw:[112,-304],ra:[-116,-16],fa:[91,-16]},
  chun:{lean:-4,head:2,rw:[-19,-299],fw:[127,-290],ra:[-92,-16],fa:[105,-16],open:1},
  cammy:{lean:7,head:-4,rw:[9,-314],fw:[86,-323],ra:[-79,-16],fa:[120,-16]},
  luke:{lean:4,head:-2,rw:[9,-289],fw:[107,-321],ra:[-97,-16],fa:[114,-16]},
  juri:{lean:-9,head:9,rw:[-53,-239],fw:[76,-232],ra:[-77,-16],fa:[68,-110],open:1},
  mai:{lean:-6,head:3,rw:[-23,-285],fw:[113,-313],ra:[-104,-16],fa:[82,-16],fan:.92,fanAngle:-9},
  iori:{lean:12,head:-8,rw:[-65,-204],fw:[116,-290],ra:[-122,-16],fa:[107,-16],open:1}
 };
 const poses={
  guard:{lean:-7,fw:[78,-317],rw:[-8,-297]},
  chamber:{lean:-14,head:7,fw:[73,-318],rw:[-35,-301],fa:[71,-156],ra:[-82,-16],ffoot:15},
  recoil:{lean:-11,fw:[38,-259],rw:[-12,-288],bob:13,chest:-10},
  wave:{lean:16,head:-9,fw:[166,-275],rw:[104,-271],ra:[-125,-16],fa:[117,-16],chest:8,open:1},
  rise:{lean:-18,head:-8,fw:[66,-412],rw:[-10,-273],fa:[72,-159],ra:[-69,-80],ffoot:-12,chest:-7},
  round:{lean:-35,head:22,fw:[73,-279],rw:[-89,-283],fa:[179,-323],ra:[-79,-16],ffoot:75,chest:-8},
  elbow:{lean:37,head:-19,fw:[52,-335],rw:[-82,-267],fa:[132,-78],ra:[-112,-126],chest:11,fan:0},
  low:{lean:18,bob:50,fw:[87,-281],rw:[-30,-282],fa:[119,-16],ra:[-108,-16]},
  claw:{lean:29,head:-17,fw:[157,-253],rw:[-104,-306],fa:[139,-16],ra:[-130,-16],open:1,chest:12}
 };
 const K=(name,extra={})=>({...poses[name],...extra});
 const library={},catalog=[];
 function author(character,key,name,command,duration,contact,endActive,frames,meta={}){
  const base={...copy(basePose),...copy(neutral[character]),rootX:0,rootY:0};
  let final={...copy(base),rootX:frames.at(-1)?.[1]?.rootX||0};const finalSpin=frames.at(-1)?.[1]?.spin;
  if(finalSpin)final.spin=Math.round(finalSpin/360)*360;
  // Air-only studies begin in their authored aerial pose, not a one-frame teleport.
  const keys=[[0,(meta.kind==='dive'||meta.kind==='body-dive')?copy(frames[0][1]):{}],...frames,[duration,final]];
  const channels=new Set(Object.keys(base));for(const [,p]of keys)for(const k in p)channels.add(k);
  const tracks={};for(const ch of channels){if(!(ch in basePose)&&!['rootX','rootY'].includes(ch))continue;tracks[ch]=keys.map(([t,p,curve])=>[t,copy({...base,...p})[ch]??0,curve||'smooth']);}
  const events=[{frame:contact,type:'contact',socket:meta.socket||'frontArm',label:name},{frame:contact,type:'impulse',amplitude:meta.kind==='spin'?14:9}];
  for(const f of meta.extraHits||[])events.push({frame:f,type:'contact',socket:meta.socket||'frontArm',label:name});
  const maiLegacy={'kachousen':'kachosen','hishou-ryuuenjin':'ryuenbu','hissatsu-shinobi-bachi':'shinobibachi','ryuuenbu':'hissatsu','kagerou-no-mai':'SA1','musasabi-no-mai':'musabi'};
  if(character==='mai'){meta.legacyMoveBase=maiLegacy[key];meta.reference='https://prtimes.jp/main/html/rd/p/000004811.000013450.html';}
  const data={version:1,id:character+':'+key,character,name,command,duration,loop:false,phases:{startup:[0,contact],active:[contact,endActive],recovery:[endActive,duration]},meta:{...meta,source:'INK authored motion study; not official frame data'},tracks,events};
  const clip=new Clip(data);library[data.id]=clip;catalog.push(data);return clip;
 }
 // Ryu: grounded two-palm release, rising fist, level rotating leg.
 author('ryu','hadoken','波动拳','↓↘→ + P',56,16,25,[
  [8,{lean:-15,bob:12,chest:-10,head:7,fw:[-2,-247],rw:[-9,-258],open:1,rootX:-9}],
  [13,{lean:-9,bob:9,fw:[36,-249],rw:[12,-254],open:1,rootX:-6},'hold'],
  [16,K('wave',{rootX:17,bob:4}),'strike'],[21,K('wave',{rootX:23,fw:[173,-276],chest:11})],
  [31,{lean:7,head:-4,fw:[133,-269],rw:[88,-276],open:1,rootX:19}],[43,K('guard',{rootX:6})]
 ],{kind:'projectile',note:'双手后收 → 蹬地送掌 → 保持掌根，再回防'});
 author('ryu','shoryu','升龙拳','→↓↘ + P',65,14,38,[
  [7,{lean:19,bob:36,chest:10,fw:[45,-238],rw:[0,-297],rootX:-2}],
  [14,K('rise',{rootY:-22,rootX:26}),'strike'],[23,K('rise',{rootY:-127,rootX:63,turn:.31,fa:[43,-201],ra:[-55,-120]})],
  [35,K('rise',{rootY:-136,rootX:70,fw:[57,-383],chest:0})],
  [45,K('chamber',{rootY:-62,rootX:68})],[52,K('low',{bob:22,rootX:64})]
 ],{kind:'uppercut',note:'下沉蓄势 → 拳峰上穿 → 抱膝腾空 → 压低着地'});
 author('ryu','tatsu','龙卷旋风脚','↓↙← + K',74,18,49,[
  [9,K('chamber',{bob:5,turn:.2})],[18,{lean:-13,fa:[203,-212],ra:[-42,-119],fw:[66,-313],rw:[-83,-296],ffoot:88,rootY:-33,rootX:18},'strike'],
  [27,{lean:-13,fa:[-200,-219],ra:[44,-120],fw:[-66,-313],rw:[83,-296],ffoot:-88,turn:1,depth:.83,rootY:-42,rootX:67}],
  [36,{lean:-13,fa:[204,-215],ra:[-43,-119],fw:[66,-313],rw:[-83,-296],ffoot:88,rootY:-38,rootX:111}],
  [46,{lean:-13,fa:[-197,-219],ra:[42,-121],fw:[-66,-313],rw:[83,-296],ffoot:-88,turn:1,depth:.83,rootY:-29,rootX:147}],
  [55,K('chamber',{rootX:155,rootY:-8})],[63,K('low',{bob:18,rootX:155})]
 ],{kind:'spin',socket:'frontLeg',extraHits:[36],note:'支撑脚离地，腿保持水平；躯干前后视图交替'});
 // Ken: step-and-turn, high flame arc, a distinct down-then-up exchange.
 author('ken','dragonlash','龙尾脚','→↓↘ + K',70,25,40,[
  [8,K('chamber',{lean:-18,rootX:-5,turn:.15})],[16,{lean:-27,head:16,fw:[40,-317],rw:[-85,-285],fa:[101,-352],ra:[-56,-171],rootY:-47,rootX:40,turn:.55}],
  [25,K('round',{fa:[201,-269],ra:[-64,-112],rootY:-58,rootX:97,turn:.25}),'strike'],
  [35,K('round',{fa:[223,-152],ra:[-73,-111],lean:-17,rootY:-28,rootX:138})],
  [46,K('chamber',{rootX:152})],[55,{lean:12,bob:17,fw:[96,-303],rw:[-13,-285],fa:[121,-16],ra:[-110,-16],rootX:156}]
 ],{kind:'kick',socket:'frontLeg',note:'抬腿过顶 → 腾空绕轴 → 脚跟下压，而非平踢'});
 author('ken','shoryu','升龙拳','→↓↘ + P',67,13,39,[
  [6,{lean:20,bob:28,fw:[22,-248],rw:[-9,-290],chest:14}],
  [13,K('rise',{lean:-6,rootX:26,rootY:-17,turn:.2}),'strike'],
  [23,K('rise',{lean:-21,rootX:78,rootY:-114,turn:.76,depth:.9,fa:[96,-208],ra:[-68,-170]})],
  [36,K('rise',{lean:-15,rootX:95,rootY:-148,turn:.23,chest:13})],
  [48,K('chamber',{rootX:110,rootY:-50})],[56,K('low',{bob:19,rootX:112})]
 ],{kind:'uppercut',note:'前冲起拳 → 肩胯换向 → 上升火焰；与隆的紧凑姿势区分'});
 author('ken','jinrai','迅雷脚','↓↘→ + K',72,19,48,[
  [9,K('chamber',{lean:-18,fw:[58,-303],rootX:5})],
  [19,K('round',{fa:[219,-177],rootX:26}),'strike'],
  [29,K('chamber',{rootX:37,fa:[78,-124]})],
  [39,{lean:-19,bob:32,head:10,fw:[76,-294],rw:[-91,-297],fa:[226,-29],ra:[-99,-16],ffoot:78,rootX:48},'strike'],
  [52,K('chamber',{rootX:55})],[61,K('guard',{rootX:52})]
 ],{kind:'kick',socket:'frontLeg',extraHits:[39],note:'中段回旋 → 折膝换轴 → 下段追击（编排示范）'});
 // Chun-Li: palms stay stable while the leg snaps between discrete held accents.
 author('chun','legs','百裂脚','↓↘→ + K',78,17,51,[
  [8,K('chamber',{open:1,fw:[117,-282],rw:[-12,-284]})],
  [17,{lean:-19,head:12,fw:[117,-284],rw:[-12,-286],open:1,fa:[222,-198],ra:[-83,-16],ffoot:82},'strike'],
  [22,K('chamber',{open:1,fw:[117,-284],rw:[-12,-286]})],
  [27,{lean:-20,fw:[118,-284],rw:[-12,-286],open:1,fa:[209,-278],ra:[-82,-16],ffoot:79},'strike'],
  [32,K('chamber',{open:1,fw:[117,-284],rw:[-12,-286]})],
  [37,{lean:-17,fw:[117,-284],rw:[-12,-286],open:1,fa:[227,-161],ra:[-82,-16],ffoot:82},'strike'],
  [42,K('chamber',{open:1,fw:[117,-284],rw:[-12,-286]})],
  [47,{lean:-21,fw:[117,-284],rw:[-12,-286],open:1,fa:[211,-253],ra:[-83,-16],ffoot:79},'strike'],
  [58,K('chamber',{open:1})],[66,{open:1,fa:[108,-16]}]
 ],{kind:'flurry',socket:'frontLeg',extraHits:[27,37,47],note:'四次伸腿各自收膝；高度和停顿不同，不用随机残影代替踢腿'});
 author('chun','bird','旋转鹤脚蹴','蓄 ↓ · ↑ + K',91,22,62,[
  [9,K('low',{bob:35,open:1})],
  [17,{lean:0,spin:112,rootY:-22,fw:[73,-388],rw:[-73,-386],fa:[181,-189],ra:[-177,-198],open:1}],
  [22,{spin:180,rootY:-35,fw:[72,-397],rw:[-72,-397],fa:[216,-180],ra:[-215,-181],ffoot:90,rfoot:-90,open:1},'strike'],
  [27,{spin:180,turn:.51,depth:.65,rootY:-36,rootX:15,fw:[5,-397],rw:[-5,-397],fa:[-1,-180],ra:[1,-181],ffoot:90,rfoot:-90,frontLegProjection:.14,rearLegProjection:.14,open:1}],
  [32,{spin:180,turn:1,depth:.9,rootY:-37,rootX:29,fw:[-72,-397],rw:[72,-397],fa:[-216,-185],ra:[215,-176],ffoot:-90,rfoot:90,open:1}],
  [37,{spin:180,turn:.5,depth:.65,rootY:-36,rootX:44,fw:[5,-397],rw:[-5,-397],fa:[-1,-180],ra:[1,-181],ffoot:-90,rfoot:90,frontLegProjection:.14,rearLegProjection:.14,open:1}],
  [43,{spin:180,rootY:-35,rootX:59,fw:[72,-397],rw:[-72,-397],fa:[216,-180],ra:[-215,-181],ffoot:90,rfoot:-90,open:1}],
  [49,{spin:180,turn:.5,depth:.65,rootY:-32,rootX:72,fw:[5,-397],rw:[-5,-397],fa:[-1,-180],ra:[1,-181],ffoot:90,rfoot:-90,frontLegProjection:.14,rearLegProjection:.14,open:1}],
  [54,{spin:180,turn:1,depth:.9,rootY:-30,rootX:82,fw:[-72,-397],rw:[72,-397],fa:[-215,-180],ra:[216,-181],ffoot:-90,rfoot:90,open:1}],
  [64,{spin:300,rootY:-12,rootX:88,fw:[72,-339],rw:[-48,-331],fa:[95,-142],ra:[-89,-139],open:1}],
  [74,K('low',{spin:360,bob:21,rootX:93,open:1})],[83,{spin:360,rootX:86,open:1}]
 ],{kind:'spin',socket:'frontLeg',extraHits:[43],note:'倒立横向张腿；经过侧视压缩姿势，再切到背面，不把直腿折成抱膝'});
 author('chun','tensho','天升脚','↓↓ + K',72,17,43,[
  [8,K('chamber',{bob:24,open:1})],
  [17,{lean:-31,head:19,fw:[104,-292],rw:[-50,-286],fa:[93,-374],ra:[-71,-114],ffoot:75,rootY:-24,rootX:15,open:1},'strike'],
  [28,{lean:-15,head:8,fw:[99,-308],rw:[-83,-285],fa:[102,-173],ra:[-6,-377],rfoot:83,rootY:-108,rootX:31,open:1},'strike'],
  [38,{lean:-23,fw:[106,-295],rw:[-62,-296],fa:[108,-358],ra:[-65,-169],ffoot:76,rootY:-131,rootX:42,open:1},'strike'],
  [49,K('chamber',{rootY:-67,rootX:44,open:1})],[60,K('low',{bob:20,rootX:46,open:1})]
 ],{kind:'uppercut',socket:'frontLeg',extraHits:[28,38],note:'左右脚交替上踢；双手用于平衡，不套用上勾拳姿势'});
 // Cammy: long axis, inversion and diagonal root motion are separate silhouettes.
 author('cammy','arrow','螺旋箭','↓↘→ + K',74,22,49,[
  [9,K('low',{lean:24,bob:33})],
  [16,{lean:41,fw:[37,-316],rw:[-53,-314],fa:[173,-122],ra:[129,-161],rootY:-23,rootX:28}],
  [22,{lean:61,head:-23,fw:[28,-326],rw:[-65,-299],fa:[246,-88],ra:[218,-135],ffoot:24,rootY:-24,rootX:59,turn:.12},'strike'],
  [32,{lean:61,head:-23,fw:[-36,-318],rw:[60,-302],fa:[246,-100],ra:[218,-124],ffoot:24,rootY:-21,rootX:117,turn:1,depth:.88}],
  [42,{lean:61,head:-23,fw:[28,-326],rw:[-65,-299],fa:[246,-88],ra:[218,-135],ffoot:24,rootY:-16,rootX:176,turn:.12}],
  [53,K('low',{lean:26,bob:27,rootX:207})],[64,K('guard',{rootX:195})]
 ],{kind:'drill',socket:'frontLeg',note:'身体拉成低平轴线；前后躯干切换表现螺旋'});
 author('cammy','spike','加农钉','→↓↘ + K',69,15,38,[
  [7,K('low',{lean:26,bob:21})],
  [15,{lean:-40,head:21,fw:[43,-285],rw:[-80,-296],fa:[90,-383],ra:[-57,-164],ffoot:75,rootY:-12,rootX:22},'strike'],
  [24,{lean:-25,head:10,spin:-73,fw:[32,-294],rw:[-70,-303],fa:[78,-409],ra:[-91,-220],rootY:-113,rootX:54,ffoot:70}],
  [35,{lean:0,spin:-192,fw:[56,-307],rw:[-46,-302],fa:[102,-251],ra:[-70,-227],rootY:-143,rootX:67,turn:.67}],
  [45,K('chamber',{spin:-310,rootY:-81,rootX:79})],
  [56,K('low',{spin:-360,bob:25,rootX:85})],[63,{spin:-360,rootX:76}]
 ],{kind:'uppercut',socket:'frontLeg',note:'上踢形成一条线，后空翻落地；不是拳头朝上的升龙'});
 author('cammy','strike','加农打击','空中 ↓↙← + K',66,18,36,[
  [1,K('chamber',{rootY:-130})],[9,{lean:-6,fw:[53,-321],rw:[-35,-322],fa:[55,-242],ra:[-75,-215],rootY:-153,rootX:0}],
  [18,{lean:18,head:-17,fw:[43,-330],rw:[-86,-302],fa:[181,-44],ra:[-39,-173],rootY:-134,rootX:40,ffoot:5},'strike'],
  [29,{lean:23,head:-19,fw:[39,-332],rw:[-87,-300],fa:[194,-38],ra:[-41,-166],rootY:-65,rootX:119,ffoot:8}],
  [38,K('low',{lean:23,bob:26,rootX:170})],[50,K('guard',{rootX:165})]
 ],{kind:'dive',socket:'frontLeg',note:'脚先沿斜线下刺，后脚折起；没有把身体俯冲和踢击混为一招'});
 // Luke: large forearms, delayed release and shoulder recoil.
 author('luke','sand','沙尘爆破','↓↘→ + P',52,14,23,[
  [7,{lean:-9,chest:-13,fw:[-6,-302],rw:[1,-322],bob:8,rootX:-10}],
  [14,{lean:22,chest:13,head:-14,fw:[177,-283],rw:[-4,-320],fa:[125,-16],ra:[-118,-16],rootX:18},'strike'],
  [19,{lean:16,chest:7,fw:[163,-286],rw:[2,-320],rootX:24}],
  [28,{lean:3,fw:[111,-292],rw:[4,-320],rootX:19}],[39,K('guard',{rootX:6})]
 ],{kind:'projectile',note:'单拳后拉 → 肩部发射 → 大臂先停、前臂回收'});
 author('luke','flash','闪光拳','↓↙← + P（可蓄力）',72,29,39,[
  [10,{lean:-12,bob:10,chest:-14,fw:[-11,-282],rw:[5,-319],rootX:-10}],
  [24,{lean:-14,bob:13,chest:-16,fw:[-16,-287],rw:[4,-322],rootX:-14},'hold'],
  [29,{lean:26,chest:15,head:-18,fw:[184,-278],rw:[-22,-306],fa:[141,-16],ra:[-130,-16],rootX:27},'strike'],
  [35,{lean:29,chest:18,fw:[176,-271],rw:[-36,-303],rootX:39}],
  [46,{lean:5,chest:-4,fw:[104,-287],rw:[7,-319],rootX:29}],[58,K('guard',{rootX:15})]
 ],{kind:'punch',note:'明显蓄力保持 → 很短的释放 → 较长的收势，不能全段匀速插值'});
 author('luke','rising','升龙拳','→↓↘ + P',65,16,36,[
  [9,{lean:23,bob:32,fw:[14,-242],rw:[7,-319],chest:14}],
  [16,K('rise',{fw:[91,-375],rw:[8,-307],lean:1,chest:13,rootY:-12,rootX:23}),'strike'],
  [25,K('rise',{fw:[70,-410],rw:[-5,-311],lean:-12,chest:-5,rootY:-102,rootX:58})],
  [36,K('rise',{fw:[80,-383],rw:[4,-312],rootY:-117,rootX:73})],
  [45,K('chamber',{rootY:-62,rootX:78})],[55,K('low',{bob:24,rootX:80})]
 ],{kind:'uppercut',note:'拳击压膝 → 短勾拳抬升 → 单拳延展，不复制隆的双肩角度'});
 // Juri: bent resting leg, off-axis torso, slicing feet.
 author('juri','saiha','岁破冲','↓↘→ + LK',66,20,34,[
  [10,K('chamber',{lean:-23,fa:[66,-182],fw:[66,-235],rw:[-78,-272],open:1,head:15})],
  [20,{lean:-25,head:19,bob:28,fw:[45,-244],rw:[-100,-276],fa:[222,-38],ra:[-85,-16],ffoot:75,open:1,rootX:19},'strike'],
  [28,{lean:-18,head:12,bob:20,fw:[61,-235],rw:[-94,-281],fa:[192,-53],ra:[-80,-16],ffoot:64,open:1,rootX:22}],
  [40,K('chamber',{lean:-12,open:1,head:14,rootX:17})],[53,{fa:[68,-110],rootX:7,open:1}]
 ],{kind:'groundwave',socket:'frontLeg',note:'擦地扫出脚刃，波沿地面走；收回到单腿悬起的站姿'});
 author('juri','gooh','五黄杀','↓↘→ + HK',77,25,46,[
  [9,K('chamber',{lean:-23,fw:[43,-236],rw:[-76,-268],open:1})],
  [18,{lean:-36,head:23,fw:[45,-244],rw:[-99,-299],fa:[101,-374],ra:[-78,-71],ffoot:80,rootY:-19,rootX:13,open:1}],
  [25,{lean:-13,head:13,fw:[57,-251],rw:[-103,-286],fa:[221,-218],ra:[-86,-114],ffoot:74,rootY:-38,rootX:47,open:1},'strike'],
  [37,{lean:11,head:6,fw:[77,-261],rw:[-108,-313],fa:[217,-81],ra:[-99,-50],ffoot:65,rootY:-10,rootX:78,open:1}],
  [49,K('chamber',{rootX:81,open:1,head:15})],[63,{rootX:59,open:1}]
 ],{kind:'kick',socket:'frontLeg',note:'脚抬过头 → 斧劈下落；背部和头部反向平衡'});
 author('juri','tensen','天穿轮','→↓↘ + P',80,19,47,[
  [9,K('chamber',{lean:-25,bob:14,open:1})],
  [19,{lean:-27,head:17,fa:[108,-376],ra:[-76,-140],fw:[57,-265],rw:[-101,-299],ffoot:82,rootY:-22,rootX:23,open:1},'strike'],
  [28,{spin:-110,lean:-7,fa:[203,-282],ra:[-79,-212],fw:[54,-275],rw:[-91,-281],rootY:-110,rootX:51,open:1,turn:.7}],
  [39,{spin:-254,lean:3,fa:[179,-224],ra:[-91,-213],fw:[56,-288],rw:[-84,-290],rootY:-121,rootX:65,open:1}],
  [48,K('chamber',{spin:-360,rootY:-72,rootX:70,open:1})],
  [61,K('low',{spin:-360,bob:23,rootX:73,open:1})],[71,{spin:-360,rootX:55,open:1}]
 ],{kind:'spin',socket:'frontLeg',note:'以腿为刃的腾空轮转，躯干压缩后再展开'});
 // Mai's motion families intentionally distinguish the SF6 versions.
 author('mai','kachousen','花蝶扇','↓↘→ + P',62,20,30,[
  [9,{lean:-16,bob:7,fw:[13,-278],rw:[-68,-284],fan:1,fanAngle:-35,chest:-8}],
  [16,{lean:-8,fw:[44,-321],rw:[-62,-279],fan:1,fanAngle:-54},'hold'],
  [20,{lean:17,head:-10,chest:9,fw:[164,-292],rw:[-68,-290],fa:[112,-16],ra:[-123,-16],fan:0,rootX:10},'strike'],
  [29,{lean:8,fw:[129,-272],rw:[-49,-295],fan:0,rootX:13}],[42,{lean:-1,fw:[79,-289],rw:[-25,-293],fan:.18,rootX:6}],[53,{fan:.75}]
 ],{kind:'fan',note:'展开扇面蓄势 → 手腕送扇 → 空手收回；扇从手中离开'});
 author('mai','hishou-ryuuenjin','飞翔龙炎阵','→↓↘ + K',80,22,45,[
  [9,K('chamber',{bob:26,lean:8,fa:[99,-135],fw:[76,-307],rw:[-42,-288],fan:0})],
  [16,K('chamber',{bob:12,lean:-9,fa:[107,-257],fan:0,rootY:-4})],
  [22,{lean:-31,head:16,fw:[63,-280],rw:[-79,-281],fa:[93,-390],ra:[-81,-141],ffoot:77,fan:0,rootY:-37,rootX:22},'strike'],
  [31,{lean:0,spin:-120,fw:[69,-287],rw:[-60,-302],fa:[142,-320],ra:[-91,-216],fan:0,turn:.65,rootY:-131,rootX:49}],
  [42,{lean:3,spin:-265,fw:[56,-313],rw:[-52,-297],fa:[116,-191],ra:[-70,-178],fan:0,rootY:-131,rootX:57}],
  [53,K('chamber',{spin:-360,fan:.1,rootY:-54,rootX:59})],[65,K('low',{spin:-360,bob:21,fan:.4,rootX:62})],[73,{spin:-360,rootX:45}]
 ],{kind:'uppercut',socket:'frontLeg',note:'膝起 → 火焰上踢 → 后空翻。不是拿扇子打升龙拳'});
 author('mai','hissatsu-shinobi-bachi','必杀忍蜂','↓↘→ + K',83,31,53,[
  [9,K('low',{bob:20,fan:0})],
  [17,{lean:8,spin:-96,fw:[72,-383],rw:[-40,-352],fa:[125,-239],ra:[-86,-252],fan:0,rootY:-21,rootX:11}],
  [25,{lean:7,spin:-275,fw:[65,-326],rw:[-46,-304],fa:[127,-208],ra:[-110,-181],fan:0,rootY:-28,rootX:42}],
  [31,K('elbow',{spin:-360,rootY:-28,rootX:75}),'strike'],
  [45,K('elbow',{spin:-360,lean:43,fa:[148,-73],ra:[-114,-138],rootY:-25,rootX:166})],
  [56,K('low',{spin:-360,bob:17,fan:.2,rootX:211})],[70,{spin:-360,rootX:176,fan:.7}]
 ],{kind:'rush',socket:'frontArm',note:'翻身起动 → 收臂露肘 → 水平撞击；不是伸拳冲刺'});
 author('mai','ryuuenbu','龙炎舞','↓↙← + P',76,20,49,[
  [9,{lean:-12,fw:[17,-316],rw:[-68,-273],fan:1,fanAngle:-27,turn:.3,chest:-10}],
  [20,{lean:15,fw:[165,-283],rw:[-91,-279],fan:1,fanAngle:24,turn:.21,chest:12},'strike'],
  [29,{lean:5,fw:[63,-347],rw:[-108,-267],fan:1,turn:.73,depth:.86}],
  [39,{lean:12,fw:[-105,-283],rw:[100,-296],fan:1,turn:1,depth:.83,fa:[102,-16],ra:[-118,-16]}],
  [49,{lean:17,fw:[145,-246],rw:[-91,-315],fan:1,fanAngle:32,turn:.16,chest:11}],
  [61,{lean:-3,fw:[84,-284],rw:[-26,-294],fan:.77}]
 ],{kind:'fire',extraHits:[39],note:'地面旋身扫炎，扇沿周身画弧；与上升翻踢分开'});
 // Canonical IDs are intentionally different from the old game's mislabeled
 // internal aliases. `meta.legacyMoveBase` records the explicit migration map.
 author('mai','musasabi-no-mai','鼯鼠之舞','空中 ↓↙← + P',74,20,39,[
  [1,{lean:-7,fw:[78,-313],rw:[-31,-301],fa:[62,-222],ra:[-71,-209],fan:0,rootY:-142}],
  [10,{lean:22,head:-13,fw:[18,-304],rw:[-71,-279],fa:[51,-221],ra:[-67,-228],fan:0,rootY:-154,rootX:8}],
  [20,{lean:65,head:-27,chest:7,fw:[24,-289],rw:[-63,-274],fa:[101,-218],ra:[34,-263],fan:0,rootY:-129,rootX:54},'strike'],
  [31,{lean:67,head:-28,chest:6,fw:[26,-289],rw:[-69,-275],fa:[113,-213],ra:[42,-265],fan:0,rootY:-62,rootX:126}],
  [41,K('low',{lean:28,bob:39,fw:[92,-257],rw:[-41,-267],fan:0,rootX:168})],
  [55,K('guard',{rootX:163,fan:.55})],[64,{rootX:158,fan:.92}]
 ],{kind:'body-dive',socket:'chest',note:'在空中收腿 → 身体先行斜冲 → 屈膝着地；不是嘉米的伸腿俯踢'});
 author('mai','kagerou-no-mai','阳炎之舞','↓↘→ ↓↘→ + P',104,33,70,[
  [11,{lean:-2,bob:25,fw:[11,-265],rw:[-25,-267],fa:[78,-16],ra:[-78,-16],fan:.08}],
  [24,{lean:-4,bob:7,fw:[41,-350],rw:[-42,-344],fan:.1,open:1},'load'],
  [33,{lean:-8,head:-11,fw:[59,-403],rw:[-62,-391],fa:[83,-16],ra:[-79,-16],fan:.18,open:1,chest:-8},'strike'],
  [50,{lean:-9,head:-12,fw:[82,-367],rw:[-90,-354],fan:1,open:1}],
  [70,{lean:2,fw:[128,-302],rw:[-108,-298],fan:1,turn:.24,open:1}],
  [86,{lean:-4,fw:[105,-294],rw:[-43,-292],fan:1}]
 ],{kind:'install',note:'原地结印 → 双臂打开 → 周身火柱。战斗资源由原游戏规则负责'});
 // Iori remains a visibly labelled crossover study, not an SF6 roster claim.
 author('iori','yamibarai','暗拂','↓↘→ + P',69,23,35,[
  [10,{lean:15,bob:24,chest:-12,fw:[-13,-244],rw:[-108,-290],open:1,rootX:-7}],
  [18,{lean:26,bob:38,fw:[46,-214],rw:[-119,-313],open:1,rootX:4}],
  [23,{lean:34,bob:42,head:-21,fw:[156,-211],rw:[-114,-306],fa:[136,-16],ra:[-137,-16],open:1,chest:13,rootX:21},'strike'],
  [35,{lean:23,bob:26,fw:[137,-224],rw:[-86,-292],open:1,rootX:24}],[50,{lean:13,fw:[100,-271],rw:[-69,-216],open:1,rootX:12}]
 ],{kind:'groundwave',note:'同人客串：后拉火焰 → 低身甩地 → 手爪回收'});
 author('iori','aoihana','葵花','↓↙← + P',92,20,60,[
  [10,{lean:18,bob:20,fw:[-21,-242],rw:[-99,-301],open:1,chest:-11}],
  [20,K('claw',{rootX:28}),'strike'],
  [30,{lean:16,fw:[35,-347],rw:[-104,-246],open:1,rootX:43}],
  [40,K('claw',{fw:[163,-226],rootX:68,bob:23}),'strike'],
  [50,{lean:-8,fw:[83,-377],rw:[-104,-262],open:1,rootX:78,rootY:-12}],
  [60,K('claw',{fw:[147,-188],lean:41,bob:46,rootX:114}),'strike'],
  [74,{lean:21,bob:18,fw:[95,-241],rw:[-92,-235],open:1,rootX:103}],[85,{rootX:73}]
 ],{kind:'claw',extraHits:[40,60],note:'同人客串：横爪 → 反手爪 → 举臂下砸，三次蓄势分开'});
 author('iori','oniYaki','鬼烧','→↓↘ + P',81,20,49,[
  [9,{lean:22,bob:31,fw:[25,-234],rw:[-86,-288],open:1,chest:13}],
  [20,{lean:-18,head:-6,fw:[88,-386],rw:[-103,-301],fa:[75,-160],ra:[-83,-104],open:1,rootY:-29,rootX:27,chest:-12},'strike'],
  [31,{lean:-10,fw:[-72,-380],rw:[102,-293],fa:[-78,-181],ra:[83,-157],open:1,turn:1,depth:.86,rootY:-116,rootX:55}],
  [43,{lean:-17,fw:[83,-382],rw:[-100,-298],fa:[79,-173],ra:[-89,-139],open:1,turn:.08,rootY:-126,rootX:66}],
  [54,K('chamber',{rootY:-61,rootX:74,open:1})],[65,K('low',{bob:22,rootX:77,open:1})],[75,{rootX:58}]
 ],{kind:'uppercut',note:'同人客串：爪形手掌牵引紫焰，前后身回转而非直拳'});
 INK.motion={library,catalog,neutral,author,base(id){return{...copy(basePose),...copy(neutral[id]||neutral.ryu),rootX:0,rootY:0};}};
})();
