'use strict';
(()=>{
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',clamp=(v,l,h)=>Math.max(l,Math.min(h,v)),mix=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a);
const el=(tag,attrs={},parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.appendChild(n);return n};
const path=(d,fill,parent,attrs={})=>el('path',{d,fill,...attrs},parent),line=(d,stroke,width,parent,attrs={})=>path(d,'none',parent,{stroke,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...attrs});
// Skip unchanged SVG attribute mutations; idle limbs and HUD need no repaint.
const sa=(n,k,v)=>{const value=String(v);const cache=n._attrs||(n._attrs=Object.create(null));if(cache[k]!==value){cache[k]=value;n.setAttribute(k,value)}};
const SCALE=1.04,FLOOR=665,STEP=1000/60;

const CHARACTERS=[
{id:'ryu',name:'RYU',cn:'隆',style:'均衡 / 电刃强化',color:'#80eaff',skin:'#d9a780',cloth:'#e0dfd4',hair:'#292431',speed:5.4,scale:1.04,stance:'电刃架势',trait:'电刃蓄力：↓↓＋P 储存强化；波动拳与波掌击增加伤害和命中次数，波动拳还能多抵消一发普通气弹。'},
{id:'ken',name:'KEN',cn:'肯',style:'压制 / 疾跑派生',color:'#ffab65',skin:'#edbe92',cloth:'#b84048',speed:6.0,scale:1.04,stance:'疾跑',trait:'疾跑派生：六种追击改变高低段与位移；火焰追击可接 SA3。'},
{id:'chun',name:'CHUN-LI',cn:'春丽',style:'技巧 / 行云流水',color:'#84c9ff',skin:'#e4b29b',cloth:'#287eaf',speed:6.1,scale:1,female:true,stance:'行云流水',trait:'行云流水：↓↓＋K 或 ↓↙←＋P 后接六键。气功拳与旋转鹤脚蹴使用真正的方向蓄力。'},
{id:'cammy',name:'CAMMY',cn:'嘉米',style:'突进 / 空中奇袭',color:'#83f1c8',skin:'#e8c0ac',cloth:'#5c829c',speed:6.8,scale:.96,female:true,stance:'流氓组合',trait:'流氓组合进入腾空架势；六种派生含空中投技、俯冲、下段与假动作。空中特殊技有真实空中限制。'},
{id:'luke',name:'LUKE',cn:'卢克',style:'重击 / 蓄力拳',color:'#ffc66c',skin:'#e2ad88',cloth:'#bf5049',speed:5.8,scale:1.05,stance:'复仇者',trait:'闪光拳可按住攻击键蓄力；在蓄力 18～24 帧松开为完美蓄力，增加伤害、浮空与取消窗口。'},
{id:'juri',name:'JURI',cn:'蛛俐',style:'疾速 / 风水引擎',color:'#e291ff',skin:'#e3b7b1',cloth:'#dcd5de',speed:6.6,scale:.99,female:true,stance:'风破连携',trait:'风破刃命中或蓄势存储风破（最多3枚）。强化必杀消耗一枚；SA2 风水引擎持续10秒，解锁普通技自由取消。'},
{id:'mai',headScale:.70,headY:-338,name:'MAI',cn:'不知火舞',style:'花蝶扇 / 空中忍术',color:'#ff8d78',skin:'#f1bda7',cloth:'#cd2945',hair:'#5a2e31',speed:6.35,scale:.99,female:true,archetype:'fan-zoner',throwStyle:'fan-vault',stance:'花蝶之舞',followSources:[0,2],trait:'轻花蝶扇慢速占位，重花蝶扇快速远投；用长扇普通技与飞翔龙炎阵守住距离，忍蜂和空中鼯鼠之舞惩罚追赶。'},
{id:'iori',headScale:.695,headY:-339,name:'IORI',cn:'八神庵',style:'紫炎 / 葵花压制',color:'#b788ff',skin:'#eed0c1',cloth:'#963c50',hair:'#ae2e43',speed:5.85,scale:1.09,archetype:'rekka-rush',throwStyle:'claw-slam',stance:'八稚女之构',followSources:[1,3],trait:'贴地紫炎掩护接近；葵花命中或被防御后再次输入逐段追击，也可以停手。屑风不可拆、伤害更高，但射程短、挥空破绽大。'}
];
const BUTTONS=['LP','MP','HP','LK','MK','HK'],BTNNAME={LP:'轻拳',MP:'中拳',HP:'重拳',LK:'轻脚',MK:'中脚',HK:'重脚'},KEYS={LP:'J',MP:'K',HP:'L',LK:'U',MK:'I',HK:'O'};
const ARROWS={1:'↙',2:'↓',3:'↘',4:'←',5:'·',6:'→',7:'↖',8:'↑',9:'↗'};
const fmtMotion=s=>s==='chargeB'?'[← 0.65秒] →':s==='chargeD'?'[↓ 0.65秒] ↑':s.split('').map(n=>ARROWS[n]||n).join(' ');
const BASESPECIALS={
ryu:[['hadoken','波动拳','236','P','projectile','wave',620,19,420],['shoryu','升龙拳','623','P','upper','upper',780,6,183],['tatsu','龙卷旋风脚','214','K','spin','kick',720,11,248],['blade','上段足刀蹴','236','K','rush','kick',820,15,270],['hasho','波掌击','214','P','burst','wave',750,17,246]],
ken:[['hadoken','波动拳','236','P','projectile','wave',560,18,460],['shoryu','火焰升龙拳','623','P','upper','upper',810,5,188],['tatsu','龙卷旋风脚','214','K','spin','kick',720,10,238],['jinrai','迅雷脚','236','K','rekka','kick',740,13,236],['dragonlash','龙尾脚','623','K','leap','kick',900,20,285]],
chun:[['kikoken','气功拳','chargeB','P','projectile','wave',660,12,480],['legs','百裂脚','236','K','barrage','kick',650,8,223],['bird','旋转鹤脚蹴','chargeD','K','spin','kick',850,10,256],['tensho','天升脚','22','P','upper','upper',790,6,190],['hazan','霸山蹴','214','K','overhead','kick',870,18,260]],
cammy:[['arrow','螺旋箭','236','K','drill','kick',720,10,260],['spike','加农升击','623','K','upper','upper',790,5,182],['knuckle','旋风铁拳','214','P','rush','punch',850,18,265],['hooligan','流氓旋跃','236','P','flip','kick',620,15,230],['strike','加农突击','214','K','dive','kick',800,9,246,{air:true}]],
luke:[['sand','沙尘爆破','236','P','projectile','wave',600,14,500],['rising','上升勾拳','623','P','upper','upper',820,6,190],['flash','闪光拳','214','P','charge','punch',810,13,256],['avenger','复仇者前冲','214','K','run','drive',700,12,270],['airflash','空中闪光拳','214','P','dive','punch',740,10,240,{air:true}]],
juri:[['fuha','风破刃','214','K','store','kick',580,12,225],['saiha','岁破冲','236','P','lowprojectile','kick',530,16,510],['anken','暗剑杀','236','K','overhead','kick',790,20,244],['gooh','五黄杀','214','P','barrage','kick',850,15,251],['tensen','天穿轮','623','P','upper','upper',770,6,192]],
mai:[['kachosen','花蝶扇','236','P','projectile','wave',570,17,510,{animation:'maiFan',projectileStyle:'fan'}],['ryuenbu','飞翔龙炎阵','623','P','upper','upper',760,7,185,{animation:'maiRise',contactPart:'fan',weaponReach:38}],['hissatsu','龙炎舞','214','P','spin','punch',680,11,216,{animation:'maiSpin',contactPart:'fan',weaponReach:38}],['shinobibachi','必杀忍蜂','236','K','rush','punch',820,16,287,{animation:'maiRush'}],['musabi','鼯鼠之舞','214','K','dive','punch',800,12,255,{air:true,animation:'maiDive',contactPart:'hand'}]],
iori:[['yamibarai','百八式·暗拂','236','P','lowprojectile','wave',560,19,530,{animation:'ioriFlame',projectileStyle:'violet-flame'}],['oniYaki','百式·鬼烧','623','P','upper','upper',820,7,188,{animation:'ioriRise'}],['aoihana','百二十七式·葵花','214','P','rekka','punch',770,12,226,{animation:'ioriRekka'}],['kototsuki','二百十二式·琴月阴','214','K','rush','punch',870,19,295,{animation:'ioriRush'}],['kuzukaze','屑风','63214','P','throw','guard',900,8,110,{animation:'ioriClaw',throw:true,commandThrow:true,throwStyle:'claw-slam',cancel:false,recovery:34}]]
};
const BRANCHES={
ryu:[['电刃·波动','projectile','wave',700,12,500],['电刃·崩掌','overhead','punch',850,19,245],['电刃·升龙','upper','upper',1020,7,193],['电刃·扫腿','low','kick',620,8,251],['电刃·足刀','rush','kick',860,12,310],['电刃·旋风','spin','kick',1060,17,265]],
ken:[['疾跑·刹停直拳','punch','punch',620,6,217],['疾跑·升龙','upper','upper',1030,7,201],['疾跑·烈火崩拳','overhead','punch',1100,20,255],['迅雷·风镰','low','kick',670,8,258],['迅雷·轰雷','overhead','kick',900,18,268],['疾跑·龙卷烈焰','spin','kick',1110,13,310]],
chun:[['兰华','punch','punch',500,5,188],['无拍','low','punch',650,8,241],['莲掌','burst','wave',900,13,250],['前突','low','kick',550,6,253],['仙风','leap','kick',780,15,294],['天空脚','upper','kick',980,11,220]],
cammy:[['奇袭·急降铁拳','dive','punch',720,7,220],['奇袭·空中捕捉','airthrow','guard',1200,9,154],['奇袭·反身落拳','overhead','punch',970,15,240],['奇袭·滑铲','low','kick',680,8,270],['奇袭·加农俯冲','dive','kick',970,9,302],['奇袭·螺旋升踢','upper','kick',1100,11,242]],
luke:[['复仇·短拳','punch','punch',660,6,212],['复仇·升空勾拳','upper','upper',940,9,224],['复仇·致命闪光','burst','punch',1240,23,281],['复仇·低位扫击','low','kick',620,7,261],['复仇·双重冲膝','barrage','kick',900,12,274],['复仇·终结重腿','overhead','kick',1120,21,298]],
juri:[['风破·紫炎','lowprojectile','wave',640,10,540],['风破·连掌','barrage','punch',850,9,229],['风破·逆轮','upper','upper',970,8,227],['风破·疾扫','low','kick',610,6,262],['风破·连环蹴','barrage','kick',920,11,269],['风破·穿心落','overhead','kick',1140,18,305]],
mai:[['花蝶·扇打','punch','punch',490,6,202],['花蝶·水鸟','low','kick',590,9,241],['花蝶·焰轮','spin','punch',760,13,235],['花蝶·背水','overhead','kick',730,19,247],['花蝶·忍走','rush','punch',750,14,278],['花蝶·空岚','upper','upper',870,10,195]],
iori:[['百合折·爪','punch','punch',530,6,188],['葵花·一段','barrage','punch',670,9,214],['轰斧·阴','overhead','kick',840,21,235],['琴月·压步','rush','punch',760,14,271],['外式·影扫','low','kick',610,10,252],['鬼烧·紫焰','upper','upper',950,11,192]]
};
const FOLLOW_NAMES={
ryu:['雷光连掌','追波足刀','崩山二段','轰雷重踏','升龙追破','旋落空刃','伏虎肘','雷刃低扫','闪电突进','上段破壁','龙卷雷掌','旋风终结'],
ken:['疾风双拳','急停刃脚','火焰追升','空中烈踢','红莲连击','爆炎落踵','迅雷穿掌','风镰追扫','轰雷冲拳','烈火飞踢','神龙追击','龙炎碎落'],
chun:['兰华双掌','兰华扫叶','无拍通背','无拍旋踵','莲掌冲波','莲掌连腿','前突寸劲','前突回旋','仙风落掌','仙风追踢','天翔连掌','天空落踵'],
cammy:['降袭连拳','影袭滑踢','捕捉折返','绞杀落地','反身突刺','背转扫腿','滑铲追击','螺旋续进','俯冲重拳','加农连袭','升踢折返','螺旋坠击'],
luke:['短拳双击','低位爆膝','升空贯拳','高空锤落','闪光爆破','重拳转膝','疾扫直拳','扫击追腿','冲膝破甲','复仇连踢','终结勾拳','致命下劈'],
juri:['紫炎连掌','残影追踢','连掌暗破','连环疾扫','逆轮紫爪','风破空坠','疾扫疾拳','暗影低旋','连环爆掌','五黄追轮','穿心逆袭','断界坠踵'],
mai:['花蝶·扇返','花蝶·忍袭','','','焰轮·冲天','焰轮·落樱'],iori:['','','葵花·二段','葵花·伏爪','','','琴月·焰爪','琴月·影扫']};
const SUPER_NAMES={ryu:['真空波动拳','真·波掌击','真·升龙拳'],ken:['龙尾烈脚','疾风迅雷脚','神龙烈破'],chun:['气功掌','凤翼扇','苍天乱华'],cammy:['旋转驱动粉碎','杀戮回旋','三角绞杀'],luke:['火山爆破','根除者','苍白骑士'],juri:['杀界风破斩','风水引擎','回旋断界落'],mai:['超必杀忍蜂','凤凰之舞','不知火流·红蝶乱舞'],iori:['禁千二百十一式·八稚女','里百八式·八酒杯','三神技之贰·八尺琼勾玉']};
const MOVES={};
// These normals are the neutral-game anchors of each character. Reach changes
// also deform the authored attacking limb; range remains an AI estimate only.
const AUTHORED_NORMALS={
ryu:{
 sMP:{startup:6,active:4,recovery:13,damage:500,stun:23,blockstun:15,range:202,attackReachScale:1,note:'近身确认：出手稳、收招短，确认后接波掌或升龙。'},
 cMK:{startup:8,active:4,recovery:17,damage:520,stun:23,blockstun:13,range:257,attackReachScale:1.02,note:'下段牵制：中距离截步，可确认取消；挥空会留下空档。'},
 sHP:{startup:10,active:4,recovery:22,damage:820,stun:29,blockstun:16,range:236,attackReachScale:1.03,note:'重拳确反：伤害高，但收招长，适合惩罚对手挥空。'},
 cHP:{startup:8,active:5,recovery:24,damage:740,stun:27,blockstun:14,range:221,attackReachScale:.97,launch:-8,knockdown:true,note:'蹲重拳对空：向上截击并浮空，无无敌，挥空后容易被追击。'}
},
ken:{
 sMP:{startup:5,active:4,recovery:12,damage:440,stun:21,blockstun:14,range:190,attackReachScale:.94,note:'贴身压制：短距离快速中拳，接迅雷脚改变节奏。'},
 cMK:{startup:7,active:3,recovery:17,damage:480,stun:22,blockstun:12,range:252,attackReachScale:1,note:'截步下段：出手快，可接迅雷；贴近后比远距离试探更强。'},
 sHP:{startup:10,active:5,recovery:21,damage:720,stun:27,blockstun:15,range:229,attackReachScale:1,note:'压制重拳：确认后接火焰追击，挥空不宜硬接下一招。'},
 cHP:{startup:9,active:5,recovery:23,damage:680,stun:26,blockstun:14,range:226,attackReachScale:.99,launch:-7,knockdown:true,note:'近身挑空：无无敌的对空选择，收招后需要重新控距。'}
},
chun:{
 sMP:{startup:5,active:3,recovery:12,damage:450,stun:21,blockstun:13,range:210,attackReachScale:1.04,note:'快掌确认：轻快的近身检查，命中后可接蓄力必杀。'},
 cMK:{startup:8,active:3,recovery:20,damage:520,stun:23,blockstun:12,range:298,attackReachScale:1.12,note:'长腿下段：用腿尖控制远距离；较长收招要求准确控距。'},
 sHP:{startup:11,active:4,recovery:23,damage:730,stun:28,blockstun:15,range:252,attackReachScale:1.10,note:'远掌确反：较远手掌触点，适合抓收招，近身不宜抢招。'},
 cHP:{startup:10,active:6,recovery:25,damage:670,stun:27,blockstun:14,range:236,attackReachScale:1.03,launch:-7,knockdown:true,note:'托掌对空：有效时间长但启动较慢，需要提前观察跳跃。'}
},
cammy:{
 sMP:{startup:5,active:3,recovery:10,damage:440,stun:21,blockstun:12,range:182,attackReachScale:.90,note:'短拳贴身：射程短、收招快，适合接近后的命中确认。'},
 cMK:{startup:7,active:3,recovery:15,damage:460,stun:21,blockstun:12,range:244,attackReachScale:.97,note:'低位截击：快速下段，可接螺旋箭；需要先进入有效距离。'},
 sHP:{startup:9,active:4,recovery:19,damage:700,stun:27,blockstun:14,range:215,attackReachScale:.94,note:'近身重击：快速兑现接近优势，短射程容易被后撤诱空。'},
 cHP:{startup:8,active:5,recovery:22,damage:660,stun:26,blockstun:13,range:215,attackReachScale:.94,launch:-8,knockdown:true,note:'近身迎击：挑起跳入对手，无无敌，过远会落空。'}
},
luke:{
 sMP:{startup:7,active:4,recovery:15,damage:540,stun:24,blockstun:14,range:206,attackReachScale:1.02,note:'扎实中拳：单次收益高，确认后接闪光拳蓄力。'},
 cMK:{startup:9,active:4,recovery:20,damage:540,stun:24,blockstun:13,range:260,attackReachScale:1.03,note:'沉重下段：伤害高但出手慢，适合预判前进。'},
 sHP:{startup:12,active:5,recovery:25,damage:910,stun:31,blockstun:16,range:252,attackReachScale:1.10,note:'重拳惩罚：高伤害、深伸展和长收招，专门惩罚明显破绽。'},
 cHP:{startup:8,active:6,recovery:25,damage:790,stun:29,blockstun:14,range:234,attackReachScale:1.02,launch:-9,knockdown:true,note:'上勾迎击：对空浮得更高，落空后恢复较慢。'}
},
juri:{
 sMP:{startup:6,active:4,recovery:12,damage:460,stun:22,blockstun:14,range:194,attackReachScale:.96,note:'疾速确认：近身检查与风水引擎连携的起点。'},
 cMK:{startup:8,active:4,recovery:17,damage:520,stun:23,blockstun:13,range:275,attackReachScale:1.09,note:'长腿截步：牵制前进，命中可接风破强化必杀。'},
 sHP:{startup:10,active:4,recovery:21,damage:720,stun:28,blockstun:15,range:231,attackReachScale:1.01,note:'重击确认：抓住硬直后兑现伤害，风水引擎中可自由连携。'},
 cHP:{startup:9,active:5,recovery:23,damage:670,stun:27,blockstun:14,range:229,attackReachScale:1,launch:-7,knockdown:true,note:'近空迎击：无无敌的浮空打断，落空后应停止追招。'}
},
mai:{
 sMP:{startup:8,active:4,recovery:18,damage:480,stun:23,blockstun:13,range:247,attackReachScale:1.07,weaponReach:38,note:'横扇控距：扇尖比徒手更远，但收招较慢，避免贴身抢招。'},
 cMK:{startup:8,active:3,recovery:17,damage:460,stun:22,blockstun:12,range:252,attackReachScale:1,note:'忍步下段：用脚截住追赶者，扇子不参与这招的判定。'},
 sHP:{startup:12,active:5,recovery:26,damage:800,stun:30,blockstun:15,range:286,attackReachScale:1.13,weaponReach:38,note:'回身长扇：远端重击，挥空后破绽大；适合惩罚追扇前进。'},
 cHP:{startup:10,active:5,recovery:25,damage:680,stun:27,blockstun:14,range:259,attackReachScale:1.02,weaponReach:38,launch:-7,knockdown:true,note:'托扇对空：扇尖向上截击，无无敌，需提前等候跳入。'}
},
iori:{
 sMP:{startup:6,active:4,recovery:11,damage:500,stun:24,blockstun:14,range:201,attackReachScale:.96,note:'近爪压制：收招快、距离短，命中后接葵花逐段确认。'},
 cMK:{startup:8,active:4,recovery:18,damage:520,stun:23,blockstun:12,range:262,attackReachScale:1.04,note:'低位影扫：截步接近，取消葵花时要确认对手是否受击。'},
 sHP:{startup:11,active:4,recovery:23,damage:850,stun:30,blockstun:15,range:245,attackReachScale:1.04,note:'荒爪确反：重伤害换长收招，抓住破绽后再续葵花。'},
 cHP:{startup:9,active:5,recovery:24,damage:770,stun:28,blockstun:14,range:236,attackReachScale:1,launch:-8,knockdown:true,note:'挑爪对空：近距离挑起对手，无无敌，地面挥空风险高。'}
}
};
function move(id,name,category,o={}){const m={id,name,category,kind:'punch',pose:'punch',startup:7,active:4,recovery:15,damage:500,range:220,height:'mid',level:1,hits:1,knock:18,stun:21,blockstun:13,cancel:true,motion:'',button:'',cost:0,...o};m.total=m.startup+m.active+m.recovery;return m}
for(const c of CHARACTERS){let a=[];
for(const state of ['s','c','a'])BUTTONS.forEach((b,i)=>{const k=i>=3,s=i%3;a.push(move(state+b,(state==='c'?'蹲姿':state==='a'?'跳跃':'站立')+BTNNAME[b],'normal',{cmd:(state==='c'?'↓ + ':state==='a'?'跳跃中 + ':'')+b+' / '+KEYS[b],button:b,normalState:state,level:s+1,pose:k?'kick':'punch',kind:k?'kick':'punch',startup:[4,7,11][s]+(k?1:0),active:3+s,recovery:9+s*5,damage:280+s*210+(k?40:0),range:(k?225:175)+s*27+(c.id==='chun'&&k?15:0),height:state==='c'?(k?'low':'mid'):state==='a'?'overhead':'mid',stun:16+s*6,blockstun:10+s*4,knock:10+s*6,knockdown:state==='c'&&b==='HK',air:state==='a',note:state==='c'&&b==='HK'?'下段扫倒；不可普通必杀取消':state==='a'?'空中攻击；需站立防御':'命中或被防御可取消为必杀 / 迸发',cancel:!(state==='c'&&b==='HK')}))});
for(const [id,n,mo,b,kind,pose,dmg,st,reach,ex={}]of BASESPECIALS[c.id])for(let s=0;s<4;s++){const od=s===3,ss=od?2:s,hits=['spin','barrage','rekka'].includes(kind)?2+ss:(od?2:1);a.push(move(id+'_'+s,(od?'OD ':['轻·','中·','重·'][s])+n,'special',{base:id,cmd:(ex.air?'空中 ':'')+fmtMotion(mo)+' + '+(od?b+b:['L','M','H'][s]+b),motion:mo,button:b,kind,pose,damage:Math.round((dmg+ss*100)*(od?1.2:1)),startup:Math.max(4,st+ss*2-(od?3:0)),active:Math.max(5,hits*7),recovery:16+ss*3,range:reach+ss*12,hits,level:ss+1,strength:s,cost:od?2:0,od,stun:24+ss*4,blockstun:14+ss*3,knock:18+ss*8,knockdown:od||['upper','spin','drill'].includes(kind),launch:kind==='upper'?-(10+ss*2):0,invuln:od&&kind==='upper'?16:0,speed:9+ss*3,travel:['rush','run','spin','drill','leap'].includes(kind)?8+ss*2:0,height:kind==='overhead'?'overhead':kind==='lowprojectile'?'low':'mid',note:od?'消耗2斗气；追加命中 / 强化位移':`启动 ${Math.max(4,st+ss*2)}F · ${hits}击 · 独立速度/距离/恢复`,...ex}))}
a.push(move('stance',c.stance,'unique',{cmd:'↓ ↓ + K → 六键派生',motion:'22',button:'K',kind:'stance',pose:c.id==='cammy'?'kick':'guard',startup:8,active:1,recovery:12,damage:0,range:0,note:'进入90帧派生窗口；六键选择不同高低段、浮空与位移'}));
BRANCHES[c.id].forEach(([n,kind,pose,dmg,st,reach],i)=>a.push(move('branch_'+i,n,'branch',{cmd:c.stance+'中 → '+BUTTONS[i]+' / '+KEYS[BUTTONS[i]],button:BUTTONS[i],kind,pose,damage:dmg,startup:st,active:['barrage','spin'].includes(kind)?24:7,recovery:15+i,range:reach,hits:['barrage','spin'].includes(kind)?3:1,level:2+i%2,knock:22+i*3,stun:27+i,blockstun:16+i,height:kind==='low'||kind==='lowprojectile'?'low':kind==='overhead'||kind==='dive'?'overhead':'mid',launch:kind==='upper'?-14:0,travel:['rush','dive','leap'].includes(kind)?12:0,knockdown:i===5||kind==='upper'||kind==='airthrow',throw:kind==='airthrow',speed:14,note:(kind==='airthrow'?'投技：击败防御/招架':kind==='upper'?'对空浮空':kind==='overhead'?'中段，需站立防御':kind==='low'||kind==='lowprojectile'?'下段，需蹲防':kind==='barrage'||kind==='spin'?'多段连续命中':'可接超级必杀')+' · 架势专属分支'})));
// Each of the six stance openers has two hit-confirmed follow-ups: 18 distinct branches total.
for(const source of (c.followSources||[0,1,2,3,4,5]))for(let route=0;route<2;route++){
 const kindsA=['burst','barrage','upper','rush','projectile','upper'],kindsB=['rush','low','dive','low','spin','overhead'],kind=(route?kindsB:kindsA)[source],btn=route?'HK':'HP',idx=source*2+route;
 a.push(move('follow_'+idx,FOLLOW_NAMES[c.id][idx],'branch',{from:'branch_'+source,followBtn:btn,cmd:BRANCHES[c.id][source][0]+'命中 / 被防御 → '+btn+' / '+KEYS[btn],kind,pose:route?'kick':kind==='upper'?'upper':kind==='projectile'?'wave':'punch',damage:820+source*73+route*110,startup:6+source+(route?3:0),active:['spin','barrage'].includes(kind)?23:10,recovery:18+source*2+route*3,range:kind==='projectile'?550:242+source*14+route*19,hits:['spin','barrage'].includes(kind)?3:kind==='burst'?2:1,level:3,knock:30+source*5,stun:32+source,blockstun:17+source,height:kind==='low'?'low':kind==='overhead'||kind==='dive'?'overhead':'mid',launch:kind==='upper'?-15:0,travel:['rush','spin','dive'].includes(kind)?11+source:0,knockdown:true,speed:15,note:'二段派生：仅从「'+BRANCHES[c.id][source][0]+'」命中或被防御后取消；'+(route?'腿系终结，改变位移与高低段':'拳系追击，浮空/连打/气弹')+'，可接SA3'}));
}
for(let lv=1;lv<=3;lv++){let kind=lv===1&&(c.id==='ryu'||c.id==='luke'||c.id==='chun'||c.id==='juri')?'superprojectile':'superrush';if(c.id==='juri'&&lv===2)kind='install';if(c.id==='iori'&&lv===2)kind='superprojectile';a.push(move('SA'+lv,SUPER_NAMES[c.id][lv-1],'super',{cmd:fmtMotion(lv===2?'214214':'236236')+' + '+(lv===3?'K':'P'),motion:lv===2?'214214':'236236',button:lv===3?'K':'P',kind,pose:kind==='superprojectile'?'wave':lv===3?'upper':'kick',super:lv,cost:0,damage:[0,1900,2800,3900][lv],startup:lv===3?12:10,active:lv===3?84:48,recovery:24,hits:lv===3?8:5,range:kind==='superprojectile'?1300:285,travel:kind==='superrush'?15:0,stun:42,blockstun:23,knock:26,knockdown:true,invuln:24,speed:16,note:kind==='install'?'消耗2超级能量；10秒普通技自由取消':'消耗'+lv+'超级能量；独立演出、多段判定与击倒'}))}
a.push(move('CA','CRITICAL ART · '+SUPER_NAMES[c.id][2],'super',{...a.find(m=>m.id==='SA3'),id:'CA',name:'CRITICAL ART · '+SUPER_NAMES[c.id][2],cmd:'生命≤25%时 · 236236 + K',damage:4600,ca:true,note:'生命≤25%、3格超级能量时自动升级；更强终结段'}));
a.push(move('throw','前投 / '+c.cn+'·摔技','system',{cmd:'LP + LK / V',kind:'throw',pose:'guard',startup:5,active:3,recovery:24,damage:1200,range:145,throw:true,knockdown:true,cancel:false,knock:65,note:'近身投技；无视防御和招架，8帧内可拆投'}));
a.push(move('backthrow','后投','system',{cmd:'← + LP + LK / ← + V',kind:'throw',pose:'guard',startup:5,active:3,recovery:24,damage:1150,range:145,throw:true,knockdown:true,cancel:false,backthrow:true,knock:80,note:'交换位置并击倒'}));
a.push(move('DI','斗气冲击','system',{cmd:'HP + HK / E',kind:'impact',pose:'drive',startup:26,active:3,recovery:32,damage:950,range:267,cost:1,armor:2,knock:65,stun:65,blockstun:21,knockdown:true,cancel:false,note:'两次霸体；第三击/投技/超级必杀破甲；角落崩墙'}));
a.push(move('REV','斗气反击','system',{cmd:'防御硬直中 → + HP + HK / → + E',kind:'reversal',pose:'drive',startup:16,active:5,recovery:25,damage:650,range:270,cost:2,invuln:26,knockdown:true,knock:85,cancel:false,note:'只能在防御硬直中发动，消耗2格并推开对手'}));
for(const [id,n,cmd,note]of [['PAR','斗气招架','MP + MK / Q','起始0.5格，持续消耗；最初2帧为完美招架，投技不可招架'],['RUSH','斗气迸发','招架中 → → / F','招架迸发总1格；命中取消3格；下次普通技+4F硬直'],['DENJIN','电刃蓄力','↓ ↓ + P','仅隆；下次波动拳或波掌击强化伤害并追加命中，波动拳还能多抵消一发普通气弹']]){if(id==='DENJIN'&&c.id!=='ryu')continue;a.push(move(id,n,'system',{cmd,note,kind:id.toLowerCase(),damage:0,range:0,startup:15,active:1,recovery:13}))}
// New guests have deliberately small, authored routes rather than cloned follow-up lists.
if(c.id==='mai'||c.id==='iori'){
 const mai=c.id==='mai',normalNames=mai?['扇柄突','横扇切','回身扇','忍步踢','侧踢','轮舞踢']:['爪突','逆掌','荒咬','胫踢','侧踢','轰斧'];
 for(const m of a){
  if(m.category==='normal'){const i=BUTTONS.indexOf(m.button);m.name=(m.normalState==='c'?'蹲·':m.normalState==='a'?'空·':'')+normalNames[i];m.animation=mai?(i<3?'maiFanStrike':'maiKick'):(i<3?'ioriClawStrike':'ioriKick');if(i<3){m.range+=mai?14:7;m.damage-=mai?15:0}m.contactPart=i<3?(mai?'fan':'hand'):'foot';if(mai&&i<3)m.weaponReach=38;}
  if(m.category==='branch'){m.animation=mai?(m.kind.includes('projectile')?'maiFan':m.kind==='upper'?'maiRise':m.kind==='spin'?'maiSpin':m.kind==='rush'?'maiRush':m.pose==='kick'?'maiKick':'maiFanStrike'):(m.kind.includes('projectile')?'ioriFlame':m.kind==='upper'?'ioriRise':m.kind==='rush'?'ioriRush':m.pose==='kick'?'ioriKick':'ioriRekka');m.projectileStyle=mai?'fan':'violet-flame';if(mai&&['maiFanStrike','maiRise','maiSpin'].includes(m.animation)){m.contactPart='fan';m.weaponReach=38;}}
  if(m.super){m.animation=mai?(m.super===1?'maiRush':m.super===2?'maiSpin':'maiSuper'):(m.super===2?'ioriFlame':'ioriSuper');m.projectileStyle=mai?'fan':'violet-flame';m.contactPart=mai&&m.super>=2?'fan':'hand';if(m.contactPart==='fan')m.weaponReach=38;if(m.super===1){m.damage=1850;m.hits=4}if(m.super===3){m.damage=m.ca?4450:3750;m.hits=7}}
  if(m.throw){m.throwStyle=c.throwStyle;if(!m.commandThrow)m.name=m.backthrow?(mai?'风车崩·后投':'逆剥·后投'):(mai?'不知火·风车崩':'逆剥·前投');}
  m.total=m.startup+m.active+m.recovery;
 }
}
for(const m of a){
 if(m.category==='normal'&&AUTHORED_NORMALS[c.id]?.[m.id])Object.assign(m,AUTHORED_NORMALS[c.id][m.id]);
 if(c.id==='mai'&&m.base==='kachosen'){
  const s=m.strength;
  Object.assign(m,{speed:[6.2,10.2,17.5,11.5][s],projectileLife:[160,120,70,125][s],projectileDistance:[840,1050,1150,1180][s],range:[840,1050,1150,1180][s],startup:[16,18,22,18][s],active:s===3?14:7,recovery:[15,19,27,22][s],damage:[510,600,720,1000][s],hits:s===3?2:1,note:[
   '慢扇占位：慢速长留场，借扇子的掩护移动；单次伤害较低。',
   '中速牵制：飞行速度与收招均衡，控制中距离追赶。',
   '快扇确反：高速远投、伤害较高；启动与收招更慢，不能盲目连发。',
   'OD 双焰扇：消耗2斗气，中速两次接触；适合确认后压制或击倒。'
  ][s]});
 }
 if(c.id==='cammy'&&m.id==='follow_2')Object.assign(m,{name:'铁拳·折返连拳',from:'knuckle_0',cmd:'轻·旋风铁拳命中 / 被防御 → HP / L',note:'轻旋风铁拳确认后按重拳接连续打击；挥空不能接，末击将对手击倒。'});
 if(c.id==='cammy'&&m.id==='follow_3')Object.assign(m,{name:'铁拳·滑踢终结',from:'knuckle_0',cmd:'轻·旋风铁拳命中 / 被防御 → HK / O',note:'轻旋风铁拳确认后按重脚接下段滑踢；需要蹲防，命中后击倒，挥空不能接。'});
 if(c.id==='iori'&&m.base==='yamibarai'){
  const s=m.strength;Object.assign(m,{speed:[8.5,10,12.5,11][s],projectileLife:[100,85,75,100][s],projectileDistance:[750,810,880,950][s],range:[750,810,880,950][s],note:(m.od?'消耗2斗气，双段紫炎。':'贴地紫炎，需蹲防。')+'有限射程逼近对手；可以跳越，不是全屏封锁。'});
 }
 if(c.id==='juri'&&m.id==='SA2')Object.assign(m,{damage:0,range:0,hits:1});
 if(c.id==='iori'&&m.base==='aoihana'){
  const s=m.strength;Object.assign(m,{name:(m.od?'OD ':['轻·','中·','重·'][s])+'葵花·一段',startup:[10,12,14,10][s],active:3,recovery:[14,15,17,14][s],damage:[420,470,520,570][s],hits:1,stun:23,blockstun:14,knock:7,travel:[2,2.5,3,3.5][s],knockdown:false,contactPart:'hand',rekkaNext:'branch_1',note:(m.od?'消耗2斗气。':'')+'单次爪击，命中或被防御后20帧内再次按任意P接第二段（也可再次 ↓↙←＋P）；停段保留较短收招。'});
 }
 if(c.id==='iori'&&m.id==='branch_1')Object.assign(m,{name:'葵花·二段',kind:'rekka',pose:'punch',animation:'ioriRekka',contactPart:'hand',cmd:'葵花一段确认 → P / J、K、L（也可再次 ↓↙←＋P）',startup:8,active:3,recovery:17,damage:450,hits:1,stun:23,blockstun:14,range:222,knock:8,travel:4,knockdown:false,rekkaFrom:'aoihana',rekkaNext:'follow_2',note:'仅从葵花一段确认进入；再次输入接第三段，也可以停手观察。'});
 if(c.id==='iori'&&m.id==='follow_2')Object.assign(m,{name:'葵花·三段',kind:'rekka',pose:'punch',animation:'ioriRekka',contactPart:'hand',cmd:'葵花二段确认 → P / J、K、L（也可再次 ↓↙←＋P）',startup:13,active:4,recovery:28,damage:700,hits:1,stun:30,blockstun:14,range:238,knock:50,travel:3,launch:0,knockdown:true,rekkaFrom:'branch_1',note:'第三段终结并击倒；被防御后收招很长，确认命中再追击更稳妥。'});
 if(c.id==='iori'&&m.id==='follow_3')Object.assign(m,{name:'百合折·影扫',from:'branch_0',cmd:'百合折·爪命中 / 被防御 → HK / O',animation:'ioriKick',contactPart:'foot',note:'百合折的下段终结，需要蹲防；独立于葵花三段路线。'});
 if(c.id==='iori'&&m.id==='stance')Object.assign(m,{cmd:'↓ ↓ + K → LP / HP / LK / MK / HK',note:'五键选择独立架势招；葵花二、三段只能从前一段命中或被防御后继续输入。'});
 if(c.id==='iori'&&m.base==='kuzukaze'){
  const s=m.strength;Object.assign(m,{damage:[1380,1490,1600,1780][s],range:[110,116,122,122][s],startup:[8,10,12,9][s],active:s===3?5:4,recovery:34,hits:1,knockdown:true,note:(m.od?'消耗2斗气。':'')+'不可拆解的近身指令投，比普通投伤害高；射程更短、启动较慢、挥空收招34帧，无法抓住跳起或硬直中的对手。'});
 }
 if(m.throw&&!m.throwStyle)m.throwStyle=c.id==='chun'||c.id==='cammy'||c.id==='juri'?'leg-vault':c.id==='luke'?'shoulder-slam':'hip-toss';
 m.total=m.startup+m.active+m.recovery;
}
MOVES[c.id]=a;
}
const getMove=(f,id)=>MOVES[f.ch.id].find(m=>m.id===id);

let gameTime=0,selected=['ryu','ken'],selectSide=0,portraits=[],fighters=[];
const G={screen:'select',mode:'cpu',control:'classic',difficulty:'normal',paused:false,phase:'intro',phaseT:90,tick:0,clock:99*60,round:1,wins:[0,0],hitstop:0,slow:0,shake:0,flash:0,superFx:0,superOwner:null,result:false,fx:[],shots:[],ghosts:[],fps:0,stats:{damage:0,maxCombo:0,tests:0}};
let audioCtx=null,soundOn=false,noise=null;
const AUDIO_MASTER_LEVEL=.72,AUDIO_MAX_VOICES=6;
let audioGraph=null,audioToggleRevision=0,audioVoiceSequence=0;
const audioVoices=new Map(),audioRecent=new Map();
// One event is one bounded voice group. Volumes are pre-master peak envelopes.
const SOUND_PLANS={
 hit:[['tone',150,52,.105,'triangle',.105],['noise',.06,2200,.08]],
 heavy:[['tone',96,36,.18,'sine',.13],['noise',.10,3100,.11],['tone',180,74,.065,'triangle',.035,.007]],
 block:[['tone',380,190,.06,'triangle',.06],['noise',.035,1700,.04]],
 parry:[['tone',820,1250,.10,'sine',.045],['tone',1400,980,.14,'sine',.026,.013],['noise',.028,3600,.014]],
 throw:[['noise',.11,1050,.035],['tone',180,88,.085,'triangle',.035]],
 land:[['tone',82,31,.21,'sine',.135],['noise',.115,1200,.085]],
 whiff:[['noise',.065,2400,.028]],
 wave:[['tone',400,120,.18,'triangle',.035],['noise',.135,2900,.034]],
 success:[['tone',523,523,.11,'sine',.035],['tone',659,659,.11,'sine',.035,.055],['tone',784,784,.11,'sine',.035,.11]],
 super:[['tone',140,40,.22,'sine',.10],['tone',280,90,.16,'triangle',.058],['noise',.13,3200,.085]],
 superhit:[['tone',140,60,.075,'sine',.072],['noise',.045,2800,.06]],
 superfinish:[['tone',90,30,.22,'sine',.128],['tone',230,70,.13,'triangle',.04],['noise',.12,3000,.10]]
};
function disposeAudioVoice(voice){if(!voice||voice.disposed)return;voice.disposed=true;audioVoices.delete(voice.id);for(const source of voice.sources){source.onended=null;try{source.stop()}catch{}try{source.disconnect()}catch{}}for(const node of voice.nodes)try{node.disconnect()}catch{}voice.sources.clear();voice.nodes.clear();try{voice.bus.disconnect()}catch{}}
function clearAudioVoices(){for(const voice of [...audioVoices.values()])disposeAudioVoice(voice);audioRecent.clear()}
function teardownAudioGraph(){clearAudioVoices();if(audioGraph){audioGraph.context.removeEventListener?.('statechange',audioGraph.onState);for(const node of [audioGraph.master,audioGraph.compressor,audioGraph.limiter])try{node.disconnect()}catch{}}audioGraph=null;noise=null}
function ensureAudioGraph(){if(!audioCtx||audioCtx.state==='closed')return null;if(audioGraph?.context===audioCtx)return audioGraph;teardownAudioGraph();const ac=audioCtx,master=ac.createGain(),compressor=ac.createDynamicsCompressor(),limiter=ac.createWaveShaper();master.gain.setValueAtTime(soundOn?AUDIO_MASTER_LEVEL:0,ac.currentTime);compressor.threshold.setValueAtTime(-15,ac.currentTime);compressor.knee.setValueAtTime(12,ac.currentTime);compressor.ratio.setValueAtTime(4,ac.currentTime);compressor.attack.setValueAtTime(.004,ac.currentTime);compressor.release.setValueAtTime(.095,ac.currentTime);
 const curve=new Float32Array(257);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=.78*Math.tanh(x*1.5)}limiter.curve=curve;limiter.oversample='none';master.connect(compressor);compressor.connect(limiter);limiter.connect(ac.destination);
 const onState=()=>{if(ac.state!=='running')clearAudioVoices()};ac.addEventListener?.('statechange',onState);audioGraph={context:ac,master,compressor,limiter,onState};return audioGraph;
}
async function setSoundEnabled(enabled){const revision=++audioToggleRevision;enabled=!!enabled;if(!enabled){soundOn=false;const ac=audioCtx;if(ac&&audioGraph&&ac.state==='running'){const g=audioGraph.master.gain;g.cancelScheduledValues(ac.currentTime);g.setTargetAtTime(0,ac.currentTime,.005);await new Promise(resolve=>setTimeout(resolve,24));}if(revision!==audioToggleRevision)return soundOn;clearAudioVoices();if(ac&&ac.state==='running')try{await ac.suspend()}catch{}return false;}
 try{if(!audioCtx||audioCtx.state==='closed'){teardownAudioGraph();audioCtx=new(window.AudioContext||window.webkitAudioContext)()}const graph=ensureAudioGraph();await audioCtx.resume();if(revision!==audioToggleRevision)return soundOn;if(audioCtx.state!=='running')throw new Error('AudioContext is not running');graph.master.gain.cancelScheduledValues(audioCtx.currentTime);graph.master.gain.setValueAtTime(0,audioCtx.currentTime);graph.master.gain.linearRampToValueAtTime(AUDIO_MASTER_LEVEL,audioCtx.currentTime+.02);soundOn=true;return true;}catch(error){if(revision===audioToggleRevision){soundOn=false;clearAudioVoices()}throw error;}
}
function sound(type='hit',strength=1){if(!soundOn||!audioCtx||audioCtx.state!=='running'||!SOUND_PLANS[type])return;
 let voice=null;try{const graph=ensureAudioGraph(),ac=audioCtx,t=ac.currentTime,force=clamp(Number(strength)||1,.4,1.5);if(!graph)return;for(const old of [...audioVoices.values()])if(old.end<t-.02)disposeAudioVoice(old);
 // Simultaneous trade contacts share one sound; adjacent combo beats remain distinct.
 const gap=type==='whiff'?.055:type==='super'?.24:.018;if(t-(audioRecent.get(type)??-99)<gap)return;audioRecent.set(type,t);
 const priority=type==='whiff'?0:['throw','wave','block'].includes(type)?1:type==='super'||type==='superfinish'?3:2;if(audioVoices.size>=AUDIO_MAX_VOICES){const victim=[...audioVoices.values()].sort((a,b)=>a.priority-b.priority||a.start-b.start)[0];if(priority<victim.priority)return;disposeAudioVoice(victim)}
 const bus=ac.createGain(),id=++audioVoiceSequence,headroom=Math.min(1,1.65/Math.sqrt(audioVoices.size+1));bus.gain.setValueAtTime(headroom,t);bus.connect(graph.master);voice={id,type,start:t,end:t,priority,bus,sources:new Set(),nodes:new Set(),disposed:false};audioVoices.set(id,voice);
 if(!noise){noise=ac.createBuffer(1,Math.ceil(ac.sampleRate*.45),ac.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1}
 for(const spec of SOUND_PLANS[type]){const tonal=spec[0]==='tone',duration=tonal?spec[3]:spec[1],delay=(tonal?spec[6]:spec[4])||0,volume=(tonal?spec[5]:spec[3])*force,start=t+delay,end=start+duration,source=tonal?ac.createOscillator():ac.createBufferSource(),gain=ac.createGain(),nodes=[source,gain];voice.sources.add(source);voice.end=Math.max(voice.end,end+.016);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,end);
  if(tonal){source.type=spec[4];source.frequency.setValueAtTime(spec[1],start);source.frequency.exponentialRampToValueAtTime(Math.max(25,spec[2]),end);source.connect(gain);}else{source.buffer=noise;const filter=ac.createBiquadFilter();filter.type='lowpass';filter.Q.setValueAtTime(.5,start);filter.frequency.setValueAtTime(spec[2],start);filter.frequency.exponentialRampToValueAtTime(Math.max(110,spec[2]*.2),end);source.connect(filter);filter.connect(gain);nodes.push(filter)}gain.connect(bus);for(const node of nodes)voice.nodes.add(node);
  const owner=voice;source.onended=()=>{source.onended=null;for(const node of nodes){try{node.disconnect()}catch{}owner.nodes.delete(node)}owner.sources.delete(source);if(!owner.sources.size)disposeAudioVoice(owner)};if(tonal)source.start(start);else source.start(start,(id%7)*.007);source.stop(end+.012);
 }
 }catch{if(voice)disposeAudioVoice(voice)}
}
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2500)}


/* ORIGINAL VECTOR ART — articulated, cel-shaded SVG. No bitmap assets. */
const ART={
 ryu:{skin:['#f4cea6','#d69d75','#8d544e'],fabric:['#f2e8d0','#d9d7cd','#8c92a2'],dark:['#665151','#493444','#2c2737'],hair:['#5b4a51','#272330','#1c1b28'],accent:'#d4484e',ink:'#352933'},
 ken:{skin:['#ffe1b4','#e8ae81','#9c655b'],fabric:['#e84947','#be3d43','#60283e'],dark:['#d0a977','#a47d58','#64534d'],hair:['#ffe6a5','#e8b454','#9c6b3b'],accent:'#e84947',ink:'#362a34'},
 chun:{skin:['#ffdfc5','#e4b08f','#a96867'],fabric:['#fafafa','#c4d9df','#677f97'],dark:['#62d9e0','#1b91b3','#174267'],hair:['#53596b','#1b2739','#101b2c'],accent:'#e9d2a0',ink:'#202c40'},
 cammy:{skin:['#ffe8ce','#dfb69a','#a16c70'],fabric:['#637889','#2b3948','#161d30'],dark:['#a5d0df','#6090b1','#2c4d76'],hair:['#fff4ba','#e3c26b','#a47c42'],accent:'#d23a4c',ink:'#252b3c'},
 luke:{skin:['#ffe0ad','#d69d70','#935c51'],fabric:['#fc8461','#d45745','#74323e'],dark:['#9cc6e2','#497db5','#263d68'],hair:['#f9d5a0','#ac7951','#563e37'],accent:'#407db3',ink:'#292633'},
 juri:{skin:['#ffe4dd','#dfb5b0','#956982'],fabric:['#faf7fc','#c5c5da','#79768f'],dark:['#655576','#2c2b41','#141c31'],hair:['#6b536d','#2b253c','#14182a'],accent:'#e06bac',ink:'#25243b'},
 mai:{skin:['#ffe9d1','#e9b29e','#a96976'],fabric:['#ff6a70','#c62646','#76263e'],dark:['#fff9e9','#e6dbe0','#9996b2'],hair:['#a85a45','#57303b','#251f31'],accent:'#fce5be',ink:'#352738'},
 iori:{skin:['#fce4d5','#d3afa8','#957487'],fabric:['#ce6170','#97374e','#562b46'],dark:['#5b5166','#272b42','#111c30'],hair:['#f37675','#ae2947','#581e38'],accent:'#b99aff',ink:'#242238'}
};
// Exact drawing paths from the user-approved preview (2).html.
const LEGACY_VECTOR={
 "ryu": {
  "head": "<path d=\"M-19 16L-23 48 18 50 22 10\" fill=\"url(#skinR)\" stroke=\"#30212e\" stroke-width=\"2.5\"/>\n          <path d=\"M-31-28Q-14-53 16-39L31-26 31-7 39 3 29 10 25 29 10 38-13 28-26 9-32-3Z\" fill=\"url(#skinR)\" stroke=\"#30212e\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/>\n          <path d=\"M22 5L30 9 25 26 10 34-11 23-18 8-12 25 10 39 26 29 29 13Z\" fill=\"#704a42\"/>\n          <path d=\"M-27-4Q-43-10-37 9L-24 15-20 6\" fill=\"#d49574\" stroke=\"#54353a\" stroke-width=\"2\"/>\n          <path d=\"M-32-17L-42-31-31-33-33-45-20-41-17-55-3-48 8-58 17-47 29-47 33-32 25-18 19-28 3-23-11-31-20-15-24 4-32 1Z\" fill=\"#272330\" stroke=\"#1c1b28\" stroke-width=\"2\"/>\n          <path d=\"M-34-24Q-4-35 30-26L31-16Q-4-24-31-13Z\" fill=\"#d4484e\" stroke=\"#7f2e3d\" stroke-width=\"1.5\"/><path d=\"M-31-23Q-1-30 27-23\" stroke=\"#ff8c79\" stroke-width=\"2\" fill=\"none\"/>\n          <path d=\"M3-9L22-12 26-8M-15-8L-4-7\" fill=\"none\" stroke=\"#382432\" stroke-width=\"3\"/><path d=\"M8-5L21-6\" stroke=\"#fff0d2\" stroke-width=\"3\"/><path d=\"M17-7V-3\" stroke=\"#241f2a\" stroke-width=\"3\"/>\n          <path d=\"M27-7L24 5 31 6M11 20L25 18M-30 1L-26 6\" fill=\"none\" stroke=\"#784b49\" stroke-width=\"1.8\"/>\n          <path d=\"M-13 4L-7 16M-1 26L3 30M7 29L10 32M16 27L18 30\" stroke=\"#352b32\" stroke-width=\"1.3\"/>\n          <path d=\"M-18-43L-4-39M4-46L17-37\" stroke=\"#5b4a51\" stroke-width=\"3\"/>",
  "torso": "<path d=\"M-39-274Q-30-288-14-294L13-293Q30-292 47-276L55-252 37-213 33-182Q4-170-34-184L-44-221-54-251Z\" fill=\"url(#skinR)\" stroke=\"#352933\" stroke-width=\"3\" stroke-linejoin=\"round\"></path><path d=\"M-22-278Q-7-288 4-277L7-250Q-9-243-29-254Z\" fill=\"#eab98f\"></path><path d=\"M9-277Q28-285 40-266L37-251Q20-244 9-251Z\" fill=\"#efbf94\"></path><path d=\"M7-275L7-245M-27-250Q-10-241 4-247M12-247Q23-241 38-247M6-232L3-206M12-231L28-230M11-215L25-215M-11-230L-23-232\" fill=\"none\" stroke=\"#9c6253\" stroke-width=\"2\"></path><path d=\"M-42-284L-18-290-24-263-21-242-4-222 43-198 35-176-10-183-43-210-55-247Z\" fill=\"url(#robe)\" stroke=\"#28222e\" stroke-width=\"2.5\"></path><path d=\"M-37-276L-42-251-31-224 10-201 35-190M-27-277L-34-250-25-236M-38-217L-2-194\" fill=\"none\" stroke=\"#917466\" stroke-width=\"3\" opacity=\"0.65\"></path><path d=\"M-36-192Q-1-181 38-188L45-171 25-158-4-164-26-159-46-173Z\" fill=\"url(#giR)\" stroke=\"#2e2b39\" stroke-width=\"2.5\"></path><path d=\"M-37-182Q0-173 37-184L39-172Q1-161-39-172Z\" fill=\"#302932\" stroke=\"#24222e\" stroke-width=\"2\"></path><path d=\"M-4-177L9-181 18-170 2-163-7-168Z\" fill=\"#444047\" stroke=\"#24222e\" stroke-width=\"1.5\"></path><g data-part=\"legacy-belt\"><path d=\"M2-166L-2-117 10-124 12-165Z\" fill=\"#36313b\" stroke=\"#232431\" stroke-width=\"2\"></path><path d=\"M10-167L35-131 41-146 20-173Z\" fill=\"#51404a\" stroke=\"#232431\" stroke-width=\"2\"></path><path d=\"M3-146L8-144M3-140L8-138M3-134L8-132\" fill=\"none\" stroke=\"#af9673\" stroke-width=\"1.5\"></path></g>",
  "hand": "<path d=\"M-13-13L2-15 5-19 21-18 28-10 29 8 20 17 0 16-15 8Z\" fill=\"#ae3645\" stroke=\"#2e2632\" stroke-width=\"2.5\" stroke-linejoin=\"round\"></path><path d=\"M1-13L5-21 21-20 27-13 27-6 11-6 7-2-1-4Z\" fill=\"url(#skinR)\" stroke=\"#513239\" stroke-width=\"1.7\"></path><path d=\"M10-18V-8M17-18V-8M23-15V-8\" fill=\"none\" stroke=\"#875349\" stroke-width=\"1.4\"></path><path d=\"M-16-13L-5-13-5 12-16 9Z\" fill=\"#e75958\" stroke=\"#652e3f\" stroke-width=\"1.6\"></path><path d=\"M-13-6L-6-5M-13 0L-6 2\" fill=\"none\" stroke=\"#ff9680\" stroke-width=\"1.5\"></path><path d=\"M1 10L14 11 22 6 22 11 16 15 1 13Z\" fill=\"#ec6463\"></path>",
  "foot": "<path d=\"M-13-17L12-17 17 0 33 5 42 12 42 19Q22 25-13 20L-20 14-16 2Z\" fill=\"url(#skinR)\" stroke=\"#352a36\" stroke-width=\"2.5\"></path><path d=\"M-18 13Q7 22 41 15L41 20Q7 27-13 21Z\" fill=\"#835750\"></path><path d=\"M33 8L33 16M26 8L27 18M19 6L20 18M-8-7L3-7\" fill=\"none\" stroke=\"#8e5d51\" stroke-width=\"1.5\"></path>",
  "headTails": "<path d=\"M-13-345Q-66-350-108-321L-98-338Q-61-363-18-354Z\" fill=\"#c63d50\" stroke=\"#612c42\" stroke-width=\"1.5\"></path><path d=\"M-17-347Q-64-332-83-348L-97-355Q-64-345-17-358Z\" fill=\"#de535c\" stroke=\"#612c42\" stroke-width=\"1.5\"></path>",
  "coatTails": ""
 },
 "ken": {
  "head": "<path d=\"M-17 14L-20 48 19 49 22 8\" fill=\"url(#skinK)\" stroke=\"#392931\" stroke-width=\"2.5\"/>\n          <path d=\"M-30-29Q-4-48 24-31L31-18 31-4 39 5 29 10 24 30 8 36-13 24-28 7Z\" fill=\"url(#skinK)\" stroke=\"#392931\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/>\n          <path d=\"M-25-4Q-39-13-36 7L-24 15-20 4\" fill=\"#e2a578\" stroke=\"#815443\" stroke-width=\"2\"/>\n          <path d=\"M-29 13L-44 20-39-1-46-14-35-18-42-32-30-34-31-45-17-43-10-54 3-49 15-56 23-45 36-41 31-31 39-23 31-13 22-5 15-13 8-23-2-15-8-24-16-7-22 1-22 20Z\" fill=\"url(#hairK)\" stroke=\"#85653e\" stroke-width=\"2\" stroke-linejoin=\"round\"/>\n          <path d=\"M-26-32L-21-8M-15-39L-7-26M-2-42L11-23M13-42L24-24M-29 8L-34 15\" stroke=\"#fff1b6\" stroke-width=\"3\" opacity=\".65\" fill=\"none\"/>\n          <path d=\"M5-6L24-9\" stroke=\"#705038\" stroke-width=\"3.5\"/><path d=\"M9-2L22-4\" stroke=\"#fff9d9\" stroke-width=\"3\"/><path d=\"M18-5V-1\" stroke=\"#3d5460\" stroke-width=\"3\"/>\n          <path d=\"M28-4L25 7 32 7M10 21L25 18M4 28L17 29\" stroke=\"#9a6154\" stroke-width=\"1.8\" fill=\"none\"/><path d=\"M-9 13L-1 23\" stroke=\"#bd805b\" stroke-width=\"2\"/>",
  "torso": "<path d=\"M-30-283Q0-304 35-281L48-252 28-182-28-179-43-254Z\" fill=\"#242432\" stroke=\"#24212e\" stroke-width=\"3\"></path><path d=\"M-18-283Q4-264 25-283L30-262Q6-247-24-265Z\" fill=\"#45404a\"></path><path d=\"M-37-289L-12-298 0-278-11-248-7-189-41-169-50-216-47-251-59-260Z\" fill=\"url(#coat)\" stroke=\"#362a34\" stroke-width=\"2.5\" stroke-linejoin=\"round\"></path><path d=\"M20-297L48-283 62-257 49-227 54-171 11-184 11-249 6-275Z\" fill=\"url(#coat)\" stroke=\"#362a34\" stroke-width=\"2.5\" stroke-linejoin=\"round\"></path><path d=\"M-16-300L-5-292 0-276-16-245-26-263-22-272-39-282Z\" fill=\"#d4b58f\" stroke=\"#75604d\" stroke-width=\"1.5\"></path><path d=\"M18-296L7-278 20-247 30-265 25-274 45-278 33-291Z\" fill=\"#c9a77c\" stroke=\"#75604d\" stroke-width=\"1.5\"></path><path d=\"M-36-269L-38-235-24-211M39-265L34-239 43-209M-29-207L-28-182M26-211L32-188\" fill=\"none\" stroke=\"#e6c396\" stroke-width=\"2\" opacity=\"0.6\"></path><path d=\"M-26-232L-10-235-9-217-25-212Z\" fill=\"#6c584c\" stroke=\"#ddbd91\" stroke-width=\"1\"></path><path d=\"M26-233L41-230 41-213 27-218Z\" fill=\"#6c584c\" stroke=\"#c5a67c\" stroke-width=\"1\"></path><path d=\"M-30-188Q5-179 33-188L31-175Q2-168-29-175Z\" fill=\"#202332\" stroke=\"#292232\" stroke-width=\"2\"></path><path d=\"M-3-188H11V-176H-3Z\" fill=\"#847e78\" stroke=\"#151b28\" stroke-width=\"2\"></path><path d=\"M1-185H8V-179H1Z\" fill=\"#282c35\"></path>",
  "hand": "<path d=\"M-13-13L2-15 5-19 21-18 28-10 29 8 20 17 0 16-15 8Z\" fill=\"#31303a\" stroke=\"#2e2632\" stroke-width=\"2.5\" stroke-linejoin=\"round\"></path><path d=\"M1-13L5-21 21-20 27-13 27-6 11-6 7-2-1-4Z\" fill=\"url(#skinK)\" stroke=\"#513239\" stroke-width=\"1.7\"></path><path d=\"M10-18V-8M17-18V-8M23-15V-8\" fill=\"none\" stroke=\"#875349\" stroke-width=\"1.4\"></path><path d=\"M-16-13L-5-13-5 12-16 9Z\" fill=\"#ba433f\" stroke=\"#652e3f\" stroke-width=\"1.6\"></path><path d=\"M-13-6L-6-5M-13 0L-6 2\" fill=\"none\" stroke=\"#e0735a\" stroke-width=\"1.5\"></path><path d=\"M1 10L14 11 22 6 22 11 16 15 1 13Z\" fill=\"#686171\"></path>",
  "foot": "<path d=\"M-15-17L13-16 17-1 36 3 45 13 45 22H-20L-20 4Z\" fill=\"#6e5147\" stroke=\"#282534\" stroke-width=\"2.5\"></path><path d=\"M-18 14Q13 16 42 12L45 23H-21Z\" fill=\"#302c35\" stroke=\"#24232e\" stroke-width=\"2\"></path><path d=\"M-12-12L5-13 9 6-13 7Z\" fill=\"#a78163\"></path><path d=\"M-8-7H8M-7-1H10M-4 5H13\" fill=\"none\" stroke=\"#d0ae82\" stroke-width=\"2\"></path><path d=\"M17 5L32 8\" fill=\"none\" stroke=\"#b08b6b\" stroke-width=\"2\"></path>",
  "headTails": "",
  "coatTails": "<path d=\"M-40-208L-68-115-58-97-28-124-7-180Z\" fill=\"url(#coat)\" stroke=\"#352b33\" stroke-width=\"2.5\"></path><path d=\"M27-211L58-189 79-91 59-110 44-109 11-180Z\" fill=\"url(#coat)\" stroke=\"#352b33\" stroke-width=\"2.5\"></path><path d=\"M-37-183L-53-121M38-182L57-123\" fill=\"none\" stroke=\"#e9bf8d\" stroke-width=\"3\" opacity=\"0.45\"></path>"
 }
};
const LEGACY_TORSO_TRANSFORM="translate(0 -191) scale(1 1.10) translate(0 180)";
for(const c of CHARACTERS)if(LEGACY_VECTOR[c.id])Object.assign(c,{legacyArt:true,headX:10,headY:-348.3,headScale:.85,rigRearShoulder:[-41,-294.4],rigFrontShoulder:[42,-290],armWidths:[26,19,12],legWidths:[33,26,16],handScale:1,footScale:1,limbStroke:2.5,...(c.id==='ryu'?{tailAnchor:[-17,-375.3]}:{})});
for(const c of CHARACTERS)if(!LEGACY_VECTOR[c.id])Object.assign(c,{headScale:c.id==='mai'||c.id==='iori'?.79:.78,headSquash:c.id==='mai'||c.id==='iori'?.88:.85});
const artDefs=document.querySelector('body>svg defs');
const ink=(d,fill,sw=1.5,more='')=>`<path d="${d}" fill="${fill}" stroke="#222939" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${more}/>`;
const mark=(d,col='#6c4851',sw=1.2,more='')=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;
const flat=(d,fill,more='')=>`<path d="${d}" fill="${fill}" ${more}/>`;
const paint=(c,k)=>`url(#art-${c.id||c}-${k})`;
function arcadeHeadFinish(c,markup){
 if(c.legacyArt)return markup;
 // Keep the existing vertical attachment while giving the face the broad,
 // compact shapes and decisive outline of the reference's two original heroes.
 markup=markup.replace(/stroke-width="([\d.]+)"/g,(all,n)=>`stroke-width="${Number(n)<2.2?Math.max(1.4,Number(n)*1.48).toFixed(2):n}"`);
 return `<g transform="scale(1 ${c.headSquash||1})">${markup}</g>`;
}
function compactGuestEyes(markup){
 return markup.replace(/<ellipse\b([^>]*)\/>/g,(all,attrs)=>{
  const value=k=>attrs.match(new RegExp(k+'="([^\"]+)"'))?.[1],x=Number(value('cx')),y=Number(value('cy')),rx=Number(value('rx')),ry=Number(value('ry'));
  if(rx<=1.6)return '';
  return mark(`M${x} ${(y-ry*.72).toFixed(2)}V${(y+ry*.72).toFixed(2)}`,value('fill')||'#382432',Math.min(3.2,rx+1));
 }).replace(/<circle\b[^>]*\/>/g,tag=>Number(tag.match(/cy="([^"]+)"/)?.[1])<-10&&Number(tag.match(/r="([^"]+)"/)?.[1])<1? '':tag);
}
function legacyHeadArt(c){
 const ken=c.id==='ken',parts=LEGACY_VECTOR[c.id].head.match(/<path\b[^>]*\/>/g),first=ken?5:7,last=ken?8:10;
 // The resting head is the original drawing, down to its individual paths.
 const rest='<g data-face-state="rest">'+parts.slice(first,last+1).join('')+'</g>';
 const nose=ken?'M28-4L25 7 32 7':'M27-7L24 5 31 6M-30 1L-26 6',faceInk=ken?'#705038':'#382432',noseInk=ken?'#9a6154':'#784b49';
 let states='';for(const hurt of [false,true]){
  states+=`<g data-face-state="${hurt?'hurt':'power'}" opacity="0">`;
  if(hurt)states+=mark(ken?'M7-1L15 3 24-3':'M5-4L14 1 24-5M-15-5L-7-1-3-4',faceInk,2.7)+mark(ken?'M4-10L25-6':'M2-13L24-9M-15-11L-3-9',faceInk,2.6);
  else states+=mark(ken?'M4-5L24-11':'M3-7L23-13 27-9M-15-7L-4-5',faceInk,3)+mark(ken?'M9-1L22-4':'M8-3L21-6',ken?'#fff9d9':'#fff0d2',3)+mark(ken?'M18-5V-1':'M17-6V-2',ken?'#3d5460':'#241f2a',3);
  states+=mark(nose,noseInk,1.8)+ink(hurt?'M11 20Q19 16 27 19L25 27 15 29Z':'M8 18Q19 12 28 17L25 29Q16 35 10 27Z',ken?'#643d39':'#50313a',1.5)+flat(hurt?'M14 20L24 19 23 22 15 24Z':'M11 18Q19 15 25 18L24 22 12 23Z','#fff0d2');
  states+='</g>';
 }
 return parts.slice(0,first).join('')+rest+states+parts.slice(last+1).join('');
}
function legacyBackHeadArt(c){
 const ken=c.id==='ken',parts=LEGACY_VECTOR[c.id].head.match(/<path\b[^>]*\/>/g),hair=ken?'url(#hairK)':'#272330';
 // The back uses the same crown height and original hair contour as the front.
 // There was no back view in the reference, so only the hidden face is replaced.
 let out=parts[0]+ink('M-30-27Q-14-49 14-41L30-26 32-1 28 22 12 36-9 29-27 9-32-5Z',hair,2.5);
 if(ken)out+=parts[3]+parts[4]+mark('M-19 4L-9 21M4 13L11 27M19 6L23 19','#9c6b3b',2);
 else out+=parts[4]+parts[5]+parts[6]+parts[12]+mark('M-24-4L-17 13M-10 16L3 25M13 19L22 11','#5b4a51',2);
 return out;
}
// Facial construction is character-specific. Shared paint does not imply a shared face.
const FACE_DESIGN={
 ryu:{neck:'M-20 5L-21 27-32 39Q-5 55 31 38L22 25 21 4Z',face:'M-32-41Q-29-67 3-69 27-69 35-45L34-29 39-18 43-11 34-6 33 9 25 22 10 29-6 27-24 16-31 0Z',shadow:'M-30-35Q-19-34-17-21L-21-5-13 11 0 24-7 25-24 15-30 0Z',cheek:'M15-16L30-18 29-7 16-3 9-8Z',nose:'M29-25L28-13 35-10 31-6M22-4L27-5',crease:'M-17-6L-8-1M-10 2L-7 6',near:'M5-24L29-27 27-21 12-20Z',far:'M-16-24L-2-24-3-20-12-20Z',upper:'M4-25L29-28',farUpper:'M-17-25L-2-25',lower:'M13-19L26-20',brow:'M1-33L28-36 31-31 9-27 2-28Z',farBrow:'M-19-32L-2-29-3-26-18-28Z',powerBrow:'M2-31L28-35 30-29 8-25 2-26Z',hurtLid:'M5-22L16-18 29-24M-16-22L-5-19-1-21',iris:'#513e32',pupil:[23,-23,2.4,2.8],farPupil:[-5,-22,1.65,2],mouth:'M5 10L16 9 29 8',lip:'M10 16L23 14',powerMouth:'M3 9Q16 5 29 7L28 19Q18 26 6 20Z',hurtMouth:'M7 9Q18 5 29 8L27 17 10 20Z'},
 ken:{neck:'M-17 4Q-11 23-20 34L-28 40Q-2 50 27 37L18 26 18 2Z',face:'M-29-41Q-25-65 2-68 26-68 33-44L32-28 36-18 41-10 32-6 28 8 19 20 7 25-5 21-18 11Q-28 0-28-18Z',shadow:'M-27-34L-17-25-19-10-11 7 7 25-5 21-18 11Q-27 0-27-18Z',cheek:'M12-16Q22-20 29-18L26-5 16-1 8-7Z',nose:'M28-26L29-12 35-10 30-7M21-2L26-4',crease:'M-13 0L-7 5M-9 11L-4 14',near:'M6-24Q17-30 29-27L26-20 13-18Z',far:'M-14-25Q-7-29 0-26L-2-21-11-21Z',upper:'M5-24Q16-31 29-28',farUpper:'M-15-25L0-28',lower:'M14-18Q21-18 26-21',brow:'M4-34Q15-40 28-36L30-33Q17-35 7-30Z',farBrow:'M-17-33L-2-34 0-30-14-29Z',powerBrow:'M3-31L27-36 30-31 9-27Z',hurtLid:'M7-23L17-19 29-24M-14-23Q-7-18-1-22',iris:'#5799ad',pupil:[22,-23,3,3.7],farPupil:[-5,-24,1.8,2.9],mouth:'M7 8Q18 11 28 4',lip:'M12 14Q20 15 25 9',powerMouth:'M6 6Q20 5 29 3L26 17Q17 24 7 17Z',hurtMouth:'M9 8L27 6 26 15Q16 20 10 14Z'},
 chun:{neck:'M-15 5Q-10 21-17 31L-27 38Q-3 48 25 37L17 27 15 4Z',face:'M-29-41Q-26-66 1-68 24-68 31-46L31-29Q31-19 37-12L31-8Q32 4 23 14 16 24 7 25Q-6 25-17 15-28 6-29-14Z',shadow:'M-28-35Q-18-35-17-19L-21-6Q-18 10-3 19L7 25Q-6 25-17 15-28 6-29-14Z',cheek:'M9-14Q23-21 29-15L27-5Q17 3 8-3Z',nose:'M28-25L27-13 31-10M21-5L25-6',crease:'M-15 1Q-11 6-6 7',near:'M5-25Q17-32 29-25L26-19Q15-15 7-21Z',far:'M-15-25Q-8-29-1-25L-2-20Q-8-17-14-22Z',upper:'M4-25Q16-32 29-26L31-28',farUpper:'M-16-25Q-8-30-1-25',lower:'M10-18Q20-15 27-21',brow:'M3-34Q14-39 27-34L28-32Q15-35 6-31Z',farBrow:'M-17-33Q-10-36-2-32L-2-30Q-10-32-15-30Z',powerBrow:'M4-32Q16-34 28-29L27-27Q15-30 5-29Z',hurtLid:'M5-23Q17-17 29-24M-15-23Q-8-18-1-23',iris:'#694c33',pupil:[21,-23,3.4,4.1],farPupil:[-5,-23,2.2,3.1],mouth:'M10 8Q18 10 25 6',lip:'M14 13Q20 14 23 10',powerMouth:'M10 5Q18 2 26 6L24 16Q17 21 11 13Z',hurtMouth:'M11 7Q19 3 26 7L24 13Q18 17 12 12Z'},
 cammy:{neck:'M-14 3L-13 24-22 35Q-2 44 24 34L15 24 15 2Z',face:'M-27-41Q-24-64 2-67 25-66 32-44L31-28 34-20 39-12 31-8 28 5 18 17 7 24-5 20-18 9-25-4Z',shadow:'M-25-35L-16-24-18-9-10 5 7 24-5 20-18 9-25-4Z',cheek:'M12-17L29-20 27-8 17-3 7-9Z',nose:'M28-27L27-13 33-11 29-8M22-4L26-5',crease:'M-14-4L-7 0M-11 7L-6 10',near:'M6-26L29-28 27-22 11-21Z',far:'M-14-26L0-26-2-21-12-22Z',upper:'M5-27L30-29',farUpper:'M-15-27L0-27',lower:'M12-20L26-22',brow:'M3-35L28-36 29-33 6-31Z',farBrow:'M-17-34L-2-33-1-30-16-31Z',powerBrow:'M4-32L29-36 29-31 7-28Z',hurtLid:'M6-24L17-20 29-25M-14-24L-5-21 0-24',iris:'#5c9ca5',pupil:[23,-25,2.6,3],farPupil:[-4,-24,1.8,2.5],mouth:'M11 8L24 7 27 8',lip:'M15 13L23 12',powerMouth:'M10 6L26 5 25 13Q18 17 11 12Z',hurtMouth:'M12 8L25 6 24 14 14 15Z'},
 luke:{neck:'M-21 3L-22 27-32 39Q-4 56 33 38L22 26 21 3Z',face:'M-31-41Q-26-68 3-69 27-69 35-44L34-28Q37-18 44-11L35-5 34 9 27 24 11 31-5 29-23 17-30 1Z',shadow:'M-29-34Q-18-36-15-20L-20-5-10 13 10 29-5 28-23 17-30 1Z',cheek:'M12-16L31-18 30-6 20 0 7-6Z',nose:'M30-25L30-14 36-10 32-6M21-4Q27-8 31-4',crease:'M-15-3L-7 2M-8 8L-3 12',near:'M6-24Q18-29 30-23L27-17Q15-14 8-20Z',far:'M-15-24Q-7-28 1-23L-1-18-12-19Z',upper:'M5-25Q17-30 30-24',farUpper:'M-16-25Q-7-29 1-24',lower:'M12-16Q21-14 28-19',brow:'M3-35Q18-39 29-32L30-29 8-30 3-31Z',farBrow:'M-18-34L-3-32 1-28-14-29Z',powerBrow:'M4-31L28-33 31-28 9-26Z',hurtLid:'M6-22L18-17 30-23M-15-22L-5-18 1-21',iris:'#5b8196',pupil:[22,-22,3.2,4],farPupil:[-4,-22,2.2,3.1],mouth:'M5 7Q17 12 30 5',lip:'M11 17Q20 19 27 11',powerMouth:'M4 6Q18 3 31 6L28 22Q17 29 7 21Z',hurtMouth:'M8 10Q20 5 30 9L27 20Q17 23 9 16Z'},
 juri:{neck:'M-13 2Q-9 23-18 33L-25 38Q-1 46 25 34L15 25 14 1Z',face:'M-27-42Q-24-66 1-69 24-69 31-46L31-28 34-20 38-12 30-8 26 5 17 17 7 26-3 21-17 10-25-5Z',shadow:'M-25-35L-15-23-18-8-9 6 7 26-3 21-17 10-25-5Z',cheek:'M11-17L28-20 27-10 14-2 7-8Z',nose:'M28-26L26-13 31-11M21-5L25-6',crease:'M-13 1L-7 5',near:'M5-21Q17-30 30-27L27-20Q15-16 7-19Z',far:'M-15-27Q-7-33 0-27L-2-21-12-22Z',upper:'M4-21Q16-30 30-28L33-31',farUpper:'M-16-27Q-8-33 0-28',lower:'M10-17Q21-16 28-21',brow:'M3-33Q17-36 29-32L30-30 7-29Z',farBrow:'M-18-35Q-10-41-1-36L0-33Q-10-36-15-32Z',powerBrow:'M3-30L28-35 31-30 9-26Z',hurtLid:'M5-23Q17-17 29-24M-15-25L-6-20 0-24',iris:'#b247a3',pupil:[23,-23,2.8,3.5],farPupil:[-5,-26,2,3.3],mouth:'M8 9Q20 12 28 2',lip:'M13 15Q21 16 26 8',powerMouth:'M7 7Q20 11 29 1L27 16Q16 23 9 16Z',hurtMouth:'M11 8Q21 2 27 6L25 15Q17 19 12 13Z'}
};
for(const c of CHARACTERS){const a=ART[c.id];for(const k of ['skin','fabric','dark','hair']){
 let g=el('linearGradient',{id:`art-${c.id}-${k}`,x1:'0%',y1:'12%',x2:'100%',y2:'77%'},artDefs);a[k].forEach((col,i)=>el('stop',{offset:[0,.51,1][i],'stop-color':col},g));
 }const g=el('radialGradient',{id:'energy-'+c.id},artDefs);[['0','#ffffff',1],['.16','#ffffff',1],['.4',c.color,1],['.68',c.color,.35],['1',c.color,0]].forEach(([offset,color,opacity])=>el('stop',{offset,'stop-color':color,'stop-opacity':opacity},g));}
artDefs.insertAdjacentHTML('beforeend',`<linearGradient id="gold3" x2="1" y2="1"><stop stop-color="#fff3c0"/><stop offset=".48" stop-color="#d7b771"/><stop offset="1" stop-color="#786144"/></linearGradient><linearGradient id="red3" x2="1" y2=".7"><stop stop-color="#ff7c71"/><stop offset=".5" stop-color="#c43b48"/><stop offset="1" stop-color="#66243b"/></linearGradient><linearGradient id="ink3" x2="1" y2="1"><stop stop-color="#555768"/><stop offset=".4" stop-color="#282f40"/><stop offset="1" stop-color="#111727"/></linearGradient><linearGradient id="white3" x2="1" y2="1"><stop stop-color="#fffbe8"/><stop offset=".4" stop-color="#dad8cc"/><stop offset="1" stop-color="#838da5"/></linearGradient><radialGradient id="floor-light3"><stop stop-color="#8cb6d5" stop-opacity=".22"/><stop offset="1" stop-color="#142539" stop-opacity="0"/></radialGradient><filter id="glow3" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter><filter id="silhouette3"><feFlood flood-color="#8fffbd"/><feComposite in2="SourceAlpha" operator="in"/></filter><pattern id="weave3" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 1H5M1 0V5" stroke="#ffffff" stroke-opacity=".055" stroke-width=".6"/></pattern>`);
function headArt(c){if(LEGACY_VECTOR[c.id])return legacyHeadArt(c);if(c.id==='mai'||c.id==='iori')return arcadeHeadFinish(c,compactGuestEyes(guestHeadArt(c)));const id=c.id,a=ART[id],q=FACE_DESIGN[id],female=c.female;let out='';
 const skin={ryu:'#e8b387',ken:'#f1c7a1',chun:'#f1c5ac',cammy:'#f3cfb1',luke:'#e5ad7e',juri:'#edc8c0'}[id];
 // Jaw width, cheek plane and neck insertion are drawn for this fighter.
 out+=ink(q.neck,skin,1.3)+flat('M-16 9Q0 22 18 9L17 28 3 35-16 29Z',a.skin[2],'opacity=".48"');
 out+=ink(q.face,skin,1.5)+flat(q.shadow,a.skin[2],'opacity=".46"');
 out+=flat(q.cheek,a.skin[0],'opacity=".46"');
 out+=ink('M-26-24Q-39-29-39-18-38-8-31-3L-24-1-22-11Z',skin,1.05)+mark('M-31-20Q-36-21-32-11L-28-12',a.skin[2],1.1);
 out+=mark(q.nose,a.skin[2],female?1:1.2)+mark(q.crease,a.skin[2],.85);
 if(id!=='ryu')out+=arcadeFaceStates(c);
 if(id==='ryu'){
  out+=flat('M-22-3L-12 9-3 7 1 11 10 10 19 12 29 5 27 17 9 27-10 20-21 9Z','#48413d','opacity=".92"');
  out+=flat('M1 7L8 3 23 3 29 7 18 8 9 6Z','#47423d');
  out+=mark('M8 11L23 9','#e8baa0',1.2)+mark('M-18 5L-12 12M-14 10L-9 16M-6 12L-4 19M1 15L3 22M10 17V22M18 16L17 20','#9b8d72',.85);
  out+=arcadeFaceStates(c);
  out+=ink('M-32-19L-38-36-32-41-37-50-25-49-25-65-12-60-6-75 5-65 15-77 23-64 32-63 39-48 32-29 27-37 14-39 2-42-10-34-19-20-23-8-28-9Z',paint(c,'hair'),1.8);
  out+=mark('M-27-49L-14-45-6-55M-14-60L-2-52 5-61M8-62L18-52 25-55M-21-32L-21-44','#807568',1.8);
  out+=ink('M-32-45Q-4-53 33-44L32-33Q-1-42-30-34Z','url(#red3)',1.1)+mark('M-29-42Q3-48 30-41','#ffad8f',1.3);
 }else if(id==='ken'){
  out+=ink('M-31-9Q-41-19-38-36L-43-38-38-52-32-51Q-36-69-20-71L-14-77 2-74Q20-83 33-68L41-57 37-45 44-37 34-22 29-29 31-45 19-50 12-40 7-39 7-52-4-36-12-33-9-48-24-26-22-13-27-1Z',paint(c,'hair'),1.6);
  out+=mark('M-29-55Q-31-64-15-66M-31-37Q-26-58-8-64M-20-43Q-11-67 9-67M4-51Q17-70 26-60M17-53Q29-58 34-47M-35-25L-28-41','#ffeabd',2.25);
  out+=mark('M-26 8L-15 17M-12 18L-6 20M8 20L12 22M27 13L24 18','#8b5e4c',.9);
 }else if(id==='chun'){
  out+=ink('M-31-10L-38-34Q-43-70-14-77 17-88 34-61L36-41 30-30 27-49 19-57Q0-47-20-47L-24-17Z',paint(c,'hair'),1.5);
  out+=mark('M-30-48Q-27-66-8-67M-18-53Q-2-62 15-65M21-68Q29-59 29-48','#8c95a0',1.3);
  out+=ink('M-42-66C-57-91-28-103-16-81L-20-65Q-30-54-42-66Z','url(#white3)',1.5)+ink('M19-78Q19-99 36-96 54-84 39-65L27-62Z','url(#white3)',1.5);
  out+=ink('M-42-73Q-44-85-34-89-23-87-22-77L-25-67-34-65Z',paint(c,'hair'),.9)+ink('M26-78Q23-88 33-90 42-88 42-79L36-70 30-70Z',paint(c,'hair'),.9);
  out+=mark('M-44-64Q-48-41-41-11L-32 6M37-65Q49-47 45-19L38-3','#fbf5de',4.8)+mark('M-46-66Q-56-44-53-19M39-64Q54-51 56-31','#bbbfc6',2.2);
  out+=`<circle cx="-27" cy="-5" r="2.9" fill="#fcf3cd" stroke="#917a65" stroke-width="1"/>`;
 }else if(id==='cammy'){
  out+=ink('M-33 8Q-39-2-38-24-44-46-28-64-18-75 6-74Q32-75 40-55L33-33 28-38 25-55Q10-50 6-26L1-17-5-31-6-45-12-34-16-11-25 9Z',paint(c,'hair'),1.6);
  out+=flat('M-31-37Q-33-59-12-62L-21-30-26 1-32 4Z','#f6dea0');
  out+=mark('M-28-14Q-29-38-15-55M-10-39Q-9-60 10-64M9-37Q14-56 26-61M22-64Q35-62 34-51','#fff5c6',1.8);
  out+=mark('M15-13L21-8M15-9L20-5','#bd7a78',1.5);
 }else if(id==='luke'){
  out+=ink('M-32-16L-35-35-33-50-24-56-24-63-13-60-6-76 7-70 14-78 24-67 36-61 40-49 31-34 28-40 17-43 10-51-5-49-15-40-22-24-24-10Z',paint(c,'hair'),1.6);
  out+=flat('M-32-27L-30-44-21-49-17-40-24-20Z','#60514a');
  out+=mark('M-17-55L-3-59 1-67M0-54L12-60 16-68M14-51L23-55 26-61M23-45L32-47','#f5d6a3',2.7);
  out+=mark('M9-7L12-1M15-9L18-3M-12-13L-8-9','#b57967',1.4);
 }else if(id==='juri'){
  out+=ink('M-31 0L-39-18-35-40Q-43-55-24-65L-32-78-27-95-13-80-8-64 14-67 24-88 38-95 37-77 30-61Q43-48 34-30L29-19 26-36 15-45 6-22 1-31-2-47-20-30-22-6Z',paint(c,'hair'),1.7);
  out+=flat('M-29-79L-24-90-15-77-12-66Z','#896585')+flat('M21-70L29-84 34-88 32-75 27-63Z','#786783');
  out+=mark('M-30-58L-20-63M19-62L29-66','#eb81ba',4.2);
  out+=mark('M-29-36L-21-45M-16-48L-10-53M20-43L25-48','#b48baa',1.8);
  out+=mark('M4-24L1-29M26-24L32-27','#352641',1.8);
  out+=`<circle cx="-29" cy="-4" r="2" fill="#b599bd"/>`;
 }
 if(id==='mai'){
  out+=ink('M-32-6L-38-26Q-43-54-23-68L-17-76Q3-83 21-72L35-62 38-43 31-24 25-38 20-51 10-49Q-3-29-14-28L-11-45-26-24-26-7Z',paint(c,'hair'),1.6);
  out+=flat('M-25-61Q-4-75 15-67L21-62Q0-64-17-48Z','#bc7956','opacity=".6"');
  out+=mark('M-30-38Q-26-55-14-61M-20-40Q-13-60 2-64M11-58L24-55 29-43','#d99773',1.45);
  out+=ink('M-21-70Q-39-78-31-91L-12-84-5-69Z',paint(c,'hair'),1.2);
  out+=ink('M-30-86L-16-91-8-81-19-73-33-76Z','url(#white3)',1.1)+mark('M-27-83L-17-80M-19-88L-13-82','#be7583',1.3);
  out+=ink('M-28-85L-46-93-43-76-27-78M-20-86L-4-99 1-83-18-78Z','url(#red3)',1.1);
  out+=`<circle cx="-28" cy="-5" r="2.8" fill="#fce7b4" stroke="#9f705d" stroke-width=".9"/>`;
 }else if(id==='iori'){
  out+=ink('M-30 0L-39-16-41-40Q-41-67-21-79L-6-85 10-80 28-70 37-54 36-33 31-37 28-52 21-59Q11-46 4-24L-9 4-11-19-19-1-18-23-27-7-28 3Z',paint(c,'hair'),1.65);
  out+=flat('M-33-54Q-21-75-5-77L15-68Q-5-48-15-21L-17-40-32-20Z','#d64c62','opacity=".72"');
  out+=mark('M-30-39Q-24-61-9-70M-17-20Q-8-49 9-66M-6-6Q0-31 16-55M24-66Q31-59 32-47','#ff9090',1.5);
  out+=flat('M-9 3L-10-20-4-30 3-26Z','#531c38');
  out+=mark('M8 8Q17 10 26 5','#6d465d',1.15);
  out+=`<circle cx="-28" cy="-4" r="2" fill="#d5d9ed" stroke="#62657d" stroke-width=".8"/>`;
 }
 return arcadeHeadFinish(c,out);
}
// Expression overlays are retained as empty compatibility nodes; every face now
// switches its own internal drawing below its hair, including the original six.
function expressionArt(){return '';}
for(const c of CHARACTERS){const n=el('symbol',{id:'v3-head-'+c.id,viewBox:c.legacyArt?'-50 -65 105 110':'-55 -103 113 161'},artDefs);n.innerHTML=headArt(c)}
function torsoArt(c){if(LEGACY_VECTOR[c.id])return `<g data-art-source="original-preview" transform="${LEGACY_TORSO_TRANSFORM}">${LEGACY_VECTOR[c.id].torso}</g>`;if(c.id==='mai'||c.id==='iori')return guestTorsoArt(c);let p=paint(c,'skin'),a=ART[c.id],f=paint(c,'fabric'),d=paint(c,'dark'),o='';
 if(c.id==='ryu'){
  o+=ink('M-19-318Q-36-311-49-292-60-272-51-247L-41-224-33-184Q-3-169 37-183L45-222Q61-255 49-281L31-305 18-318 12-305-7-305Z',p,2);
  o+=flat('M7-300Q27-303 41-282L45-262Q30-252 10-258L4-280Z',a.skin[0],'opacity=".8"');
  o+=flat('M-8-297Q-23-300-33-283L-35-263Q-17-254 0-261L2-279Z','#f0c596');
  o+=flat('M39-251L48-270Q59-249 41-222L34-187 20-184 25-211Z',a.skin[2],'opacity=".65"');
  o+=flat('M-5-250L3-243-2-221 1-200-11-184-29-189-33-227Z',a.skin[2],'opacity=".38"');
  o+=mark('M4-297L5-277 3-259M10-255Q23-250 39-257M-30-259Q-17-253-3-258M5-245L3-236M9-239Q20-244 29-237M9-225Q17-228 25-222M8-209Q15-214 23-208M1-231L0-222M0-215L-1-204','#985f50',1.5);
  o+=mark('M14-285Q25-292 34-279M13-269L30-266M10-233L21-235M9-218L19-220','#ffe1b6',1.8);
  o+=ink('M-29-317L-46-308Q-61-291-62-270L-53-243-37-223 32-185 43-198 5-228-19-251-26-274Z',d,1.7);
  o+=flat('M-41-304Q-53-280-44-259L-23-234 14-207-20-222-50-249-54-273Z','#c09c7b','opacity=".38"');
  o+=mark('M-34-302L-39-278-33-259-17-242M-45-294L-47-270-37-246 18-205M-44-243L-22-219 6-203','#d6b596',1.3,'opacity=".7"');
  o+=ink('M-33-191Q-6-179 34-190L46-171 34-153Q5-150-6-162L-32-154-45-169Z',f,1.6);
  o+=ink('M-38-184Q1-172 39-186L40-171Q1-157-39-171Z','url(#ink3)',1.4);
  o+=mark('M-36-180Q0-168 36-180','#756e69',1.1);
  o+=ink('M-5-177L10-181 20-169 5-160-8-167Z','#3e3c41',1.3);
  o+=mark('M-30-289l4-5m-8 15 5-6m-7 16 5-6','#e0bea2',.8,'opacity=".5"');
 }else if(c.id==='ken'){
  o+=ink('M-25-312L-47-296-46-252-34-190Q-1-176 32-189L47-254 43-298 23-314 12-304-9-301Z','url(#ink3)',1.7);
  o+=mark('M-18-299Q3-288 21-301','#767878',2.6)+flat('M-12-289L11-285 22-260-5-233-24-250Z','#383b43');
  o+=ink('M-29-314L-50-298-60-277-53-246-46-210-51-161-19-176-6-210-10-255 1-279-8-303Z',d,1.7);
  o+=ink('M20-316L45-302 61-279 51-246 45-210 54-157 15-174 10-218 10-251 1-280Z',d,1.7);
  o+=flat('M-47-291L-46-256-34-218-38-176-48-163-45-212-56-264Z','#705d4b')+flat('M25-300L43-285 45-247 35-209 43-173 23-183 17-221Z','#c3a47a');
  o+=ink('M-29-316L-17-319 1-282-20-250-34-266-24-280-41-295Z','url(#white3)',1.2);
  o+=ink('M19-320L33-312 45-294 29-280 37-266 19-249 1-282Z','#e5d8bd',1.2);
  o+=mark('M-29-308L-23-299M-26-291L-19-283M-25-272L-19-266M26-309L30-302M27-288L23-280M27-268L24-260','#a7a18f',2,'stroke-dasharray="2 3"');
  o+=ink('M-42-241L-16-238-17-221-37-216Z','#816c53',1)+ink('M23-239L45-235 42-218 25-223Z','#7f694f',1);
  o+=mark('M-41-239L-19-235M25-236L44-232','#ead0a1',1.3);
  o+=mark('M-49-281L-42-252M48-282L41-251M-34-212L-31-188M32-209L37-184','#ddbd8b',1.2);
  o+=ink('M-30-189Q0-181 31-190L35-175Q3-166-32-175Z','url(#ink3)',1.3)+ink('M-3-186L11-187 13-174-2-173Z','#afb0a2',1)+flat('M1-182H8V-177H1Z','#2b3340');
 }else if(c.id==='chun'){
  o+=ink('M-14-321L18-322 28-306 44-290 37-261 27-224 33-200 47-177 33-151 9-167-17-160-41-175-32-211-33-251-44-282-30-306Z',d,1.8);
  o+=flat('M-6-306Q12-301 22-277L20-238 16-211 29-185 14-169-13-174-25-199-24-236-23-273Z','#29a8c1');
  o+=flat('M32-298L39-286 33-258 24-229 24-209 34-188 29-176 16-208 20-252Z','#16536e');
  o+=ink('M-15-322L17-323 23-309 13-296-6-295-20-306Z',d,1.1)+mark('M-17-317L-12-308 13-300 21-311','url(#gold3)',2.8);
  o+=mark('M-16-303L-20-286 20-265 18-234 27-205 39-182M-37-289L-32-269M36-290L31-271','url(#gold3)',2.4);
  for(let j=0;j<4;j++)o+=mark(`M-11 ${-283+j*12}q7 7 16 2`,'#e8d8aa',1.6)+`<circle cx="6" cy="${-281+j*12}" r="1.65" fill="#f0dcaa"/>`;
  o+=mark('M-9-254q-15 1-10 13t14 2q10-8 2-16m-13 5q-8 7 1 13M1-221q-13-1-11 9t15 3m-5-10q8-8 15-2M-21-279q-10-10-14-2m25 73q-16 5-12 14','#8ce0d7',1,'opacity=".65"');
  o+=ink('M-33-212Q-2-199 30-212L34-197Q1-185-34-197Z','url(#gold3)',1.2);
  o+=ink('M-9-204L8-211 22-200 8-186-9-193-17-200Z','#dbe5de',1.1)+flat('M5-206L15-200 7-192-4-197Z','#faf7da');
 }else if(c.id==='cammy'){
  o+=ink('M-15-315L17-314 38-299 38-274 27-235 23-211-24-210-29-240-36-272-33-301Z','url(#ink3)',1.7);
  o+=flat('M-10-299Q3-286 19-300L24-273 16-239-15-238-23-275Z','#283944')+mark('M-13-239Q1-234 19-241','#798a97',1.1);
  o+=ink('M-26-309L-9-312-8-294-17-274-13-235-27-224-41-261-44-288Z',d,1.6);
  o+=ink('M19-314L38-304 49-285 41-259 33-229 21-231 25-273 11-294Z',d,1.6);
  o+=flat('M-32-296L-34-273-24-243-25-228-36-251-40-280Z','#aacfe0','opacity=".75"');
  o+=mark('M-24-303L-24-275-20-249M33-303L35-280 29-253','#d5e9e8',1.6);
  o+=ink('M-21-304L-14-311-8-297-14-288Z','#ccdae1',.9)+ink('M17-312L26-306 29-291 18-294Z','#c0d7de',.9);
  o+=ink('M-24-212Q-1-205 24-214L28-184Q0-174-30-185Z',p,1.4)+flat('M-25-208Q-5-199 22-208L24-199Q3-191-26-196Z','#b47e77','opacity=".5"')+mark('M0-197L0-190',a.skin[2],1.2);
  o+=ink('M-31-193Q0-181 28-194L43-173 25-154-29-157-43-175Z',paint(c,'fabric'),1.5);
  o+=mark('M-33-185Q1-174 31-185M-25-172L-18-165M24-174L16-166','#72919f',2);
  o+=flat('M-8-267L3-274 15-267 13-253 2-247-8-255Z','#a83247')+mark('M-4-263L5-268 11-260 4-254Z','#eabaac',1.1);
 }else if(c.id==='luke'){
  o+=ink('M-23-320L-43-306-55-282-49-248-37-212-34-184 35-183 41-226 53-277 39-309 21-322 13-306-9-306Z',p,1.7);
  o+=ink('M-28-315L-10-307-7-281Q8-274 20-289L20-316 39-307 45-276 35-239 37-184-36-184-35-237-47-277Z','url(#white3)',1.6);
  o+=ink('M-30-315L-16-309-19-280-27-251-37-244-46-278Z',d,1.2)+ink('M23-315L39-308 43-279 34-253 25-253 18-276Z',d,1.2);
  o+=mark('M-29-303L-34-280-32-264M32-300L33-280 28-266','#b5dfeb',1.6);
  o+=flat('M-35-231L-13-242 5-223 16-238 36-226 35-184-35-184Z',paint(c,'fabric'));
  o+=ink('M-17-248L-2-261 12-248 26-249 21-234 11-224-1-232-14-228Z','url(#gold3)',1.2);
  o+=flat('M-4-253L7-243 19-244 13-238 7-234-3-240-10-238Z','#f6d998');
  o+=mark('M-28-212L-22-199M30-214L23-193M-14-199L4-205','#f6ab80',1.2);
  o+=ink('M-33-189Q0-177 35-190L42-171 27-153-30-154-45-173Z',f,1.6)+mark('M-36-181Q0-169 37-181','#f6dfb4',4)+mark('M2-179L-1-161 8-166 8-177','#efe7cd',1.6);
 }else if(c.id==='juri'){
  o+=ink('M-15-319L17-319 38-302 41-284 29-250 23-236-25-237-38-276-35-302Z',d,1.6);
  o+=ink('M-17-318L-6-305 2-295 16-316 29-309 23-290 5-272-15-286-29-306Z','url(#white3)',1.1);
  o+=flat('M-6-304L3-292 18-310 20-300 5-281-10-293Z','#bca8c1');
  o+=mark('M-22-268L-6-279 3-267 16-276 27-265M-15-255L1-265 21-252','#ef8dc0',2.5);
  o+=ink('M-25-238L24-238 23-217 30-189Q1-174-31-190L-24-219Z',p,1.4);
  o+=flat('M-25-235L-17-229-14-204-23-190-31-190-24-219Z','#b58494','opacity=".7"');
  o+=mark('M4-229L1-218M-14-214Q-10-201-7-198M15-212L20-201M2-198L3-194','#bb8c95',1)+mark('M-10-233L-10-223M6-210L8-206','#fff0e1',1.5);
  o+=ink('M-29-196L-8-184 3-194 19-182 30-196 44-177 29-151-33-154-46-172Z',paint(c,'fabric'),1.6);
  o+=mark('M-34-188L-8-175 4-184 21-173 37-185','#23263c',9)+mark('M-33-192L-8-181 4-190 21-179 36-190','#d567ad',2.6);
  o+=ink('M-3-181L11-181 17-166 3-159-9-167Z','#292738',1.1);
 }
 if(c.id==='mai'){
  // A red crossover ninja tunic and wide white obi remain readable at gameplay scale.
  o+=ink('M-17-321L17-321 27-304 39-292 35-264 27-239 24-214 30-191 36-178 22-154-27-155-39-179-28-201-24-236-34-265-39-289-26-306Z',p,1.7);
  o+=flat('M-25-285Q-13-296-4-284L-8-254-20-235-26-246Z',a.skin[2],'opacity=".25"');
  o+=ink('M-24-310L-11-308-1-292 9-312 24-310 34-291 30-263 18-236 17-217 31-191 39-172 19-154-26-153-39-174-26-207-19-236-33-276Z',f,1.5);
  o+=flat('M17-300L29-285 26-262 12-238 13-211 25-190 23-168 10-166-6-208-5-245Z','#e13e53');
  o+=ink('M-24-312L-13-311 5-281 23-311 31-303 13-269 5-262-4-266-29-301Z','url(#white3)',1.05);
  o+=mark('M-20-306L3-270 9-270 27-304','#fff9e8',1.7);
  o+=mark('M-21-280L-13-258M23-279L15-254M-11-238L-5-220M17-241L12-223','#ff9896',1.2);
  o+=ink('M-27-220Q0-208 25-220L31-194Q4-179-31-194Z','url(#white3)',1.3);
  o+=mark('M-26-212Q1-201 26-212M-28-203Q2-192 29-203','#aaa2b2',1.2);
  o+=ink('M-4-210L10-214 19-202 9-189-7-194-13-204Z','#fff4e8',1.1);
  o+=flat('M0-205L10-208 13-202 8-194-2-197Z','#d6c8d4');
  o+=mark('M-26-188L-34-173-23-162M28-187L33-174 23-161','#ffb5a6',1.7);
 }else if(c.id==='iori'){
  // Cropped jacket over the long, split white shirt; the crescent is authored on the rear view.
  o+=ink('M-19-325L20-325 43-303 44-270 35-219 43-165 30-140 7-151-8-144-40-160-33-214-45-278-41-303Z','url(#white3)',1.6);
  o+=flat('M12-304L28-290 29-253 17-217 24-180 28-148 9-155 2-198 4-240Z','#c5c4d4');
  o+=ink('M-14-326L13-326 20-311 10-292-3-290-20-310Z',p,1.1);
  o+=ink('M-30-321L-12-320-3-294-7-256-1-224-31-215-45-248-49-287-41-309Z',d,1.8);
  o+=ink('M16-322L38-316 50-295 47-255 33-216 7-224 7-253 1-292Z',d,1.8);
  o+=flat('M-37-302L-40-276-31-242-15-237-20-261-17-292Z','#46445b');
  o+=flat('M24-308L39-291 35-257 21-230 12-230 18-263Z','#3f3e55');
  o+=ink('M-15-326L-5-321 1-296-7-283-21-312Z','url(#white3)',1.15)+ink('M13-327L24-320 13-284 1-296Z','url(#white3)',1.15);
  o+=mark('M-36-306L-31-312M35-305L39-299M-24-239L-15-236M16-238L25-235','#8e889d',1.1);
  o+=mark('M-19-212L-24-186-22-159M21-211L18-186 24-157M3-226L2-161','#9695ad',1.25);
  o+=ink('M-32-195Q0-185 32-196L35-178Q0-163-35-179Z',f,1.2);
  o+=ink('M-30-193Q0-184 31-194L32-185Q0-173-31-184Z','url(#ink3)',1.05);
  o+=ink('M-2-191L11-192 13-180-1-178Z','#ddd4cb',.9)+flat('M2-188L8-188 9-183 2-182Z','#343346');
  o+=`<circle cx="-21" cy="-229" r="2.7" fill="#c8c4d3"/><circle cx="25" cy="-230" r="2.7" fill="#c8c4d3"/>`;
 }
 return o;
}
const P2=(x,y)=>[x,y],vadd=(a,b)=>[a[0]+b[0],a[1]+b[1]],vsub=(a,b)=>[a[0]-b[0],a[1]-b[1]],vmul=(a,s)=>[a[0]*s,a[1]*s],vlen=a=>Math.hypot(a[0],a[1]),vnorm=a=>vmul(a,1/(vlen(a)||1)),vperp=a=>[-a[1],a[0]],pt=a=>a.map(v=>+v.toFixed(2)).join(' '),lerp2=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
function solveLimb(a,target,hint,l1,l2){let delta=vsub(target,a),dist=clamp(vlen(delta),Math.abs(l1-l2)+3,l1+l2-1),u=vnorm(delta),v=vperp(u),end=vadd(a,vmul(u,dist)),proj=(l1*l1-l2*l2+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,l1*l1-proj*proj)),sign=(hint[0]-a[0])*v[0]+(hint[1]-a[1])*v[1]>=0?1:-1;return[a,vadd(vadd(a,vmul(u,proj)),vmul(v,h*sign)),end]}
// A single curved skin envelope crosses the elbow/knee, avoiding segmented tubes.
function envelope(a,b,c,w0,w1,w2){const u=vnorm(vsub(b,a)),v=vnorm(vsub(c,b)),n=vperp(u),m=vperp(v),j=vnorm(vadd(n,m)),l=vlen(vsub(b,a)),q=vlen(vsub(c,b)),off=(p,z,w)=>vadd(p,vmul(z,w));let d='';for(let s of [1,-1]){let A=off(a,n,w0*s),B=off(b,j,w1*s),C=off(c,m,w2*s);if(s===1){d=`M${pt(A)} C${pt(off(vadd(a,vmul(u,l*.23)),n,w0*1.14))} ${pt(off(vadd(b,vmul(u,-l*.21)),n,w1*1.3))} ${pt(B)} C${pt(off(vadd(b,vmul(v,q*.26)),m,w1*1.28))} ${pt(off(vadd(c,vmul(v,-q*.34)),m,w2*1.48))} ${pt(C)} Q${pt(vadd(c,vmul(v,5)))} ${pt(off(c,m,-w2))}`}
 else d+=` C${pt(off(vadd(c,vmul(v,-q*.27)),m,-w2*1.25))} ${pt(off(vadd(b,vmul(v,q*.24)),m,-w1*1.08))} ${pt(B)} C${pt(off(vadd(b,vmul(u,-l*.28)),n,-w1*1.25))} ${pt(off(vadd(a,vmul(u,l*.16)),n,-w0*1.13))} ${pt(A)} Q${pt(vadd(a,vmul(u,-w0*.45)))} ${pt(off(a,n,w0))}Z`; }return d}
function limbLight(a,b,c,w0,w1,w2){const n=vperp(vnorm(vsub(b,a))),m=vperp(vnorm(vsub(c,b))),j=vnorm(vadd(n,m)),O=(p,v,w)=>pt(vadd(p,vmul(v,w)));return `M${O(a,n,w0*.63)}Q${O(lerp2(a,b,.42),n,w0*.95)} ${O(b,j,w1*.64)}Q${O(lerp2(b,c,.36),m,w1*.78)} ${O(c,m,w2*.55)}L${O(c,m,w2*.16)}Q${O(lerp2(b,c,.28),m,w1*.24)} ${O(b,j,w1*.2)}Q${O(lerp2(a,b,.55),n,w0*.4)} ${O(a,n,w0*.28)}Z`}
function newLimb(parent,c,type,rear){const g=el('g',{'data-limb':type+(rear?'Back':'Front')},parent);let fill=type==='arm'?paint(c,'skin'):paint(c,'fabric');if(type==='leg'&&c.id==='juri'&&rear)fill=paint(c,'dark');if(c.legacyArt)fill=type==='arm'?`url(#skin${c.id==='ken'?'K':'R'})`:`url(#gi${c.id==='ken'?'K':'R'}${rear?'Dark':''})`;const contour=path('',fill,g,{stroke:ART[c.id].ink,'stroke-width':c.limbStroke||1.8,'stroke-linejoin':'round'}),shade=path('','#15243b',g,{opacity:rear?.24:.17}),light=path('','#fff2cc',g,{opacity:rear?.14:.32}),details=line('',type==='arm'?ART[c.id].skin[2]:'#374052',1.15,g,{opacity:.7}),cloth=el('g',{},g),end=el('g',{},g);const rim=line('','#c7f3fb',1.4,g,{opacity:.23});return{g,contour,shade,light,details,cloth,end,rim,rear,type}}
function gloveArt(c,open=false){if(LEGACY_VECTOR[c.id])return LEGACY_VECTOR[c.id].hand;if(c.id==='mai'||c.id==='iori')return guestHandArt(c,open);let a=ART[c.id],fill=c.id==='chun'?'url(#gold3)':c.id==='ken'?'url(#ink3)':c.id==='luke'?paint(c,'dark'):c.id==='juri'?paint(c,'dark'):'url(#red3)',o='';
 if(open){o+=ink('M-9-12L8-15Q17-25 21-26 25-25 22-19L19-13 39-17Q44-17 43-13L25-7 44-7Q49-5 45-2L25 1 42 5Q45 9 39 10L23 7 34 15Q36 20 31 20L15 12 2 15-10 9Z',paint(c,'skin'),1.2)+mark('M8-9Q10 1 19 3M23-7L14-6M24 1L15 0M22 7L14 5',a.skin[2],.85);
 }else{o+=ink('M-12-11L0-13 7-18Q13-22 18-19 25-22 28-17Q36-18 37-10L39 4Q39 11 32 14L16 17 2 12-12 10Z',fill,1.45);o+=flat('M4-11L10-16Q20-19 30-15L33-5 20-1 7-3Z',c.id==='chun'?a.skin[0]:c.id==='luke'?'#8ab5d5':c.id==='ken'?'#777b7d':'#ff9383','opacity=".72"');o+=ink('M1 0Q5-9 10-6L21 0Q25 3 23 8L14 10 5 7Z',paint(c,'skin'),.9)+mark('M11-15L12-6M20-17L22-7M29-14L30-6M7 3L17 6',c.id==='chun'?a.skin[2]:'#382b37',.95);}
 o+=ink('M-16-12L-3-12-3 12-17 10Z',fill,1.05)+mark('M-13-7L-6-7M-14 1L-6 1',c.id==='chun'?'#fff1c2':'#eabda8',1.2);
 if(c.id==='chun')o+=ink('M-14-12L-11-23-6-12M-17 7L-24 12-15 12','#eee8d4',.9);
 return o;
}
function footArt(c){const id=c.id;let o='';if(LEGACY_VECTOR[id])return LEGACY_VECTOR[id].foot;if(id==='mai')return maiFootArt(c);if(id==='iori')return ioriFootArt(c);if(id==='ryu'||id==='juri'){
 o+=ink('M-13-13Q-7-17 9-14L15-2 30 4Q43 6 46 12L44 19Q18 26-15 17L-19 9Z',paint(c,'skin'),1.35);
 o+=flat('M-17 10Q6 17 29 15L43 13 44 19Q19 26-15 17Z',ART[id].skin[2],'opacity=".65"');
 o+=mark('M36 7L36 15M29 6L30 16M23 4L24 15M17 2L18 12M-9-9Q0-5 9-8',ART[id].skin[2],.95);
 o+=mark('M-8 0Q1 8 13 8',ART[id].skin[0],1.5);
 if(id==='juri')o+=ink('M-13-19L10-18 12-5-14-6Z',paint(c,'dark'),1)+mark('M-11-16L10-13M-12-10L11-8','#ee6aae',2.5);
 }else{let fill=id==='chun'?'url(#white3)':id==='ken'?paint(c,'dark'):id==='luke'?paint(c,'dark'):'url(#ink3)';o+=ink('M-14-27L12-28 15-9 25-1 37 3Q45 5 46 14L42 22 18 25-19 19-20 5Z',fill,1.5);o+=ink('M-20 12Q10 20 44 11L46 19 40 24Q10 30-20 20Z',id==='chun'?'#8a94a3':'#202636',1);o+=flat('M-11-23L5-25 8-6-11-4Z',id==='ken'?'#cfb18d':id==='chun'?'#fffae5':'#52677a');o+=mark('M-8-19L7-19M-8-13L8-13M-7-7L10-7M19 1L20 13',id==='ken'?'#6d665f':id==='chun'?'#a9acac':'#a0a9ad',1.5);o+=mark('M23 2L34 6 39 11',id==='chun'?'#fff5d6':'#76818b',1.4);
 if(id==='cammy')o+=ink('M-12-25L8-25 11-11-11-9Z','url(#red3)',.9);
 }return o;}
function createFighter(id,name,x,dir,cpu){const ch=CHARACTERS.find(c=>c.id===name)||CHARACTERS[0],root=el('g',{'aria-label':ch.cn,'data-character':ch.id},$('fighters')),facing=el('g',{id:'body-'+id},root),aura=el('g',{opacity:0},facing);
 el('ellipse',{cx:0,cy:-188,rx:135,ry:212,fill:'url(#energy-'+ch.id+')',opacity:.45},aura);
 const trailing=el('g',{'data-part':'cloth-trails'},facing),rearLeg=newLimb(facing,ch,'leg',true),frontLeg=newLimb(facing,ch,'leg',false),core=el('g',{},facing),rearArm=newLimb(core,ch,'arm',true),torso=el('g',{'data-part':'torso'},core);torso.innerHTML=torsoArt(ch);const torsoBack=el('g',{'data-part':'torso-back',opacity:0},core);torsoBack.innerHTML=backTorsoArt(ch);
 const coatTails=el('g',{},core),headTails=el('g',{},core),head=el('g',{},core);head.innerHTML='<g data-part="character-head">'+headArt(ch)+'</g>';
 const headFront=head.firstElementChild,headBack=el('g',{'data-part':'head-back',opacity:0},head);headBack.innerHTML=backHeadArt(ch);
 const facePower=el('g',{opacity:0},head),faceHurt=el('g',{opacity:0},head);facePower.innerHTML=ch.id==='mai'||ch.id==='iori'?'':expressionArt(ch,false);faceHurt.innerHTML=ch.id==='mai'||ch.id==='iori'?'':expressionArt(ch,true);const guestFaces=head.querySelector('[data-face-state="rest"]')?['rest','power','hurt'].map(v=>head.querySelector('[data-face-state="'+v+'"]')):null;
 const frontArm=newLimb(core,ch,'arm',false);core.insertBefore(rearArm.g,headTails);
 for(let l of [rearLeg,frontLeg])l.end.innerHTML=footArt(ch);
 for(let l of [rearArm,frontArm]){l.fist=el('g',{},l.end);l.fist.innerHTML=gloveArt(ch,false);l.palm=el('g',{opacity:0},l.end);l.palm.innerHTML=gloveArt(ch,true)}
 if(ch.id==='ryu'){headTails.innerHTML=ink('M-14-356Q-48-367-95-341L-114-334-98-355Q-52-378-16-364Z','url(#red3)',1.3)+ink('M-15-361Q-58-343-85-360L-103-365-85-350Q-55-336-12-352Z','#d54852',1.1);coatTails.innerHTML=ink('M-3-169L-7-113 6-117 12-165Z','url(#ink3)',1.1)+ink('M8-169L39-128 45-146 20-174Z','#3f3740',1.1)+mark('M-1-139L4-137M-1-133L4-131M-1-127L4-125','#c0a77c',1.3)}
 if(ch.id==='ken')trailing.innerHTML=ink('M-44-221L-62-120-53-93-27-121-3-188Z',paint(ch,'dark'),1.4)+ink('M30-219L56-199 82-99 54-123 41-118 7-190Z',paint(ch,'dark'),1.4)+mark('M-39-189L-49-126M40-184L62-124','#eac595',1.5);
 if(ch.id==='chun'){coatTails.innerHTML=ink('M-32-195L-45-130-33-81-18-103 1-169Z',paint(ch,'dark'),1.3)+ink('M14-196L43-177 48-108 35-71 19-113-3-171Z',paint(ch,'dark'),1.3)+mark('M-32-183L-37-130-32-94M25-180L38-123 35-86','url(#gold3)',2.4)+ink('M-5-193L-13-126 2-136 9-187Z','url(#white3)',.9);}
 if(ch.id==='juri')coatTails.innerHTML=ink('M-2-169L-29-124-16-116 14-167Z','url(#ink3)',1)+ink('M7-168L23-124 37-112 31-142 19-177Z',paint(ch,'dark'),1)+mark('M-16-132L-11-126M26-134L29-128','#e776bd',2);
 let fan=null,beltLink=null;
 if(ch.id==='mai'){
  headTails.innerHTML=maiHairTailArt();
  coatTails.innerHTML=maiGarmentTailArt();
  trailing.innerHTML=maiTrailingArt();
  fan=el('g',{'data-part':'hand-fan'},frontArm.end);fan.innerHTML=fanArt(ch);frontArm.end.insertBefore(fan,frontArm.fist);frontArm.fist.innerHTML=fanGripArt(ch);frontArm.palm.innerHTML=fanGripArt(ch); 
 }
 if(ch.id==='iori'){
  coatTails.innerHTML=ioriShirtTailsArt();
  beltLink=el('g',{'data-part':'trouser-strap'},facing);facing.insertBefore(beltLink,core);beltLink.innerHTML=mark('','url(#red3)',8)+mark('','#e38d8c',1.5);
 }
 if(ch.legacyArt){
  const old=LEGACY_VECTOR[ch.id];
  headTails.innerHTML=old.headTails?`<g transform="translate(0 -25.3)">${old.headTails}</g>`:'';
  // Ryu's original belt tails belong to the copied torso; do not draw them twice.
  coatTails.innerHTML='';
  trailing.innerHTML=old.coatTails?`<g transform="${LEGACY_TORSO_TRANSFORM}">${old.coatTails}</g>`:'';
 }
 const charge=el('g',{opacity:0},facing);el('circle',{r:63,fill:'url(#energy-'+ch.id+')'},charge);const chargeRing=el('g',{},charge);chargeRing.innerHTML=mark('M-38 6A38 30 0 0 1 21-30M37-5A38 30 0 0 1-20 30',ch.color,2.5)+mark('M-28-17L-48-24M25 20L43 36M-8-34L-13-49','#ffffff',1.5);
 const motionFx=el('g',{'pointer-events':'none'},facing),fxArc=path('','none',motionFx,{stroke:ch.color,'stroke-width':8,'stroke-linecap':'round',opacity:0}),fxCore=path('','none',motionFx,{stroke:'#eafdff','stroke-width':2.3,'stroke-linecap':'round',opacity:0}),fxFill=path('',ch.color,motionFx,{opacity:0}),fxExtra=el('g',{},motionFx);
 const shadow=el('g',{},$('fighter-shadows'));el('ellipse',{cx:0,cy:8,rx:107,ry:17,fill:'#07101e',opacity:.7},shadow);el('ellipse',{cx:0,cy:5,rx:76,ry:8,fill:'#050c13',opacity:.55},shadow);
 return{id,ch,name:ch.name,x,dir,cpu,root,facing,core,torso,torsoBack,headFront,headBack,guestFaces,fan,beltLink,rearLeg,frontLeg,rearArm,frontArm,head,facePower,faceHurt,headTails,coatTails,trailing,aura,charge,chargeRing,motionFx,fxArc,fxCore,fxFill,fxExtra,shadow,renderScale:ch.scale,hp:10000,displayHp:10000,drive:6,super:3,y:0,py:0,px:x,vy:0,move:0,state:'idle',stateAge:0,walkT:0,pose:null,attack:null,rushBuff:0,install:0};}
function skinFighter(){} // all eight rigs are authored separately at construction time

// Guest-specific hands, footwear and articulated clothing remain vector geometry.
function guestHandArt(c,open){const a=ART[c.id],iori=c.id==='iori';let o='';
 if(open&&iori){
  // Hooked fingers point along the strike, with the last two fingers held together.
  // Knuckles form one palm volume; five equal spokes would read as a starfish.
  o+=ink('M-12-10L1-13 7-20Q11-27 16-25L18-22 14-17 12-11 20-16 28-23Q34-27 39-22L40-16 36-12 32-14 34-18 31-19 25-14 22-7 33-11Q40-11 43-6L45 0 41 5 37 3 37-2 34-4 24 1 30 2Q37 3 39 9L38 15 34 18 30 15 32 11 29 8 20 7 24 11Q29 15 27 21L23 24 20 21 20 17 15 13 7 15-2 12-12 9Z','#e3b6a2',1.2);
  o+=flat('M-10 2Q0 7 8 7L18 2 23 4 15 11 7 15-2 12-12 9Z','#b98680');
  o+=mark('M7-9Q10-2 17 0M23-9L28-12M25 2L30 4M19 8L23 12','#a16d6c',.85);
  o+=mark('M35-17L38-17M39-2L42-1M33 12L36 13M22 19L25 20','#6b3b50',1.1);
 }else if(open){
  o+=ink('M-12-10L4-12 13-22Q18-26 20-22L17-15 13-9 35-14Q41-15 40-11L25-5 41-5Q45-3 41 0L24 2 36 7Q40 11 35 12L20 7 27 15Q29 20 24 19L13 12 1 13-11 9Z',paint(c,'skin'),1.15)+mark('M6-7Q9 1 17 3M21-5L13-3M21 3L13 3M18 8L12 7',a.skin[2],.8);
 }else{
  o+=ink('M-11-10L2-12 8-17Q13-20 18-16 24-18 28-13 34-12 34-5L33 8 27 13 14 15 2 11-11 8Z',iori?'#e3b6a2':paint(c,'skin'),1.25)+flat('M5-10L11-15 26-11 29-3 19 1 7-2Z',a.skin[0],'opacity=".7"')+ink('M2-1Q7-7 11-4L19 0Q22 3 19 7L12 9 5 6Z',iori?'#e3b6a2':paint(c,'skin'),.8)+mark('M11-13L12-6M20-13L22-6M27-9L28-3M8 3L15 5',a.skin[2],.85);
 }
 if(iori)o+=ink('M-20-14L-6-13-5 12-20 14Z','url(#white3)',1)+mark('M-17-8L-9-8M-17 7L-9 8','#b5b0c4',1.1);
 else o+=ink('M-17-12L-7-12-6 10-17 10Z','url(#red3)',1)+mark('M-14-8L-10-8M-14 5L-9 5','#f7c5ad',1.2);
 return o;
}
function maiFootArt(c){return ink('M-11-26Q-2-28 10-24L10-10Q14-2 25 3 35 6 37 11Q32 17 17 17L-11 11Q-17 7-16 0Z','#fff2dc',1.2)+flat('M-15 4Q-5 10 9 10L29 12 36 10Q32 17 17 17L-11 11Z','#d2bcc2')+mark('M-14 9Q7 18 35 12','#932238',2.4)+ink('M-10-10L-3-13 24 6 19 10Z','#ce253b',.8)+ink('M10-10L14-4-4 8-10 5Z','#df3345',.75)+mark('M28 7Q25 10 26 14','#b9a3aa',.9);}
function ioriFootArt(c){return ink('M-14-26L11-26 12-9 23 0 39 5Q46 8 48 15L43 23 17 24-20 18-20 7Z','url(#ink3)',1.45)+flat('M-10-23L5-22 8-4-7-2Z','#5e6077')+ink('M-20 11Q9 20 46 12L47 20 40 25Q9 27-20 20Z','#151826',1.1)+mark('M-9-16L7-16M-8-10L8-10M-7-4L10-4M20 2L23 13M27 6L39 10','#a6a3b5',1.05);}
function fanArt(c){let o='<g data-fan-leaves="true">';o+=ink('M16 0L36-75Q88-66 96-18 99 34 49 67Z','url(#white3)',1.3)+ink('M36-75Q88-66 96-18 99 34 49 67L45 55Q84 29 82-14 77-53 36-62Z','url(#red3)',1.1)+flat('M16 0L61-58 71-44 16 0 84-28 87-12 16 0 86 7 82 23 16 0 72 41 60 54Z','#e8c6c1','opacity=".36"');
 for(const end of [[36,-71],[58,-59],[76,-41],[87,-20],[89,2],[82,24],[67,45],[49,62]])o+=mark(`M16 0L${end.join(' ')}`,'#ac8268',1.05);
 o+=flat('M51-14Q64-29 73-15L66-7 75 0Q62 11 53 0L43 2 47-6 42-14Z','#cf3c50')+mark('M53-14L64-2M49-5L68-8','#ffd0b5',1.1)+mark('M36-75Q88-66 96-18 99 34 49 67','#ffe2af',2.7);o+='</g>';
 o+=ink('M10-4L18-4 24 2 17 7 9 4Z','url(#gold3)',1)+`<circle cx="16" cy="1" r="2" fill="#fdf1d0" stroke="#8b5b51" stroke-width=".8"/>`;return o;}
function backHeadArt(c){if(LEGACY_VECTOR[c.id])return legacyBackHeadArt(c);if(c.id==='mai'||c.id==='iori')return arcadeHeadFinish(c,guestBackHeadArt(c));const a=ART[c.id],female=c.female;let o=ink('M-18 3L-18 28-28 40Q0 54 28 39L18 26 17 2Z',paint(c,'skin'),1.3);o+=ink(female?'M-28-43Q-31-69-6-73 22-75 32-49L31-14Q28 13 10 22L-11 18Q-27 4-28-20Z':'M-29-45Q-31-72-4-75 25-76 34-48L33-14Q28 13 10 22L-12 16Q-28 1-29-21Z',paint(c,'hair'),1.6);
 o+=flat('M-21-53Q-11-68 5-65L12-59Q-7-55-9-24L-19-4-24-20Z',a.hair[0],'opacity=".48"')+mark('M-20-40Q-21-57-4-62M0-8Q8-35 20-53M15 5L25-14',a.hair[0],1.3,'opacity=".72"');
 if(c.id==='ryu')o+=ink('M-29-32Q3-38 33-28L32-16Q0-23-28-20Z','url(#red3)',1.1)+ink('M-32-46L-36-56-24-53-24-68-12-61-4-77 5-66 17-77 23-63 34-59 38-43Z',paint(c,'hair'),1.3);
 if(c.id==='ken')o+=ink('M-29-13L-37-35-36-54-27-64-14-76 0-73 12-79 30-64 37-45 33-20 27-10 26-34 13-18 6-33-5-10-8-30-22-10-22-27Z',paint(c,'hair'),1.25)+mark('M-24-48L-14-62M-9-41L2-61M15-39L24-55',a.hair[0],2.1);
 if(c.id==='chun')o+=ink('M-34-63Q-54-67-48-87-34-99-22-80L-23-67Z','url(#white3)',1.3)+ink('M22-75Q30-99 47-85 57-70 38-62L27-63Z','url(#white3)',1.3)+mark('M-37-61L-43-24-37 4M38-60L44-24 38 8','#faf5e3',4);
 if(c.id==='juri')o+=ink('M-24-61L-34-84-26-96-11-77-8-63M16-64L25-87 39-94 37-75 30-61',paint(c,'hair'),1.4)+mark('M-26-62L-13-66M20-64L31-65','#e883bc',4);
 if(c.id==='mai')o+=ink('M-29-72L-46-83-39-66-23-61M-15-73L0-89 3-71-12-64Z','url(#white3)',1.1)+ink('M-24-79L-7-74-10-60-26-63Z','url(#red3)',1);
 if(c.id==='iori')o+=ink('M-28-46L-34-53-28-67-14-78 1-80 16-73 31-61 37-41 30-18 22-6 18-23 7-4 2-20-10-3-12-22-25-7Z',paint(c,'hair'),1.4)+mark('M-21-45L-8-64M-4-36L6-61M15-30L23-54','#ef787e',1.4);
 return arcadeHeadFinish(c,o);}
function backTorsoArt(c){if(c.id==='mai'||c.id==='iori')return guestBackTorsoArt(c);const a=ART[c.id],female=c.female,body=female?'M-19-321L20-320 39-301 41-277 30-243 24-215 32-186 40-170 24-153-30-155-41-174-29-207-25-242-39-278-37-300Z':'M-22-322L24-322 47-302 53-277 41-235 34-193 43-171 27-153-31-155-45-173-34-216-49-273-46-299Z';let fill=c.id==='ryu'?paint(c,'skin'):c.id==='ken'||c.id==='chun'||c.id==='cammy'||c.id==='iori'?paint(c,'dark'):c.id==='luke'?'url(#white3)':paint(c,'fabric');let o=ink(body,fill,1.8);
 if(c.id==='ryu'){o+=mark('M0-308L0-260-3-217M-26-291Q-7-281-7-260M27-289Q9-279 9-260M-30-247L-17-223M31-245L20-221',a.skin[2],1.45)+ink('M-28-320L-45-304-44-274-20-247 36-204 42-185 13-199-32-232-49-253-58-282-47-310Z',paint(c,'dark'),1.4)+ink('M-35-189Q0-176 37-189L41-170Q0-155-39-171Z','url(#ink3)',1.2);}
 if(c.id==='ken'){o+=ink('M-31-314Q0-293 34-314L40-296Q0-278-38-297Z','#e5d7bc',1.3)+mark('M0-284L1-199M-33-276L-27-227M35-273L28-228','#d3b17f',1.4)+ink('M-13-253L14-254 13-233-12-232Z','#a08462',1);}
 if(c.id==='chun'){o+=mark('M-17-318Q0-307 19-318M-29-298Q-20-270-28-247M30-298Q20-270 28-247','url(#gold3)',2.2)+ink('M-31-213Q0-200 30-213L34-196Q0-182-34-196Z','url(#gold3)',1.1)+mark('M-2-287q-18 5-10 16t18-2q6-10-7-10M1-256q15-2 13 9t-20 5m9-1-8 11','#8be0d6',1.3);}
 if(c.id==='cammy'){o+=ink('M-21-305L-13-312 1-295 17-315 28-307 28-267 20-239-20-240-30-270Z',paint(c,'dark'),1)+mark('M-21-298L-18-267M23-298L19-267','#cee3e9',1.7)+ink('M-24-213Q0-205 24-213L28-185Q0-173-30-185Z',paint(c,'skin'),1.2)+ink('M-31-191Q0-179 29-192L40-173 24-154-29-156-42-174Z',paint(c,'fabric'),1.1);}
 if(c.id==='luke'){o+=ink('M-29-316L-13-310-19-277-36-245-46-275Z',paint(c,'dark'),1)+ink('M24-316L39-307 43-277 34-251 21-263Z',paint(c,'dark'),1)+ink('M-34-232L-15-244 1-229 20-244 36-231 34-188-34-188Z',paint(c,'fabric'),1.2)+mark('M-19-273L0-290 19-273-1-251Z','url(#gold3)',5);}
 if(c.id==='juri'){o+=ink('M-22-319L-8-308 4-286 20-315 31-307 12-272-2-279-29-307Z','url(#ink3)',1.2)+mark('M-20-296L19-269M23-296L-13-266','#e68fbd',3)+ink('M-25-240L25-240 24-215 31-191Q0-176-30-191L-24-216Z',paint(c,'skin'),1.2)+mark('M1-230L0-207',a.skin[2],1.2)+ink('M-30-193L-9-179 4-191 21-178 34-193 42-173 28-154-32-155-44-174Z',paint(c,'fabric'),1.1);}
 if(c.id==='mai'){o+=ink('M-19-320L-8-312 1-285 15-316 25-312 14-274 4-267-7-275-28-309Z','url(#white3)',1.1)+mark('M-19-269L-11-239M23-269L15-239','#ffbab1',1.4)+ink('M-27-220Q0-208 25-220L31-194Q4-179-31-194Z','url(#white3)',1.2)+mark('M-26-209Q0-197 27-209','#b3a2b5',1.2);}
 if(c.id==='iori'){o+=ink('M-19-324Q1-311 23-324L30-311Q1-295-27-311Z','url(#white3)',1.1)+flat('M11-298C-13-306-28-286-24-268-18-243 8-242 22-259C6-254-7-268-7-280-7-288 0-295 11-298Z','#f3eed9')+mark('M-34-283L-28-250M36-283L28-247','#777286',1.1)+ink('M-34-218Q0-202 34-218L40-160 25-143 4-156-10-145-37-158Z','url(#white3)',1.2)+mark('M-21-203L-23-159M20-203L25-159','#aaa5ba',1.15);}
 return o;}

// Called by the motion renderer after its shared skin-envelope pass.
function characterLimbArt(l,a,b,c,f,widths){const ch=f.ch;if(ch.id!=='mai'&&ch.id!=='iori')return null;const leg=l.type==='leg',iori=ch.id==='iori',[w0,w1,w2]=widths,m=vperp(vnorm(vsub(c,b))),P=(p,w)=>pt(vadd(p,vmul(m,w)));let o='';
 if(leg&&!iori){const a0=lerp2(b,c,.61);o+=ink(limbContour(a0,lerp2(b,c,.81),c,w1*.68,w2+2,w2+1),'#fff1d9',1.05)+mark(`M${P(a0,w1*.67)}Q${P(lerp2(b,c,.66),0)} ${P(a0,-w1*.65)}`,'#b7a5ad',1);}
 if(!leg&&iori){const a0=lerp2(b,c,.8);o+=ink(limbContour(a0,lerp2(b,c,.91),c,w2+2.6,w2+2,w2+1.5),'#f5ebdc',1.05)+mark(`M${P(a0,w2*.67)}L${P(c,w2*.67)}`,'#c4b9be',.8);}
 if(!leg&&!iori){const a0=lerp2(b,c,.82);o+=ink(limbContour(a0,lerp2(b,c,.92),c,w2+2,w2+1.7,w2+1),'#ad2133',.85);}
 return o;
}
function updateCharacterAttachments(f,p,limbs){if(f.guestFaces){const hurt=['hit','stun','tumble','captured','down','ko'].includes(f.state),power=!hurt&&(f.portraitPower||f.attack&&(f.attack.m.super||f.attack.m.od||f.attack.m.level>=3)&&f.attack.t>f.attack.m.startup*.6),face=hurt?2:power?1:0;f.guestFaces.forEach((g,i)=>sa(g,'opacity',i===face?1:0));}const turn=clamp(p.turn||0,0,1),back=turn>.54;sa(f.torso,'opacity',back?0:1);sa(f.torsoBack,'opacity',back?1:0);sa(f.headFront,'opacity',back?0:1);sa(f.headBack,'opacity',back?1:0);sa(f.facePower,'visibility',back?'hidden':'visible');sa(f.faceHurt,'visibility',back?'hidden':'visible');
 if(f.fan){const m=f.attack?.m,at=f.attack?.t||0,throwing=m?.base==='kachosen'&&at>m.startup-1&&at<m.startup+m.active+8;let fan=p.fan??(f.state==='hit'||f.state==='tumble'||f.state==='down'||f.state==='ko'?.1:.84);fan=clamp(fan,.07,1);sa(f.fan.firstElementChild,'transform',`translate(16 0) scale(1 ${fan.toFixed(3)}) translate(-16 0)`);sa(f.fan,'opacity',throwing?0:1);sa(f.fan,'transform',`rotate(${(-18+(1-fan)*9+(p.fanAngle||0)).toFixed(2)} 16 0)`);}
 if(f.beltLink){const a=lerp2(limbs.rearLeg[1],limbs.rearLeg[2],.26),b=lerp2(limbs.frontLeg[1],limbs.frontLeg[2],.26),span=Math.abs(a[0]-b[0]),dip=clamp(28-span*.12,8,27);const d=`M${pt(a)}Q${((a[0]+b[0])/2).toFixed(2)} ${(Math.max(a[1],b[1])+dip).toFixed(2)} ${pt(b)}`;sa(f.beltLink.children[0],'d',d);sa(f.beltLink.children[1],'d',d);}
}

function faceEyesArt(c,mood='rest'){const q=FACE_DESIGN[c.id],a=ART[c.id],color=a.hair[2];let o='';
 if(mood==='hurt')return mark(q.hurtLid,color,c.female?1.65:1.9)+mark(c.id==='juri'?'M4-32L27-28M-16-34L0-29':c.id==='ryu'?'M3-32L27-29M-17-31L-3-28':c.id==='luke'?'M4-32L28-28M-17-30L0-27':c.id==='cammy'?'M5-32L28-29M-16-31L0-29':c.id==='ken'?'M5-32L28-29M-16-32L0-28':'M5-32Q18-29 28-30M-16-32L-1-29',color,c.female?1.55:2.15);
 const [x,y,rx,ry]=q.pupil,[fx,fy,frx,fry]=q.farPupil;
 if(mood==='power')o+='<g transform="translate(0 -22) scale(1 .86) translate(0 22)">';
 o+=flat(q.near,'#fff2df')+flat(q.far,'#f5e3cf');
 o+=mark(`M${x} ${(y-ry*.72).toFixed(2)}V${(y+ry*.72).toFixed(2)}`,q.iris,Math.min(3.2,rx))+mark(`M${fx} ${(fy-fry*.68).toFixed(2)}V${(fy+fry*.68).toFixed(2)}`,q.iris,Math.min(2.7,frx));
 o+=mark(q.upper,color,c.id==='juri'?2.3:c.female?2:2.3)+mark(q.farUpper,color,c.female?1.7:2);
 if(mood==='power')o+='</g>';
 o+=flat(mood==='power'?q.powerBrow:q.brow,color)+flat(q.farBrow,color);
 return o;
}
function arcadeFaceStates(c){const q=FACE_DESIGN[c.id],a=ART[c.id];let o='';for(const mood of ['rest','power','hurt']){o+=`<g data-face-state="${mood}" opacity="${mood==='rest'?1:0}">`+faceEyesArt(c,mood);
 if(mood==='rest'){
  if(c.id==='luke')o+=ink('M5 7Q17 12 30 5L27 12Q16 19 7 12Z','#68443b',.85)+flat('M8 9Q19 12 28 7L26 11Q17 16 9 11Z','#fff0d9');
  else if(c.id==='juri')o+=flat('M11 10Q21 11 27 5L25 10Q19 15 12 12Z','#f2dacd');
  o+=mark(q.mouth,c.id==='juri'?'#9c4c75':c.id==='ryu'?'#e8bda0':'#855054',c.female?1.1:1.35)+mark(q.lip,c.id==='ryu'?'#a28c73':a.skin[0],1);
 }else{
  o+=ink(mood==='hurt'?q.hurtMouth:q.powerMouth,c.id==='juri'?'#57263f':'#4d303a',.85);
  const teeth={ryu:'M7 10Q18 7 27 9L26 13 9 14Z',ken:'M9 8Q19 8 27 5L25 10 10 12Z',chun:'M12 6Q19 4 24 7L23 10 13 10Z',cammy:'M12 7L24 7 23 10 13 11Z',luke:'M7 8Q19 5 29 8L26 13Q17 15 9 12Z',juri:'M10 9Q21 12 27 5L25 10Q18 15 11 12Z'}[c.id];
  o+=flat(teeth,'#fff0d9');
  if(mood==='power'&&['ryu','ken','luke'].includes(c.id))o+=mark(c.id==='ryu'?'M12 20Q19 17 24 19':c.id==='ken'?'M13 18L22 16':'M12 23Q19 19 25 21','#b57578',2.1);
 }
 o+='</g>';}
 return o;
}
// Arcade guest redraw: a small number of hand-drawn contours and cel shadows.
function guestHeadArt(c){const mai=c.id==='mai',skin=mai?'#f6c6a9':'#e7c0ac',shade=mai?'#cf8f79':'#b98680',hair=mai?'#693123':'#aa273e',deep=mai?'#3d2124':'#631a32',hi=mai?'#a85b37':'#e5525c';let o='';
 o+=ink(mai?'M-13 2Q-10 22-17 29L-26 33Q-4 44 26 33L17 26 16 0Z':'M-15 1L-17 27-25 34Q-3 42 28 32L17 24 17-2Z',skin,1.1);
 o+=flat(mai?'M-12 8Q0 21 16 7L16 23 4 28-13 22Z':'M-14 5L13 9 16 23 2 27-15 21Z',shade);
 o+=ink(mai?'M-25-40C-25-65 10-70 27-48Q33-39 29-24L30-17 35-11 29-8Q29 3 21 11L8 19Q-5 19-16 8-26-2-26-21Z':'M-25-43Q-21-67 8-65 29-64 31-44L30-28 30-19 36-12 28-8 25 3 17 12 7 20-6 13Q-24 1-25-22Z',skin,1.35);
 o+=flat(mai?'M-25-33Q-16-35-17-18L-20-5Q-15 10 8 19-5 19-16 8-26-2-26-21Z':'M-24-38L-16-24-18-10-9 7 7 20-6 13Q-24 1-25-22Z',shade);
 o+=ink('M-23-22Q-34-26-34-16-33-5-25-2L-22-10Z',skin,1)+mark('M-28-19Q-32-18-27-10',shade,.9);
 if(mai){
  o+='<g data-face-state="rest">';
  o+=flat('M5-24Q17-30 29-26L27-21Q17-17 7-21Z','#fff5df')+flat('M-15-24Q-8-28 0-24L-1-20Q-7-17-13-21Z','#fff1d9');
  o+='<ellipse cx="21" cy="-23" rx="3.45" ry="3.65" fill="#86502f"/><ellipse cx="21.5" cy="-23" rx="1.5" ry="3" fill="#322125"/><ellipse cx="-5" cy="-22" rx="2.7" ry="3.6" fill="#8e4a30"/><ellipse cx="-4.6" cy="-22" rx="1.2" ry="2.9" fill="#352225"/><circle cx="22.1" cy="-24.5" r=".8" fill="#fff8e6"/>';
  o+=mark('M4-24Q16-31 29-26L32-29M-16-24Q-8-29 0-24','#482126',1.65)+mark('M11-19Q20-17 27-22','#af6b59',.7);
  o+=flat('M4-33Q16-38 27-33L28-31Q17-34 6-30Z','#582329')+mark('M-16-32Q-9-34-1-31','#582329',1.6);
  o+=mark('M28-24L26-12 29-10M21-5L25-6','#be7d68',.9)+flat('M28-14L29-10 32-11Z','#ffe2bc');
  o+=mark('M10 5Q18 8 26 2','#934647',1.15)+mark('M14 10Q20 12 24 6','#ffe0ba',1.05);
  o+='</g>'+guestFaceStates(c);
  // Center-parted temple locks, lifted crown and the recognizable white ponytail tie.
  o+=ink('M-28-12Q-37-37-29-55-23-69-6-71Q12-75 28-61 37-49 33-26L28-14 27-33Q22-47 7-54L3-53Q-8-40-12-25L-19 1-23 18-23-8-28 4Z',hair,1.45);
  o+=ink('M5-54Q16-59 25-50 36-38 28-8L24 17 19 26 23 2 21-28Q17-45 5-54Z',hair,1.15);
  o+=flat('M-29-40Q-30-59-11-64L0-60Q-13-48-18-25L-22-11-23-32Z',hi)+flat('M10-54Q27-54 29-38L27-15 24-34Q22-47 10-54Z',hi);
  o+=mark('M-22-28Q-18-47-4-58M24-20Q26-39 16-50',deep,1.1);
  o+=ink('M-19-68Q-36-83-23-94 1-103 12-79L5-66Z',hair,1.3)+flat('M-20-83Q-14-95 0-88L5-79-7-77Z',hi);
  o+=ink('M-24-83Q-9-88 8-80L7-69Q-7-75-22-72Z','#fff0da',1.05)+mark('M-19-80Q-5-83 4-77','#cbbac0',1.15);
  o+='<circle cx="-27" cy="-4" r="2.2" fill="#f3d6a5" stroke="#8c594b" stroke-width=".7"/>';
 }else{
  o+='<g data-face-state="rest">';
  // Only the near eye is exposed. The far eye is never reintroduced by expression layers.
  o+=flat('M9-25L28-28 30-25 24-20 12-21Z','#f9eddf')+'<ellipse cx="23" cy="-24" rx="2.1" ry="2.5" fill="#80737c"/><ellipse cx="23.5" cy="-24" rx="1" ry="2.3" fill="#222132"/>';
  o+=mark('M7-26L28-29 31-27','#402330',1.6)+flat('M5-34L28-38 31-34 10-29Z','#6f1f32');
  o+=mark('M28-24L25-12 29-10M20-5L24-6','#a77570',1)+mark('M9 5L21 4 26 2','#77464f',1.05)+mark('M12 10L22 8','#f8d8bc',.85);
  o+='</g>'+guestFaceStates(c);
  o+=ink('M-27 1Q-40-15-37-44-34-68-15-76Q2-84 22-70 36-61 36-39L32-22 29-28 28-45 23-54Q9-40 4-21L-5 1-11 15-10-8-18 9-17-15-25 2-25-12Z',hair,1.5);
  o+=flat('M-30-43Q-25-65-10-71L6-69Q-9-45-15-17L-20-4-21-28Z',hi);
  o+=flat('M10-66Q-1-41-3-24L-9 5-10-8-18 9-17-15-25 2-24-11-13-28-3-52Z',deep);
  o+=flat('M14-67Q29-61 31-44L28-31 27-46 22-55 13-45 17-58Z',hi);
  o+=mark('M-30-33Q-26-56-13-67M-17-8Q-11-40 4-64M-6 3Q-1-24 15-53',mai?'#482326':'#771e35',1.2);
  o+='<circle cx="-28" cy="-7" r="1.6" fill="#e9d5d2"/>';
 }
 return o;
}
function guestTorsoArt(c){const mai=c.id==='mai',skin=mai?'#f2bd9e':'#e3b6a2',red='#d8293e',redShade='#a01f36',white='#fff0dc',whiteShade='#cbb9be',dark='#282634';let o='';
 if(mai){
  o+=ink('M-18-316Q-31-312-39-297-44-287-38-270L-27-245Q-20-224-24-208L-34-181Q-14-159 20-161L36-180 24-209Q20-227 28-248L39-278Q44-295 30-307L16-317 8-306-7-306Z',skin,1.4);
  o+=flat('M-31-295Q-39-282-29-259L-19-235-21-216-28-214-30-242-40-275Z','#c58570');
  o+=flat('M-12-309Q-3-302 8-307L11-301Q-2-297-10-303Z','#cf8f77');
  o+=ink('M-19-315L-10-310Q-12-291 0-266L8-244 1-222-14-211-25-218Q-19-238-29-253-43-270-38-286Z',red,1.2);
  o+=ink('M18-316L30-307Q42-291 35-273L22-247Q12-228 17-214L26-202Q2-191-22-203L-17-221 1-251Q10-274 18-316Z',red,1.3);
  o+=flat('M26-297Q35-282 25-265L12-243 5-220 11-204-2-202-7-219 5-251 19-278Z',redShade);
  o+=flat('M-28-285Q-31-270-16-258L-8-238-4-250-9-276-20-296Z','#ee4e4a');
  o+=flat('M-37-280Q-33-265-19-261L-10-250-7-240Q-19-244-27-254-36-264-37-280Z','#b3273c');
  o+=flat('M31-287Q35-273 21-262L12-246Q16-264 22-272L24-291Z','#f35451');
  o+=mark('M-12-236Q-8-225-1-221M8-230Q11-223 16-220','#b12b40',1.05);
  o+=ink('M-20-315L-13-314Q-14-288 2-260L5-251 0-241Q-9-257-17-275-25-294-20-315Z',white,1);
  o+=ink('M18-317L24-312Q16-275 4-251L0-241-4-248Q9-276 18-317Z',white,1);
  o+=ink('M-23-217Q0-211 24-220L29-199Q5-185-28-198Z',white,1.2)+flat('M-25-207Q1-199 27-210L29-199Q5-185-28-198Z',whiteShade)+mark('M-24-211Q1-203 26-214','#fff9e8',1.5);
  // The front garment is a hanging panel, not a shorts silhouette.
  o+=ink('M-21-197Q1-187 25-200L24-176Q10-164-9-170L-24-183Z',red,1.2);
  o+=mark('M-14-195Q4-188 18-195',redShade,1.1);
  // White rope crosses behind the bare shoulders; no artificial deltoid plates.
  o+=mark('M-26-310Q-37-318-43-302M25-312Q39-319 46-300',whiteShade,7)+mark('M-26-312Q-36-316-42-303M25-314Q38-317 44-302',white,4.7);
 }else{
  o+=ink('M-23-321Q-40-319-49-301L-48-266Q-37-245-32-222L-35-196 33-193 31-224Q43-245 49-271L46-303Q36-319 19-322L11-307-9-308Z',dark,1.65);
  o+=flat('M-36-307Q-45-291-36-268L-24-241-25-222-6-218-4-253-16-294Z','#373447');
  o+=flat('M29-308Q44-299 40-279L29-249 21-223 9-222 15-260 14-297Z','#181d2c');
  o+=ink('M-12-325L13-325 20-311 13-290 3-278-13-293-20-310Z',skin,1.15)+flat('M-12-318L11-308 17-312 11-294 3-285-11-297Z','#b78679');
  o+=ink('M-20-319L-10-319 3-290-4-273-17-290-26-310Z',white,1.15)+ink('M15-322L25-317 17-287 3-290Z',white,1.15);
  o+=ink('M-6-291L4-290 8-222 4-207-5-211Z',white,1.1);
  o+=ink('M-32-222Q0-209 32-223L34-180 28-164 8-167-4-159-31-170-35-188Z',white,1.25)+flat('M6-215L16-217 20-173 9-168 1-163Z',whiteShade);
  o+=mark('M-18-210Q-24-185-22-174M23-209L27-180','#b4a4b2',1);
  o+=ink('M-30-198Q-1-187 31-198L33-184Q0-173-32-184Z','#85273f',1.1)+mark('M-30-193Q0-182 31-193','#33202d',5);
  o+=ink('M-1-193L11-194 12-184 0-182Z','#e1d7d0',.75)+flat('M3-190L8-190 9-186 3-185Z','#2b2431');
  o+='<circle cx="-18" cy="-225" r="2.2" fill="#d6ced0"/><circle cx="25" cy="-226" r="2.2" fill="#d6ced0"/>';
 }
 return o;
}
function maiHairTailArt(){return ink('M-11-391Q-24-417-45-411C-72-399-52-356-61-325Q-72-300-69-270-63-247-44-239L-36-244Q-53-260-50-282C-48-304-33-319-34-345Q-35-373-17-380Z','#653021',1.45)+flat('M-37-402Q-58-391-43-356C-36-330-51-313-56-288Q-63-260-44-242-64-250-63-274C-67-304-49-327-53-347Q-66-386-43-404Z','#8e482a')+mark('M-46-389Q-52-372-43-350M-55-302Q-66-273-50-255','#af6839',1.25)+ink('M-26-394Q-17-399-9-390L-12-382-29-384Z','#fff2de',1);}
function maiGarmentTailArt(){return ink('M-20-197Q0-189 23-199L24-174Q12-143 15-113L-11-110Q-21-145-22-168Z','#d5293e',1.25)+flat('M12-194L22-197 23-174Q11-144 15-113L5-112Q3-153 12-174Z','#a51f36')+mark('M-19-190Q-18-153-11-113','#fff0db',3.7)+mark('M22-189Q13-149 14-115','#ffe8d4',2.8)+mark('M-9-188Q-1-171-3-153','#f04c49',1.35);}
function maiTrailingArt(){return mark('M-25-203C-58-225-96-198-86-158Q-81-138-96-108','#aa9ca6',13)+mark('M-26-205C-56-221-91-196-82-158Q-78-136-94-109','#fff0dc',9)+ink('M-22-205Q-46-226-66-207L-53-190-29-195Z','#fff0dc',1.1)+ink('M-19-203Q-17-227-40-231L-45-211-28-196Z','#fff0dc',1.1)+flat('M-44-219Q-43-204-27-198L-32-194-52-198Z','#c6b5bd')+ink('M-99-119Q-113-117-113-103-110-89-97-90-83-91-82-104-84-117-99-119Z','#d73244',1.15)+flat('M-107-110Q-111-97-96-93-86-95-85-103-89-95-99-99Z','#9d2039')+ink('M-99-92Q-110-83-114-63L-107-67-106-52Q-85-66-88-89Z','#fff0dc',1.1)+mark('M-99-85L-105-66M-95-85L-98-66','#bcabb5',1);}
function ioriShirtTailsArt(){return ink('M-25-211Q-32-180-31-147L-10-152-6-205Z','#f4eadb',1.2)+ink('M3-208L8-148Q21-153 31-147L26-212Z','#f4eadb',1.2)+flat('M-14-207L-21-150-10-152-6-205Z','#c7b7c2')+flat('M19-211L24-150 31-147 26-212Z','#bfb1bd');}
function guestFaceStates(c){const mai=c.id==='mai';let o='';for(const hurt of [false,true]){o+=`<g data-face-state="${hurt?'hurt':'power'}" opacity="0">`;if(hurt){o+=mark(mai?'M6-23Q17-18 29-23M-15-23Q-8-20-1-23':'M10-24L19-20 28-24',mai?'#67352d':'#402330',1.65)+mark(mai?'M7-31L26-28M-14-31L-1-28':'M7-31L28-33',mai?'#582329':'#6f1f32',1.4)}else if(mai){o+=flat('M5-24Q16-29 29-24L26-19Q15-16 7-20Z','#fff2dd')+'<ellipse cx="21" cy="-22" rx="3.4" ry="3.7" fill="#9b5632"/><ellipse cx="21.3" cy="-22" rx="1.6" ry="2.8" fill="#322125"/>'+flat('M-15-24L0-23-2-19-12-20Z','#fff2dd')+'<ellipse cx="-5" cy="-22" rx="2" ry="2.7" fill="#4e2a27"/>'+mark('M4-25L28-27M-16-26L-1-24','#482126',1.7)+flat('M4-33Q18-34 28-30L27-28 5-30Z','#582329')}else{o+=flat('M9-25L28-28 30-25 24-20 12-21Z','#f9eddf')+'<ellipse cx="23" cy="-24" rx="1.9" ry="2.5" fill="#655663"/>'+mark('M7-26L28-29 31-27','#402330',1.8)+flat('M5-34L28-38 31-34 10-29Z','#6f1f32')}
 o+=mark(mai?'M28-24L26-12 29-10M21-5L25-6':'M28-24L25-12 29-10M20-5L24-6',mai?'#be7d68':'#a77570',.95)+ink(mai?(hurt?'M10 5Q19 2 26 5L24 13Q17 16 12 11Z':'M9 5Q18 2 26 5L23 13Q16 16 11 11Z'):(hurt?'M10 7L25 4 25 13 14 16Z':'M7 6Q19 8 28 1L26 14 15 19 9 14Z'),'#542f38',.8)+flat(mai?'M12 5Q19 4 24 6L23 8 13 8Z':hurt?'M12 8L24 6 23 9 13 11Z':'M10 8Q20 9 26 4L24 8 15 12 11 10Z','#fff2df');o+='</g>';}return o;}
function fanGripArt(c){return ink('M-14-9L-2-11Q6-15 12-12L20-7 22-1 19 6Q15 12 7 12L-13 8Z','#f2bd9e',1.05)+flat('M-12 3L4 6Q12 8 18 4L18 9 9 12-13 8Z','#cb8b75')+ink('M5-9Q10-16 15-13L22-5Q24-1 20 2L15-1 11-7 9-3Z','#f7c9a9',.9)+mark('M2 0L8 3M-2 5L5 7','#b97867',.8)+ink('M-18-11L-7-12-6 9-18 10Z','#b62436',.95);}
function guestBackHeadArt(c){const mai=c.id==='mai',skin=mai?'#f2bd9e':'#e3b6a2',hair=mai?'#693123':'#aa273e',shadow=mai?'#3d2124':'#631a32',hi=mai?'#a85b37':'#e5525c';let o=ink('M-13 3L-16 27-25 34Q-1 43 27 32L17 23 16 0Z',skin,1.1)+flat('M-13 7L15 7 16 24 3 29-14 23Z',mai?'#cf8f79':'#b98680');o+=ink(mai?'M-27-44Q-28-68-7-71 18-77 30-56 36-43 30-23L27-6 14 14-4 17-19 7Q-29-8-27-44Z':'M-29-43Q-29-68-10-75 13-83 30-64 38-51 33-28L31-12 22 9 13 15 8 3-4 17-13 8-19-3-24 3Q-32-15-29-43Z',hair,1.4);o+=flat(mai?'M12-65Q30-52 26-29L20-10 11 11-1 14 4-1Q19-32 12-65Z':'M11-71Q32-57 28-33L22-11 13 15 8 3-4 17 2-2Q19-29 11-71Z',shadow)+flat(mai?'M-23-45Q-21-63-6-66L2-61Q-13-46-15-19L-22-7Z':'M-24-42Q-21-64-8-70L1-66Q-12-40-15-17L-23-8Z',hi);o+=mark(mai?'M-19-22Q-18-46-4-62M13-5Q24-24 25-41':'M-18-13Q-16-43-2-64M12 0Q26-22 29-42',shadow,1.05);
 if(mai)o+=ink('M-19-67Q-33-83-21-94-2-103 10-83L5-68Z',hair,1.2)+ink('M-24-83Q-8-88 8-80L7-69Q-7-75-22-72Z','#fff0da',1.05)+mark('M-18-80Q-5-82 3-77','#cbbac0',1.1);return o;}
function guestBackTorsoArt(c){const mai=c.id==='mai';let o='';if(mai){o+=ink('M-17-315Q-35-311-39-295-39-278-29-256L-22-228-24-209-34-181Q-15-162 18-162L35-181 23-210 23-233 32-264Q45-289 33-304L17-316 8-307-7-307Z','#f2bd9e',1.4)+flat('M-33-294Q-34-270-23-251L-16-228-20-212-25-211-25-236-34-261Z','#cd8c75')+ink('M-19-315L-10-311-17-280-22-253-19-220-27-209-29-239Q-37-270-36-290Z','#d8293e',1.1)+ink('M17-315L27-309Q31-284 23-260L16-239 16-218 25-209 27-227 35-266 39-287 31-304Z','#d8293e',1.1)+mark('M-26-309Q-16-297-6-293M25-309Q15-295 5-293','#fff0dc',5.3)+mark('M-34-306Q0-321 37-303','#c1afb7',8)+mark('M-34-308Q0-322 37-305','#fff0dc',5.2)+ink('M-23-217Q0-209 24-220L29-199Q5-185-28-198Z','#fff0dc',1.2)+flat('M-25-207Q0-199 27-210L29-199Q5-185-28-198Z','#cbb9be')+ink('M-25-198Q0-190 25-201L28-179 15-168-16-166-31-181Z','#d8293e',1.15);}else{o+=ink('M-22-321Q-40-319-49-301L-47-268Q-37-245-32-221L-33-197 32-195 31-222Q41-246 48-272L46-303Q36-319 20-322L11-313-9-313Z','#282634',1.55)+flat('M-33-309Q-43-292-34-266L-22-239-24-221-7-217-4-256-12-300Z','#383647')+flat('M30-309Q44-298 40-279L29-247 20-219 8-219 13-257 14-303Z','#171b29')+ink('M-18-324Q0-313 20-324L28-313Q0-299-25-312Z','#f4eadb',1.1)+flat('M10-297C-9-304-24-291-23-275-22-256-7-247 10-252L21-261C7-255-6-263-7-277-7-286-1-292 10-297Z','#f5ecd7')+ink('M-31-221Q0-209 32-223L35-180 29-165 8-168-4-160-31-171-35-188Z','#f4eadb',1.2)+flat('M7-215L17-217 21-172 9-168 1-164Z','#c5b6bf');}return o;}

const BASE={lean:0,bob:0,head:0,spin:0,open:0,ffoot:0,rfoot:0,floor:0,rootShift:0,depth:1,turn:0,fan:0,fanAngle:0,reachScale:1,reachFoot:0,re:[-56,-248],rw:[-8,-286],fe:[74,-255],fw:[89,-298],rk:[-66,-105],ra:[-86,-16],fk:[68,-106],fa:[103,-16]};
const POSES={
 jabWind:{lean:-3,fe:[50,-263],fw:[43,-288]},jab:{lean:5,fe:[111,-285],fw:[178,-289],re:[-59,-246],rw:[-3,-287]},
 crossWind:{lean:-9,re:[-79,-271],rw:[-42,-279],fe:[60,-249],fw:[73,-298]},cross:{lean:13,head:-7,re:[42,-270],rw:[119,-280],fe:[112,-282],fw:[189,-285],rk:[-77,-103],ra:[-103,-16]},
 hookWind:{lean:-11,bob:8,fe:[10,-240],fw:[1,-220],re:[-57,-252],rw:[-5,-290]},hook:{lean:15,bob:1,head:-9,fe:[126,-251],fw:[165,-305],re:[-26,-247],rw:[28,-280],fa:[121,-16]},
 kickWind:{lean:-7,bob:1,fe:[69,-251],fw:[66,-300],fk:[95,-187],fa:[50,-133],ffoot:15},
 lowkick:{lean:-12,head:8,fe:[64,-245],fw:[89,-286],fk:[133,-126],fa:[223,-75],ffoot:-26,re:[-83,-258],rw:[-58,-298]},
 sidekick:{lean:-21,head:14,bob:8,fe:[53,-251],fw:[78,-291],re:[-76,-264],rw:[-83,-304],fk:[142,-210],fa:[231,-240],ffoot:82,rk:[-48,-91],ra:[-64,-16]},
 roundkick:{lean:-28,head:16,bob:7,fe:[43,-245],fw:[59,-279],re:[-76,-267],rw:[-97,-303],fk:[130,-245],fa:[198,-311],ffoot:60,rk:[-61,-109],ra:[-82,-16]},
 waveWind:{lean:-10,head:3,open:1,fe:[15,-254],fw:[9,-233],re:[-54,-243],rw:[-5,-234],rk:[-70,-105],ra:[-99,-16],fk:[89,-99],fa:[126,-16]},
 wave:{lean:14,head:-8,open:1,fe:[106,-274],fw:[138,-261],re:[44,-264],rw:[104,-256],rk:[-83,-107],ra:[-123,-16],fk:[76,-98],fa:[119,-16]},
 upperWind:{lean:9,bob:29,fe:[60,-210],fw:[57,-231],re:[-47,-246],rw:[8,-278],rk:[-65,-66],ra:[-97,-16],fk:[93,-69],fa:[123,-16]},
 upper:{lean:-8,bob:-3,head:-12,fe:[77,-345],fw:[70,-411],re:[-60,-250],rw:[-11,-289],fk:[90,-188],fa:[46,-123],rk:[-61,-113],ra:[-98,-24],ffoot:-35},
 risingkick:{lean:-27,head:15,bob:12,fe:[60,-235],fw:[112,-264],re:[-95,-250],rw:[-100,-287],fk:[88,-290],fa:[122,-384],rk:[-61,-148],ra:[-100,-86],ffoot:78},
 spinKick:{lean:-19,bob:18,head:9,fe:[55,-247],fw:[68,-289],re:[-86,-273],rw:[-103,-305],fk:[141,-194],fa:[233,-185],rk:[-92,-158],ra:[-179,-187],ffoot:88,rfoot:-50},
 drillWind:{lean:-23,bob:31,fe:[56,-241],fw:[99,-278],re:[-64,-255],rw:[-62,-302],fk:[106,-183],fa:[66,-103]},
 drill:{lean:-73,bob:60,head:25,fe:[48,-250],fw:[69,-304],re:[-41,-237],rw:[-17,-290],fk:[126,-136],fa:[230,-111],rk:[101,-160],ra:[207,-132],ffoot:80,rfoot:90},
 dive:{lean:17,bob:9,head:-15,fe:[40,-249],fw:[53,-299],re:[-87,-288],rw:[-111,-322],fk:[111,-93],fa:[195,-17],rk:[-65,-153],ra:[-26,-105],ffoot:0},
 sweepWind:{lean:-10,bob:48,head:2,fe:[55,-257],fw:[54,-291],fk:[84,-60],fa:[115,-16],rk:[-51,-70],ra:[-94,-16]},
 sweep:{lean:-17,bob:61,head:14,fe:[55,-233],fw:[93,-260],re:[-87,-241],rw:[-105,-276],fk:[131,-48],fa:[237,-14],rk:[-74,-57],ra:[-112,-16],ffoot:75},
 axeWind:{lean:-6,head:5,fe:[68,-244],fw:[93,-283],fk:[55,-276],fa:[39,-377],ffoot:60},
 axe:{lean:19,bob:12,head:-12,fe:[63,-258],fw:[87,-298],fk:[108,-135],fa:[201,-83],ffoot:10},
 elbow:{lean:17,bob:11,head:-8,fe:[129,-267],fw:[90,-290],re:[-40,-239],rw:[24,-275],rk:[-89,-92],ra:[-120,-16],fk:[83,-102],fa:[124,-16]},
 knee:{lean:-4,head:1,fe:[67,-269],fw:[51,-310],re:[-55,-270],rw:[-6,-311],fk:[122,-229],fa:[82,-162],rk:[-55,-94],ra:[-81,-16],ffoot:10},
 guard:{lean:-8,bob:6,head:6,re:[-3,-241],rw:[34,-317],fe:[70,-254],fw:[68,-321],fk:[78,-95],fa:[112,-16]},
 parry:{lean:-3,head:2,open:1,re:[-53,-247],rw:[-5,-291],fe:[86,-263],fw:[105,-324],fk:[75,-101],fa:[114,-16]},
 hit:{lean:-22,bob:7,head:-14,re:[-80,-262],rw:[-129,-240],fe:[48,-249],fw:[101,-277],rk:[-76,-102],ra:[-113,-16],fk:[47,-103],fa:[83,-16]},
 gutHit:{lean:20,bob:23,head:21,re:[-31,-254],rw:[15,-231],fe:[56,-231],fw:[29,-213],rk:[-77,-89],ra:[-101,-16],fk:[76,-87],fa:[116,-16]},
 rush:{lean:23,bob:24,head:-17,open:1,re:[-100,-285],rw:[-160,-293],fe:[40,-247],fw:[89,-281],rk:[-100,-109],ra:[-164,-20],fk:[106,-100],fa:[139,-16]},
 victory:{lean:0,head:-8,re:[-57,-227],rw:[-20,-197],fe:[61,-354],fw:[52,-420],rk:[-42,-102],ra:[-57,-16],fk:[53,-104],fa:[77,-16]},
 ko:{lean:0,bob:0,head:11,spin:-88,re:[24,-267],rw:[-2,-196],fe:[78,-221],fw:[71,-196],rk:[75,-104],ra:[-25,-17],fk:[85,-92],fa:[30,-22]},
 toss:{lean:-26,bob:3,open:1,re:[-22,-297],rw:[6,-353],fe:[73,-320],fw:[59,-376],fk:[67,-106],fa:[105,-16]},
 flip:{lean:0,bob:25,spin:-170,head:2,fe:[76,-239],fw:[97,-296],re:[-81,-273],rw:[-112,-307],fk:[79,-147],fa:[143,-218],rk:[-72,-152],ra:[-126,-238]},
 bird:{lean:0,spin:180,bob:55,open:1,fe:[69,-309],fw:[102,-374],re:[-61,-321],rw:[-96,-378],fk:[115,-175],fa:[222,-188],rk:[-115,-175],ra:[-222,-188],ffoot:90,rfoot:-90}
};
// Authored silhouettes cover support, contact, follow-through and the recovery pose.
// The joint rig interpolates those silhouettes; it does not invent the action.
Object.assign(POSES,{
 step:{lean:4,bob:7,head:-3,re:[-75,-246],rw:[-28,-281],fe:[69,-259],fw:[93,-300],rk:[-67,-104],ra:[-92,-16],fk:[80,-110],fa:[110,-16]},
 punchRecover:{lean:6,bob:4,head:-3,fe:[101,-261],fw:[111,-281],re:[-43,-245],rw:[16,-274]},
 kickRecover:{lean:-9,bob:2,head:8,fk:[98,-188],fa:[72,-122],ffoot:13,fe:[59,-252],fw:[81,-299]},
 crouchGuard:{lean:1,bob:61,head:6,fe:[79,-242],fw:[79,-298],re:[-22,-238],rw:[22,-295],rk:[-74,-69],ra:[-108,-16],fk:[91,-72],fa:[125,-16]},
 jumpStart:{lean:5,bob:26,head:-3,re:[-68,-253],rw:[-4,-276],fe:[69,-236],fw:[88,-281],rk:[-65,-80],ra:[-101,-16],fk:[93,-80],fa:[124,-16]},
 jumpRise:{lean:-4,bob:1,head:-3,fe:[71,-275],fw:[79,-325],re:[-57,-266],rw:[-4,-305],rk:[-54,-140],ra:[-49,-72],fk:[83,-191],fa:[73,-119],ffoot:-18},
 jumpFall:{lean:10,bob:6,head:-7,fe:[78,-260],fw:[99,-308],re:[-65,-257],rw:[-17,-296],rk:[-70,-138],ra:[-100,-71],fk:[97,-138],fa:[114,-69]},
 grabbed:{lean:18,bob:17,head:14,open:1,re:[-12,-246],rw:[38,-254],fe:[72,-236],fw:[106,-256],rk:[-63,-97],ra:[-103,-16],fk:[56,-103],fa:[76,-16]},
 grabReach:{lean:10,bob:16,head:-7,open:1,re:[-8,-253],rw:[32,-275],fe:[60,-253],fw:[64,-302],rk:[-78,-93],ra:[-120,-16],fk:[88,-79],fa:[122,-16]},
 grabLoad:{lean:8,bob:25,head:-10,open:1,re:[-12,-249],rw:[43,-277],fe:[82,-251],fw:[79,-283],rk:[-76,-76],ra:[-117,-16],fk:[83,-68],fa:[121,-16]},
 grabLift:{lean:-15,bob:0,head:-8,open:1,re:[-28,-296],rw:[18,-345],fe:[70,-321],fw:[85,-374],rk:[-65,-102],ra:[-94,-16],fk:[70,-113],fa:[109,-16],turn:.35},
 grabTurn:{lean:18,bob:13,head:-9,open:1,re:[-41,-295],rw:[-11,-344],fe:[89,-263],fw:[144,-272],rk:[-35,-104],ra:[-62,-16],fk:[93,-94],fa:[123,-16],turn:.83,depth:.85},
 grabSlam:{lean:37,bob:30,head:-15,open:1,re:[-8,-265],rw:[46,-229],fe:[118,-245],fw:[161,-203],rk:[-73,-81],ra:[-116,-16],fk:[86,-70],fa:[132,-16],turn:.3},
 airborneHit:{lean:-14,bob:2,head:-18,open:1,spin:-12,re:[-82,-282],rw:[-124,-326],fe:[66,-254],fw:[115,-247],rk:[-55,-145],ra:[-115,-103],fk:[88,-166],fa:[106,-87]},
 tumbleCurl:{lean:13,bob:6,head:16,open:1,spin:-55,re:[-31,-258],rw:[22,-250],fe:[64,-250],fw:[61,-215],rk:[-41,-155],ra:[-91,-132],fk:[88,-168],fa:[115,-116]},
 tumbleFall:{lean:0,bob:0,head:7,open:1,spin:-86,re:[15,-268],rw:[-7,-236],fe:[57,-249],fw:[30,-214],rk:[42,-123],ra:[-21,-35],fk:[80,-124],fa:[95,-41],ffoot:15,rfoot:10},
 landed:{lean:0,bob:0,head:10,spin:-88,floor:119,open:1,re:[12,-266],rw:[-4,-224],fe:[73,-234],fw:[40,-205],rk:[48,-110],ra:[-8,-25],fk:[84,-101],fa:[93,-29],ffoot:10,rfoot:2},
 groundBrace:{lean:24,bob:27,head:16,spin:-52,floor:84,open:1,re:[-43,-236],rw:[-95,-194],fe:[91,-230],fw:[124,-170],rk:[-15,-123],ra:[-60,-27],fk:[78,-127],fa:[89,-30],turn:.12},
 riseKnee:{lean:21,bob:59,head:-8,open:1,re:[-67,-230],rw:[-93,-188],fe:[69,-245],fw:[103,-222],rk:[-67,-63],ra:[-101,-16],fk:[87,-83],fa:[116,-16]},
 fanLoad:{lean:-11,bob:5,head:4,open:1,fan:1,fe:[45,-250],fw:[39,-308],re:[-65,-235],rw:[-28,-208],fk:[67,-111],fa:[90,-16],rk:[-69,-105],ra:[-99,-16],turn:.22},
 fanCast:{lean:17,bob:3,head:-9,open:1,fan:1,fe:[119,-284],fw:[177,-297],re:[-67,-275],rw:[-109,-294],fk:[90,-102],fa:[136,-16],rk:[-85,-104],ra:[-122,-16],turn:.08},
 fanSweep:{lean:14,bob:10,head:-7,open:1,fan:1,fe:[129,-260],fw:[166,-225],re:[-73,-287],rw:[-90,-336],fk:[93,-97],fa:[131,-16],rk:[-74,-106],ra:[-103,-16],turn:.65},
 fanRise:{lean:-13,bob:-4,head:-12,open:1,fan:1,fe:[60,-349],fw:[90,-405],re:[-76,-260],rw:[-122,-234],fk:[93,-181],fa:[85,-110],rk:[-67,-133],ra:[-94,-62],turn:.26},
 fanDive:{lean:24,bob:9,head:-17,spin:21,open:0,fan:0,fe:[118,-266],fw:[175,-273],re:[-75,-264],rw:[-111,-301],fk:[56,-136],fa:[12,-72],rk:[-87,-155],ra:[-132,-91],ffoot:-18,turn:.28},
 fanRush:{lean:36,bob:29,head:-22,open:1,fan:0,fe:[110,-264],fw:[102,-317],re:[-92,-260],rw:[-148,-251],fk:[110,-117],fa:[168,-70],rk:[-89,-121],ra:[-150,-61],turn:.16},
 clawLoad:{lean:15,bob:17,head:-4,open:1,fe:[56,-228],fw:[13,-243],re:[-62,-277],rw:[-49,-310],fk:[83,-93],fa:[121,-16],rk:[-72,-93],ra:[-106,-16],turn:.2},
 clawSlash:{lean:23,bob:8,head:-13,open:1,fe:[117,-296],fw:[173,-323],re:[-77,-250],rw:[-126,-219],fk:[84,-100],fa:[126,-16],rk:[-89,-104],ra:[-121,-16],turn:.12},
 clawRake:{lean:29,bob:24,head:-13,open:1,fe:[123,-246],fw:[164,-207],re:[-84,-270],rw:[-119,-307],fk:[94,-84],fa:[138,-16],rk:[-84,-93],ra:[-122,-16],turn:.35},
 clawRise:{lean:-11,bob:-3,head:-17,open:1,fe:[75,-340],fw:[123,-386],re:[-48,-251],rw:[-91,-235],fk:[79,-177],fa:[50,-123],rk:[-61,-124],ra:[-83,-57],turn:.5},
 flameGround:{lean:30,bob:26,head:-14,open:1,fe:[113,-239],fw:[146,-204],re:[-71,-283],rw:[-102,-322],fk:[83,-79],fa:[124,-16],rk:[-77,-91],ra:[-113,-16]},
 clawRush:{lean:34,bob:25,head:-22,open:1,fe:[104,-264],fw:[145,-303],re:[-98,-254],rw:[-155,-251],fk:[90,-107],fa:[128,-16],rk:[-95,-110],ra:[-164,-16]}
});
POSES.punch=POSES.cross;POSES.punchWind=POSES.crossWind;POSES.kick=POSES.sidekick;POSES.driveWind=POSES.hookWind;POSES.drive=POSES.elbow;
function poseCopy(a){let p={};for(let k in a)p[k]=Array.isArray(a[k])?[...a[k]]:a[k];return p}
function blendPose(a,b,t){let p=poseCopy(a);t=clamp(t,0,1);for(let k in b){const av=a[k]??(Array.isArray(b[k])?[0,0]:0);p[k]=Array.isArray(b[k])?[mix(av[0],b[k][0],t),mix(av[1],b[k][1],t)]:mix(av,b[k],t)}return p}
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},outCubic=t=>1-(1-clamp(t,0,1))**3,inCubic=t=>clamp(t,0,1)**3;
function fullPose(p,base=BASE){return blendPose(base,typeof p==='string'?POSES[p]||BASE:p,1)}
function poseFrames(frames,t){if(t<=frames[0][0])return poseCopy(frames[0][1]);for(let i=1;i<frames.length;i++)if(t<=frames[i][0]){const a=frames[i-1],b=frames[i],q=(t-a[0])/Math.max(.001,b[0]-a[0]);return blendPose(a[1],b[1],b[2]==='snap'?outCubic(q):b[2]==='in'?inCubic(q):ease(q))}return poseCopy(frames.at(-1)[1])}
function neutralPose(f){let p=poseCopy(BASE),t=gameTime;p.bob=Math.sin(t*3.8+(f.index||0)*.9)*1.5;p.head=Math.sin(t*2.1)*.6;switch(f.ch.id){case'ryu':p.lean=-2;p.fw=[90,-299];p.ra=[-95,-16];break;case'ken':p.lean=-3;p.fw=[101,-289];p.rw=[-17,-274];p.fe=[73,-251];p.ra=[-106,-16];break;case'chun':p.lean=-3;p.fw=[126,-279];p.fe=[64,-246];p.rw=[-4,-282];p.open=1;p.turn=.12;break;case'cammy':p.lean=6;p.bob+=5;p.fw=[70,-312];p.fe=[62,-260];p.rw=[-9,-301];p.fa=[111,-16];p.ra=[-84,-16];break;case'luke':p.lean=3;p.fw=[98,-308];p.rw=[2,-289];p.fe=[78,-257];p.re=[-63,-244];p.fa=[112,-16];break;case'juri':p.lean=-5;p.fk=[96,-161];p.fa=[67,-91];p.fe=[92,-251];p.fw=[71,-212];p.re=[-76,-255];p.rw=[-41,-225];p.open=1;p.head=6;break;case'mai':{const breath=Math.sin(t*2.7);p.lean=-4+breath*.45;p.bob=1+breath*.4;p.head=2;p.fw=[118+breath*1.2,-300+breath*1.4];p.fe=[78,-260];p.rw=[-3,-290];p.re=[-62,-260];p.open=1;p.fan=.76+breath*.07;p.fanAngle=breath*3;p.turn=.19;p.ra=[-113,-16];p.rk=[-79,-113];p.fa=[86,-17];p.fk=[89,-105];p.ffoot=-3;break}case'iori':{const breath=Math.sin(t*2.4);p.lean=16+breath*.5;p.bob=10+breath*.6;p.head=-9;p.open=1;p.re=[-74,-248];p.rw=[-64,-185+breath*1.1];p.fe=[96,-246];p.fw=[125+breath*1.8,-282];p.ra=[-117,-16];p.rk=[-80,-105];p.fa=[113,-16];p.fk=[85,-89];p.turn=.16;break}}return p}
function clipFor(f,m){const id=f.ch.id,b=m.base,k=m.kind||'';
 const anim={maiFan:['fanLoad','fanCast','fanSweep'],maiRise:['fanLoad','fanRise','fanSweep'],maiSpin:['fanLoad','fanSweep','fanRise'],maiRush:['fanLoad','fanRush','fanSweep'],maiDive:['fanLoad','fanDive','fanSweep'],ioriFlame:['clawLoad','flameGround','clawRake'],ioriRise:['clawLoad','clawRise','clawRake'],ioriRekka:['clawLoad','clawSlash','clawRake'],ioriRush:['clawLoad','clawRush','clawRake'],ioriClaw:['clawLoad','clawRake','clawSlash']};
 if(anim[m.animation])return anim[m.animation];if(m.category!=='normal'&&m.animation==='maiFanStrike')return anim.maiFan;if(m.category!=='normal'&&m.animation==='ioriClawStrike')return anim.ioriRekka;
 const own={hadoken:['waveWind','wave','wave'],hasho:['waveWind','wave','hook'],shoryu:['upperWind','upper','upper'],tatsu:['kickWind','spinKick','spinKick'],blade:['kickWind','sidekick','sidekick'],jinrai:['kickWind','lowkick','roundkick'],dragonlash:['axeWind','roundkick','axe'],kikoken:['waveWind','wave','wave'],legs:['kickWind','sidekick','roundkick'],bird:['kickWind','bird','bird'],tensho:['kickWind','risingkick','risingkick'],hazan:['axeWind','flip','axe'],arrow:['drillWind','drill','drill'],spike:['kickWind','risingkick','risingkick'],knuckle:['crossWind','hook','elbow'],hooligan:['kickWind','flip','dive'],strike:['kickWind','dive','dive'],sand:['crossWind','cross','jab'],rising:['upperWind','upper','upper'],flash:['hookWind','cross','hook'],avenger:['rush','elbow','knee'],airflash:['hookWind','dive','hook'],fuha:['kickWind','roundkick','risingkick'],saiha:['kickWind','lowkick','sweep'],anken:['axeWind','axe','sidekick'],gooh:['kickWind','sidekick','roundkick'],tensen:['kickWind','risingkick','spinKick'],kachosen:anim.maiFan,ryuenbu:anim.maiRise,hissatsu:anim.maiSpin,shinobibachi:anim.maiRush,musabi:anim.maiDive,yamibarai:anim.ioriFlame,oniYaki:anim.ioriRise,aoihana:anim.ioriRekka,kototsuki:anim.ioriRush,kuzukaze:anim.ioriClaw};
 if(b&&own[b])return own[b];
 if(m.category==='normal'){const s=clamp((m.level||1)-1,0,2);if(m.normalState==='c')return m.pose==='kick'?['sweepWind','sweep','sweepWind']:['upperWind',s===2?'upper':s===1?'cross':'jab','guard'];if(m.normalState==='a')return m.pose==='kick'?['kickWind',s===2?'roundkick':'sidekick','kickRecover']:['jabWind',s===2?'hook':'jab','guard'];if(id==='iori'&&m.pose!=='kick')return['clawLoad',s===2?'clawRake':'clawSlash','clawLoad'];if(id==='mai'&&m.pose!=='kick')return['fanLoad',s===2?'fanSweep':'fanCast','fanLoad'];return m.pose==='kick'?['kickWind',['lowkick','sidekick','roundkick'][s],'kickRecover']:[['jabWind','crossWind','hookWind'][s],['jab','cross','hook'][s],'punchRecover'];}
 if(m.super){if(k==='superprojectile')return id==='mai'?anim.maiFan:id==='iori'?anim.ioriFlame:['waveWind','wave','wave'];if(k==='install')return id==='iori'?anim.ioriClaw:['parry','roundkick','parry'];if(m.super===3)return({ryu:['upperWind','hook','upper'],ken:['crossWind','roundkick','upper'],chun:['kickWind','sidekick','risingkick'],cammy:['drillWind','drill','risingkick'],luke:['hookWind','cross','upper'],juri:['axeWind','roundkick','axe'],mai:['fanLoad','fanSweep','fanRise'],iori:['clawLoad','clawRake','clawRise']})[id]||['crossWind','cross','upper'];return id==='luke'?['hookWind','hook','upper']:id==='ryu'?['waveWind','wave','hook']:id==='mai'?anim.maiSpin:id==='iori'?anim.ioriRekka:['kickWind','roundkick','spinKick'];}
 if(k==='throw'||k==='airthrow')return['guard','grabReach','grabLoad'];if(k==='impact'||k==='reversal')return['hookWind',id==='chun'||id==='juri'?'sidekick':id==='iori'?'clawRake':'elbow','punchRecover'];if(k==='stance')return['guard','parry','parry'];if(k==='low')return['sweepWind','sweep','sweepWind'];if(k==='dive')return['kickWind','dive','kickRecover'];if(k==='upper')return['upperWind',f.ch.female?'risingkick':'upper','kickRecover'];if(k==='overhead')return['axeWind',m.pose==='punch'?'hook':'axe','guard'];if(k.includes('projectile')||k==='burst'&&m.pose==='wave')return['waveWind','wave','wave'];if(k==='spin')return['kickWind','spinKick','roundkick'];if(k==='leap')return['axeWind','roundkick','axe'];if(k==='rush'||k==='run')return['rush',m.pose==='kick'?'sidekick':'elbow','guard'];if(k==='barrage')return m.pose==='kick'?['kickWind','sidekick','roundkick']:['crossWind','cross','hook'];return m.pose==='kick'?['kickWind','sidekick','kickRecover']:['crossWind','cross','punchRecover'];}
function characterActionPose(f,m,p,phase){const id=f.ch.id,kick=m.pose==='kick',normal=m.category==='normal';
 // Character mechanics change the silhouette, weight transfer and hand shape.
 if(id==='ryu'){p.lean*=.84;p.turn*=.7;if(!kick&&phase>0){p.rw[0]+=9;p.head-=2}}
 if(id==='ken'){p.lean*=1.12;if(kick){p.fw[0]-=8;p.rw[0]-=10}p.turn=Math.max(p.turn,kick?.16:.11)}
 if(id==='chun'){p.open=1;p.depth=.97;p.turn=Math.max(p.turn,kick?.17:.08);if(!kick&&normal){p.fw[1]+=11;p.fe[1]+=6;p.rw=[-10,-272]}if(kick){p.rw=[-35,-277];p.re=[-70,-257]}}
 if(id==='cammy'){if(normal&&!kick){p.lean+=5;p.fw[0]-=10;p.fe[0]-=6;p.rw=[-3,-303]}p.depth=.93;p.turn=Math.max(p.turn,.12)}
 if(id==='luke'){if(!kick){p.fw[0]+=7;p.rw[0]-=7;p.lean+=3}p.bob+=2;p.turn=Math.max(p.turn,.1)}
 if(id==='juri'){p.open=1;if(kick){p.head+=6;p.fw=[49,-226];p.fe=[77,-251];p.rw=[-78,-295]}p.turn=Math.max(p.turn,kick?.23:.16)}
 if(id==='mai'){p.open=1;p.fan=m.base==='kachosen'&&phase>.4?0:1;p.turn=Math.max(p.turn,.12);if(kick){p.fw=[77,-323];p.fe=[70,-267];p.rw=[-103,-253];p.re=[-71,-239];p.head+=4}}
 if(id==='iori'){p.open=1;p.head-=4;if(kick){p.lean+=9;p.fw=[100,-232];p.fe=[67,-248];p.rw=[-51,-246]}else if(normal)p.bob+=3}
 return p;
}
function movePose(f,m,t){const base=neutralPose(f),clip=clipFor(f,m),s=Math.max(1,m.startup||1),a=Math.max(1,m.active||1),r=Math.max(1,m.recovery||1),end=s+a;
 let wind=characterActionPose(f,m,fullPose(clip[0],base),0),strike=characterActionPose(f,m,fullPose(clip[1],base),1),follow=characterActionPose(f,m,fullPose(clip[2],base),2),p;
 if(t<s){p=poseFrames([[0,base],[s*.63,wind],[s,strike,'snap']],t);return p}
 if(t<end){let q=(t-s)/a,beat=q*Math.max(1,m.hits||1),cycle=Math.floor(beat),u=beat%1;
  p=poseCopy(strike);
  if(m.hits>1&&!m.kind.includes('projectile')){
   const alternate=cycle%2?follow:strike,reset=blendPose(wind,alternate,.24);
   p=poseFrames([[0,alternate],[.22,alternate],[.7,reset],[1,cycle%2?strike:follow,'snap']],u);
  }else if(!m.kind.includes('projectile'))p=blendPose(strike,follow,ease(q)*.36);
  if(['tatsu','bird'].includes(m.base)){const ph=q*Math.PI*2*(m.hits||3),c=Math.cos(ph),sn=Math.sin(ph);p=fullPose(m.base==='bird'?'bird':'spinKick',base);p.fa=[211*c,-187-sn*23];p.ra=[-202*c,-182+sn*23];p.fk=[118*c,-182-sn*9];p.rk=[-118*c,-177+sn*9];p.turn=(1-c)*.5;p.depth=.74+Math.abs(c)*.26;p.spin=m.base==='bird'?180:sn*5;p.fw=[66*c,-297];p.rw=[-86*c,-290];p.fe=[56*c,-255];p.re=[-76*c,-261];}
  if(m.base==='legs'){let sn=Math.sin(beat*Math.PI*2);p.fk=[126,-183+sn*28];p.fa=[218,-193+sn*67];p.turn=.17;p.fw=[110,-282];p.rw=[-6,-274];}
  if(['hooligan','hazan'].includes(m.base)){p=poseFrames([[0,fullPose('kickWind',base)],[.3,fullPose('flip',base)],[.7,fullPose('flip',base)],[1,fullPose('dive',base)]],q);p.spin=-360*ease(q);p.turn=Math.sin(q*Math.PI)**2*.25;}
  if(m.base==='arrow'){p=fullPose('drill',base);p.turn=(1-Math.cos(q*Math.PI*4))*.5;p.depth=.8+Math.abs(Math.cos(q*Math.PI*4))*.2;p.spin=Math.sin(q*Math.PI*4)*5;p.fw[1]+=Math.sin(q*Math.PI*4)*12;}
  if(m.animation==='maiSpin'||m.base==='hissatsu'){const yaw=q*Math.PI*2;p=blendPose(strike,follow,(1-Math.cos(yaw))*.5);p.turn=(1-Math.cos(yaw))*.5;p.depth=.8+Math.abs(Math.cos(yaw))*.2;p.fw=[145*Math.cos(yaw),-285-45*Math.sin(yaw)];p.fe=[93*Math.cos(yaw),-258];p.fan=1;p.open=1;}
  if(m.animation==='maiRise'||m.base==='ryuenbu'){p=blendPose(strike,follow,ease(q)*.32);p.turn=Math.sin(q*Math.PI)*.8;p.fan=1;}
  if(m.animation==='maiRush'||m.base==='shinobibachi'){p=fullPose('fanRush',base);p.turn=.2+Math.sin(q*Math.PI)*.32;p.fan=0;p.rk[1]+=Math.sin(q*Math.PI*4)*10;}
  if(m.animation==='ioriRekka'||m.base==='aoihana'){p=poseFrames([[0,strike],[.27,strike],[.57,follow],[.77,follow],[1,wind]],u);p.turn=.15+Math.sin(u*Math.PI)*.34;p.open=1;}
  if(m.animation==='ioriRise'||m.base==='oniYaki'){p=blendPose(strike,follow,ease(q)*.23);p.turn=Math.sin(q*Math.PI)*.8;p.depth=1-.12*Math.sin(q*Math.PI);p.open=1;}
  if(m.super&&m.kind==='superrush'){
   const finish=q>.8,flurry=({ryu:['cross','hook','upper'],ken:['cross','roundkick','upper'],chun:['lowkick','sidekick','risingkick'],cammy:['elbow','sidekick','risingkick'],luke:['jab','cross','upper'],juri:['lowkick','roundkick','axe'],mai:['fanCast','fanSweep','fanRise'],iori:['clawSlash','clawRake','clawRise']})[f.ch.id]||['jab','cross','upper'];
   const hit=characterActionPose(f,m,fullPose(flurry[finish?2:cycle%2],base),1),load=characterActionPose(f,m,fullPose(finish?clip[0]:flurry[(cycle+1)%2],base),0);
   p=poseFrames([[0,hit],[.3,hit],[.75,blendPose(load,wind,.55)],[1,hit,'snap']],u);
   if(finish){p.turn=Math.max(p.turn,Math.sin(u*Math.PI)*.4);p.bob-=Math.sin(u*Math.PI)*8}
  }
  return p;
 }
 const q=(t-end)/r,activeEnd=movePose(f,{...m,recovery:1},end-.001),recoil=blendPose(follow,base,.2);recoil.bob+=m.level>=3?6:2;
 // Fold the striking limb before lowering it. A straight kick never slides to idle.
 const folded=m.pose==='kick'?characterActionPose(f,m,fullPose('kickRecover',base),2):blendPose(recoil,fullPose(f.ch.id==='iori'?'clawLoad':f.ch.id==='mai'?'fanLoad':'punchRecover',base),.65);
 return poseFrames([[0,activeEnd],[.25,folded],[.72,blendPose(folded,base,.83)],[1,base]],q);
}
function throwPoseBase(f){const action=f.throwAction,owner=action?.owner===f,t=action?.t||0,release=action?.release||26,base=neutralPose(f),style=action?.owner?.ch.throwStyle||'shoulder';
 if(!owner){const caught=fullPose('grabbed',base),lift=fullPose('tumbleCurl',base),over=fullPose('tumbleFall',base);caught.rootShift=0;lift.spin=-36;lift.head=14;lift.turn=.42;over.spin=style==='fan-vault'?-150:style==='claw-slam'?-86:-118;over.turn=.8;over.floor=0;
  if(style==='claw-slam'){lift.spin=-24;lift.fw=[57,-218];lift.rw=[-67,-228];lift.fa=[85,-102];over.lean=-15;over.fw=[95,-221]}
  return poseFrames([[0,caught],[8,blendPose(caught,lift,.12)],[18,lift],[release,over]],t);
 }
 let reach=fullPose('grabReach',base),load=fullPose('grabLoad',base),lift=fullPose('grabLift',base),turn=fullPose('grabTurn',base),slam=fullPose('grabSlam',base);
 if(style==='fan-vault'){load.fan=0;lift=fullPose('knee',base);lift.open=1;lift.fw=[98,-270];lift.rw=[22,-260];lift.turn=.55;turn=fullPose('sidekick',base);turn.spin=-17;turn.turn=.95;turn.fan=1;turn.fa=[172,-233];slam=fullPose('fanSweep',base);slam.bob+=19;}
 else if(style==='claw-slam'){load=fullPose('clawLoad',base);load.fw=[133,-284];lift=fullPose('clawRise',base);lift.fa=[111,-16];lift.ra=[-111,-16];lift.fk=[73,-99];lift.rk=[-70,-101];lift.turn=.33;turn=fullPose('clawRake',base);turn.fw=[137,-244];turn.turn=.7;slam=fullPose('flameGround',base);slam.bob+=13;}
 else if(f.ch.id==='cammy'||f.ch.id==='juri'){lift.turn=.55;turn.turn=.95;turn.depth=.8;slam=fullPose('sweepWind',base);slam.open=1;slam.fw=[125,-237];slam.rw=[-59,-226];}
 const result=poseFrames([[0,reach],[8,load],[18,lift],[release-2,turn],[release+5,slam],[action?.duration||52,base]],t);if(action?.back&&t>14){const q=ease((t-14)/12);for(const k of ['fe','fw','re','rw'])result[k][0]*=1-2*q;result.lean=mix(result.lean,-result.lean*.7,q);result.turn=Math.max(result.turn,q);result.depth=1-q*.12}result.fan=style==='fan-vault'&&t>release?1:result.fan;return result;
}
function poseLocalPoint(f,world,p,isArm=false){const s=f.renderScale||f.ch.scale||SCALE,xx=(world[0]-f.x)/(f.dir*(p.depth||1)*s)-(p.rootShift||0),yy=(world[1]-FLOOR-f.y)/s-(p.floor||0)+180,r=-p.spin*Math.PI/180,x=xx*Math.cos(r)-yy*Math.sin(r),y=xx*Math.sin(r)+yy*Math.cos(r)-180;if(!isArm)return[x,y];const a=-p.lean*Math.PI/180,cy=y-p.bob+181;return[x*Math.cos(a)-cy*Math.sin(a),x*Math.sin(a)+cy*Math.cos(a)-181]}
function throwTargetPlacement(action){const owner=action.owner,target=action.target,p=throwPoseBase(owner),q=throwPoseBase(target);q.floor=poseFloorOffset(target,q);const rig=poseRig(owner,p),hands=lerp2(poseWorldPoint(owner,rig.rearArm[2],p,true),poseWorldPoint(owner,rig.frontArm[2],p,true),.5),origin={...target,x:0,y:0},collar=poseWorldPoint(origin,[0,-287],q,true);return{x:hands[0]-collar[0],y:Math.min(-1,hands[1]-collar[1])}}
function throwPose(f){const p=throwPoseBase(f),action=f.throwAction;if(!action)return p;
 if(action.target===f){p.floor=poseFloorOffset(f,p);return p}
 if(action.t<=action.release){const target=action.target,q=throwPoseBase(target);q.floor=poseFloorOffset(target,q);const left=poseWorldPoint(target,[-19,-287],q,true),right=poseWorldPoint(target,[19,-287],q,true),front=poseLocalPoint(f,left,p,true),rear=poseLocalPoint(f,right,p,true),grip=clamp(action.t/4,0,1);p.fw=lerp2(p.fw,front,grip);p.rw=lerp2(p.rw,rear,grip);p.open=1;}
 return p;
}
function landingPose(f,base=neutralPose(f)){const p=fullPose('jumpStart',base);p.bob=21;p.lean=6;p.rw=[-6,-284];p.fw=[91,-296];if(f.ch.id==='iori'){p.open=1;p.lean=14;p.rw=[-64,-204];p.fw=[111,-281]}if(f.ch.id==='mai'){p.open=1;p.fan=.72;p.fw=[108,-301];p.rw=[-4,-285]}return p}
function authoredPose(f){let p=neutralPose(f),age=f.stateAge||0;
 if(f.state==='throwing'||f.state==='captured'&&f.captureKind==='throw')return throwPose(f);
 if(f.state==='tumble'){
  const thrown=f.tumbleFrom==='throw'&&f.throwAction,up=thrown?throwPose(f):fullPose('airborneHit',p),curl=fullPose('tumbleCurl',p),fall=fullPose('tumbleFall',p),q=clamp(age/22,0,1);p=thrown?poseFrames([[0,up],[.48,blendPose(up,fall,.55)],[1,fall]],q):poseFrames([[0,up],[.48,curl],[1,fall]],q);p.turn=Math.sin(q*Math.PI)*.36;
  // A shallow launch reaches a horizontal contact silhouette before landing.
  if(f.vy>0&&f.y>-55)p=blendPose(p,fall,ease(1+f.y/55));return p;
 }
 if(f.state==='down'||f.state==='ko'){p=fullPose('landed',p);if(f.state==='down'&&f.downPoseFrom&&age<6)p=blendPose(f.downPoseFrom,p,ease(age/6));if(f.state==='ko'&&age<20)p=poseFrames([[0,fullPose('hit')],[6,fullPose('tumbleFall')],[20,p]],age);else{p.fk[1]-=Math.sin(clamp(age/8,0,1)*Math.PI)*9;p.head+=Math.sin(clamp(age/8,0,1)*Math.PI)*4}return p}
 if(f.state==='rise'){return poseFrames([[0,fullPose('landed')],[6,fullPose('groundBrace')],[12,fullPose('riseKnee')],[18,p]],age)}
 if(f.state==='hit'||f.state==='stun'){const hit=fullPose(f.hitHeight==='low'?'gutHit':'hit',p);p=blendPose(p,hit,age<4?1:Math.max(.62,1-(age-4)*.016));if(f.state==='stun'){p.head+=Math.sin(age*.13)*7;p.lean+=Math.sin(age*.1)*3;p.open=1}return p}
 if(f.state==='block'){p=fullPose(f.crouch?'crouchGuard':'guard',p);p.lean-=Math.max(0,1-age/7)*5;p.head+=Math.max(0,1-age/7)*3;return p}
 if(f.state==='win'){let win=fullPose(f.ch.id==='juri'?'parry':f.ch.id==='mai'?'fanRise':f.ch.id==='iori'?'clawLoad':'victory',p);if(f.ch.id==='mai'){win.fa=[90,-16];win.ra=[-78,-16];win.fk=[66,-108];win.rk=[-52,-105];win.fan=1}if(f.ch.id==='iori'){win.lean=-2;win.head=-13;win.fw=[-5,-235];win.rw=[-91,-216];win.bob=0}return blendPose(p,win,ease(age/28))}
 if(f.attack)p=movePose(f,f.attack.m,f.attack.t);
 else if(['rush','dash'].includes(f.state)){p=fullPose(f.ch.id==='iori'?'clawRush':'rush',p);const w=age*.47,z=Math.sin(w);p.fk[0]+=z*18;p.fa[0]+=z*34;p.rk[0]-=z*18;p.ra[0]-=z*31;p.ra[1]-=Math.max(0,z)*39;p.fa[1]-=Math.max(0,-z)*36;p.bob+=Math.abs(z)*4;}
 else if(f.state==='parry')p=fullPose('parry',p);
 else if(f.state==='stance'){p=fullPose('parry',p);p.bob+=22;if(f.ch.id==='chun'){p.bob+=23;p.fw=[138,-245];p.rw=[-46,-227];p.lean=-9}else if(f.ch.id==='juri')p=blendPose(p,POSES.kickWind,.6)}
 else if(f.jumpPre>0)p=blendPose(p,POSES.jumpStart,ease((5-f.jumpPre)/5));
 else if(f.y<0){const base=poseCopy(p);p=poseFrames([[-14,fullPose('jumpRise',p)],[-2,fullPose('jumpRise',p)],[6,fullPose('jumpFall',p)],[14,fullPose('jumpFall',p)]],f.vy||0);if(f.ch.id==='mai'){p.fan=1;p.turn=.3;p.fw=[95,-321]}if(f.ch.id==='iori'){p.open=1;p.fw=[104,-279];p.rw=[-65,-266]}
  if(f.vy<0&&f.y>-110)p=blendPose(fullPose('jumpStart',base),p,ease(-f.y/110));
  if(f.vy>=0&&f.y>-65)p=blendPose(p,landingPose(f,base),ease((65+f.y)/65));
 }
 else if(f.landT>0){const q=1-f.landT/Math.max(1,f.landMax||6),land=landingPose(f,p),sink=poseCopy(land);sink.bob+=7;sink.head+=3;p=poseFrames([[0,land],[.27,sink],[1,p]],q)}
 else if(Math.abs(f.move||0)>.05){const w=f.walkT||0,z=Math.sin(w),stride=f.ch.female?34:30;p.rk[0]+=z*17;p.ra[0]+=z*stride;p.fk[0]-=z*17;p.fa[0]-=z*stride;p.ra[1]-=Math.max(0,Math.cos(w))*13;p.fa[1]-=Math.max(0,-Math.cos(w))*13;p.bob+=Math.abs(z)*2.5;p.lean+=f.move*1.3;p.fw[0]-=z*5;p.rw[0]+=z*5;if(f.ch.id==='juri'){p.fk=[67-z*17,-106];p.fa=[99-z*stride,-16-Math.max(0,-Math.cos(w))*13]}}
 if((f.crouch||f.attack?.m.normalState==='c')&&f.y>=-2){if(!f.attack)p=fullPose('crouchGuard',p);else{p.bob+=f.attack.m.pose==='kick'?9:48;p.rk=[-76,-69];p.ra=[-113,-16];if(f.attack.m.pose!=='kick'){p.fk=[93,-71];p.fa=[124,-16]}}}
 return p;
}
function attackUsesFoot(f,m){return m.contactPart?m.contactPart==='foot':m.pose==='kick'||['drill','dive','spin'].includes(m.kind)||m.pose==='upper'&&f.ch.female}
function attackReach(f){const m=f.attack?.m;if(!m||!m.attackReachScale)return 1;const t=f.attack.t,s=m.startup,end=s+m.active,q=t<s?ease((t-s*.6)/Math.max(1,s*.4)):t<end?1:1-ease((t-end)/Math.max(1,m.recovery*.72));return mix(1,clamp(m.attackReachScale,.82,1.2),q)}
function desiredPose(f){const p=authoredPose(f);p.floor=p.floor||0;p.depth=clamp(p.depth||1,.68,1.08);p.reachScale=attackReach(f);p.reachFoot=f.attack&&attackUsesFoot(f,f.attack.m)?1:0;
 if(['tumble','down','rise','ko'].includes(f.state)){
  const pin=poseFloorOffset(f,p);
  // The physics root is the ground-contact plane. Keep that meaning while
  // rotating the body, so an airborne horizontal body cannot snap 130px on landing.
  p.floor=f.state==='rise'?pin*(1-ease(((f.stateAge||0)-12)/6)):pin;
 }
 return p;
}
function poseFloorOffset(f,p){const key=[f.ch.id,p.lean,p.bob,p.spin,p.reachScale||1,p.reachFoot||0,...p.rw,...p.fw,...p.ra,...p.fa,p.ffoot,p.rfoot,...(f.ch.armWidths||[]),...(f.ch.legWidths||[])].join(',');if(f._floorCache?.key===key)return f._floorCache.value;const rig=poseRig(f,p),r=p.spin*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),points=[],spinY=q=>q[0]*sn+(q[1]+180)*cs-180;
 // Ground contact uses the same curved silhouettes and character widths as SVG
 // rendering, including the user-approved original Ryu/Ken proportions.
 for(const [name,bones]of Object.entries(rig)){const leg=name.includes('Leg'),rear=name.startsWith('rear'),widths=rigLimbWidths(f.ch,leg,rear),surface=limbSurface(...bones,...widths),stroke=(f.ch.limbStroke||(f.ch.id==='mai'?1.35:1.6))*.5;
  for(const sample of surface)for(const side of[-.95,1]){const local=vadd(sample.pos,vmul(sample.n,sample.w*side)),q=leg?local:poseBodyPoint(p,local);points.push(spinY(q)+stroke)}
  if(leg){const angle=rigFootAngle(p,bones,rear)*Math.PI/180,ca=Math.cos(angle),sa=Math.sin(angle),scale=f.ch.footScale??(f.ch.female?.88:.97),sole=f.ch.id==='mai'?[[-16,0],[-11,11],[17,17],[37,11],[25,3],[10,-24],[-11,-26]]:[[-20,7],[-20,20],[18,25],[44,22],[48,15],[25,-1],[12,-27],[-14,-27]];
   for(const q of sole){const x=q[0]*scale,y=q[1]*scale;points.push(spinY([bones[2][0]+x*ca-y*sa,bones[2][1]+x*sa+y*ca])+1)}
  }
 }
 for(const [q,pad]of [[[5,-369],38],[[-30,-256],36],[[30,-256],36],[[0,-192],28]]){const v=poseBodyPoint(p,q);points.push(spinY(v)+pad)}
 const value=clamp(-Math.max(...points),-18,155);f._floorCache={key,value};return value;
}
function poseBodyPoint(p,point){const a=p.lean*Math.PI/180,x=point[0],y=point[1]+181;return[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)-181+p.bob]}
// Anatomical bend sides stay fixed while hands and feet follow authored paths.
// A pole crossing the limb axis must not choose the other IK solution mid-frame.
function solveRigChain(a,target,l1,l2,side){const mid=lerp2(a,target,.5),normal=vperp(vnorm(vsub(target,a))),pole=vadd(mid,vmul(normal,side*90));return solveLimb(a,target,pole,l1,l2)}
function poseRig(f,p=desiredPose(f)){const male=!f.ch.female,as=f.ch.id==='iori'?40:male?43:35,ua=f.ch.id==='iori'?67:male?68:64,la=f.ch.id==='iori'?76:male?71:67,hip=x=>poseBodyPoint(p,[x,-191]),rig={rearArm:solveRigChain(f.ch.rigRearShoulder||[-as,-291],p.rw,ua,la,1),frontArm:solveRigChain(f.ch.rigFrontShoulder||[as,-288],p.fw,ua,la,1),rearLeg:solveRigChain(hip(-26),p.ra,f.ch.id==='chun'?100:96,98,1),frontLeg:solveRigChain(hip(26),p.fa,f.ch.id==='chun'?100:96,98,-1)};
 // Small authored reach differences are a controlled stretch of the entire
 // striking chain after IK. The same solved chain supplies render and collision.
 const reach=p.reachScale||1;if(Math.abs(reach-1)>.00001){const limb=p.reachFoot?rig.frontLeg:rig.frontArm;limb[1]=lerp2(limb[0],limb[1],reach);limb[2]=lerp2(limb[0],limb[2],reach)}return rig;}
function poseWorldPoint(f,point,p=desiredPose(f),isArm=false){const q=isArm?poseBodyPoint(p,point):point,r=p.spin*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),x=q[0]*cs-(q[1]+180)*sn+(p.rootShift||0),y=q[0]*sn+(q[1]+180)*cs-180+(p.floor||0),s=f.renderScale||f.ch.scale||SCALE;return[f.x+x*(p.depth||1)*s*f.dir,FLOOR+f.y+y*s]}
function poseWeaponGeometry(f,p=desiredPose(f),rig=poseRig(f,p)){
 if(f.ch.id!=='mai')return[];const [a,b,c]=rig.frontArm,angle=Math.atan2(c[1]-b[1],c[0]-b[0]),fan=clamp(p.fan??.84,.07,1),wrist=(-18+(1-fan)*9+(p.fanAngle||0))*Math.PI/180,handScale=.76;
 return[[36,-75],[98,-18],[49,67]].map(q=>{const x=q[0]-16,y=q[1]*fan,fx=(16+x*Math.cos(wrist)-y*Math.sin(wrist))*handScale,fy=(x*Math.sin(wrist)+y*Math.cos(wrist))*handScale,hand=[c[0]+fx*Math.cos(angle)-fy*Math.sin(angle),c[1]+fx*Math.sin(angle)+fy*Math.cos(angle)];return poseWorldPoint(f,hand,p,true)});
}
const patchTemplate=document.createElementNS(NS,'g');
function morphSVG(node,markup){
 if(!node._patchReady){node.innerHTML=markup;node._patchReady=true;return}
 // Dynamic garment patches contain only paths with a stable order.
 const paths=[...markup.matchAll(/<path\s+([^>]+)\/?>/g)];
 if(paths.length!==node.children.length){node.innerHTML=markup;return}
 paths.forEach((m,i)=>{const child=node.children[i];for(const x of m[1].matchAll(/([\w-]+)="([^"]*)"/g))sa(child,x[1],x[2]);});
}
function curvePoint(a,b,c,d,t){const q=1-t;return[a[0]*q*q*q+3*b[0]*q*q*t+3*c[0]*q*t*t+d[0]*t*t*t,a[1]*q*q*q+3*b[1]*q*q*t+3*c[1]*q*t*t+d[1]*t*t*t]}
function smoothOutline(points,closed=false){if(!points.length)return'';let d='M'+pt(points[0]);for(let i=0;i<points.length-1;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],e=points[Math.min(points.length-1,i+2)],p=vadd(b,vmul(vsub(c,a),1/6)),q=vsub(c,vmul(vsub(e,b),1/6));d+='C'+pt(p)+' '+pt(q)+' '+pt(c)}return d+(closed?'Z':'')}
function limbSurface(a,b,c,w0,w1,w2){
 const ab=vsub(b,a),bc=vsub(c,b),L=vlen(ab),R=vlen(bc),bend=vnorm(vadd(vnorm(ab),vnorm(bc))),joint=vlen(bend)>.1?bend:vnorm(bc),ac1=vadd(a,vmul(ab,.32)),ac2=vsub(b,vmul(joint,L*.22)),bc1=vadd(b,vmul(joint,R*.22)),bc2=vsub(c,vmul(bc,.32)),points=[];
 for(let i=0;i<=14;i++){const part=i<=7?0:1,t=part?(i-7)/7:i/7,pos=part?curvePoint(b,bc1,bc2,c,t):curvePoint(a,ac1,ac2,b,t),before=part?curvePoint(b,bc1,bc2,c,Math.max(0,t-.015)):curvePoint(a,ac1,ac2,b,Math.max(0,t-.015)),after=part?curvePoint(b,bc1,bc2,c,Math.min(1,t+.015)):curvePoint(a,ac1,ac2,b,Math.min(1,t+.015)),n=vperp(vnorm(vsub(after,before))),w=part?mix(w1,w2,ease(t))+Math.sin(t*Math.PI)*w1*.12:mix(w0,w1,ease(t))+Math.sin(t*Math.PI)*w0*.055;points.push({pos,n,w})}
 return points;
}
function limbContour(a,b,c,w0,w1,w2,surface=null){surface=surface||limbSurface(a,b,c,w0,w1,w2);const left=surface.map(p=>vadd(p.pos,vmul(p.n,p.w))),right=surface.map(p=>vsub(p.pos,vmul(p.n,p.w*.95))).reverse();return smoothOutline([...left,...right,left[0]],true)}
function limbCelShade(surface){const edge=surface.slice(1,-1).map(p=>vsub(p.pos,vmul(p.n,p.w*.92))),inside=surface.slice(1,-1).map((p,i)=>vsub(p.pos,vmul(p.n,p.w*(.48+Math.sin(i*.3)*.08)))).reverse();return smoothOutline([...edge,...inside,edge[0]],true)}
function rigLimbWidths(ch,leg,rear){const id=ch.id,female=ch.female;let widths=leg?(id==='mai'?[26,16.5,9.5]:id==='iori'?[29,20,11.5]:id==='cammy'?[26,17,10]:id==='chun'?[33,21.5,12]:id==='juri'?[29,21,12]:id==='luke'?[31,19,11]:[32,22,13]):(id==='iori'?[20,12.5,9]:id==='luke'?[23,15.5,10.5]:female?[15,10,7.5]:[20,13,9.5]);if(leg&&ch.legWidths)widths=[...ch.legWidths];if(!leg&&ch.armWidths)widths=[...ch.armWidths];return rear?widths.map(x=>x*.94):widths}
function rigFootAngle(p,bones,rear){const delta=vsub(bones[2],bones[1]),angle=Math.atan2(delta[1],delta[0])*180/Math.PI,custom=rear?p.rfoot:p.ffoot;return custom||clamp((angle-90)*.24,-26,30)}
function renderLimb(l,a,b,c,f){
 const ch=f.ch,id=ch.id,leg=l.type==='leg',female=ch.female;
 const widths=rigLimbWidths(ch,leg,l.rear);const geometryStamp=[...a,...b,...c,...widths].join(',');if(l._geometryStamp!==geometryStamp){l._geometryStamp=geometryStamp;const [w0,w1,w2]=widths,surface=limbSurface(a,b,c,...widths),skin=!leg&&(ch.legacyArt||!['iori','ken','cammy'].includes(id))||leg&&['mai','luke'].includes(id),shade=skin?ART[id].skin[2]:id==='iori'?'#302030':'#202638';
 sa(l.contour,'d',limbContour(a,b,c,...widths,surface));sa(l.contour,'stroke-width',ch.limbStroke||(id==='mai'?1.35:1.6));
 sa(l.shade,'d',limbCelShade(surface));sa(l.shade,'fill',id==='mai'?'#bb7668':id==='iori'?(leg?'#581d32':'#111624'):shade);sa(l.shade,'opacity',id==='iori'?.36:skin?.26:.25);if(id==='mai'||id==='iori')sa(l.contour,'fill',id==='mai'?'#f2bd9e':leg?'#a92d45':'#282634');sa(l.light,'d','');sa(l.rim,'d','');
 const n=vperp(vnorm(vsub(b,a))),m=vperp(vnorm(vsub(c,b))),P=(p,v,w)=>pt(vadd(p,vmul(v,w))),fold=1-vnorm(vsub(b,a)).reduce((sum,v,i)=>sum+v*vnorm(vsub(c,b))[i],0);let detail='';
 // One short crease explains a flexed elbow or knee. No polygonal muscle panels.
 if(fold>.22){const q=lerp2(b,c,.12);detail=`M${P(q,m,-w1*.56)}Q${P(lerp2(b,c,.06),m,-w1*.08)} ${P(lerp2(b,c,.17),m,w1*.16)}`}
 sa(l.details,'d',detail);sa(l.details,'stroke',skin?ART[id].skin[2]:shade);sa(l.details,'stroke-width',.95);sa(l.details,'opacity',.54);
 let cloth='';
 if(typeof characterLimbArt==='function'&&['mai','iori'].includes(id))cloth=characterLimbArt(l,a,b,c,f,widths)||'';
 else if(!ch.legacyArt){
  // Clothing follows the same continuous contour as the body beneath it.
  if(!leg){
   if(id==='ken'||id==='cammy'||id==='ryu'&&l.rear)cloth+=ink(limbContour(a,lerp2(a,b,.5),lerp2(a,b,.94),w0+2,w0*.85,w1+2),paint(ch,'dark'),1.1);
   if(id==='cammy')cloth+=ink(limbContour(lerp2(b,c,.36),lerp2(b,c,.7),c,w1*.99,w1*.86,w2+1),'url(#red3)',1.05);
   if(id==='luke')cloth+=mark(`M${P(lerp2(b,c,.22),m,w1*.45)}q-6 7-1 11l-7 10`,'#514d58',1.7,'opacity=".8"');
  }else{
   if(id==='luke'){sa(l.contour,'fill',paint(ch,'skin'));cloth+=ink(limbContour(a,lerp2(a,b,.4),lerp2(a,b,.81),w0+1,w0*.97,w1+3),paint(ch,'fabric'),1.1)+mark(`M${P(lerp2(a,b,.79),n,w1+3)}Q${P(lerp2(a,b,.83),n,0)} ${P(lerp2(a,b,.79),n,-w1-3)}`,'#d9cab3',1.8)}
   if(id==='chun')cloth+=ink(limbContour(lerp2(b,c,.54),lerp2(b,c,.8),c,w1*.66,w1*.6,w2+1),'url(#white3)',1.05);
   if(id==='cammy')cloth+=ink(limbContour(lerp2(b,c,.5),lerp2(b,c,.75),c,w1*.73,w1*.65,w2+1),'url(#ink3)',1);
   if(id==='juri')cloth+=mark(`M${P(a,n,w0*.6)}Q${P(lerp2(a,b,.5),n,w0*.67)} ${P(b,n,w1*.52)}`,l.rear?'#d47eb1':'#fff3ef',2.1);
   if(id==='ryu')cloth+=mark(`M${P(lerp2(b,c,.93),m,w2)}Q${P(lerp2(b,c,.9),m,0)} ${P(lerp2(b,c,.93),m,-w2)}`,'#999e99',1.05);
  }
 }
 if(l._cloth!==cloth){l._cloth=cloth;morphSVG(l.cloth,cloth)}
 }
 const delta=vsub(c,b),angle=Math.atan2(delta[1],delta[0])*180/Math.PI;
 if(!leg){sa(l.end,'transform',`translate(${pt(c)}) rotate(${angle}) scale(${ch.handScale??(female?.76:id==='iori'?(f.attack||f.state==='throwing'?.87:.79):id==='luke'?.96:.88)})`);const open=clamp(f.pose.open,0,1);sa(l.palm,'opacity',open>.45?1:0);sa(l.fist,'opacity',open>.45?0:1)}
 else{const footangle=rigFootAngle(f.pose,[a,b,c],l.rear);sa(l.end,'transform',`translate(${pt(c)}) rotate(${footangle}) scale(${ch.footScale??(female?.88:.97)})`)}
 l.points=[a,b,c];
}
function renderFighter(f,dt=1/60,alpha=1){
 const signature=f.state+'|'+(f.attack?.m.id||'')+'|'+(f.captureKind||''),simFrame=signature+'|'+(f.stateAge||0)+'|'+(f.attack?.t||0)+'|'+(f.throwAction?.t||0)+'|'+f.y+'|'+f.vy+'|'+(f.landT||0)+'|'+(f.jumpPre||0)+'|'+!!f.crouch,changed=f._renderSignature!==signature;
 let view=f;
 // Interpolate along the authored simulation timeline, never toward an old pose.
 // A contact frame is shown once immediately and remains exact during hitstop.
 if(!changed&&G.screen==='battle'&&!G.paused&&!G.hitstop&&alpha<1){view=Object.create(f);view.stateAge=Math.max(0,(f.stateAge||0)-1+alpha);if(f.attack)view.attack={...f.attack,t:Math.max(0,f.attack.t-1+alpha)};if(f.throwAction)view.throwAction={...f.throwAction,t:Math.max(0,f.throwAction.t-1+alpha)};if(f.throwAction?.owner===f)view.throwAction.owner=view;}
 const reusePose=(G.hitstop>0||G.paused)&&f._poseSimulationFrame===simFrame&&f.pose;let d=reusePose?f.pose:desiredPose(view);
 f.pose=d;f._renderSignature=signature;f._poseSimulationFrame=simFrame;
 const p=f.pose,s=f.renderScale||f.ch.scale||SCALE,frozen=G.hitstop>0||G.paused,rx=mix(f.px??f.x,f.x,frozen?1:alpha),ry=mix(f.py??f.y,f.y,frozen?1:alpha);
 sa(f.root,'transform',`translate(${rx.toFixed(2)} ${(FLOOR+ry).toFixed(2)}) scale(${s})`);
 sa(f.facing,'transform',`scale(${f.dir*(p.depth||1)} 1) translate(${p.rootShift||0} ${(p.floor||0).toFixed(2)}) rotate(${p.spin.toFixed(2)} 0 -180)`);
 sa(f.core,'transform',`translate(0 ${p.bob.toFixed(2)}) rotate(${p.lean.toFixed(2)} 0 -181)`);
 const headX=f.ch.headX??(f.ch.female?5:6),headY=f.ch.headY||-340;sa(f.head,'transform',`translate(${headX} ${headY}) rotate(${p.head.toFixed(2)}) scale(${f.ch.headScale||.66})`);
 const trailingTime=gameTime,air=Math.abs(f.y||0)>8,clothFlow=clamp((f.vx||0)+(f.push||0),-14,14),turnFlow=(p.turn||0)*6;
 const tailAnchor=f.ch.tailAnchor||(f.ch.id==='mai'?[-11,-391]:f.ch.id==='ryu'?[-15,-360]:[-16,-357]),tailSway=Math.sin(trailingTime*6.4)*2.1+(f.move||0)*2-clothFlow*.44-p.lean*.12+turnFlow;sa(f.headTails,'transform',`rotate(${p.head.toFixed(2)} ${headX} ${headY}) rotate(${tailSway.toFixed(2)} ${tailAnchor[0]} ${tailAnchor[1]})`);
 sa(f.coatTails,'transform',`rotate(${(Math.sin(trailingTime*5)*1.4-p.lean*.26-clothFlow*.57+(air?Math.sin(trailingTime*9)*3:0)).toFixed(2)} 0 -177)`);
 sa(f.trailing,'transform',`translate(0 ${(p.bob*.6).toFixed(2)}) rotate(${(Math.sin(trailingTime*5)*2-p.lean*.28-clothFlow*.25).toFixed(2)} 0 -195)`);
 const limbs=poseRig(f,p),ar=limbs.rearArm,af=limbs.frontArm,lr=limbs.rearLeg,lf=limbs.frontLeg;
 renderLimb(f.rearArm,...ar,f);renderLimb(f.frontArm,...af,f);renderLimb(f.rearLeg,...lr,f);renderLimb(f.frontLeg,...lf,f);
 const back=p.turn>.54;
 if(f._backLayer!==back){f._backLayer=back;if(back){f.core.insertBefore(f.frontArm.g,f.torso);f.core.appendChild(f.rearArm.g);f.facing.insertBefore(f.frontLeg.g,f.rearLeg.g)}else{f.core.insertBefore(f.rearArm.g,f.torso);f.core.appendChild(f.frontArm.g);f.facing.insertBefore(f.rearLeg.g,f.frontLeg.g)}}
 if(typeof updateCharacterAttachments==='function')updateCharacterAttachments(f,p,limbs);
 if(f.shadow){const lying=['down','ko'].includes(f.state),spread=lying?1.3:clamp(1+ry/720,.4,1);sa(f.shadow,'transform',`translate(${rx} ${FLOOR}) scale(${spread} 1)`);sa(f.shadow,'opacity',clamp(1+ry/600,.24,1));}
 let aura=f.state==='rush'||f.rushBuff>0?'#7dffac':f.state==='parry'?'#93bbff':f.attack?.m.od?'#ffe5a8':f.install>0?f.ch.color:f.attack?.m.kind==='impact'?'#ff9966':null;
 sa(f.aura,'opacity',aura?.33+Math.sin(gameTime*19)*.07:0);if(aura)sa(f.aura.children[0],'fill',aura);
 const charge=f.attack&&(f.attack.m.kind.includes('projectile')||f.attack.m.kind==='charge')&&f.attack.t<f.attack.m.startup;sa(f.charge,'opacity',charge?1:0);if(charge){const cp=bodyPoint(f,['luke','mai','iori'].includes(f.ch.id)?af[2]:lerp2(af[2],ar[2],.5)),q=f.attack.t/f.attack.m.startup;sa(f.charge,'transform',`translate(${cp[0]+10} ${cp[1]}) scale(${.15+q*q*.45})`);sa(f.chargeRing,'transform',`rotate(${gameTime*350})`)}
 const hurt=['hit','stun','tumble','captured','down','ko'].includes(f.state),power=!hurt&&(f.portraitPower||f.attack&&(f.attack.m.super||f.attack.m.od||f.attack.m.level>=3)&&f.attack.t>f.attack.m.startup*.6);sa(f.faceHurt,'opacity',hurt?1:0);sa(f.facePower,'opacity',power?1:0);
 renderMoveFX(f);f.root.style.opacity=f.hp<=0?.91:1;
}
function bodyPoint(f,p){return poseBodyPoint(f.pose,p)}

function flameArt(outer,inner,core){return flat('M-104-5Q-85-30-58-18L-70-43Q-40-36-24-15L-27-34Q0-22 17 1Q-3 30-27 16L-42 34-49 15Q-72 33-98 12L-74 3Z',outer,'opacity=".73"')+flat('M-63-3Q-40-17-24-7L-29-21Q-6-15 12 1-5 17-25 10L-36 20-34 7Q-49 15-63-3Z',inner,'opacity=".91"')+flat('M-29-2Q-11-9 9 1-4 11-24 6L-18 0Z',core)}
function patchMoveFX(node,markup){
 const structure=(markup.match(/<\/?(?:g|path|ellipse|circle|use)(?=[\s/>])|\/>/g)||[]).join('|'),tokens=[...markup.matchAll(/<(g|path|ellipse|circle|use)\b([^>]*)>/g)];
 if(node._fxStructure!==structure||!node._fxNodes||node._fxNodes.length!==tokens.length||tokens.length&&!node.firstElementChild){node.innerHTML=markup;node._fxStructure=structure;node._fxNodes=[...node.querySelectorAll('*')];node._fxAttrKeys=[];}
 if(node._fxNodes.length!==tokens.length){node.innerHTML=markup;node._fxNodes=[...node.querySelectorAll('*')];node._fxAttrKeys=[];return}
 tokens.forEach((token,i)=>{const child=node._fxNodes[i],attrs=Object.fromEntries([...token[2].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));for(const key of node._fxAttrKeys[i]||[])if(!(key in attrs)){child.removeAttribute(key);if(child._attrs)delete child._attrs[key]}for(const [key,value]of Object.entries(attrs))sa(child,key,value);node._fxAttrKeys[i]=Object.keys(attrs)});
}
const SKILL_FX={
 ryu:{color:'#78ceff',core:'#ecfcff',shade:'#267ddb',style:'wave'},ken:{color:'#ff874a',core:'#fff0b5',shade:'#e5412c',style:'fire'},chun:{color:'#8ae8ed',core:'#f4fff1',shade:'#329fbb',style:'flow'},cammy:{color:'#b4eaff',core:'#f2ffff',shade:'#699fb7',style:'wind'},luke:{color:'#f6ce8a',core:'#fff7d9',shade:'#bd9263',style:'air'},juri:{color:'#db91f0',core:'#fff0fd',shade:'#8f49be',style:'blade'},mai:{color:'#ff9b70',core:'#fff4d8',shade:'#df514b',style:'fan'},iori:{color:'#b481f2',core:'#fae8ff',shade:'#7435b5',style:'claw'}
};
function moveFXPoint(f,m){const kick=m.contactPart?m.contactPart==='foot':m.pose==='kick'||m.pose==='upper'&&['chun','cammy','juri'].includes(f.ch.id),limb=kick?f.frontLeg:f.frontArm;let tip=kick?limb.points[2]:bodyPoint(f,limb.points[2]),joint=kick?limb.points[1]:bodyPoint(f,limb.points[1]);
 if(m.contactPart==='fan'&&typeof poseWeaponGeometry==='function'){const world=poseWeaponGeometry(f,f.pose,poseRig(f,f.pose))[1];if(world){const p=f.pose,s=f.renderScale||f.ch.scale,r=p.spin*Math.PI/180,x=(world[0]-f.x)/(s*f.dir*(p.depth||1))-(p.rootShift||0),y=(world[1]-FLOOR-f.y)/s-(p.floor||0)+180;tip=[x*Math.cos(r)+y*Math.sin(r),-x*Math.sin(r)+y*Math.cos(r)-180];}}
 return{tip,joint,kick};
}
function fxCurve(points){if(points.length<2)return'';let d='M'+pt(points[0]);for(let i=1;i<points.length-1;i++)d+='Q'+pt(points[i])+' '+pt(lerp2(points[i],points[i+1],.5));return d+'L'+pt(points[points.length-1]);}
function fxRibbon(points,width){if(points.length<3)return'';const left=[],right=[];for(let i=0;i<points.length;i++){const tangent=vnorm(vsub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)])),n=vperp(tangent),w=width*Math.sin(i/(points.length-1)*Math.PI*.5);left.push(vadd(points[i],vmul(n,w)));right.push(vadd(points[i],vmul(n,-w*.24)))}return'M'+left.map(pt).join('L')+'L'+right.reverse().map(pt).join('L')+'Z';}
function renderMoveFX(f){const m=f.attack?.m,t=f.attack?.t||0,profile=SKILL_FX[f.ch.id],drive=f.state==='rush'||f.rushBuff>0,parry=f.state==='parry',visible=m&&t>=m.startup*.3&&t<m.startup+m.active+7;
 if(G.hitstop>0&&f._moveFXFrame===t&&f._moveFXState===f.state)return;f._moveFXFrame=t;f._moveFXState=f.state;
 if(!visible&&!drive&&!parry&&!f.install){sa(f.fxArc,'opacity',0);sa(f.fxCore,'opacity',0);sa(f.fxFill,'opacity',0);if(f.fxExtra.childElementCount)f.fxExtra.replaceChildren();f._fxExtra='';f.trailPoints=[];return}
 const color=drive?'#83ffc0':parry?'#99c6ff':profile.color,active=visible&&t>=m.startup,charge=visible&&t<m.startup,special=m&&m.category!=='normal',fade=visible?clamp((m.startup+m.active+7-t)/10,0,1):1,alpha=visible?clamp((t-m.startup*.3)/4,0,1)*fade:1;let d='',fill='',extra='';
 if(visible){const {tip:pos,joint,kick}=moveFXPoint(f,m),angle=Math.atan2(pos[1]-joint[1],pos[0]-joint[0])*180/Math.PI,tag=m.base||m.kind;
  if(f.trailKey!==m.id||t<f.trailFrame){f.trailPoints=[];f.trailKey=m.id}if(f.trailTick!==t){f.trailTick=t;f.trailFrame=t;f.trailPoints=[...(f.trailPoints||[]),pos].slice(-7)}const pts=f.trailPoints||[],travelling=pts.length>2&&vlen(vsub(pts[0],pos))>10;
  if(active&&!m.kind.includes('projectile')&&travelling){d=fxCurve(pts);fill=fxRibbon(pts,m.super?14:special?9:2.7)}
  if(charge&&special){const q=clamp(t/m.startup,0,1),r=7+q*15,spin=(f.ch.id==='iori'?-1:1)*q*70;extra+=`<g transform="translate(${pt(pos)}) rotate(${spin})" opacity="${(.2+q*.45).toFixed(3)}">`;
   if(profile.style==='fan')extra+=mark(`M${-r} ${-r*.4}Q0 ${-r*1.5} ${r} ${-r*.4}M${-r*.7} ${r*.5}Q0 ${r} ${r*.7} ${r*.5}`,profile.core,1.7)+flat(`M${-r*.9}-3q-8-8-13-4l6 6-6 3q7 3 13-5Z`,profile.color);
   else if(['fire','claw'].includes(profile.style))extra+=`<g transform="scale(${(.15+q*.16).toFixed(3)})">`+flameArt(profile.shade,profile.color,profile.core)+'</g>';
   else if(profile.style==='air'||profile.style==='wind')extra+=mark(`M${-r*2}-10L${-r*.4}-6M${-r*2} 11L${-r*.35} 6M${r*.4} ${-r}Q${r*1.15} 0 ${r*.4} ${r}`,profile.core,1.5);
   else extra+=`<ellipse rx="${r}" ry="${r*.65}" fill="none" stroke="${profile.color}" stroke-width="1.6"/><path d="M-4 0H4M0-4V4" stroke="${profile.core}" stroke-width="1.3"/>`;
   extra+='</g>';
  }
  if(active&&!m.kind.includes('projectile')){
   // Distinct material follows the real attacking limb; every bright core stays small.
   if(profile.style==='fire'&&special){extra+=`<g transform="translate(${pt(vadd(pos,vmul(vnorm(vsub(pos,joint)),-13)))}) rotate(${angle}) scale(${m.super?.78:.6})">`+flameArt('#df452d','#ffac4f','#fff1b3')+mark('M-116-9L-103-8M-93 29L-80 22','#ffd388',1.4)+'</g>';}
   if(profile.style==='fan'&&special){const prev=pts[Math.max(0,pts.length-3)]||joint,flow=Math.atan2(pos[1]-prev[1],pos[0]-prev[0])*180/Math.PI;extra+=`<g transform="translate(${pt(pos)}) rotate(${flow}) scale(${m.super?.7:.52})">`+flameArt('#e35c54','#ffb174','#fff3d5')+'</g>';if(travelling)for(let j=1;j<=3;j++){const q=pts[Math.max(0,pts.length-1-j*2)];extra+=`<path d="M${q[0]-8} ${q[1]}q-12-10-20-5l8 7-7 5q9 3 19-7Z" fill="${profile.core}" opacity="${.24-j*.035}"/>`;}}
   if(profile.style==='claw'&&m.pose!=='kick'){const from=pts[Math.max(0,pts.length-5)]||joint,n=vperp(vnorm(vsub(pos,from)));for(let j=-1;j<=1;j++){const a=vadd(from,vmul(n,j*7)),b=vadd(pos,vmul(n,j*7));extra+=mark(`M${pt(a)}Q${mix(a[0],b[0],.5)+n[0]*10} ${mix(a[1],b[1],.5)+n[1]*10} ${pt(b)}`,j===0?profile.core:profile.color,special?1.8:1.05,`opacity="${special?.78:.45}"`)}if(special)extra+=`<g transform="translate(${pt(pos)}) rotate(${angle}) scale(.43)">`+flameArt('#7134b1','#bd78ed','#fbe6ff')+'</g>';}
   if(profile.style==='wave'&&special){extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+mark('M-26-19Q4-25 11 0Q4 25-26 19',profile.core,1.9)+mark('M-51-22L-36-15M-48 24L-31 16',profile.color,1.35)+(m.pierce?mark('M-45-17L-34-29-26-12-15-20M-38 20L-27 32-18 17',profile.core,1.1):'')+'</g>';}
   if(profile.style==='flow'&&special){extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+mark('M-57-22Q-16-45 11-11M-64 20Q-21 37 8 12',profile.core,1.6)+mark('M-88-10Q-42-29-11-22M-75 30Q-32 43-4 26',profile.color,1.1)+'</g>';}
   if(profile.style==='air'&&special){extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+mark('M-8-31Q31 0-8 31M-23-39Q13-27 22-7M-74-18L-28-9M-82 17L-31 10',profile.core,1.8)+flat('M-6-28Q16-11 16 3L4 22Q12-3-6-28Z',profile.color,'opacity=".18"')+'</g>';}
   if(profile.style==='wind'&&special){extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+mark('M-108-20Q-44-42 2-16M-134 14Q-54 35 7 12M-111-3L-54-1',profile.core,1.4)+mark('M-145-27L-93-22M-139 28L-85 22',profile.color,1.1)+'</g>';}
   if(profile.style==='blade'&&special){if(travelling)extra+=mark(fxCurve(pts.map((v,i)=>vadd(v,[0,5+i*.8]))),profile.core,1.7);extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+flat('M-76-18L-13-8 8 0-12 4-51 22-32 4Z',profile.color,'opacity=".27"')+mark('M-73-18L-17-8M-54 22L-23 7',profile.core,1.2)+'</g>';}
   if(m.kind==='impact'||m.kind==='reversal'){fill='';extra+=`<g transform="translate(${pt(pos)}) rotate(${angle})">`+mark('M-62-48L-35-27M-75 33L-39 19M-16-61L-8-31','#ffb56c',4.1)+flat('M-38-35L-18-29-27-12Z M-48 18L-27 12-31 26Z','#f6af7c','opacity=".3"')+'</g>';}
  }
 }
 if(drive){fill='M-154-15Q-109-115-125-251L-84-223-57-341-37-284-35-159-61-51Z';d='M-179-36Q-132-114-144-210M-145-277L-103-239';extra+=mark('M-210-146L-121-157M-198-238L-119-222M-190-53L-111-81',color,2.1);}
 if(parry){d='M113-366Q169-293 125-209';fill='M119-373Q181-297 133-205L125-215Q158-300 119-373Z';extra+=mark('M139-343L157-358M150-293L173-293M139-241L157-225','#ddf1ff',1.4);}
 if(f.install>0)extra+=mark('M-92-5Q-5 22 103-3M-73 7Q8 25 76 10',color,1.7,'stroke-dasharray="19 9 3 9"');
 sa(f.fxArc,'d',d);sa(f.fxCore,'d',d);sa(f.fxArc,'stroke',color);sa(f.fxCore,'stroke',profile.core);sa(f.fxArc,'stroke-width',m?.super?8:m?.category==='normal'?2.2:5);sa(f.fxCore,'stroke-width',m?.category==='normal'?.9:1.45);sa(f.fxArc,'opacity',d?alpha*.55:0);sa(f.fxCore,'opacity',d?alpha*.78:0);sa(f.fxFill,'d',fill);sa(f.fxFill,'fill',color);sa(f.fxFill,'opacity',fill?alpha*(drive?.13:m?.super?.24:.17):0);
 if(f._fxExtra!==extra){f._fxExtra=extra;patchMoveFX(f.fxExtra,extra)}sa(f.fxExtra,'opacity',alpha);
}
function snapshotSilhouette(f,color){const clean=n=>n.outerHTML.replace(/fill="[^"]*"/g,`fill="${color}"`).replace(/stroke="[^"]*"/g,'stroke="none"');return`<g transform="${f.facing.getAttribute('transform')||''}" fill="${color}">${clean(f.rearLeg.contour)}${clean(f.frontLeg.contour)}<g transform="${f.core.getAttribute('transform')||''}">${clean(f.rearArm.contour)}${clean(f.torso.children[0])}${clean(f.frontArm.contour)}<path d="M-17-309L-23-350-9-389 22-397 40-367 36-332 18-311Z" fill="${color}"/></g></g>`}
function ghost(f){if(G.ghosts.length>=6||!f.pose)return;let color=f.state==='rush'?'#6dffc0':f.ch.color;const n=el('g',{transform:`translate(${f.x} ${FLOOR+f.y}) scale(${f.ch.scale})`,opacity:.34},$('ghosts'));n.innerHTML=snapshotSilhouette(f,color);G.ghosts.push({node:n,life:17,max:17})}
function particle(x,y,vx,vy,col,size=5,life=24,kind='spark'){if(G.fx.length>=96)return;const n=kind==='ring'?el('ellipse',{rx:size,ry:size*.75,fill:'none',stroke:col,'stroke-width':1.8},$('impact-fx')):kind==='dust'?el('ellipse',{rx:size*2,ry:size,fill:col},$('ground-fx')):path(`M${-size*.4} 0L0 ${-size*.23}L${size*3.4} 0L0 ${size*.23}Z`,col,$('impact-fx'));n.setAttribute('transform',`translate(${x} ${y}) rotate(${Math.atan2(vy,vx)*180/Math.PI})`);G.fx.push({node:n,x,y,vx,vy,life,max:life,size,kind,rot:Math.atan2(vy,vx)*180/Math.PI})}
function impactResidue(style,col,core){switch(style){
 case'fire':return flat('M-31 13Q-10 15-10-8L-4-27 6-8Q17-18 20-29L25-7 13 18 29 9Q23 35-3 30Z',col,'opacity=".25"')+mark('M-31-17L-24-10M24-21L31-34M25 20L35 27',core,1.4);
 case'fan':return mark('M-35-4Q-15-34 12-25M-25 25Q5 37 28 16',col,1.4)+flat('M23-27Q41-35 43-23L31-15Z M-25 19Q-39 16-43 28L-31 27Z M16 33Q29 38 35 28L23 26Z',core,'opacity=".64"');
 case'claw':return mark('M-29-22Q-4-11 18 28M-18-33Q8-17 30 16M-39-12Q-15-1 6 36',col,2)+mark('M-20-23L17 24M-9-30L27 13',core,.95);
 case'flow':return mark('M-32-9Q-11-37 18-23 41-5 20 24M-22 23Q4 38 31 6',col,1.35)+mark('M-17-31Q8-38 25-20',core,1.1);
 case'wind':return mark('M-48-24Q-12-39 29-13M-53 16Q-6 36 37 12M-45-1L-24 0',core,1.15);
 case'air':return mark('M-11-36Q28-22 31 0Q30 21-7 34M-49-19L-24-9M-48 20L-20 10',col,1.7)+mark('M2-30Q34 0 1 28',core,1);
 case'blade':return flat('M-38-27L-10-15 32 30 15 22Z M-23 31L-7 13 39-25 24-7Z',col,'opacity=".33"')+mark('M-24-27L29 25M-23 26L30-24',core,1.1);
 default:return mark('M-31-12Q-6-38 21-21M-20 28Q10 39 34 9',col,1.55)+mark('M-39 8L-24 5M24-29L34-39',core,1.05);
}}
function burst(x,y,col,count=16,kind='hit',context=null){
 if(G.fx.length>100)return;const guard=kind==='block'||kind==='parry',profile=context?.owner?SKILL_FX[context.owner.ch.id]:null,move=context?.move,special=move&&move.category!=='normal',strength=guard?.8:move?.super?1.03:move?.level>=3?.93:count>=20?1.12:.75,main=profile&&!guard?profile.color:col,core=profile?.core||'#fff7e5',life=guard?9:7,n=el('g',{transform:`translate(${x} ${y})`},$('impact-fx'));
 if(guard){n.innerHTML=`<path d="M-9-28Q24-16 18 8Q12 26-12 31" stroke="${kind==='parry'?'#eee5ff':'#bcecff'}" stroke-width="3" fill="none"/><path d="M-23-19L-13-11M-5-38L-3-27M27-23L18-15M32 3L23 3M22 26L15 20" stroke="${col}" stroke-width="1.55"/><ellipse rx="10" ry="17" fill="${col}" opacity=".08"/>`;
 }else{n.innerHTML=`<path d="M-3-6L-8-23 3-10 16-19 9-2 32-5 13 5 20 18 5 11-7 27-7 12-29 17-13 2-33-8Z" fill="${main}" opacity=".5"/><path d="M-3-4L0-13 4-5 13-7 7 1 15 5 5 5 1 13-3 6-13 7-7 0-13-5Z" fill="${core}"/><path d="M-39-20L-21-11M25-18L43-28M25 13L47 25M-22 16L-37 29" stroke="${main}" stroke-width="1.3" opacity=".85"/>`;}
 G.fx.push({node:n,x,y,vx:0,vy:0,life,max:life,size:24,impactScale:strength,kind:'impact',rot:guard?0:(context?.direction??context?.owner?.dir)===-1?165:rand(-12,12)});
 // A dim material-specific afterimage lasts beyond the seven-frame contact flash.
 if(!guard&&profile&&(special||move?.level>=3)&&G.fx.length<85){const echo=el('g',{transform:`translate(${x} ${y}) scale(${context.direction??context.owner.dir} 1)`},$('impact-fx'));echo.innerHTML=impactResidue(profile.style,profile.color,profile.core);G.fx.push({node:echo,x,y,vx:(context.direction??context.owner.dir)*.3,vy:profile.style==='fire'||profile.style==='claw'?-.4:0,life:17,max:17,size:28,impactScale:strength,kind:'residue',rot:0,mirror:context.direction??context.owner.dir});}
 for(let i=0;i<Math.min(count,guard?4:8);i++){const a=rand(0,Math.PI*2),v=rand(2.2,guard?4.5:8);particle(x,y,Math.cos(a)*v,Math.sin(a)*v,i%4===0?core:main,rand(1.5,3.1),rand(10,19))}
 if(guard||!profile||['wave','flow','air','wind'].includes(profile.style))particle(x,y,0,0,main,guard?13:7,guard?10:12,'ring');
}
function groundImpact(x,col='#c9b9b2',strength=1){
 const n=el('g',{transform:`translate(${x} ${FLOOR+5})`},$('ground-fx'));n.innerHTML=`<ellipse rx="45" ry="7" fill="none" stroke="${col}" stroke-width="2.2"/><path d="M-46-1L-93-4M39 1L87-2M-11-7L-31-17M18-5L33-13" fill="none" stroke="${col}" stroke-width="1.3"/>`;G.fx.push({node:n,x,y:FLOOR+5,vx:0,vy:0,life:16,max:16,size:38,kind:'impact',rot:0,impactScale:strength});
 for(let i=0;i<8;i++){const side=i%2?-1:1;particle(x+side*rand(12,35),FLOOR+4,side*rand(2,6)*strength,rand(-2.7,-.8),col,rand(3,6),rand(16,25),'dust')}
}
function spawnShot(f,m){const low=m.kind==='lowprojectile'||m.projectileStyle==='violet-flame',sup=m.kind==='superprojectile',n=el('g',{},$('projectiles')),id=f.ch.id,color=m.od?'#ffe6ab':f.ch.color,r=sup?78:low?28:id==='mai'?48:39;let art='';
 if(id==='mai'){
 art=`<path d="M-117-12L-38-21M-149 11L-47 5M-103 32L-35 24" stroke="${color}" stroke-width="2" opacity=".54"/><g data-spin="fan" transform="translate(-47 0)">${fanArt(f.ch)}</g>`;
 }else if(id==='iori'){
 art=`<path d="M-137 38Q-111 7-77 18L-90-17-49 1Q-61-45-19-59L-21-24Q15-57 17-83 46-55 29-21 56-23 62 11L42 36 7 44Z" fill="#7336bd" opacity=".74"/><path d="M-88 35Q-54 9-31 22L-35-11Q-10 7-6-34 17-10 12 8 29-7 44 14L33 33-6 39Z" fill="#b780ff"/><path d="M-25 30Q-7 7 4-4L8 18 21 8Q34 22 22 31Z" fill="#fff0ff"/><path d="M-119 42L-43 42M-87-5L-106-19M-7-58L0-74" stroke="#d8b4ff" stroke-width="2"/>`;
 }else if(id==='juri'){
 art=`<path d="M-128 29Q-81-28-17-18L-2-59Q66-24 43 16L14 31Q29-8-8-10L-12 14-58 6Z" fill="${color}" opacity=".85"/><path d="M-84 20Q-28-16 22 15L37-3Q34-21 8-32L2-9Q-35-19-84 20Z" fill="#fff0ff"/><path d="M-155 27L-65 22M-108-17L-40-6" stroke="${color}" stroke-width="3"/>`;
 }else if(id==='luke'){
 art=`<path d="M-140-13L-40-31 11-19 27-47 50-23 59 0 45 24 8 31-50 15-145 18-90 1Z" fill="${color}" opacity=".68"/><path d="M-55-9L9-19 36-7 46 3 23 16-37 8-100 12-54 1Z" fill="#fff9de"/><path d="M-175-25L-55-17M-142 31L-43 21M-87-47L-26-31" stroke="${color}" stroke-width="2"/>`;
 }else if(id==='ken'){
 art=`<path d="M-136-10Q-95-34-60-20L-72-43Q-30-47-10-25L-9-51Q24-45 43-21 64 2 41 26 15 49-12 30L-41 45-50 22Q-95 36-131 17L-89 3Z" fill="#ee652f" opacity=".65"/><path d="M-88-4Q-52-22-25-9L-31-30Q0-24 30-10 49 4 28 21 9 35-16 17L-44 25-35 8Z" fill="#ffc264"/><path d="M-28-12Q5-24 25-8 39 6 20 18-1 27-23 11L-42 13-25 2Z" fill="#fff5d0"/><path d="M-125-24L-92-18M-105 33L-68 23M-51-48L-26-35" stroke="#ffd395" stroke-width="1.6"/>`;
 }else if(id==='chun'){
 art=`<ellipse cx="0" cy="0" rx="51" ry="38" fill="#7ae7e6" opacity=".19"/><path d="M-117-9Q-63-37-20-24 27-51 52-16 68 8 37 30 6 48-25 26L-73 32-47 12-107 17-66 1Z" fill="#72d9df" opacity=".62"/><path d="M-34-15Q-2-33 27-16 49 0 28 19 4 35-25 18L-47 19-30 5-60-1Z" fill="#efffed"/><path d="M-63-23Q-5-61 42-22M-57 24Q3 55 43 24M-84-7Q-47-22-25-16" fill="none" stroke="#ecfff2" stroke-width="1.8"/><path d="M-103-22L-70-17M-101 31L-63 21" stroke="#85e6e9" stroke-width="1.3"/>`;
 }else if(id==='cammy'){
 art=`<path d="M-133-17Q-68-54-6-32 45-35 54 0 42 39-8 34-70 53-130 22Q-82 23-56 10-87 0-133-17Z" fill="#b4eaff" opacity=".16"/><path d="M-118-21Q-38-58 39-19M-129 19Q-37 54 44 16M-83-3Q-17-30 45-1M-166-8L-92-7" stroke="#e9ffff" stroke-width="2" fill="none"/><path d="M-13-28Q22-28 36-8 48 7 26 25" stroke="#abdbe9" stroke-width="5" opacity=".65" fill="none"/>`;
 }else{
 // Ryu keeps the rounded, breathing wave silhouette of the user's preferred original art.
 art=`<path d="M-129-9Q-78-29-24-21L8-35 39-21 57 0 36 27-5 30-45 13Q-86 20-128 10L-85 1Z" fill="#4e99dc" opacity=".49"/><path d="M-108-5L-43-12-9-22 28-9 42 2 20 14-27 10-81 6Z" fill="#78deee" opacity=".67"/><ellipse rx="65" ry="49" fill="url(#energy-${id})" opacity=".62"/><ellipse cx="4" rx="27" ry="23" fill="#efffff" opacity=".87"/><g data-spin="energy"><path d="M-34-28Q27-55 46-6 57 29-10 35M-40 4Q-43 42 22 23M-18-33Q-37-8-13 14" fill="none" stroke="#dfffff" stroke-width="2.2" opacity=".9"/></g><path d="M-92-18L-58-21M-115 15L-78 16M-67 30L-42 25" stroke="#87e4ed" stroke-width="2" opacity=".72"/>`;
 if(m.pierce)art+=mark('M-43-41L-21-49-8-37 8-45 25-34M-30 36L-13 45 1 33 17 40','#f2ffff',1.4);

 }
 if(sup)art+=`<path d="M-90-60Q48-124 87-15M-61 72Q68 85 84 14" stroke="#f0ffff" stroke-width="4" fill="none"/><path d="M-205-29L-122-19M-178 35L-108 22M-125-81L-74-53" stroke="${color}" stroke-width="4"/>`;
 const g=el('g',{transform:`scale(${sup?1.68:id==='mai'?.74:low?.88:1})`},n);g.innerHTML=art;if(id==='iori'){const base=sup?1.68:.88;sa(g,'transform',`translate(0 ${45-44*base}) scale(${base})`)}
 const pose=desiredPose(f),rig=poseRig(f,pose),hand=['luke','mai','iori'].includes(id)?rig.frontArm[2]:lerp2(rig.frontArm[2],rig.rearArm[2],.5),origin=poseWorldPoint(f,hand,pose,true);
 const s={node:n,visual:g,spin:g.querySelector('[data-spin]'),spinKind:g.querySelector('[data-spin]')?.getAttribute('data-spin'),owner:f,x:origin[0]+f.dir*23,y:low?FLOOR+f.y-45:origin[1],dir:f.dir,v:(m.speed||12)+(sup?4:0),m,hits:m.hits,r,life:sup?180:105,cool:0,damage:m.damage/m.hits,age:0};n.setAttribute('transform',`translate(${s.x} ${s.y}) scale(${s.dir} 1)`);G.shots.push(s);sound('wave');}
function updateFX(){if(!G.hitstop)for(const s of G.shots){s.age++;if(s.spin)sa(s.spin,'transform',s.spinKind==='energy'?`rotate(${s.age*10})`:`rotate(${s.age*27}) translate(-47 0)`);else if(s.owner.ch.id==='iori'){const base=s.m.super?1.68:.88,sy=base*(1+Math.sin(s.age*.58)*.055);sa(s.visual,'transform',`translate(0 ${(45-44*sy).toFixed(2)}) scale(${base} ${sy.toFixed(3)})`)}}for(let p of [...G.fx]){p.life--;p.x+=p.vx;p.y+=p.vy;if(p.kind==='spark')p.vy+=.13;const q=1-p.life/p.max;p.node.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot}) ${p.mirror?`scale(${p.mirror} 1)`:''} ${p.kind==='impact'?`scale(${(.6+outCubic(Math.min(q*2,1))*.7)*(p.impactScale||1)})`:''}`);p.node.setAttribute('opacity',p.kind==='impact'?Math.max(0,1-q*q):p.life/p.max);if(p.kind==='ring'){p.node.setAttribute('rx',p.size+q*63);p.node.setAttribute('ry',(p.size+q*63)*.75)}if(p.life<=0){p.node.remove();G.fx.splice(G.fx.indexOf(p),1)}}for(let p of [...G.ghosts]){p.life--;p.node.setAttribute('opacity',p.life/p.max*.28);if(p.life<=0){p.node.remove();G.ghosts.splice(G.ghosts.indexOf(p),1)}}G.shake=G.shake<.15?0:G.shake*.8;G.flash=G.flash<.002?0:G.flash*.68;if(G.superFx>0)G.superFx--;}
function superCrest(id,col){if(id==='mai')return`<g transform="translate(-13 0) rotate(-28) scale(.57)">${fanArt(CHARACTERS.find(c=>c.id==='mai'))}</g>`;if(id==='iori')return flat('M20-40C-18-51-46-23-36 9-26 42 8 49 32 25C3 35-18 13-16-10-13-24 1-37 20-40Z',col)+mark('M-29-27L7 22M-18-34L20 17M-39-13L-5 31','#f8ebff',1.1);if(id==='ken')return`<g transform="rotate(-60) scale(.6)">${flameArt('#c34934',col,'#fff0c2')}</g>`;if(id==='juri')return mark('M-41 19Q3-47 38-30M-34 36Q18-18 47-6M-36-7Q-7-45 11-47',col,4);if(id==='luke')return mark('M-35-24L12-13 29 0 11 16-38 26M-5-36Q52 0-3 38',col,4);if(id==='cammy')return mark('M-41-2Q-16-48 24-27 52-1 16 25-15 42-33 13-43-12-12-24 18-21',col,3.5);if(id==='chun')return mark('M-39 10Q-16-45 22-31 50-11 21 24-5 45-37 21M-24-25Q1-46 26-18',col,3);return mark('M-29-29Q1-53 30-24 51 3 25 31-9 51-37 16-48-15-21-31M-39 0Q-7-22 38 2',col,3.7);}
function buildSuperFX(f,m){const col=SKILL_FX[f.ch.id].color,x=f.index?706:154;const name=m.name.replace('CRITICAL ART · ','');
 // A compact announcement occupies the space below the HUD; the actual attack stays visible.
 $('super-overlay').innerHTML=`<defs><linearGradient id="super-banner-fade"><stop stop-color="#0c1320" stop-opacity=".94"/><stop offset=".8" stop-color="#0c1320" stop-opacity=".75"/><stop offset="1" stop-color="#0c1320" stop-opacity="0"/></linearGradient></defs><g transform="translate(${x} 158)"><path d="M0 12L555 0 578 88 22 102Z" fill="url(#super-banner-fade)"/><path d="M0 12L540 0M21 102L565 88" fill="none" stroke="${col}" stroke-width="1.5" opacity=".7"/><g transform="translate(61 51) scale(.63)">${superCrest(f.ch.id,col)}</g><text x="114" y="28" class="mono" font-size="10" letter-spacing="3" fill="${col}">${m.ca?'CRITICAL ART':'SUPER ART '+m.super} · ${f.ch.name}</text><text x="111" y="64" class="svg-text" font-size="${name.length>14?22:26}" font-weight="800" fill="#fff3e1">${name}</text><path d="M114 80H${114+Math.min(m.super,3)*58}" stroke="${col}" stroke-width="2.7"/><path d="M510 25L520 36 510 48" fill="none" stroke="${col}" stroke-width="1.2" opacity=".6"/></g>`;
}

const enemy=f=>fighters[1-f.index];
function newInput(){return{held:new Set(),dirs:[],history:[],dir:5,queue:[],batch:null,chargeB:0,chargeD:0,savedB:0,savedD:0,releaseB:-99,releaseD:-99,lastButton:-99,touchX:0,touchY:0,lastDash:-99}}
function initFighter(f,index){Object.assign(f,{index,hp:10000,displayHp:10000,trailHp:10000,drive:6,super:G.mode==='training'?3:0,burnout:false,burnT:0,driveDelay:0,x:index?960:480,px:index?960:480,y:0,py:0,vy:0,vx:0,push:0,dir:index?-1:1,move:0,state:'idle',stateT:0,stateAge:0,attack:null,branchT:0,branchReady:0,denjin:0,stock:0,install:0,invuln:0,rushBuff:0,combo:0,comboDamage:0,comboTimer:0,comboScale:1,captured:false,captureKind:null,capturedBy:null,captureWasParry:false,capturePhase:0,captureX:0,captureY:0,throwAction:null,throwInvuln:0,juggle:0,knockOnLand:false,landT:0,landMax:0,airLock:false,parryAge:0,parryPaid:0,aiWait:45,crouch:false,input:newInput(),lastMove:'准备就绪',lastMessage:0,lastHitTick:-99,lastThrow:-99,hitstun:0,blockstun:0,walkT:0,pose:null,downPoseFrom:null,tumbleFrom:null,roundResult:null,_attackAtContact:null,_renderSignature:null,_poseSimulationFrame:null,aiGuard:false,aiParry:false,win:false,lastHitDamage:0,perfectScale:1,jumpPre:0,jumpDir:0,ai:null});const track=$('input-'+f.id);if(track)track.replaceChildren();const label=$('move-'+f.id);if(label)label.textContent='准备就绪';return f}
function clearBattleFX(){for(let a of [G.fx,G.shots,G.ghosts]){for(let e of a)e.node?.remove();a.length=0}for(let id of ['impact-fx','ground-fx','ghosts','projectiles','hitboxes'])$(id).replaceChildren();G.superFx=0;G.superOwner=null;G.hitstop=0;G.slow=0;G.shake=0;G.flash=0;G.pendingMelee=[];$('super-overlay').setAttribute('opacity',0)}
function makeFighters(){for(let f of fighters){f.root.remove();f.shadow.remove()}fighters=[];selected.forEach((id,i)=>fighters.push(initFighter(createFighter(i?'k':'p',id,i?960:480,i?-1:1,i===1),i)));buildHUD()}
function setState(f,state,t=0){f.state=state;f.stateT=t;f.stateAge=0;if(!['attack','stance'].includes(state))f.attack=null;f.move=0;if(state!=='attack'&&f.y===0)f.airLock=false;if(['hit','tumble','down','rise','captured','throwing','stun','ko'].includes(state)){f.crouch=false;f.jumpPre=0;f.aiGuard=false;f.aiParry=false}}
function notify(f,text){f.lastMove=text;f.lastMessage=G.tick;$('move-'+f.id).textContent=text;const n=$('call-'+f.id);if(n)n.textContent=text}
function pushHistory(f,v,isDir=false){f.input.history.push({v,dir:isDir,t:G.tick});if(f.input.history.length>20)f.input.history.shift();const tr=$('input-'+f.id);if(tr){tr.innerHTML=f.input.history.slice(-10).map(e=>`<span class="input-token ${e.dir?'dir':'attack'}">${e.dir?ARROWS[e.v]:e.v}</span>`).join('')}}
const KEYMAP=[{KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',KeyJ:'LP',KeyK:'MP',KeyL:'HP',KeyU:'LK',KeyI:'MK',KeyO:'HK',KeyQ:'PAR',KeyE:'DI',KeyF:'RUSH',KeyV:'THROW'}, {ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Numpad1:'LP',Numpad2:'MP',Numpad3:'HP',Numpad4:'LK',Numpad5:'MK',Numpad6:'HK',Numpad0:'PAR',NumpadDecimal:'DI',NumpadAdd:'THROW',NumpadEnter:'RUSH'}];
const numDir=(x,y)=>y<0?(x<0?7:x>0?9:8):y>0?(x<0?1:x>0?3:2):(x<0?4:x>0?6:5);
const relative=(n,face)=>face===1?n:({1:3,3:1,4:6,6:4,7:9,9:7}[n]||n);
function updateDirection(f){if(f.input.deviceDirectionBatch)return;const ip=f.input;let x=(ip.held.has('right')?1:0)-(ip.held.has('left')?1:0),y=(ip.held.has('down')?1:0)-(ip.held.has('up')?1:0);if(ip.touchX||ip.touchY){x=ip.touchX;y=ip.touchY}const nd=numDir(x,y);if(nd!==ip.dir){ip.dir=nd;ip.dirs.push({n:nd,t:G.tick});if(ip.dirs.length>60)ip.dirs.shift();pushHistory(f,relative(nd,f.dir),true);const n=relative(nd,f.dir);if((n===4||n===6)&&G.tick-ip.lastDash>12){const z=ip.dirs.slice(0,-1).filter(e=>relative(e.n,f.dir)===n).at(-1),neutral=ip.dirs.at(-2)?.n===5;if(z&&G.tick-z.t<=15&&neutral){ip.lastDash=G.tick;if(n===6&&(f.state==='parry'||canRushCancel(f)))driveRush(f);else if(f.state==='idle'&&f.y===0){setState(f,'dash',n===6?17:20);f.vx=f.dir*(n===6?13:-11);notify(f,n===6?'前冲':'后撤')}}}}
}
function inputPress(f,b){if(f.input.held.has(b))return;f.input.held.add(b);if(['up','down','left','right'].includes(b)){updateDirection(f);return}f.input.lastButton=G.tick;pushHistory(f,b);if(['PAR','DI','RUSH','THROW'].includes(b)){performButton(f,b);return}const list=b==='PP'?['LP','MP']:b==='KK'?['LK','MK']:[b];if(!f.input.batch)f.input.batch={buttons:new Set(),t:G.tick};list.forEach(x=>f.input.batch.buttons.add(x))}
function inputRelease(f,b){f.input.held.delete(b);if(['up','down','left','right'].includes(b))updateDirection(f);if(f.state==='parry'&&!isParryHeld(f)&&G.tick-f.parryStart>3){setState(f,'recovery',12)}if(f.attack?.m.kind==='charge'&&f.attack.holding&&BUTTONS.includes(b)){const a=f.attack,held=a.holdTicks;a.holding=false;a.m={...a.m,damage:Math.round(a.m.damage*(held>=18?1.5:1)),launch:held>=18?-11:0,stun:held>=18?40:a.m.stun};if(held>=18&&held<=24){a.m.damage=Math.round(a.m.damage*1.15);a.perfect=true;notify(f,'PERFECT · 完美闪光拳');burst(f.x+f.dir*90,FLOOR+f.y-250,f.ch.color,14)}a.t=a.m.startup-2}}
function isParryHeld(f){return f.input.held.has('PAR')||(f.input.held.has('MP')&&f.input.held.has('MK'))||f.aiParry}
function motion(f,pattern,age=39){const ip=f.input;if(pattern==='chargeB')return [3,6,9].includes(relative(ip.dir,f.dir))&&ip.savedB>=39&&G.tick-ip.releaseB<14;if(pattern==='chargeD')return [7,8,9].includes(relative(ip.dir,f.dir))&&ip.savedD>=39&&G.tick-ip.releaseD<14;
const p=pattern.split('').map(Number),events=ip.dirs.filter(e=>G.tick-e.t<=(p.length>4?75:age));const nonNeutral=events.filter(e=>e.n!==5);if(!nonNeutral.length||relative(nonNeutral.at(-1).n,f.dir)!==p.at(-1))return false;if(pattern==='22'){let e=events.slice();while(e.length&&e.at(-1).n===5)e.pop();let z=e.slice(-3);return z.length===3&&relative(z[0].n,f.dir)===2&&z[1].n===5&&relative(z[2].n,f.dir)===2&&G.tick-z[2].t<14}let idx=p.length-1,last=-1;
// Direction order is preserved. Neutral releases are ignored, not invented.
for(let j=events.length-1;j>=0;j--){const d=relative(events[j].n,f.dir);if(d===5)continue;if(idx===p.length-1){if(d!==p[idx]){if(G.tick-events[j].t>9)return false;continue}last=events[j].t;if(G.tick-last>14)return false}if(d===p[idx]){idx--;if(idx<0)return true}else if(j>0&&idx===p.length-1)return false}
return false}
function consumeMotion(f){f.input.dirs=[{n:f.input.dir,t:G.tick}];f.input.savedB=0;f.input.savedD=0;f.input.chargeB=0;f.input.chargeD=0}
function canRushCancel(f){return !!(f.attack&&f.attack.confirmed&&f.attack.m.category==='normal'&&f.attack.m.cancel&&G.tick-f.attack.confirmTick<=20&&f.attack.t<f.attack.m.total-2)}
function canCancel(f,m){const a=f.attack;if(!a)return false;if(!a.confirmed||G.tick-(a.confirmTick??G.tick)>20)return false;if(f.install>0&&m.category==='normal'&&a.m.id!==m.id)return true;if(a.m.category==='normal'&&a.m.cancel&&['special','super','branch'].includes(m.category))return true;if(['special','branch'].includes(a.m.category)&&m.category==='super'&&(m.super===3||a.m.od&&m.super>=2))return true;return false}
function canAirFollow(f,m){const a=f.attack;return !!(a&&m?.category==='branch'&&m.from===a.m.id&&a.confirmed&&G.tick-a.confirmTick<=20&&a.t<a.m.total)}
function spendDrive(f,n){if(G.mode==='training'&&$('infinite').checked)return true;if(f.burnout||f.drive+1e-6<n){notify(f,f.burnout?'BURNOUT · 斗气疲劳':'斗气不足');return false}f.drive=Math.max(0,f.drive-n);f.driveDelay=90;if(f.drive<=.001)burnout(f);return true}
function burnout(f){if(f.burnout)return;f.burnout=true;f.drive=0;f.burnT=0;notify(f,'BURNOUT · 斗气疲劳');burst(f.x,FLOOR-200,'#a5a6b3',12)}
function startParry(f){if(!['idle','parry'].includes(f.state)||f.y<0||f.attack)return false;if(f.state==='parry')return true;if(!spendDrive(f,.5))return false;setState(f,'parry');f.parryAge=0;f.parryStart=G.tick;f.parryPaid=.5;notify(f,'DRIVE PARRY · 斗气招架');return true}
function driveRush(f){if(f.y<0)return false;let cancel=canRushCancel(f),parry=f.state==='parry';if(!(cancel||parry||f.state==='idle'))return false;const cost=cancel?3:parry?.5:1;if(!spendDrive(f,cost))return false;setState(f,'rush',25);f.vx=f.dir*20;f.rushBuff=80;notify(f,cancel?'CANCEL RUSH · 取消迸发 −3':'DRIVE RUSH · 斗气迸发 −1');burst(f.x-f.dir*30,FLOOR-75,'#9bff6b',20);sound('wave');return true}
function performButton(f,b){if(G.phase!=='fight'||G.paused)return false;if(b==='PAR')return startParry(f);if(b==='RUSH')return driveRush(f);if(b==='THROW'){f.lastThrow=G.tick;if(f.state==='captured'&&f.captureKind==='throw')return escapeThrow(f);return requestMove(f,getMove(f,relative(f.input.dir,f.dir)===4?'backthrow':'throw'))}if(b==='DI'){const rel=relative(f.input.dir,f.dir);return requestMove(f,getMove(f,f.state==='block'&&[3,6,9].includes(rel)?'REV':'DI'))}}
function canRekkaContinue(f,m){const a=f.attack;return !!(a&&m?.rekkaFrom&&a.m.rekkaNext===m.id&&(a.m.base===m.rekkaFrom||a.m.id===m.rekkaFrom)&&a.confirmed&&G.tick-a.confirmTick<=20)}
function interpret(f,bs){if(G.phase!=='fight')return;const b=[...bs],p=b.filter(x=>x.endsWith('P')),k=b.filter(x=>x.endsWith('K')),isP=p.length>0,kind=isP?'P':'K',st=Math.max(...b.map(x=>BUTTONS.indexOf(x)%3),0),od=isP?p.length>=2:k.length>=2;let m=null;
if(b.includes('LP')&&b.includes('LK'))return performButton(f,'THROW');if(b.includes('HP')&&b.includes('HK'))return performButton(f,'DI');if(b.includes('MP')&&b.includes('MK'))return performButton(f,'PAR');
if(isP&&f.attack?.m.rekkaNext&&!motion(f,'236236')&&!motion(f,'214214')){const next=getMove(f,f.attack.m.rekkaNext);if(canRekkaContinue(f,next)){consumeMotion(f);return requestMove(f,next)}}
if(f.attack?.confirmed&&!f.attack.m.rekkaNext&&(b.includes('HP')||b.includes('HK'))){const from=f.attack.m.id,route=b.includes('HP')?'HP':'HK',follow=MOVES[f.ch.id].find(x=>x.from===from&&x.followBtn===route);if(follow){requestMove(f,follow);return}}
if(f.branchT>0&&G.tick>=f.branchReady&&(!f.attack||f.attack.m.kind==='stance'||['run','flip','rekka'].includes(f.attack.m.kind))){m=getMove(f,'branch_'+BUTTONS.indexOf(b[0]));if(m){requestMove(f,m);return}}
if(motion(f,isP?'214214':'236236'))m=getMove(f,isP?'SA2':'SA3');else if(isP&&motion(f,'236236'))m=getMove(f,'SA1');
if(!m&&motion(f,'22')&&!isP)m=getMove(f,'stance');
if(!m&&f.ch.id==='ryu'&&isP&&motion(f,'22'))m=getMove(f,'DENJIN');
if(!m&&f.ch.id==='chun'&&isP&&motion(f,'214'))m=getMove(f,'stance');
if(!m){let defs=BASESPECIALS[f.ch.id].filter(d=>d[3]===kind&&!!(d[9]?.air)===(f.y<-10));defs.sort((a,b)=>{const order={623:0,chargeB:1,chargeD:1,22:2,214:3,236:4};return(order[a[2]]??9)-(order[b[2]]??9)});for(const d of defs){if(motion(f,d[2])){m=getMove(f,d[0]+'_'+(od?3:st));break}}}
if(!m&&f.ch.id==='ken'&&k.length>=2)m=getMove(f,'stance');
if(m){consumeMotion(f);return requestMove(f,m)}
const state=f.y<-8?'a':[1,2,3].includes(relative(f.input.dir,f.dir))?'c':'s';m=getMove(f,state+b[0]);if(m)requestMove(f,m)
}
function requestMove(f,m,buffer=true){if(!m||G.phase!=='fight'||f.hp<=0||f.captured||f.state==='throwing'||f.landT>0||f.airLock&&f.y<-1&&!(m.super&&canCancel(f,m)||canAirFollow(f,m)))return false;if(m.id==='PAR')return startParry(f);if(m.id==='RUSH')return driveRush(f);if(m.id==='CA'&&f.hp>2500){notify(f,'CA 需要生命不高于25%');return false}if(m.id==='SA3'&&f.hp<=2500)m=getMove(f,'CA');
const previousAttack=f.attack;if(m.base&&previousAttack?.m.rekkaNext&&m.base===(previousAttack.rekkaRoot||previousAttack.m.base)){const next=getMove(f,previousAttack.m.rekkaNext);if(canRekkaContinue(f,next))m=next}
if(m.air&&f.y>=-8){notify(f,'该招式需要在空中发动');return false}if(!m.air&&f.y<-15&&!['branch','super'].includes(m.category)&&!['dive'].includes(m.kind)){return false}
const specialState=m.id==='REV'&&f.state==='block',branch=m.category==='branch'&&(m.rekkaFrom?canRekkaContinue(f,m):m.from?f.attack?.m.id===m.from&&f.attack.confirmed:f.branchT>0&&G.tick>=f.branchReady);const free=['idle','dash','rush','stance'].includes(f.state)||f.state==='parry'&&!m.cost;
if(!(free&&!f.attack||specialState||branch||canCancel(f,m))){if(buffer){f.input.queue=[{m,t:G.tick}]}return false}
if(m.id==='REV'&&f.state!=='block'){notify(f,'斗气反击需要处于防御硬直');return false}if(m.category==='branch'&&!branch)return false;
if(m.super){if(f.super<m.super&&!(G.mode==='training'&&$('infinite').checked)){notify(f,'超级能量不足 · 需要 '+m.super+' 格');return false}if(!(G.mode==='training'&&$('infinite').checked))f.super-=m.super}
if(m.cost&&!spendDrive(f,m.cost))return false;
const rush=(f.rushBuff>0&&m.category==='normal');m={...m};if(rush){m.stun+=4;m.blockstun+=4;m.damage=Math.round(m.damage*1.05);f.rushBuff=0}
if(f.ch.id==='ryu'&&f.denjin>0&&['hadoken','hasho'].includes(m.base)){m.hits+=1;m.damage=Math.round(m.damage*1.25);m.pierce=true;f.denjin=0}
if(f.ch.id==='juri'&&f.stock>0&&m.category==='special'&&m.base!=='fuha'){f.stock--;m.damage=Math.round(m.damage*1.2);m.stun+=6;m.hits++}
setState(f,'attack');f.jumpPre=0;f.attack={m,t:0,confirmed:false,confirmTick:-999,hitConfirmed:false,hitsDone:new Set(),contacted:new Set(),armor:m.armor||0,holding:false,holdTicks:0,rush,projectileSent:false,rekkaRoot:m.rekkaFrom?(previousAttack?.rekkaRoot||previousAttack?.m.base):m.base};f.input.queue=[];f.crouch=m.normalState==='c';f.vx=0;f.invuln=m.invuln||0;if(m.air||m.kind==='upper')f.airLock=true;if(m.category==='branch'||m.rekkaNext||m.rekkaFrom)f.branchT=0;
if(m.kind==='stance'){f.branchT=100;f.branchReady=G.tick+8}
if(['run','flip','rekka'].includes(m.kind)&&!m.rekkaNext&&!m.rekkaFrom){f.branchT=100;f.branchReady=G.tick+m.startup+5}
if(m.kind==='flip'||(m.id==='stance'&&f.ch.id==='cammy')){f.vy=-12;f.vx=f.dir*6;f.y=-1}
if(m.kind==='dive'){f.vy=9;f.vx=f.dir*10}
if(m.kind==='leap'||m.kind==='overhead'){f.vy=m.kind==='leap'?-10.2:-8;f.y=-1}
if(m.super){G.hitstop=20+(m.ca?6:0);G.superFx=62+(m.ca?10:0);G.superOwner=f;buildSuperFX(f,m);sound('super');G.flash=.24}
notify(f,(rush?'DR · ':'')+m.name);return true}
function tryQueue(f){if(f.input.queue.length){let q=f.input.queue[0];if(G.tick-q.t>9)f.input.queue.shift();else requestMove(f,q.m,false)}}
function dust(x){for(let i=0;i<5;i++)particle(x+rand(-35,35),FLOOR+7,rand(-3,3),rand(-1.7,-.4),'#c8b4c1',rand(3,6),20,'dust')}
function blockIntent(d,m,a){if(m.throw)return false;if(d.attack||d.y<-8||!['idle','block'].includes(d.state))return false;const nd=relative(d.input.dir,d.dir),guard=d.aiGuard||[1,4,7].includes(nd);if(!guard)return false;let crouch=d.crouch||nd===1;if(G.mode==='training'&&d.index===1&&$('dummy').value==='guard')crouch=m.height==='low';if(m.height==='low'&&!crouch)return false;if(m.height==='overhead'&&crouch)return false;return true}
// A shared throw owns both bodies until release; damage belongs to the ground impact.
function escapeThrow(f){const a=f.throwAction;if(!a||a.target!==f||a.t>8||a.m.commandThrow)return false;const o=a.owner;a.done=true;o.throwAction=f.throwAction=null;f.captureKind=null;f.captured=false;for(const body of [o,f]){setState(body,'recovery',19);body.y=0;body.vy=0;body.vx=0;body.throwInvuln=26}o.push=-a.dir*4.5;f.push=a.dir*4.5;notify(f,'THROW ESCAPE · 拆投');burst((o.x+f.x)/2,FLOOR-230,'#edfaff',12);sound('block');G.hitstop=5;return true}
function beginThrow(a,d,m){if(d.captured||d.throwInvuln>0||d.jumpPre>0||['hit','block','down','rise','stun','throwing','tumble'].includes(d.state))return 'immune';if(m.kind==='airthrow'?(a.y>=-8||d.y>=-8||Math.abs(d.y-a.y)>110):d.y<-8||a.y<-8)return 'miss';
 const action={owner:a,target:d,m,dir:a.dir,back:!!m.backthrow,originX:a.x,originY:a.y,t:0,release:26,impact:35,duration:52,done:false,damageDone:false};a.throwAction=d.throwAction=action;d.captured=true;d.captureKind='throw';d.capturePhase=0;d.captureY=d.y;d.captureX=d.x;a.vx=a.vy=a.push=d.vx=d.vy=d.push=0;d.input.queue=[];a.input.queue=[];setState(a,'throwing',52);setState(d,'captured');notify(a,m.name);sound('throw');if(!m.commandThrow&&G.tick-d.lastThrow<=8)escapeThrow(d);return 'grab'}
function tickThrowActions(){for(const f of fighters){const a=f.throwAction;if(!a||a.owner!==f||a.done)continue;const d=a.target;a.t++;f.dir=a.dir;d.dir=-a.dir;f.move=d.move=0;
 if(a.t<=a.release){const grip=clamp(a.t/4,0,1),side=a.back?-1:1;let placement=throwTargetPlacement(a);if(grip===1){const edgeShift=clamp(placement.x,105,1335)-placement.x;if(edgeShift){f.x=clamp(f.x+edgeShift,105,1335);placement=throwTargetPlacement(a)}}d.capturePhase=a.t/a.release;d.x=clamp(mix(d.captureX,placement.x,grip),105,1335);d.y=mix(d.captureY,placement.y,grip);d.vy=d.vx=d.push=0;
  if(a.t===a.release){d.captured=false;d.captureKind=null;setState(d,'tumble');d.knockOnLand=true;d.tumbleFrom='throw';d.y=Math.min(-65,d.y);d.vy=-2.7;d.vx=a.dir*side*7.4;d.hitHeight='mid';d.lastHitTick=G.tick;f.stateT=a.duration-a.t;sound('throw')}
 }
 if(a.t>a.release&&f.y<0){f.y+=f.vy;f.vy+=.7;if(f.y>=0){f.y=0;f.vy=0;dust(f.x)}}
 if(a.t>=a.duration){a.done=true;f.throwAction=null;if(a.damageDone&&d.throwAction===a)d.throwAction=null;if(f.state==='throwing'){setState(f,f.y<0?'recovery':'idle');if(f.y<0)f.airLock=true}}
}}
function throwImpact(d){const a=d.throwAction;if(!a||a.target!==d||a.damageDone)return;a.damageDone=true;const f=a.owner,m=a.m,damage=Math.round(m.damage*(d.captureWasParry?1.2:1));d.hp=Math.max(0,d.hp-damage);d.lastHitDamage=damage;d.lastHitTick=G.tick;f.lastHitTick=G.tick;f.combo=1;f.comboTimer=55;f.comboDamage=damage;G.stats.damage=damage;G.stats.maxCombo=Math.max(1,G.stats.maxCombo);combatEvent('throw',f,d,m,damage);f.super=clamp(f.super+.16,0,3);d.super=clamp(d.super+.1,0,3);G.hitstop=Math.max(G.hitstop,9);G.shake=Math.max(G.shake,11);burst(d.x,FLOOR-40,f.ch.color,12,'throw',{owner:f,move:m,last:true,direction:a.dir});if(a.done)d.throwAction=null}
function combatEvent(type,a,d,m,damage=0){G.lastCombatEvent={tick:G.tick,type,attacker:a.index,defender:d.index,move:m.id,damage};if(!G.combatEvents)G.combatEvents=[];G.combatEvents.push(G.lastCombatEvent);if(G.combatEvents.length>24)G.combatEvents.shift()}
function noteConfirm(a,result,sourceAttack=a.attack){if(!a.attack||a.attack!==sourceAttack)return;a.attack.confirmed=true;a.attack.confirmTick=G.tick;a.attack.contactResult=result;if(result==='hit')a.attack.hitConfirmed=true}
function contact(attacker,defender,m,hitIndex=0,projectile=false){const a=attacker,d=defender,shot=projectile&&typeof projectile==='object'?projectile:null,hitDir=shot?.dir||a.dir,sourceAttack=shot?(shot.sourceAttack||null):projectile?null:a.attack;if(d.hp<=0&&!(d.captured&&d.capturedBy===a&&m.kind==='superrush')||d.invuln>0||['down','rise','ko','throwing'].includes(d.state)||d.captureKind==='throw')return 'immune';if(d.captured&&d.capturedBy&&d.capturedBy!==a)return 'immune';
 if(m.throw){d.captureWasParry=d.state==='parry';return beginThrow(a,d,m)}
 const px=d.x-hitDir*36,py=FLOOR+d.y-(m.height==='low'?83:d.crouch?180:m.kind==='upper'?306:259);
 if(d.state==='parry'&&!d.burnout){const perfect=d.parryAge<=2;d.drive=clamp(d.drive+(perfect?1:.65),0,6);d.driveDelay=12;if(perfect){G.slow=18;G.hitstop=12;d.perfectScale=.5;d.rushBuff=45;notify(d,'PERFECT PARRY · 完美招架')}else{G.hitstop=4;notify(d,'PARRY · 招架成功')}d.parryAge=9;burst(px,py,perfect?'#d8c1ff':'#83c3ff',perfect?12:6,'parry');sound('parry');combatEvent('parry',a,d,m);return 'parry'}
 if(d.attack?.armor>0&&!m.super){d.attack.armor--;d.hp=Math.max(1,d.hp-Math.round(m.damage/m.hits*.3));burst(px,py,'#ffa267',8);G.hitstop=4;notify(d,'ARMOR · 霸体吸收');return 'armor'}
 if(blockIntent(d,m,a)){const burn=d.burnout;let chip=burn&&['special','super','branch'].includes(m.category)?Math.round(m.damage/m.hits*.16):0;d.hp=Math.max(0,d.hp-chip);if(!burn){d.drive-=m.kind==='impact'?1.2:m.category==='normal'?.12:.24;if(d.drive<=0)burnout(d)}d.driveDelay=60;const wasCrouch=d.crouch;setState(d,'block',m.blockstun+(burn?4:0));d.crouch=wasCrouch;d.push=hitDir*(m.super?2.5:1.8);d.blockstun=d.stateT;d.throwInvuln=Math.max(d.throwInvuln,d.stateT+5);noteConfirm(a,'block',sourceAttack);burst(px,py,'#82c6ec',7,'block',{owner:a,move:m,direction:hitDir});G.hitstop=4;sound('block');if(m.kind==='impact'&&(d.x<145||d.x>1295)){setState(d,burn?'stun':'hit',burn?110:45);d.invuln=0;notify(d,burn?'STUN · 疲劳角落眩晕':'WALL SPLAT · 崩墙');G.shake=10;burst(d.x,py,'#fa91c8',18)}combatEvent('block',a,d,m,chip);return 'block'}
 const comboActive=a.comboTimer>0&&(d.state==='hit'||d.state==='tumble'||d.captured||G.tick-d.lastHitTick<10),count=comboActive?a.combo+1:1,scale=Math.max(.25,1-(count-1)*.085)*a.perfectScale;
 if(d.juggle>=9&&d.y<-5&&!m.super)return 'immune';let damage=Math.round(m.damage/Math.max(1,m.hits)*scale);const opposing=d.attack||d._attackAtContact,counter=!!opposing&&opposing.t<opposing.m.startup,punish=!!opposing&&opposing.t>=opposing.m.startup+opposing.m.active;if(counter&&!m.super)damage=Math.round(damage*1.12);if(punish&&!m.super)damage=Math.round(damage*1.2);
 d.hp=Math.max(0,d.hp-damage);d.lastHitDamage=damage;d.hitHeight=m.height;d.lastHitTick=G.tick;a.combo=count;a.comboTimer=75;a.comboDamage=count===1?damage:a.comboDamage+damage;a.lastHitTick=G.tick;G.stats.damage=damage;G.stats.maxCombo=Math.max(G.stats.maxCombo,count);noteConfirm(a,'hit',sourceAttack);combatEvent('hit',a,d,m,damage);
 const last=hitIndex>=m.hits-1,superLock=m.kind==='superrush'&&!last;setState(d,'hit',m.stun+(counter?2:punish?5:0));d.hitstun=d.stateT;d.throwInvuln=d.stateT+5;d.captured=superLock;d.capturedBy=superLock?a:null;d.captureKind=superLock?'super':null;
 if(superLock){d.x=clamp(a.x+hitDir*170,105,1335);d.y=-Math.abs(Math.sin(hitIndex*.8))*45;d.vy=d.vx=d.push=0;d.stateT=45}else{d.push=hitDir*(m.knock/8);if(m.launch||d.y<-5||m.knockdown&&last){setState(d,'tumble');d.knockOnLand=true;d.tumbleFrom=m.kind;d.vy=m.launch||m.knockdown&&last?-Math.max(5,Math.min(15,Math.abs(m.launch||-7))):Math.min(-2,d.vy);if(d.juggle>0)d.vy=Math.max(d.vy,-Math.max(3,11-d.juggle));d.y=Math.min(-1,d.y);d.vx=hitDir*Math.min(6.5,m.knock/12);d.juggle++}else d.vy=Math.min(0,d.vy)}
 if(m.kind==='impact'){d.stateT=50;d.push=hitDir*9;d.drive=Math.max(0,d.drive-1.5);if(d.drive===0)burnout(d);G.shake=13;burst(px,py,'#ff8658',18);if(d.x<145||d.x>1295){notify(d,'WALL SPLAT · 崩墙');d.stateT=d.burnout?110:55}}
 if(!m.super)a.super=clamp(a.super+.045+damage/10500,0,3);d.super=clamp(d.super+.035+damage/19000,0,3);if(!a.burnout&&m.category==='normal')a.drive=clamp(a.drive+.08,0,6);
 G.flash=m.super?.1:.025;G.hitstop=Math.max(G.hitstop,m.super?6:m.level>=3?7:m.level===2?5:3);G.shake=Math.max(G.shake,m.super?10:m.level>=3?6:3);burst(px,py,m.od?'#ffe8a1':a.ch.color,m.super?16:8,'hit',{owner:a,move:m,last,direction:hitDir});sound(m.super?(last?'superfinish':'superhit'):m.level>=3?'heavy':'hit');if(counter)notify(a,'COUNTER · '+m.name);else if(punish)notify(a,'PUNISH · '+m.name);if(last&&m.super){d.knockOnLand=true;setState(d,'tumble');d.vy=-10;d.vx=hitDir*6;d.push=hitDir*4;d.captured=false;d.captureKind=null;d.capturedBy=null;G.shake=14;burst(px,py,'#fff2c7',20)}return 'hit'}
const overlapCombat=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function combatBounds(points,pad=0,part='body'){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-pad,y=Math.min(...ys)-pad;return{x,y,w:Math.max(...xs)-x+pad,h:Math.max(...ys)-y+pad,part}}
function getCombatGeometry(f){const p=desiredPose(f),rig=poseRig(f,p),world=(point,arm=false)=>poseWorldPoint(f,point,p,arm),s=f.ch.scale;
 const rect=(x,y,w,h,part,arm=false)=>combatBounds([[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(q=>world(q,arm)),0,part);
 const hurt=[rect(-32,-368,70,64,'head',true),rect(-44,-301,91,123,'torso',true),combatBounds([world(rig.rearLeg[0]),world(rig.rearLeg[1]),world(rig.rearLeg[2])],15*s,'rear-leg'),combatBounds([world(rig.frontLeg[0]),world(rig.frontLeg[1]),world(rig.frontLeg[2])],15*s,'front-leg')];
 const hit=[],throws=[],a=f.attack,m=a?.m,active=!!a&&a.t>=m.startup&&a.t<m.startup+m.active;
 if(active&&!m.kind.includes('projectile')&&m.damage>0){if(m.throw){throws.push(rect(0,-300,Math.min(158,m.range),230,'throw'))}else{
  const kick=m.contactPart?m.contactPart==='foot':m.pose==='kick'||['drill','dive','spin'].includes(m.kind)||m.pose==='upper'&&f.ch.female,limb=kick?rig.frontLeg:rig.frontArm,end=world(limb[2],!kick),joint=world(limb[1],!kick);const tip=kick?25:24;
  if(m.contactPart==='fan'){const fan=poseWeaponGeometry(f,p,rig);if(fan.length)hit.push(combatBounds([end,...fan],8*s,'fan'))}else if(m.weaponReach){const dx=end[0]-joint[0],dy=end[1]-joint[1],len=Math.hypot(dx,dy)||1;hit.push(combatBounds([end,[end[0]+dx/len*m.weaponReach*s,end[1]+dy/len*m.weaponReach*s]],21*s,m.contactPart||'weapon'))}hit.push(combatBounds([end],tip*s,kick?'foot':'fist'));hit.push(combatBounds([end,[mix(end[0],joint[0],.72),mix(end[1],joint[1],.72)]],(kick?18:15)*s,kick?'shin':'forearm'));
  if(m.kind==='spin'&&kick){const r=rig.rearLeg;hit.push(combatBounds([world(r[1]),world(r[2])],23*s,'rear-kick'))}
  if(['upper','impact','reversal','superrush','drill','rush','run','burst'].includes(m.kind)){const h=m.kind==='upper'?175:m.height==='low'?83:110,y=m.kind==='upper'?-392:m.height==='low'?-113:-315,w=m.kind==='burst'?Math.min(m.range,215):m.kind==='superrush'?190:147;hit.push(rect(24,y,w,h,'energy',false))}
 }}return{hurt,hit,throw:throws,push:{x:f.x-53*s,y:FLOOR+f.y-260*s,w:106*s,h:250*s}}}
function meleeContact(f,m,index,geometry=null){const d=enemy(f);if(!d)return false;if(m.kind==='superrush'&&d.captured&&d.capturedBy===f)return contact(f,d,m,index);if(d.hp<=0)return false;const a=geometry?.attack||getCombatGeometry(f),b=geometry?.defend||getCombatGeometry(d);if(m.throw){if(!a.throw.some(x=>b.hurt.some(y=>overlapCombat(x,y))))return false}else if(!a.hit.some(x=>b.hurt.some(y=>overlapCombat(x,y))))return false;
 if(m.height==='low'&&d.y<-72)return false;return contact(f,d,m,index)}
// Both fighters advance before collision resolution, so simultaneous active frames can trade.
function resolveMelee(){const pending=(G.pendingMelee||[]).map(e=>({...e,geometry:{attack:getCombatGeometry(e.f),defend:getCombatGeometry(enemy(e.f))}}));for(const f of fighters)f._attackAtContact=f.attack;pending.sort((a,b)=>Number(!!a.m.throw)-Number(!!b.m.throw));for(const e of pending){if(e.m.throw&&e.f.attack!==e.a)continue;const res=meleeContact(e.f,e.m,e.idx,e.geometry);if(res&&!['immune','miss'].includes(res))e.a.hitsDone.add(e.idx)}for(const f of fighters)f._attackAtContact=null;G.pendingMelee=[]}
function tickInput(f){const ip=f.input;updateDirection(f);const rel=relative(ip.dir,f.dir);if([1,4,7].includes(rel))ip.chargeB++;else if(ip.chargeB){ip.savedB=ip.chargeB;ip.releaseB=G.tick;ip.chargeB=0}if([1,2,3].includes(rel))ip.chargeD++;else if(ip.chargeD){ip.savedD=ip.chargeD;ip.releaseD=G.tick;ip.chargeD=0}
if(ip.batch&&G.tick-ip.batch.t>=2){const bs=new Set(ip.batch.buttons);for(const b of BUTTONS)if(ip.held.has(b)&&ip.batch.buttons.has(b)===false&&G.tick-ip.lastButton<=3)bs.add(b);ip.batch=null;interpret(f,bs)}
if(isParryHeld(f)&&f.state==='idle'&&!f.attack)startParry(f)}
function playerMovement(f){const rel=relative(f.input.dir,f.dir);f.crouch=[1,2,3].includes(rel)&&f.y===0;const dx=(f.input.dir===4||f.input.dir===1||f.input.dir===7)?-1:([3,6,9].includes(f.input.dir)?1:0);f.move=0;if(['idle','recovery'].includes(f.state)&&!f.attack){if(f.state==='idle'){if([7,8,9].includes(rel)&&f.y===0&&!f.jumpPre){f.jumpPre=4;f.jumpDir=dx}if(f.jumpPre>0&&f.y===0){f.jumpPre--;if(!f.jumpPre){f.y=-1;f.vy=-15;f.vx=f.jumpDir*5.7;dust(f.x)}}else if(!f.crouch&&f.y===0&&!f.jumpPre){f.move=dx;f.x+=dx*f.ch.speed*(rel===4?.76:1)}}}
}
// Decisions are held for a short interval. The brain sees delayed public frames,
// including telegraphed attacks; it cannot read the opponent's current input.
const AI_PROFILES={
 ryu:{combo:['burst','spin','upper'],range:310,zone:.72,aggression:.46,jump:.08,throw:.17,label:'波动控距'},
 ken:{combo:['rekka','spin','upper'],range:200,zone:.24,aggression:.83,jump:.1,throw:.25,label:'疾跑压制'},
 chun:{combo:['barrage','spin','upper'],range:255,zone:.44,aggression:.6,jump:.1,throw:.18,label:'步法牵制'},
 cammy:{combo:['drill','rush','upper'],range:185,zone:.08,aggression:.88,jump:.22,throw:.3,label:'突袭近身'},
 luke:{combo:['charge','upper'],range:255,zone:.48,aggression:.65,jump:.09,throw:.21,label:'拳击确反'},
 juri:{combo:['barrage','store','upper'],range:220,zone:.27,aggression:.8,jump:.16,throw:.25,label:'高低连携'},
 mai:{combo:['spin','rush','upper'],range:335,zone:.8,aggression:.5,jump:.21,throw:.18,label:'花蝶诱空'},
 iori:{combo:['rekka','rush','upper'],range:185,zone:.22,aggression:.91,jump:.12,throw:.32,label:'葵花压制'}
};
function aiVoluntaryAir(frame){return !!frame&&!['hit','tumble','captured','throwing','stun','down','rise','ko'].includes(frame.state)&&frame.attack?.kind!=='upper'}
function aiBrain(f){if(!f.ai)f.ai={history:[],nextDecision:0,plan:{kind:'wait',until:G.tick+24},lastSample:-9,lastPerceived:-9,observed:null,lastOpponentMove:'',jumps:0,shots:0,guards:0,commits:0,lastAttack:-999,lastSuper:-999,lastRush:-999,lastJump:-999,lastThrow:-999,lastDefense:-999,lastStance:-999,lastProjectile:-999,comboAttack:null,confirmReady:0,goal:'观察开局'};return f.ai}
function aiObserve(f,b){const d=enemy(f);if(!d)return null;if(G.tick-b.lastSample>=3){b.lastSample=G.tick;const a=d.attack;b.history.push({t:G.tick,x:d.x,y:d.y,vy:d.vy,state:d.state,stateT:d.stateT,crouch:d.crouch,hp:d.hp,attack:a?{id:a.m.id,kind:a.m.kind,height:a.m.height,range:a.m.range,startup:a.m.startup,active:a.m.active,total:a.m.total,t:a.t,throw:!!a.m.throw}:null,projectiles:G.shots.filter(s=>s.owner===d&&s.life>0).map(s=>({x:s.x,y:s.y,v:s.v,dir:s.dir,r:s.r}))});if(b.history.length>28)b.history.shift()}
 const delay=G.difficulty==='hard'?9:G.difficulty==='easy'?23:15;const obs=b.history.findLast(s=>G.tick-s.t>=delay);if(obs&&obs.t!==b.lastPerceived){b.lastPerceived=obs.t;const key=obs.attack?obs.attack.id+':'+Math.floor((obs.t-obs.attack.t)/12):'';if(key&&key!==b.lastOpponentMove){if(obs.attack.kind.includes('projectile'))b.shots=Math.min(12,b.shots+1);b.lastOpponentMove=key}if(obs.y<-35&&b.observed?.y>=-35&&aiVoluntaryAir(obs))b.jumps=Math.min(12,b.jumps+1);if(['block','parry'].includes(obs.state))b.guards=Math.min(100,b.guards+1);else b.guards=Math.max(0,b.guards-.2);b.observed=obs}return b.observed}
function aiChoose(list){return list.length?list[Math.floor(Math.random()*list.length)]:null}
function aiSetPlan(f,kind,frames,extra={}){const b=aiBrain(f);b.plan={kind,until:G.tick+frames,...extra};b.nextDecision=G.tick+frames;b.goal=extra.goal||kind;return b.plan}
function aiAttack(f,m,reason='牵制'){if(!m)return false;const b=aiBrain(f);if(requestMove(f,m,false)){b.lastAttack=G.tick;if(m.kind.includes('projectile'))b.lastProjectile=G.tick;b.commits++;b.goal=reason;aiSetPlan(f,'wait',Math.max(7,m.startup),{goal:reason});return true}return false}
function aiSpecial(f,kind,strength=1){for(const k of Array.isArray(kind)?kind:[kind]){const found=MOVES[f.ch.id].find(m=>m.category==='special'&&m.kind===k&&!m.air&&m.strength===strength&&(!m.cost||f.drive>=m.cost)&&!m.commandThrow);if(found)return found}return null}
function aiCombo(f,b,obs){const a=f.attack;if(!a)return false;if(b.comboAttack!==a){b.comboAttack=a;b.confirmReady=0;b.comboTried=false}if(!a.confirmed||b.comboTried)return false;if(!b.confirmReady)b.confirmReady=G.tick+(G.difficulty==='hard'?3:G.difficulty==='easy'?10:6);if(G.tick<b.confirmReady)return false;b.comboTried=true;const hard=G.difficulty==='hard',easy=G.difficulty==='easy';if(easy&&Math.random()<.63)return false;
 if(a.hitConfirmed&&f.super>=1&&G.tick-b.lastSuper>420){const lv=f.super>=3?3:f.super>=2&&obs.hp<2700?2:1;if((a.m.category==='normal'||lv===3||a.m.od&&lv>=2)&&(obs.hp<2300||f.hp<3800||lv===3)&&Math.random()<(hard?.85:.6)){if(aiAttack(f,getMove(f,'SA'+lv),'命中确认 · 超级追击')){b.lastSuper=G.tick;return true}}}
 if(a.m.rekkaNext){const next=getMove(f,a.m.rekkaNext);return canRekkaContinue(f,next)&&aiAttack(f,next,a.hitConfirmed?'葵花确认续段':'葵花压制续段')}
 const follow=MOVES[f.ch.id].filter(m=>m.from===a.m.id&&!m.throw);if(follow.length)return aiAttack(f,aiChoose(follow),a.hitConfirmed?'派生确认':'派生压制');
 if(a.m.category==='normal'&&a.m.cancel){if(a.hitConfirmed&&f.drive>=4&&G.tick-b.lastRush>250&&Math.random()<.23){if(driveRush(f)){b.lastRush=G.tick;aiSetPlan(f,'approach',10,{goal:'取消迸发追击'});return true}}
  const dist=Math.abs(obs.x-f.x),k=a.hitConfirmed?dist<200?(AI_PROFILES[f.ch.id]?.combo||['barrage','upper']):['rush','drill','burst']:['projectile','lowprojectile','burst'];const next=aiSpecial(f,k,a.hitConfirmed&&f.drive>=4&&Math.random()<.25?3:0);if(next)return aiAttack(f,next,a.hitConfirmed?'确认连段':'安全收尾')
 }return false}
function runAIPlan(f,b){const p=b.plan;f.move=0;f.aiGuard=false;f.aiParry=false;if(!p)return;const free=['idle','rush','dash','stance','parry'].includes(f.state)&&!f.attack;
 if(p.kind==='guard'){f.aiGuard=true;f.crouch=p.low!==false;if(free&&f.y===0&&f.state==='idle'&&p.backstep){f.move=-f.dir;f.x-=f.dir*f.ch.speed*.55}return}
 if(p.kind==='parry'){f.aiParry=true;if(f.state==='idle')startParry(f);return}
 if(!free)return;f.crouch=false;
 if(p.kind==='approach'||p.kind==='retreat'){if(f.y<0||f.state!=='idle')return;const sign=p.kind==='retreat'?-1:1;f.move=f.dir*sign;f.x+=f.move*f.ch.speed*(sign<0?.76:1);if(sign<0)f.aiGuard=true}
 if(p.kind==='jump'&&!p.started&&f.y===0){p.started=true;f.jumpPre=4;f.jumpDir=f.dir*(p.back?-1:1)}
 if(p.kind==='jump'&&f.jumpPre>0&&f.y===0){f.jumpPre--;if(f.jumpPre===0){f.y=-1;f.vy=-15;f.vx=f.jumpDir*5.4;dust(f.x)}}
}
function updateAI(f){const b=aiBrain(f),obs=aiObserve(f,b);f.move=0;if(!obs)return;const profile=AI_PROFILES[f.ch.id]||AI_PROFILES.ryu,hard=G.difficulty==='hard',easy=G.difficulty==='easy',dist=Math.abs(obs.x-f.x),corner=f.x<205||f.x>1235;
 // Early defenses are guesses held before contact. A captured AI cannot react in 0F.
 if(f.state==='captured'){if(f.captureKind==='throw'&&f.throwAction?.t===7&&hard&&Math.random()<.18&&!f.throwAction.m.commandThrow){f.lastThrow=G.tick;escapeThrow(f)}return}
 if(f.attack){aiCombo(f,b,obs);return}
 if(f.state==='block'){f.aiGuard=true;if(G.tick-b.lastDefense>170&&f.drive>=3&&f.stateAge>8&&hard&&obs.attack?.kind==='impact'){if(requestMove(f,getMove(f,'REV'),false))b.lastDefense=G.tick}return}
 if(!['idle','rush','dash','stance','parry'].includes(f.state)){f.aiGuard=false;f.aiParry=false;return}
 if(f.y<-30){f.aiGuard=false;if(f.vy>-4&&dist<245&&G.tick-b.lastAttack>20){const dive=MOVES[f.ch.id].find(m=>m.air&&m.category==='special'&&m.strength===0);aiAttack(f,dive&&Math.random()<profile.jump*2?dive:getMove(f,dist<185?'aMP':'aHK'),'空中接近')}return}
 if(f.branchT>0&&G.tick>=f.branchReady&&(f.state==='stance'||f.state==='idle')){const choices=MOVES[f.ch.id].filter(m=>m.category==='branch'&&!m.from&&!m.rekkaFrom&&!m.throw&&m.kind!=='dive'&&(dist<280||m.kind.includes('projectile')||m.travel));aiAttack(f,aiChoose(choices),'架势派生');return}
 if(G.tick<b.nextDecision){runAIPlan(f,b);return}
 const attack=obs.attack,observedAge=attack?attack.t+(G.tick-obs.t):0,threat=attack&&dist<Math.min(390,attack.range+75)&&observedAge<attack.startup+attack.active+7;
 const projectile=obs.projectiles.find(s=>s.dir*(f.x-s.x)>0&&Math.abs(f.x-s.x)<320&&Math.abs(FLOOR+f.y-230-s.y)<220);
 const pause=easy?15:hard?7:10;
 // Vertical movement is visible well before an attack button. Anti-air obeys a reaction delay.
 if(obs.y<-65&&obs.vy<8&&dist<270&&f.y===0&&aiVoluntaryAir(obs)){if(Math.random()<(easy?.25:hard?.78:.54)+Math.min(.15,b.jumps*.025)){const anti=aiSpecial(f,'upper',f.drive>=3&&Math.random()<.2?3:0);if(aiAttack(f,anti||getMove(f,'cHP'),'观察跳入 · 对空'))return}aiSetPlan(f,'guard',16,{low:false,goal:'防守跳入'});runAIPlan(f,b);return}
 if(projectile&&f.y===0){if(Math.random()<.56-Math.min(.14,b.shots*.018)){aiSetPlan(f,f.drive>1.2&&Math.random()<.27?'parry':'guard',18,{low:projectile.y>FLOOR-160,goal:'应对飞行道具'});runAIPlan(f,b);return}if(G.tick-b.lastJump>190&&dist>300){b.lastJump=G.tick;aiSetPlan(f,'jump',40,{goal:'越过飞行道具'});runAIPlan(f,b);return}}
 if(threat){const overhead=attack.height==='overhead'&&attack.t>=9,low=overhead?false:Math.random()>.15;if(attack.kind==='impact'&&hard&&G.tick-b.lastDefense>140&&f.drive>=2&&attack.t<18){if(aiAttack(f,getMove(f,'DI'),'观察冲击 · 反制')){b.lastDefense=G.tick;return}}if(Math.random()<(easy?.48:hard?.88:.72)){aiSetPlan(f,'guard',pause+9,{low,backstep:dist>210,goal:overhead?'站防中段':'低防牵制'});runAIPlan(f,b);return}}
 // A whiff only becomes punishable once its public active frames have finished.
 if(attack&&observedAge>=attack.startup+attack.active&&observedAge<attack.total-3&&dist<305){const left=attack.total-observedAge,normal=dist<170?'sLP':dist<215?'sMP':'cMK',m=getMove(f,normal);if(left>=m.startup-2&&aiAttack(f,m,'观察收招 · 确反'))return;if(left>16&&dist<280&&aiAttack(f,aiSpecial(f,['rush','drill'],0),'挥空追击'))return}
 if(obs.state==='down'||obs.state==='rise'){if(dist>185){aiSetPlan(f,'approach',Math.min(16,Math.ceil((dist-172)/f.ch.speed)),{goal:'击倒后接近'});runAIPlan(f,b);return}aiSetPlan(f,'guard',pause+4,{low:true,goal:'压起身 · 防逆转'});runAIPlan(f,b);return}
 const leading=f.hp-obs.hp>1700&&G.clock<32*60,target=profile.range+(leading?100:0),ownShot=G.shots.some(s=>s.owner===f&&s.life>0);
 if(f.ch.id==='mai'&&(ownShot||G.tick-b.lastProjectile<150)&&!attack&&!projectile&&dist>245&&dist<430&&!f.burnout&&G.tick-b.lastStance>360&&Math.random()<.5){if(aiAttack(f,getMove(f,'stance'),'花蝶牵制后 · 忍术架势')){b.lastStance=G.tick;return}}
 if(dist>390&&!attack&&!projectile&&G.tick-b.lastAttack>70){if(f.ch.id==='ryu'&&!f.denjin&&Math.random()<.2&&aiAttack(f,getMove(f,'DENJIN'),'观察空档 · 电刃蓄力'))return;if(f.ch.id==='juri'&&!f.stock&&Math.random()<.26&&aiAttack(f,getMove(f,'stance'),'风破储存'))return;if(f.ch.id==='juri'&&f.super>=2&&f.install<=0&&G.tick-b.lastSuper>600&&Math.random()<.3&&aiAttack(f,getMove(f,'SA2'),'风水引擎 · 开始压制')){b.lastSuper=G.tick;return}}
 if(b.jumps>=3&&dist>220&&dist<370&&profile.zone>.4&&Math.random()<.17){aiSetPlan(f,'guard',15,{low:false,goal:'识别跳跃习惯 · 等待对空'});runAIPlan(f,b);return}
 if(!easy&&dist<220&&(obs.x<185||obs.x>1255)&&f.drive>=3&&G.tick-b.lastDefense>210&&Math.random()<.085){if(aiAttack(f,getMove(f,'DI'),'角落冲击')){b.lastDefense=G.tick;return}}

 if(dist>target+55){if(dist>360&&Math.random()<profile.zone&&!ownShot&&G.tick-b.lastAttack>45){if(aiAttack(f,aiSpecial(f,['projectile','lowprojectile'],Math.random()<.3?2:0),'远距牵制'))return}if(dist>450&&profile.aggression>.7&&f.drive>=3&&G.tick-b.lastRush>230){if(driveRush(f)){b.lastRush=G.tick;aiSetPlan(f,'approach',21,{goal:'斗气迸发接近'});return}}aiSetPlan(f,'approach',Math.min(24,Math.max(pause,Math.ceil((dist-target)/f.ch.speed))),{goal:leading?'保持优势距离':'建立攻击距离'});runAIPlan(f,b);return}
 if(dist<target-55&&!corner&&Math.random()<.3+profile.zone*.25){aiSetPlan(f,'retreat',pause+8,{goal:'后撤诱空'});runAIPlan(f,b);return}
 if(dist<165&&G.tick-b.lastThrow>160&&Math.random()<profile.throw+(b.guards>12?.18:0)&&!['hit','block'].includes(obs.state)){const command=MOVES[f.ch.id].find(m=>m.commandThrow&&m.strength===0);const m=command&&Math.random()<.5?command:getMove(f,corner?'backthrow':'throw');if(aiAttack(f,m,corner?'背投脱角':'近身破防')){b.lastThrow=G.tick;f.lastThrow=G.tick;return}}
 if(!ownShot&&dist>285&&Math.random()<profile.zone&&G.tick-b.lastAttack>35&&aiAttack(f,aiSpecial(f,['projectile','lowprojectile'],0),'波与步法'))return;
 if(dist<290&&Math.random()<profile.aggression*.24&&G.tick-b.lastAttack>25){const kinds=obs.crouch?['overhead','leap']:['barrage','rekka','charge','rush','drill'];if(aiAttack(f,aiSpecial(f,kinds,0),'改变进攻节奏'))return}
 if(dist>220&&dist<410&&G.tick-b.lastJump>240&&Math.random()<profile.jump){b.lastJump=G.tick;aiSetPlan(f,'jump',38,{back:corner&&Math.random()<.25,goal:'跳跃改变节奏'});runAIPlan(f,b);return}
 if(dist<300&&Math.random()<profile.aggression+.08){const names=dist<172?['sLP','cLP','sMP','sLK']:dist<225?['sMP','cMP','cMK','sMK']:['cMK','sHK','cHK'];if(aiAttack(f,getMove(f,aiChoose(names)),dist<172?'近身牵制':'中距试探'))return}
 aiSetPlan(f,Math.random()<.5&&!corner?'retreat':'guard',pause+7,{low:Math.random()>.15,goal:'等待对手出错'});runAIPlan(f,b)
}
function updateFighter(f){f.stateAge++;if(f.invuln>0)f.invuln--;if(f.throwInvuln>0)f.throwInvuln--;if(f.landT>0)f.landT--;if(f.install>0)f.install--;if(f.rushBuff>0)f.rushBuff--;if(f.branchT>0)f.branchT--;if(f.driveDelay>0)f.driveDelay--;if(f.comboTimer>0){f.comboTimer--;if(!f.comboTimer){f.combo=0;f.comboDamage=0;f.perfectScale=1}}
if(f.burnout){f.burnT++;f.drive=Math.min(6,f.drive+6/840);if(f.drive>=6){f.burnout=false;notify(f,'DRIVE RECOVERED · 斗气恢复')}}else if(f.driveDelay===0&&f.state!=='parry')f.drive=Math.min(6,f.drive+(f.attack?.002:.006));
if(f.state==='parry'){f.parryAge++;if(!f.burnout&&!(G.mode==='training'&&$('infinite').checked)){f.drive-=1/60;if(f.drive<=0){burnout(f);setState(f,'recovery',15)}}if(f.aiParry&&f.parryAge>24){f.aiParry=false;setState(f,'idle')}if(!isParryHeld(f)&&f.parryAge>5&&!f.aiParry)setState(f,'recovery',12)}
if(f.stateT>0){f.stateT--;if(!f.stateT&&!f.attack){if(f.state==='down'){setState(f,'rise',18);f.invuln=18;f.throwInvuln=26}else if(f.state==='rise'){setState(f,'idle');f.invuln=1;f.throwInvuln=8;f.juggle=0;f.knockOnLand=false;f.ai&&aiSetPlan(f,'guard',G.difficulty==='easy'?8:5,{low:true,goal:'起身防守'})}else if(f.y<0&&['hit','stun'].includes(f.state)){setState(f,'tumble');f.knockOnLand=true;f.captured=false;f.captureKind=null;f.capturedBy=null}else if(!['tumble','captured','throwing'].includes(f.state)){setState(f,'idle');f.captured=false;f.captureKind=null;f.capturedBy=null}}}
if(f.captured&&f.captureKind==='throw')return;
if(f.state==='throwing'){f.x=clamp(f.x,105,1335);return} 
if(f.state==='rush'||f.state==='dash'){f.x+=f.vx;f.vx*=.955;f.walkT+=.45;if(f.state==='rush'&&G.tick%4===0)ghost(f)}
if(f.attack){const a=f.attack,m=a.m;if(m.kind==='charge'&&a.t>=m.startup-3&&!a.holding&&!a.chargeResolved&&!f.ai&&BUTTONS.some(b=>f.input.held.has(b))){a.holding=true;a.chargeResolved=true}
if(a.holding){a.holdTicks++;if(a.holdTicks>=36){a.holding=false;a.m={...m,damage:Math.round(m.damage*1.4),launch:-10,stun:38};a.t=m.startup-2}}else a.t++;
if(m.kind==='denjin'&&a.t===m.startup){f.denjin=1;burst(f.x,FLOOR-220,f.ch.color,16);notify(f,'DENJIN READY · 电刃储存')}
if(m.kind==='install'&&a.t===m.startup){f.install=600;f.stock=3;notify(f,'FENG SHUI ENGINE · 风水引擎 10秒');burst(f.x,FLOOR-230,f.ch.color,25)}
if(m.kind==='store'&&a.t===m.startup)f.stock=Math.min(3,f.stock+1);
if(m.kind==='stance'&&a.t>=m.total){f.attack=null;setState(f,'stance',75);if(f.ch.id==='juri')f.stock=Math.min(3,f.stock+1)}
else if(a.t>=m.total){if(!a.confirmed&&!a.projectileSent&&m.damage>0)sound('whiff');f.attack=null;if(f.branchT>0&&['run','flip','rekka'].includes(m.kind))setState(f,'stance',f.branchT);else setState(f,f.y<0&&f.airLock?'recovery':'idle');if(f.y===0)f.vx=0}
else {
if(m.kind.includes('projectile')&&!a.projectileSent&&a.t>=m.startup){a.projectileSent=true;const firstShot=G.shots.length;spawnShot(f,m);for(const shot of G.shots.slice(firstShot)){shot.sourceAttack=a;shot.clashDurability=m.pierce?2:1;shot.travelled=0;shot.maxDistance=m.projectileDistance||Infinity;if(m.projectileLife)shot.life=m.projectileLife}}
if(m.travel&&a.t>=Math.max(1,m.startup-5)&&a.t<m.startup+m.active){f.x+=f.dir*m.travel*(m.kind==='superrush'&&a.confirmed?.08:1);if(G.tick%5===0&&(m.od||m.super))ghost(f)}
if(m.kind==='upper'&&a.t===m.startup){f.vy=-10-(m.strength||0);f.y=Math.min(-1,f.y)}
if(!m.kind.includes('projectile')&&m.damage>0&&a.t>=m.startup&&a.t<m.startup+m.active){let idx=Math.min(m.hits-1,Math.floor((a.t-m.startup)/(m.active/m.hits)));if(!a.hitsDone.has(idx)){G.pendingMelee.push({f,a,m,idx})}}
if(m.kind==='superrush'&&a.confirmed){const d=enemy(f);if(d.captured&&d.capturedBy===f){d.x=clamp(f.x+f.dir*185,90,1350);d.stateT=35;d.y=-Math.abs(Math.sin((a.t-m.startup)*.055))*70}}
}
}
if(f.y<0||f.vy!==0){if(!f.captured){f.y+=f.vy;f.vy+=.7;if(f.y>=0){const landingSpeed=f.vy;f.y=0;f.vy=0;if(f.knockOnLand||f.state==='tumble'){throwImpact(f);f.knockOnLand=false;f.downPoseFrom=f.pose?poseCopy(f.pose):null;setState(f,'down',25);f.invuln=25;f.throwInvuln=51;f.push=0;f.juggle=0;f.capturedBy=null;f.captureKind=null;groundImpact(f.x,f.ch.color,landingSpeed>10?1.25:1);sound('land');if(landingSpeed>8){G.shake=Math.max(G.shake,4);burst(f.x,FLOOR-12,'#d8c8a2',7)}}else if(f.airLock){dust(f.x);const recovery=f.attack?.m.kind==='upper'?10:6;setState(f,'recovery',recovery);f.landT=f.landMax=recovery}else if(f.attack?.m.air){dust(f.x);setState(f,'recovery',5);f.landT=f.landMax=5}else if(!f.attack){dust(f.x);f.landT=f.landMax=6}f.airLock=false;f.vx=0}else if(!['dash','rush'].includes(f.state))f.x+=f.vx}}
// A launch cannot recover to a standing pose until the body reaches the ground.
if(f.y<0&&f.state==='hit'&&!f.captured&&f.stateT<=0){setState(f,'tumble');f.knockOnLand=true}
if(f.captured&&f.captureKind==='super'){const owner=f.capturedBy;if(!owner?.attack||owner.attack.m.kind!=='superrush'){f.captured=false;f.captureKind=null;f.capturedBy=null;setState(f,'tumble');f.knockOnLand=true;f.vy=-3}}
f.x+=f.push;f.push*=.82;f.x=clamp(f.x,105,1335);f.walkT+=Math.abs(f.move)*.2;
if(G.mode==='training'&&$('autohp').checked&&G.tick-f.lastHitTick>155&&f.hp<10000&&!f.attack&&f.state==='idle'){f.hp=10000}
tryQueue(f)
}
function updateShots(){for(const s of [...G.shots]){if(s.life<=0){s.node.remove();const ix=G.shots.indexOf(s);if(ix>=0)G.shots.splice(ix,1);continue}s.life--;s.cool=Math.max(0,s.cool-1);const d=enemy(s.owner);
 // Multi-hit projectiles spend their active beats at contact instead of teleporting
 // through a target during the cooldown and losing the rest of their damage.
 if(s.lockedTarget&&(!d||d.hp<=0||d.captured||d.invuln>0||['down','rise','ko'].includes(d.state)))s.lockedTarget=null;
 const previousX=s.x;if(s.lockedTarget){s.x=d.x-s.dir*32;s.y=s.lockY+d.y}else s.x+=s.dir*s.v;s.travelled=(s.travelled||0)+Math.abs(s.x-previousX);
 if(s.travelled>(s.maxDistance||Infinity)){s.life=0;s.node.remove();const ix=G.shots.indexOf(s);if(ix>=0)G.shots.splice(ix,1);continue}
 if(d&&s.cool===0&&Math.abs(d.x-s.x)<s.r+220&&d.hp>0){const shotBox={x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2};if(getCombatGeometry(d).hurt.some(b=>overlapCombat(shotBox,b))){const res=contact(s.owner,d,s.m,s.m.hits-s.hits,s);if(res&&!['immune','miss'].includes(res)){s.hits--;s.cool=s.m.super?7:8;if(s.hits<=0){s.life=0;s.lockedTarget=null}else{s.lockedTarget=d;s.lockY=s.y-d.y;s.x=d.x-s.dir*32}}}}
 for(const o of G.shots){if(o!==s&&o.life>0&&s.life>0&&o.owner!==s.owner&&Math.abs(o.x-s.x)<s.r+o.r*.65&&Math.abs(o.y-s.y)<s.r+o.r*.65){if(s.m.super&&!o.m.super)o.life=0;else if(!s.m.super&&o.m.super)s.life=0;else{const left=s.clashDurability??1,right=o.clashDurability??1,cancelled=Math.min(left,right);s.clashDurability=left-cancelled;o.clashDurability=right-cancelled;if(s.clashDurability<=0)s.life=0;if(o.clashDurability<=0)o.life=0;burst((s.x+o.x)/2,(s.y+o.y)/2,'#ccf3ee',8);const survivor=s.life>0?s:o.life>0?o:null;if(survivor?.m.pierce)notify(survivor.owner,'DENJIN PIERCE · 电刃抵消后继续')}}}
 if(s.life<=0||s.x<-200||s.x>1640){s.node.remove();const ix=G.shots.indexOf(s);if(ix>=0)G.shots.splice(ix,1)}else s.node.setAttribute('transform',`translate(${s.x} ${s.y}) scale(${s.dir} 1)`)} }
function announce(main,sub='',opacity=1){$('announce-main').textContent=main;$('announce-sub').textContent=sub;$('announce').setAttribute('opacity',opacity)}
function finishRound(){if(G.phase!=='fight'||G.mode==='training')return;let [a,b]=fighters,winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;G.phase='ko';G.phaseT=160;G.hitstop=16;if(winner>=0)G.wins[winner]++;fighters.forEach((f,i)=>{f.roundResult=i===winner?'win':'ko';f.captured=false;f.captureKind=null;f.capturedBy=null;f.throwAction=null;f.attack=null;f.push*=.5;f.knockOnLand=false;setState(f,f.y<0?(i===winner?'recovery':'tumble'):f.roundResult);if(f.y===0){f.vx=f.vy=0}f.input.held.clear();f.input.queue=[];f.aiGuard=false;f.aiParry=false});announce(G.clock<=0?'TIME UP':'K.O.',winner<0?'DOUBLE K.O.':fighters[winner].ch.name+' WINS');G.lastWinner=winner;sound('super')}
function tickRoundEnd(){for(const f of fighters){f.stateAge++;if(f.y<0||f.vy!==0){f.y+=f.vy;f.vy+=.7;f.x=clamp(f.x+f.vx+f.push,105,1335);f.push*=.82;if(f.y>=0){f.y=0;f.vy=f.vx=f.push=0;dust(f.x);setState(f,f.roundResult||'ko');if(f.state==='ko'){f.stateAge=20;sound('land');G.shake=Math.max(G.shake,6)}}}else if(f.state!==f.roundResult){setState(f,f.roundResult||'ko')}}}
function nextRound(){clearBattleFX();fighters.forEach((f,i)=>{const sup=f.super;initFighter(f,i);f.super=sup});G.round++;G.clock=99*60;G.phase='intro';G.phaseT=90;announce('ROUND '+G.round,'BEST OF THREE');updateHUD()}
function resetMatch(){clearBattleFX();G.wins=[0,0];G.round=1;G.clock=99*60;G.phase=G.mode==='training'?'fight':'intro';G.phaseT=90;G.result=false;G.paused=false;G.lastCombatEvent=null;G.combatEvents=[];G.stats.damage=0;G.stats.maxCombo=0;fighters.forEach((f,i)=>initFighter(f,i));$('pause-overlay').hidden=true;$('game-frame').classList.remove('is-paused');announce(G.mode==='training'?'':'ROUND 1',G.mode==='training'?'':'FIRST TO 2 WINS',G.mode==='training'?0:1);$('pause-btn').textContent='暂停';updateHUD()}
function simulate(force=false){if(G.screen!=='battle'||G.paused&&!force)return;G.tick++;for(const f of fighters){f.px=f.x;f.py=f.y}updateFX();for(let f of fighters)tickInput(f);
if(G.hitstop>0){G.hitstop--;updateHUD();return}
gameTime+=1/60;
if(G.phase==='intro'){G.phaseT--;if(G.phaseT===30)announce('FIGHT','');if(G.phaseT<=0){G.phase='fight';announce('','',0)}updateHUD();return}
if(G.phase==='ko'){G.phaseT--;tickRoundEnd();if(G.phaseT<=0){if(G.wins.some(n=>n>=2)){G.result=true;G.paused=true;showPause(true)}else nextRound()}updateHUD();return}
if(G.phase!=='fight')return;
if(G.slow>0){G.slow--;if(G.tick%2===0)return}
tickThrowActions();G.pendingMelee=[];
for(let f of fighters){const d=enemy(f);if(!f.attack&&!['down','rise','tumble','captured','throwing','ko','rush','dash','hit','block','stun'].includes(f.state)&&Math.abs(d.x-f.x)>10)f.dir=d.x>f.x?1:-1;const ai=G.mode==='demo'||f.index===1&&(G.mode==='cpu'||G.mode==='training'&&$('dummy').value==='cpu');if(ai)updateAI(f);else if(f.index===1&&G.mode==='training'){f.aiGuard=['guard','crouch'].includes($('dummy').value);f.crouch=$('dummy').value==='crouch';f.move=0}else playerMovement(f);updateFighter(f)}
resolveMelee();
const [a,b]=fighters,dist=Math.abs(a.x-b.x);if(dist<119&&Math.abs(a.y-b.y)<170&&!a.captured&&!b.captured&&!a.attack?.m.throw&&!b.attack?.m.throw&&a.state!=='throwing'&&b.state!=='throwing'&&a.state!=='down'&&b.state!=='down'){const sign=a.x<b.x?-1:1,shift=(119-dist)/2;a.x=clamp(a.x+sign*shift,105,1335);b.x=clamp(b.x-sign*shift,105,1335)}
updateShots();if(G.mode!=='training'){G.clock--;if(G.clock<=0||(a.hp<=0||b.hp<=0)&&!fighters.some(f=>f.hp<=0&&f.captured&&f.capturedBy?.attack?.m.kind==='superrush'))finishRound()}else{for(let f of fighters)if(f.hp<=0){f.hp=10000;f.invuln=50;notify(f,'TRAINING RESET · 木桩复位')}}updateHUD()}


function headRef(c){return 'v3-head-'+c.id}
function buildHUD(){fighters.forEach(f=>f.hudWins=-1);let s='<rect width="1440" height="178" fill="url(#hudTop)"/><rect y="707" width="1440" height="103" fill="url(#hudBottom)"/>';
for(let f of fighters){const r=f.index===1,x=r?807:176,barX=r?807:177,cn=r?1343:95; s+=`<path d="${r?'M1393 30H818L799 53H1275L1302 123H1393Z':'M47 30H622L641 53H165L138 123H47Z'}" fill="#282332b0" stroke="#70677b" stroke-opacity=".4"/><g transform="translate(${cn} 78) scale(${r?-.68:.68} .68)"><use href="#${headRef(f.ch)}" x="-50" y="-80" width="105" height="130"/></g><text x="${r?1259:180}" y="52" text-anchor="${r?'end':'start'}" class="condensed" fill="#f4f1eb" font-style="italic" font-size="25">${f.ch.name}</text><text x="${r?895:585}" y="50" text-anchor="${r?'start':'end'}" class="mono" font-size="10" fill="#b0a5bc">${r?(G.mode==='versus'?'2P':'CPU'):'1P'} / ${G.mode==='training'?'LAB':G.mode==='demo'?'AUTO':'CLASSIC'}</text><path d="M${barX-4} 62h459l8 30h-459Z" fill="#332734" stroke="#a294ab" stroke-width="1.3"/><rect x="${barX}" y="67" width="454" height="20" fill="#513a4c"/><rect id="trail-${f.id}" x="${barX}" y="67" width="454" height="20" fill="#e56c78"/><rect id="hp-${f.id}" x="${barX}" y="67" width="454" height="20" fill="url(#${r?'healthK':'healthP'})"/><path d="M${barX} 68h454" stroke="#ffffed" stroke-opacity=".6"/>
<g id="drive-${f.id}" transform="translate(${r?1254:187} 100) scale(${r?-1:1} 1)">${Array.from({length:6},(_,i)=>`<path id="d-${f.id}-${i}" d="M${i*42} 0h36l4 9h-36Z" fill="#d6ed95"/>`).join('')}</g><text id="resource-${f.id}" x="${r?1256:187}" y="130" text-anchor="${r?'end':'start'}" font-size="10" class="mono" letter-spacing="1" fill="#b9c4b2"></text><text id="call-${f.id}" x="${r?1354:84}" y="178" text-anchor="${r?'end':'start'}" font-size="15" class="svg-text" fill="${f.ch.color}" font-weight="700"></text><g id="combo-${f.id}" opacity="0"><text id="combo-num-${f.id}" x="${r?1355:82}" y="279" text-anchor="${r?'end':'start'}" class="condensed" font-style="italic" font-size="78" fill="${r?'#ffb5d9':'#def49e'}">0</text><text x="${r?1352:85}" y="302" text-anchor="${r?'end':'start'}" class="mono" font-size="13" letter-spacing="4" fill="#e4dfee">HITS</text><text id="damage-${f.id}" x="${r?1352:85}" y="324" text-anchor="${r?'end':'start'}" class="mono" font-size="11" fill="#afa5bd"></text></g>
<g transform="translate(${r?1046:48} 749)"><text x="${r?346:0}" y="-13" text-anchor="${r?'end':'start'}" class="mono" font-size="9" letter-spacing="2" fill="#c5b8cd">SUPER ART</text><rect width="346" height="16" fill="#1c1b2c" stroke="#695b7d"/><rect id="sa-${f.id}" x="0" y="0" width="346" height="16" fill="${r?'#e880d1':'#859bff'}"/><path d="M115 0v16M231 0v16" stroke="#272037" stroke-width="3"/><text id="sa-num-${f.id}" x="${r?-18:363}" y="21" text-anchor="${r?'end':'start'}" font-size="35" class="condensed" fill="${r?'#e99bd6':'#b0bbff'}">3</text></g><g id="round-${f.id}"></g>`;
}
s+='<path d="M686 28H754L783 80 754 127H686L657 80Z" fill="#171925" stroke="#a3a0b3"/><path d="M691 35H749L774 80 749 118H691L666 80Z" fill="none" stroke="#525069"/><text x="720" y="52" text-anchor="middle" class="mono" font-size="8" letter-spacing="3" fill="#b3a9bd">TIME</text><text id="timer" x="720" y="99" text-anchor="middle" font-size="51" class="condensed" fill="#fff8e8">99</text><text id="round-number" x="720" y="748" text-anchor="middle" class="mono" font-size="10" letter-spacing="3" fill="#b9a9c3">ROUND 01</text><text id="center-note" x="720" y="772" text-anchor="middle" class="svg-text" font-size="12" fill="#d1c5db"></text>';
$('hud').innerHTML=s;for(let f of fighters){f.hpEl=$('hp-'+f.id);f.trailEl=$('trail-'+f.id);f.driveEls=Array.from({length:6},(_,i)=>$('d-'+f.id+'-'+i));f.callEl=$('call-'+f.id)}updateHUD()}
function updateHUD(){if(!fighters.length||!$('timer'))return;for(const f of fighters){let r=f.index===1,barX=r?807:177;f.displayHp=mix(f.displayHp,f.hp,.33);f.trailHp=mix(f.trailHp,f.hp,.07);const hpw=+(454*f.displayHp/10000).toFixed(2),trw=+(454*f.trailHp/10000).toFixed(2);sa(f.hpEl,'width',hpw);sa(f.trailEl,'width',trw);if(r){sa(f.hpEl,'x',1261-hpw);sa(f.trailEl,'x',1261-trw)}for(let i=0;i<6;i++){sa(f.driveEls[i],'fill',f.burnout?'#a5a1ab':f.state==='rush'?'#8fff71':'#d6ed95');sa(f.driveEls[i],'opacity',i<f.drive?clamp(f.drive-i,.2,1):.15)}let trait=f.ch.id==='ryu'?'DENJIN '+(f.denjin?'READY':'—'):f.ch.id==='juri'?'FUHA '+f.stock+'/3'+(f.install>0?' · ENGINE '+Math.ceil(f.install/60)+'s':''):f.branchT>0?'FOLLOW-UP READY':'DRIVE '+f.drive.toFixed(1)+'/6';$('resource-'+f.id).textContent=f.burnout?'BURNOUT · '+Math.ceil((6-f.drive)/6*14)+'s':trait;sa(f.callEl,'opacity',clamp((160-G.tick+f.lastMessage)/35,0,1));$('sa-'+f.id).setAttribute('width',clamp(f.super,0,3)/3*346);$('sa-num-'+f.id).textContent=Math.floor(f.super+1e-6);$('combo-'+f.id).setAttribute('opacity',f.combo>1?1:0);$('combo-num-'+f.id).textContent=f.combo;$('damage-'+f.id).textContent=f.comboDamage+' DAMAGE';if(f.hudWins!==G.wins[f.index]){f.hudWins=G.wins[f.index];$('round-'+f.id).innerHTML=Array.from({length:2},(_,i)=>`<path d="M${r?823+i*23:617-i*23} 117l6 6-6 6-6-6Z" fill="${G.wins[f.index]>i?'#d8f477':'#4e475d'}"/>`).join('')}}
$('timer').textContent=G.mode==='training'?'∞':Math.max(0,Math.ceil(G.clock/60));$('round-number').textContent=G.mode==='training'?'TRAINING LAB':'ROUND '+String(G.round).padStart(2,'0');$('center-note').textContent=G.mode==='training'?'R 重置 · H 招式表 · N 暂停逐帧':'FIRST TO TWO · '+G.wins[0]+' — '+G.wins[1];$('training-stat').textContent='伤害 '+G.stats.damage+' · 最大连段 '+G.stats.maxCombo+' · '+(fighters[0].attack?fighters[0].attack.m.name+' '+fighters[0].attack.t+'F':'NEUTRAL');if($('showboxes').checked&&G.mode==='training')renderBoxes();else if($('hitboxes').childElementCount)$('hitboxes').replaceChildren()}
function renderBoxes(){let markup='';for(const f of fighters){if(typeof getCombatGeometry!=='function')continue;const g=getCombatGeometry(f);for(const [kind,color] of [['hurt','#66e9ed'],['hit','#ff5779'],['throw','#ffe289']])for(const b of g[kind]||[])markup+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2"/>`;} $('hitboxes').innerHTML=markup;}
function showPause(result=false){$('pause-overlay').hidden=false;$('pause-title').textContent=result?(G.lastWinner>=0?fighters[G.lastWinner].ch.name+' WINS':'DRAW'):'PAUSED';$('pause-text').textContent=result?'最终比分 '+G.wins[0]+' : '+G.wins[1]+' · 再来一局，或更换角色。':'回到战场，继续你的连段。';$('resume-btn').hidden=result;$('game-frame').classList.add('is-paused');$('pause-btn').textContent='继续'}
function pause(v){if(G.screen!=='battle'||G.result)return;G.paused=v;clearHeld();if(v)showPause();else{$('pause-overlay').hidden=true;$('game-frame').classList.remove('is-paused');$('pause-btn').textContent='暂停'}}
function clearHeld(){if(typeof resetInputDevices==='function')resetInputDevices();for(let f of fighters){f.input.held.clear();f.input.touchX=0;f.input.touchY=0;f.input.batch=null;f.input.queue=[];f.input.dir=5;f.aiParry=false}document.querySelectorAll('.pressed').forEach(n=>n.classList.remove('pressed'));$('stick-knob').style.transform=''}
function setSide(i){selectSide=i;for(let n=0;n<2;n++){$('side-'+n).classList.toggle('active',n===i);$('side-'+n).setAttribute('aria-pressed',n===i)}}
function updateSelection(){document.querySelectorAll('.fighter-card').forEach(n=>{let id=n.dataset.char;n.classList.toggle('p1',selected[0]===id);n.classList.toggle('p2',selected[1]===id);n.querySelector('.pick-badges').innerHTML=(selected[0]===id?'<span>1P</span>':'')+(selected[1]===id?'<span class="pink">2P</span>':'');n.setAttribute('aria-label',CHARACTERS.find(c=>c.id===id).cn+(selected[0]===id?'，玩家一已选':'')+(selected[1]===id?'，玩家二已选':''))});
for(let i=0;i<2;i++){let c=CHARACTERS.find(c=>c.id===selected[i]);$('preview-name-p'+(i+1)).textContent=c.name;$('preview-detail-p'+(i+1)).textContent=c.cn+' / '+c.style;const svg=$('preview-p'+(i+1));if(portraits[i]?.ch.id!==c.id){svg.replaceChildren();const f=createFighter('preview'+i,c.id,0,i?-1:1,false);f.shadow.remove();f.shadow=null;svg.appendChild(f.root);Object.assign(f,{state:'idle',hp:10000,x:180,y:0,move:0,install:0,attack:null,rushBuff:0});portraits[i]=f}svg.style.filter='drop-shadow(0 8px 22px '+c.color+'14)'}
}
function startBattle(){G.mode=$('mode').value==='arcade'?'cpu':$('mode').value;G.control=$('control').value;G.difficulty=$('difficulty').value;G.screen='battle';$('select-screen').hidden=true;$('battle-screen').hidden=false;$('screen-indicator').textContent='02 / '+(G.mode==='training'?'TRAINING LAB':'FIGHTING GROUND');$('training-bar').hidden=G.mode!=='training';$('match-label').textContent=({'cpu':'VERSUS CPU','versus':'LOCAL 2P','training':'TRAINING LAB','demo':'CPU SHOWCASE'}[G.mode])+' / '+selected.map(id=>CHARACTERS.find(c=>c.id===id).name).join(' vs ');$('battle-hint').innerHTML=G.control==='classic'?'经典搓招：<b>↓ ↘ → + J</b>　·　招架后前前：<b>Q + D D</b>':'辅助：<b>Z X C B</b> 必杀　·　<b>1 2 3</b> 超级必杀　·　经典搓招仍可用';document.querySelectorAll('[data-assist]').forEach(b=>{b.disabled=G.control!=='assist';b.title=G.control!=='assist'?'选人页选择“辅助”操作可用':'快捷指令，仍遵守能量和硬直'});makeFighters();resetMatch();$('stage-wrap').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'})}
function backToSelect(){clearHeld();clearBattleFX();G.screen='select';G.paused=false;G.result=false;$('battle-screen').hidden=true;$('select-screen').hidden=false;$('screen-indicator').textContent='01 / CHARACTER SELECT';$('game-frame').classList.remove('is-paused');updateSelection()}
function openManual(){if(G.screen==='battle')$('manual-character').value=fighters[0].ch.id;renderManual();openDialog('moves-dialog')}
let dialogPrevious=false;function openDialog(id){dialogPrevious=G.paused;if(G.screen==='battle'){G.paused=true;clearHeld()}$(id).showModal()}
for(let d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{if(G.screen==='battle')G.paused=dialogPrevious});
function renderManual(){const id=$('manual-character').value||'ryu',c=CHARACTERS.find(c=>c.id===id),cat=$('manual-category').value,q=$('move-search').value.toLowerCase();$('manual-note').textContent=c.cn+'：'+MOVES[id].filter(m=>m.category==='special').length+'项必杀变体，'+MOVES[id].filter(m=>m.category==='branch').length+'项派生。'+c.trait+' 本作所有指令以此表为准；派生架势、蛛俐部分输入和战斗数值经过 SVG 同人改编。';const list=MOVES[id].filter(m=>(cat==='all'||m.category===cat)&&[m.name,m.cmd,m.note||''].join(' ').toLowerCase().includes(q));$('manual-list').innerHTML=list.map(m=>`<article class="move-row"><div><h3>${m.name}</h3><small>${m.category.toUpperCase()} · ${m.damage?m.damage+' 基础伤害':'UTILITY'} · ${m.startup}F 启动 / ${m.active}F 持续 / ${m.recovery}F 恢复</small></div><div><div class="move-cmd">${m.cmd||''}</div><div class="move-detail">${m.note||''}</div></div><button data-practice="${m.id}" data-character="${id}" ${G.screen==='battle'&&G.mode==='training'?'':'disabled'}>练习此招</button></article>`).join('')||'<p>未找到匹配招式。</p>';for(let b of $('manual-list').querySelectorAll('[data-practice]'))b.onclick=()=>practiceMove(b.dataset.character,b.dataset.practice)}
function practiceMove(char,id){
 if(G.mode!=='training'||G.screen!=='battle')return false;
 const chosen=MOVES[char]?.find(m=>m.id===id);if(!chosen)return false;
 dialogPrevious=false;clearHeld();$('moves-dialog').close();clearBattleFX();G.paused=false;
 if(selected[0]!==char){selected[0]=char;makeFighters()}else fighters.forEach((f,i)=>initFighter(f,i));
 G.phase='fight';G.result=false;G.lastCombatEvent=null;G.combatEvents=[];
 const f=fighters[0],d=fighters[1];f.x=f.px=570;d.x=chosen.kind.includes('projectile')?850:f.x+(chosen.kind==='upper'?140:clamp(chosen.range*f.ch.scale-30,125,230));d.px=d.x;
 // The lab places the requested move at its legal training prerequisite. Build
 // predecessor attacks through the real request path so their confirmation,
 // cancel timing and attack bookkeeping match an ordinary combat frame.
 function prepare(entry,depth=0){
  if(!entry||depth>4)return false;
  const sourceKey=entry.rekkaFrom||entry.from;
  if(sourceKey){
   const source=getMove(f,sourceKey)||MOVES[char].find(m=>m.base===sourceKey&&m.strength===0);
   if(!prepare(source,depth+1)||f.attack?.m.id!==source.id)return false;
   f.attack.t=source.startup;noteConfirm(f,'hit',f.attack);
  }else if(entry.category==='branch'){
   const stance=getMove(f,'stance');if(!requestMove(f,stance,false))return false;
   f.attack.t=stance.startup;f.branchReady=G.tick;
  }
  if(entry.air||entry.kind==='airthrow'||entry.kind==='dive'){
   f.y=f.py=entry.kind==='dive'?-180:-140;f.vy=entry.kind==='dive'?-2:0;
   if(entry.kind==='airthrow'){d.y=d.py=f.y+15;d.vy=0;}
  }
  if(entry.id==='CA')f.hp=2400;
  if(entry.id==='REV')setState(f,'block',30);
  if(entry.id==='PAR')f.input.held.add('PAR');
  return requestMove(f,entry,false);
 }
 const started=prepare(chosen);if(!started)notify(f,'该招式的演示前置条件未满足');
 $('pause-overlay').hidden=true;$('game-frame').classList.remove('is-paused');$('pause-btn').textContent='暂停';$('stage-wrap').focus({preventScroll:true});return started;
}
function assist(f,s){if(G.control!=='assist'){notify(f,'辅助快捷键未启用 · 请用经典搓招');return false}if(s.startsWith('SA'))return requestMove(f,getMove(f,s));const idx=({special:0,special2:1,special3:2,special4:3})[s]??0;return requestMove(f,getMove(f,BASESPECIALS[f.ch.id][idx][0]+'_1'))}
$('roster').innerHTML=CHARACTERS.map((c,i)=>`<button class="fighter-card" data-char="${c.id}" style="--fighter-color:${c.color}"><span class="card-index">0${i+1}</span><svg viewBox="-100 -403 225 220" aria-hidden="true"><path d="M-120-230L170-410V-170H-120Z" fill="${c.color}" fill-opacity=".12"/><g id="card-art-${c.id}"></g></svg><span class="pick-badges"></span><span class="card-label">${c.name}<small>${c.cn}</small></span></button>`).join('');
for(const c of CHARACTERS){const cf=createFighter('card-'+c.id,c.id,0,1,false);renderFighter(cf,1,1);cf.shadow.remove();cf.shadow=null;$('card-art-'+c.id).appendChild(cf.facing);cf.root.remove();}
document.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>{selected[selectSide]=b.dataset.char;updateSelection();sound('parry')});$('side-0').onclick=()=>setSide(0);$('side-1').onclick=()=>setSide(1);$('start-btn').onclick=startBattle;$('back-btn').onclick=backToSelect;$('overlay-select').onclick=backToSelect;$('help-btn').onclick=()=>openDialog('help-dialog');$('moves-btn').onclick=openManual;
$('manual-character').innerHTML=CHARACTERS.map(c=>`<option value="${c.id}">${c.cn} / ${c.name}</option>`).join('');for(let id of ['manual-character','manual-category','move-search'])$(id).addEventListener('input',renderManual);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('pause-btn').onclick=()=>pause(!G.paused);$('resume-btn').onclick=()=>pause(false);$('rematch-btn').onclick=resetMatch;$('reset-btn').onclick=resetMatch;$('step-btn').onclick=()=>{if(!G.paused)pause(true);simulate(true)};
$('sound-btn').onclick=async()=>{try{const enabled=await setSoundEnabled(!soundOn);$('sound-btn').textContent='音效 '+(enabled?'开':'关');$('sound-btn').setAttribute('aria-pressed',enabled);if(enabled)sound('parry')}catch(e){toast('此浏览器未能启用 Web Audio 音效')}};
$('fullscreen-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-frame').requestFullscreen()}catch(e){toast('当前浏览器不支持全屏；可横屏或缩放窗口游玩')}};
let last=0,accumulator=0,frameN=0,fpsStamp=0;
function frame(now){if(!last)last=now;let dt=Math.min(80,now-last);last=now;frameN++;if(now-fpsStamp>750){G.fps=Math.round(frameN*1000/(now-fpsStamp));$('fps').textContent=G.fps;fpsStamp=now;frameN=0}
if(G.screen==='battle'){if(typeof pollGamepads==='function')pollGamepads();if(!G.paused){accumulator+=dt*((G.mode==='training'||G.mode==='demo')?(G.artSpeed||1):1);let steps=0;while(accumulator>=STEP&&steps<5){simulate();accumulator-=STEP;steps++}if(steps===5)accumulator=Math.min(accumulator,STEP)}else accumulator=0;let alpha=G.paused?1:clamp(accumulator/STEP,0,1);for(let f of fighters)renderFighter(f,G.paused||G.hitstop>0?0:Math.min(dt/1000,.04),alpha);sa($('camera'),'transform',artCamera(now));sa($('hit-flash'),'opacity',G.flash);sa($('super-overlay'),'opacity',G.superFx>0?clamp(Math.min((75-G.superFx)/8,G.superFx/15),0,.98):0)}else{gameTime+=dt/1000;for(let i=0;i<portraits.length;i++){const f=portraits[i];renderFighter(f,dt/1000,1);sa(f.root,'transform',`translate(166 438) scale(1.02)`);sa(f.facing,'transform',`scale(${i?-1:1} 1)`)} }
requestAnimationFrame(frame)}
// Inspectable, dependency-free development hooks. All gameplay still uses the same engine paths.
window.SVG_FIGHTER={version:'4.0-dev',characters:CHARACTERS,moves:MOVES,state:G,get fighters(){return fighters},start:(p1='ryu',p2='ken',mode='training',control='classic')=>{selected=[p1,p2];$('mode').value=mode;$('control').value=control;startBattle()},step:(n=1)=>{for(let i=0;i<n;i++)simulate(true)},press:(i,b)=>inputPress(fighters[i],b),release:(i,b)=>inputRelease(fighters[i],b),move:(i,id)=>requestMove(fighters[i],getMove(fighters[i],id)),motion:(i,p)=>motion(fighters[i],p),reset:resetMatch,setState,contact,practice:practiceMove,getMove,clearFX:clearBattleFX,pause,render:(dt=1/60)=>fighters.forEach(f=>renderFighter(f,dt,1)),pose:desiredPose,clip:clipFor,audit:()=>CHARACTERS.map(c=>({character:c.name,specials:MOVES[c.id].filter(m=>m.category==='special').length,branches:MOVES[c.id].filter(m=>m.category==='branch').length,supers:MOVES[c.id].filter(m=>m.category==='super').length,normals:MOVES[c.id].filter(m=>m.category==='normal').length,total:MOVES[c.id].length}))};
// Inspection controls operate on the same combat engine and the same live SVG rigs.
const lab=document.createElement('div');lab.className='motion-lab';lab.id='motion-lab';lab.hidden=true;lab.innerHTML=`<b>动作鉴赏 / MOTION LAB</b><select id="lab-char" aria-label="鉴赏角色">${CHARACTERS.map(c=>`<option value="${c.id}">${c.cn} / ${c.name}</option>`).join('')}</select><select id="lab-move" aria-label="鉴赏动作"></select><button class="lab-play" id="lab-play">▶ 播放招式</button><select id="lab-speed" aria-label="演示速度"><option value="1">正常速度</option><option value="0.5">慢放 × 0.5</option><option value="0.25">慢放 × 0.25</option></select><button class="lab-small" id="lab-close" aria-pressed="false">特写 关</button><button class="lab-small" id="lab-freeze">定格</button><button class="lab-small" id="lab-step">逐帧 +1</button><small>LIVE SVG · 非视频 · 逐帧可检查</small>`;
$('training-bar').after(lab);
const show=document.createElement('button');show.id='showcase-btn';show.className='small-btn';show.textContent='动作鉴赏';$('moves-btn').after(show);
const selectShow=document.createElement('button');selectShow.id='select-showcase';selectShow.className='small-btn';selectShow.textContent='进入动作鉴赏 ↗';$('select-screen').querySelector('.select-top').appendChild(selectShow);
let labEnabled=false,labFrozen=false;
function fillLabMoves(){let c=$('lab-char').value;const list=MOVES[c].filter(m=>(m.category==='special'&&m.strength===2)||m.category==='super'||['sLP','sHP','sHK','cHK','throw','backthrow','DI','RUSH'].includes(m.id));$('lab-move').innerHTML=list.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}
function enterLab(){if(G.trial&&SVG_FIGHTER.experience)SVG_FIGHTER.experience.exitLessons();if(G.screen!=='battle'||G.mode!=='training'){G.mode='training';$('mode').value='training';$('control').value='assist';startBattle()}labEnabled=true;lab.hidden=false;G.artSpeed=Number($('lab-speed').value)||1;labFrozen=false;G.paused=false;$('pause-overlay').hidden=true;$('game-frame').classList.remove('is-paused');$('pause-btn').textContent='暂停';$('lab-freeze').textContent='定格';$('lab-char').value=fighters[0].ch.id;fillLabMoves();$('dummy').value='idle';$('infinite').checked=true;$('autohp').checked=true;show.classList.add('active');$('stage-wrap').focus({preventScroll:true});}
show.onclick=()=>{if(labEnabled){labEnabled=false;lab.hidden=true;show.classList.remove('active');G.artSpeed=1;G.artCloseup=false;G.paused=false;labFrozen=false;$('pause-overlay').hidden=true;$('game-frame').classList.remove('is-paused');$('pause-btn').textContent='暂停';$('lab-freeze').textContent='定格';$('lab-speed').value='1';$('lab-close').textContent='特写 关';$('lab-close').setAttribute('aria-pressed','false')}else enterLab()};selectShow.onclick=enterLab;
$('lab-char').onchange=()=>{let c=$('lab-char').value;selected[0]=c;makeFighters();resetMatch();fillLabMoves();G.artSpeed=Number($('lab-speed').value);labFrozen=false;$('lab-freeze').textContent='定格';$('stage-wrap').focus({preventScroll:true});};
$('lab-play').onclick=()=>{$('game-frame').classList.remove('is-paused');G.paused=false;labFrozen=false;$('lab-freeze').textContent='定格';let c=$('lab-char').value,m=$('lab-move').value;practiceMove(c,m);G.artSpeed=Number($('lab-speed').value);$('pause-overlay').hidden=true;$('stage-wrap').focus({preventScroll:true});};
$('lab-speed').onchange=()=>{G.artSpeed=Number($('lab-speed').value);$('stage-wrap').focus({preventScroll:true})};
$('lab-close').onclick=()=>{G.artCloseup=!G.artCloseup;$('lab-close').textContent='特写 '+(G.artCloseup?'开':'关');$('lab-close').setAttribute('aria-pressed',G.artCloseup);};
$('lab-freeze').onclick=()=>{labFrozen=!labFrozen;G.paused=labFrozen;$('lab-freeze').textContent=labFrozen?'继续':'定格';$('game-frame').classList.toggle('is-paused',labFrozen);$('pause-overlay').hidden=true;clearHeld()};
$('lab-step').onclick=()=>{G.paused=true;labFrozen=true;$('lab-freeze').textContent='继续';simulate(true);for(let f of fighters){f.pose=null;renderFighter(f,1,1)};$('pause-overlay').hidden=true;};
// Atmospheric stage grading stays behind the actors, and never obscures command readability.
const stageGrade=el('g',{'pointer-events':'none'},null);
stageGrade.innerHTML=`<rect y="157" width="1440" height="530" fill="#122b3d" opacity=".18"/><ellipse cx="715" cy="616" rx="560" ry="173" fill="url(#floor-light3)"/><path d="M299 581Q720 505 1138 583" fill="none" stroke="#b0d9dd" stroke-width="37" opacity=".018"/><path d="M58 670L541 661M893 674L1353 690" stroke="#bbc9be" stroke-opacity=".15" stroke-width="2"/><path d="M425 793L621 660M791 660L1138 793" stroke="#79bacb" stroke-opacity=".11"/>`;
$('camera').insertBefore(stageGrade,$('ground-fx'));
// Per-character colored rim on the floor: vectors, not postprocessed bitmap effects.
const floorRim=el('g',{},stageGrade);for(let i=0;i<13;i++){let x=87+i*107;el('path',{d:`M${x} 684l${34+i%3*20} 1`,stroke:i%2?'#b88fa4':'#86b7c6','stroke-width':1.4,opacity:.16},floorRim)}
let camZoom=1.045,camX=720,camY=480,camStamp=0;
function actorYBounds(f){
 if(!f.pose)return[245,680];const p=f.pose,r=p.spin*Math.PI/180,co=Math.cos(r),si=Math.sin(r),shift=p.floor||0;
 const points=[bodyPoint(f,[0,-401]),bodyPoint(f,[-45,-300]),bodyPoint(f,[45,-300]),bodyPoint(f,[0,-165]),...f.rearArm.points.map(p=>bodyPoint(f,p)),...f.frontArm.points.map(p=>bodyPoint(f,p)),...f.rearLeg.points,...f.frontLeg.points];
 const ys=points.map(q=>FLOOR+f.y+(q[0]*si+(q[1]+180)*co-180+shift)*f.ch.scale);return[Math.min(...ys)-21,Math.max(...ys)+25];
}
function artCamera(now){if(!fighters.length)return'';let target=G.artCloseup?1.28:1.045;const a=fighters[0],b=fighters[1],dist=Math.abs(a.x-b.x),superActor=fighters.find(f=>f.attack?.m.super&&f.attack.confirmed);if(superActor)target=G.artCloseup?1.33:1.15;else if(dist<320)target=Math.max(target,1.065);
 const bounds=fighters.map(actorYBounds),lo=Math.min(...bounds.map(b=>b[0])),hi=Math.max(...bounds.map(b=>b[1]));target=Math.min(target,545/Math.max(440,hi-lo+14));
 const dt=camStamp?clamp((now-camStamp)/1000,0,.1):1/60;camStamp=now;const k=1-Math.exp(-dt*(target<camZoom?15:7));camZoom=mix(camZoom,clamp(target,.79,1.3),k);
 const cx=camZoom<=1?720:clamp((a.x+b.x)/2,720/camZoom,1440-720/camZoom);camX=mix(camX,cx,k);camY=mix(camY,(lo+hi)/2,k);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,shake=reduced?0:G.shake;return`translate(${720+Math.sin(now*.14)*shake} ${439+Math.cos(now*.11)*shake*.32}) scale(${(reduced?Math.min(1,camZoom):camZoom).toFixed(4)}) translate(${-camX} ${-camY})`;}
const originalStartBattle=startBattle;startBattle=function(){G.artSpeed=1;G.artCloseup=false;labEnabled=false;labFrozen=false;lab.hidden=true;show.classList.remove('active');$('lab-close').textContent='特写 关';$('lab-close').setAttribute('aria-pressed','false');$('lab-speed').value='1';camZoom=1.045;camX=720;camY=480;camStamp=0;originalStartBattle();};
// Rebind handlers captured before the wrapper; the development API also reaches this function.
$('start-btn').onclick=startBattle;
const oldReset=resetMatch;resetMatch=function(){G.artSpeed=labEnabled?Number($('lab-speed').value):1;labFrozen=false;oldReset()};$('reset-btn').onclick=resetMatch;$('rematch-btn').onclick=resetMatch;
SVG_FIGHTER.lab=enterLab;

// Touch capability remains available when a mouse is also attached to a tablet.
document.body.classList.toggle('touch-device',navigator.maxTouchPoints>0);
function syncMatchCaption(){$('match-label').textContent=({'cpu':'VERSUS CPU','versus':'LOCAL 2P','training':'TRAINING LAB','demo':'CPU SHOWCASE'}[G.mode])+' / '+fighters.map(f=>f.ch.name).join(' vs ')}
const basePractice=practiceMove;practiceMove=function(c,m){basePractice(c,m);syncMatchCaption()};SVG_FIGHTER.practice=practiceMove;
$('lab-char').addEventListener('change',syncMatchCaption);

updateSelection();requestAnimationFrame(frame);
// Physical devices share held actions. Releasing one device must not release another.
const assistKeys={KeyZ:'special',KeyX:'special2',KeyC:'special3',KeyB:'special4',Digit1:'SA1',Digit2:'SA2',Digit3:'SA3'};
const inputSources=new Map(),physicalKeys=new Set(),touchPointers=new Map(),connectedPads=new Map();
let controllerHint=null,controllerHintSignature='';
let inputWindowFocused=typeof document.hasFocus==='function'?document.hasFocus():true;
const directionButtons=['up','down','left','right'];
const stick=$('joystick');
let stickID=null;
function inputIsEditable(el){return !!el&&(el.isContentEditable||['SELECT','INPUT','TEXTAREA'].includes(el.tagName))}
function playerCanInput(i){return G.screen==='battle'&&!G.paused&&!G.result&&!document.hidden&&inputWindowFocused&&!document.querySelector('dialog[open]')&&!!fighters[i]&&(i===0?G.mode!=='demo':G.mode==='versus')}
function inputSourceOwns(f,b){for(const s of inputSources.values())if(s.f===f&&s.input===f.input&&s.buttons.has(b))return true;return false}
function setInputSource(id,i,buttons){
  const old=inputSources.get(id),f=fighters[i],next=new Set(buttons.flatMap(b=>b==='PP'?['LP','MP']:b==='KK'?['LK','MK']:[b]));
  if(old)inputSources.delete(id);
  if(f&&next.size)inputSources.set(id,{f,input:f.input,player:i,buttons:next});
  // A diagonal is one physical sample. Do not invent intermediate directions in
  // motion history while reconciling its two keys; attacks still see the final direction.
  const activeOld=old&&old.input===old.f.input,affected=new Set([activeOld&&old.f,f].filter(Boolean));
  for(const fighter of affected)fighter.input.deviceDirectionBatch=true;
  try{
    if(activeOld)for(const b of old.buttons)if(directionButtons.includes(b)&&!inputSourceOwns(old.f,b))inputRelease(old.f,b);
    if(f)for(const b of next)if(directionButtons.includes(b)&&!f.input.held.has(b))inputPress(f,b);
  }finally{for(const fighter of affected){delete fighter.input.deviceDirectionBatch;updateDirection(fighter)}}
  if(activeOld)for(const b of old.buttons)if(!directionButtons.includes(b)&&!inputSourceOwns(old.f,b))inputRelease(old.f,b);
  if(f)for(const b of next)if(!directionButtons.includes(b)&&!f.input.held.has(b))inputPress(f,b);
}
function releaseInputSource(id){const old=inputSources.get(id);if(old)setInputSource(id,old.player,[])}
function refreshTouchButton(b){b.classList.toggle('pressed',[...touchPointers.values()].some(p=>p.button===b))}
// Called by clearHeld() for pause, modal dialogs, match resets and selection changes.
// Keep physical key edges: an already-held key must be released before it can fire again.
function resetInputDevices(){
  const previous=[...inputSources.values()];inputSources.clear();
  for(const f of fighters)f.input.deviceDirectionBatch=true;
  const released=new Map();
  for(const s of previous){if(s.input!==s.f.input)continue;let seen=released.get(s.f);if(!seen){seen=new Set();released.set(s.f,seen)}for(const b of s.buttons)if(!seen.has(b)){seen.add(b);inputRelease(s.f,b)}}
  for(const [id,p] of touchPointers){p.button.classList.remove('pressed');try{if(p.button.hasPointerCapture?.(id))p.button.releasePointerCapture(id)}catch(e){}}
  touchPointers.clear();
  const oldStick=stickID;stickID=null;
  if(oldStick!==null)try{if(stick?.hasPointerCapture?.(oldStick))stick.releasePointerCapture(oldStick)}catch(e){}
  if($('stick-knob'))$('stick-knob').style.transform='';
  for(const f of fighters){const ip=f.input;delete ip.deviceDirectionBatch;ip.dirs=[];ip.chargeB=ip.chargeD=ip.savedB=ip.savedD=0;ip.releaseB=ip.releaseD=-99;ip.lastDash=G.tick}
  for(const p of connectedPads.values()){p.neutralRequired=true;p.actions={}}
  updateControllerHint();
}
window.addEventListener('keydown',e=>{
  if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||inputIsEditable(document.activeElement))return;
  if(document.querySelector('dialog[open]'))return;
  if(G.screen==='select'){
    if(e.code==='Enter'&&!e.repeat&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();startBattle()}
    return;
  }
  if(G.screen!=='battle')return;
  if(['KeyP','Escape','KeyH','KeyR','KeyN'].includes(e.code)){
    e.preventDefault();if(e.repeat||physicalKeys.has(e.code))return;physicalKeys.add(e.code);
    if(e.code==='KeyP'||e.code==='Escape')pause(!G.paused);
    if(e.code==='KeyH')openManual();
    if(e.code==='KeyR')resetMatch();
    if(e.code==='KeyN'&&G.mode==='training'){if(!G.paused)pause(true);simulate(true)}
    return;
  }
  for(let i=0;i<2;i++){
    const b=KEYMAP[i][e.code];if(!b)continue;e.preventDefault();
    if(!e.repeat&&!physicalKeys.has(e.code)){physicalKeys.add(e.code);if(playerCanInput(i))setInputSource('key:'+e.code,i,[b])}
    return;
  }
  if(assistKeys[e.code]){e.preventDefault();if(!e.repeat&&!physicalKeys.has(e.code)){physicalKeys.add(e.code);if(playerCanInput(0))assist(fighters[0],assistKeys[e.code])}}
},{passive:false});
window.addEventListener('keyup',e=>{
  physicalKeys.delete(e.code);
  // Release even after focus, screen, layout or modifier changes.
  const source='key:'+e.code,buttonSource='button-key:'+e.code;
  if(inputSources.has(source)||inputSources.has(buttonSource)){e.preventDefault();releaseInputSource(source);releaseInputSource(buttonSource)}
});
function suspendPhysicalInput(){
  clearHeld();physicalKeys.clear();
  if(G.screen==='battle'&&!G.paused&&!document.querySelector('dialog[open]'))pause(true);
}
window.addEventListener('blur',()=>{inputWindowFocused=false;suspendPhysicalInput()});
window.addEventListener('focus',()=>{inputWindowFocused=true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendPhysicalInput()});
window.addEventListener('pagehide',suspendPhysicalInput);
for(const b of document.querySelectorAll('[data-btn]')){
  b.style.touchAction='none';
  b.addEventListener('pointerdown',e=>{
    e.preventDefault();if(e.pointerType==='mouse'&&e.button!==0||!playerCanInput(0)||touchPointers.has(e.pointerId))return;
    touchPointers.set(e.pointerId,{button:b});try{b.setPointerCapture(e.pointerId)}catch(err){}
    refreshTouchButton(b);setInputSource('touch:'+e.pointerId,0,[b.dataset.btn]);
  });
  const up=e=>{
    const p=touchPointers.get(e.pointerId);if(!p||p.button!==b)return;
    e.preventDefault();touchPointers.delete(e.pointerId);releaseInputSource('touch:'+e.pointerId);refreshTouchButton(b);
  };
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
  b.addEventListener('keydown',e=>{
    if(!['Space','Enter'].includes(e.code))return;e.preventDefault();
    if(!e.repeat&&!physicalKeys.has(e.code)){physicalKeys.add(e.code);if(playerCanInput(0))setInputSource('button-key:'+e.code,0,[b.dataset.btn])}
  });
  b.addEventListener('blur',()=>{releaseInputSource('button-key:Space');releaseInputSource('button-key:Enter')});
}
for(const b of document.querySelectorAll('[data-assist]'))b.onclick=()=>{if(playerCanInput(0))assist(fighters[0],b.dataset.assist)};
function vectorButtons(x,y){const out=[];if(y<0)out.push('up');if(y>0)out.push('down');if(x<0)out.push('left');if(x>0)out.push('right');return out}
function moveStick(e){
  if(e.pointerId!==stickID||!playerCanInput(0))return;
  const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),max=r.width*.3,s=l>max?max/l:1;
  $('stick-knob').style.transform=`translate(${x*s}px,${y*s}px)`;
  const dead=r.width*.12,q=Math.round(Math.atan2(y,x)/(Math.PI/4));
  setInputSource('stick',0,l>dead?vectorButtons(Math.round(Math.cos(q*Math.PI/4)),Math.round(Math.sin(q*Math.PI/4))):[]);
}
if(stick){
  stick.style.touchAction='none';
  stick.addEventListener('pointerdown',e=>{
    e.preventDefault();if(e.pointerType==='mouse'&&e.button!==0||stickID!==null||!playerCanInput(0))return;
    stickID=e.pointerId;try{stick.setPointerCapture(e.pointerId)}catch(err){}moveStick(e);
  });
  stick.addEventListener('pointermove',e=>{if(e.pointerId===stickID){e.preventDefault();moveStick(e)}});
  const endStick=e=>{if(e.pointerId!==stickID)return;stickID=null;$('stick-knob').style.transform='';releaseInputSource('stick')};
  stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);stick.addEventListener('lostpointercapture',endStick);
}
// W3C standard mapping. Face/shoulder attacks retain the engine's simultaneous-button
// window, command parser and resource/hitstun gates; shortcuts use the normal assist path.
const padAttackMap={0:'LK',1:'MK',2:'LP',3:'MP',4:'PAR',5:'HP',6:'DI',7:'HK',8:'THROW',10:'RUSH'};
const padAssistMap={0:'special3',1:'special4',2:'special',3:'special2',4:'SA1',5:'SA2',7:'SA3'};
// Build once, then update only when the controller/mode/ready state changes.
// A keyboard pause can leave a controller held: explain the neutral latch in the UI.
function updateControllerHint(){
  const pads=[...connectedPads.values()].sort((a,b)=>a.player-b.player);
  if(!pads.length){if(controllerHint&&!controllerHint.root.hidden)controllerHint.root.hidden=true;controllerHintSignature='';return}
  const signature=[G.mode,G.control,!!G.paused,!!G.result,...pads.flatMap(p=>[p.player,!!p.neutralRequired])].join('|');
  if(signature===controllerHintSignature)return;
  if(!controllerHint){
    const toolbar=$('battle-hint')?.closest?.('.toolbar');if(!toolbar)return;
    const root=document.createElement('div'),status=document.createElement('span'),buttons=document.createElement('span'),drive=document.createElement('span'),shortcuts=document.createElement('span');
    root.id='controller-hint';root.style.cssText='display:grid;gap:3px;padding:8px 15px;background:#151923;border-top:1px solid #394252;font:10px/1.55 var(--mono,monospace);color:#bdc8d3;overflow-wrap:anywhere';
    root.setAttribute('aria-label','已连接手柄与按键提示');
    status.id='controller-status';status.style.color='#d7edaf';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    buttons.textContent='移动：左摇杆 / 十字键 · 拳：X/□ 轻、Y/△ 中、RB/R1 重 · 脚：A/× 轻、B/○ 中、RT/R2 重';
    drive.textContent='LB/L1 招架 · LT/L2 冲击 · View/Select 投技 · L3 迸发 · Start/Options 暂停';
    shortcuts.id='controller-assist';shortcuts.style.color='#dfb7d9';shortcuts.textContent='辅助：按住 R3，再按 X/□、Y/△、A/×、B/○ = 必杀 1–4；LB/L1、RB/R1、RT/R2 = SA 1–3';
    root.append(status,buttons,drive,shortcuts);toolbar.after(root);controllerHint={root,status,shortcuts};
  }
  let waiting=false;
  const players=pads.map(p=>{
    const name=(p.player+1)+'P 手柄';
    if(p.player===1&&G.mode!=='versus')return name+'待用（本地双人时启用）';
    if(G.mode==='demo')return name+'观战中（Start 可暂停）';
    if(G.result)return name+'本局结束';
    if(G.paused)return name+'已暂停（继续后松开按键并回中）';
    if(p.neutralRequired){waiting=true;return name+'等待松键回中'}
    return name+'已就绪';
  });
  controllerHint.root.hidden=false;
  controllerHint.status.textContent=players.join(' · ')+(waiting?' · 请松开手柄全部按键并将摇杆回中；键盘仍可用。':'');
  controllerHint.shortcuts.hidden=G.control!=='assist';
  controllerHintSignature=signature;
}
function readPadButtons(pad,previous=[]){return Array.from({length:Math.max(17,pad.buttons.length)},(_,i)=>{
  const b=pad.buttons[i],value=typeof b==='number'?b:typeof b?.value==='number'?b.value:b?.pressed?1:0;
  return value>=(previous[i] ? .35 : .5);
})}
function padVector(pad,buttons,state){
  if(buttons.slice(12,16).some(Boolean))return{x:Number(!!buttons[15])-Number(!!buttons[14]),y:Number(!!buttons[13])-Number(!!buttons[12])};
  const ax=Number.isFinite(pad.axes[0])?pad.axes[0]:0,ay=Number.isFinite(pad.axes[1])?pad.axes[1]:0,l=Math.hypot(ax,ay);
  if(l<(state.analogActive ? .20 : .28)){state.analogActive=false;state.sector=null;return{x:0,y:0}}
  state.analogActive=true;const angle=Math.atan2(ay,ax),sector=Math.round(angle/(Math.PI/4));
  // A little angular hysteresis keeps corners stable while still allowing quarter circles.
  if(state.sector!==null){const diff=Math.atan2(Math.sin(angle-state.sector*Math.PI/4),Math.cos(angle-state.sector*Math.PI/4));if(Math.abs(diff)<Math.PI/8+.055)return{x:Math.round(Math.cos(state.sector*Math.PI/4)),y:Math.round(Math.sin(state.sector*Math.PI/4))}}
  state.sector=sector;return{x:Math.round(Math.cos(sector*Math.PI/4)),y:Math.round(Math.sin(sector*Math.PI/4))};
}
function forgetGamepad(index){
  const p=connectedPads.get(index);if(!p)return;
  releaseInputSource('pad:'+index);connectedPads.delete(index);
  if(G.screen==='battle'&&!G.paused&&!G.result&&(p.player===0||p.player===1&&G.mode==='versus')){pause(true);if(typeof toast==='function')toast((p.player+1)+'P 手柄已断开 · 已暂停')}
  updateControllerHint();
}
function pollGamepads(){
  if(typeof navigator.getGamepads!=='function')return;
  let pads;try{pads=Array.from(navigator.getGamepads()).filter(p=>p&&p.connected!==false&&p.mapping==='standard')}catch(e){for(const index of [...connectedPads.keys()])forgetGamepad(index);return}
  const live=new Set(pads.map(p=>p.index));for(const index of [...connectedPads.keys()])if(!live.has(index))forgetGamepad(index);
  for(const pad of pads){
    let state=connectedPads.get(pad.index);
    if(state&&state.id!==pad.id){forgetGamepad(pad.index);state=null}
    if(!state){
      const used=new Set([...connectedPads.values()].map(p=>p.player)),player=[0,1].find(i=>!used.has(i));if(player===undefined)continue;
      state={id:pad.id,player,previous:[],neutralRequired:true,analogActive:false,sector:null,input:null,layout:null,actions:{}};connectedPads.set(pad.index,state);
    }
    const i=state.player,source='pad:'+pad.index,buttons=readPadButtons(pad,state.previous),edges=buttons.map((b,n)=>b&&!state.previous[n]);state.previous=buttons;
    const f=fighters[i];
    if(state.input!==f?.input||state.layout!==G.control){releaseInputSource(source);state.input=f?.input;state.layout=G.control;state.neutralRequired=true}
    const v=padVector(pad,buttons,state),neutral=!v.x&&!v.y&&!buttons.some(Boolean);
    if(neutral)state.neutralRequired=false;
    // Start is edge-triggered and stays available while paused. Background tabs cannot resume.
    if(edges[9]&&(i===0||G.mode==='versus')&&G.screen==='battle'&&!document.hidden&&inputWindowFocused&&!document.querySelector('dialog[open]')&&!G.result)pause(!G.paused);
    if(!playerCanInput(i)){state.neutralRequired=true;state.actions={};releaseInputSource(source);continue}
    if(state.neutralRequired){state.actions={};releaseInputSource(source);continue}
    const desired=vectorButtons(v.x,v.y),shift=G.control==='assist'&&buttons[11],shortcuts=[];
    for(const [n,b] of Object.entries(padAttackMap)){
      if(!buttons[n])delete state.actions[n];
      else if(edges[n]){state.actions[n]=shift&&padAssistMap[n]?'assist':b;if(state.actions[n]==='assist')shortcuts.push(padAssistMap[n])}
      if(state.actions[n]&&state.actions[n]!=='assist')desired.push(state.actions[n]);
    }
    setInputSource(source,i,desired);
    for(const s of shortcuts)assist(f,s);
  }
  updateControllerHint();
}
window.addEventListener('gamepadconnected',pollGamepads);
window.addEventListener('gamepaddisconnected',e=>forgetGamepad(e.gamepad.index));
if(window.SVG_FIGHTER)window.SVG_FIGHTER.controllers=()=>({supported:typeof navigator.getGamepads==='function',gamepads:[...connectedPads].map(([index,p])=>({index,player:p.player+1,ready:!p.neutralRequired})),sources:[...inputSources].map(([source,s])=>({source,player:s.player+1,buttons:[...s.buttons]}))});

// Small goals and an arcade route turn isolated matches into a playable session.
const MODE_COPY={arcade:'<b>街机巡回</b> · 挑战其余七位角色。每场两局获胜，击败最后的宿敌完成巡回。',cpu:'<b>自由对战</b> · 自选对手和难度。用后退控制距离，等对方挥空再反击。',versus:'<b>本地双人</b> · 1P 使用 WASD；2P 使用方向键和数字小键盘。',training:'<b>练习室</b> · 自由尝试招式、逐帧观察，或从五个实战目标开始。',demo:'<b>观战</b> · 两位 CPU 自主对战，观察不同角色如何控距和接近。'};
function modeDescription(){const mode=$('mode').value;$('mode-description').innerHTML=(MODE_COPY[mode]||MODE_COPY.cpu)+' <span class="starter-tip">初次游玩推荐辅助：<kbd>J / O</kbd> 出拳踢腿，<kbd>Z / X / C / B</kbd> 必杀，<kbd>V</kbd> 投技。</span>';$('start-btn').textContent=mode==='arcade'?'开始巡回　↗':mode==='demo'?'开始观战　↗':mode==='training'?'进入练习　↗':'进入对战　↗';}
$('mode').addEventListener('change',modeDescription);modeDescription();
const tourStrip=document.createElement('div');tourStrip.id='tour-strip';tourStrip.className='tour-strip';tourStrip.hidden=true;$('game-frame').before(tourStrip);
const defenseCue=el('g',{'pointer-events':'none','aria-hidden':'true',visibility:'hidden'},$('game'));
el('rect',{x:465,y:148,width:510,height:49,rx:4,fill:'#12121de8',stroke:'#8e9270','stroke-width':1},defenseCue);
const defenseCueText=el('text',{x:720,y:180,'text-anchor':'middle','font-size':21,'font-weight':700,fill:'#e6f59c',class:'svg-text'},defenseCue);
function showDefenseCue(text,color='#e6f59c'){defenseCue.setAttribute('visibility','visible');defenseCueText.textContent=text;sa(defenseCueText,'fill',color);}

function renderTour(){
 const a=G.arcade;tourStrip.hidden=!a;if(!a)return;
 if(a.complete){tourStrip.innerHTML='<b class="arcade-summary">✓ 巡回完成 · '+fighters[0].ch.cn+'</b><span>换一位角色，尝试另一种打法。</span>';return;}
 tourStrip.innerHTML='<b>街机巡回 '+Math.min(a.index+1,a.order.length)+' / '+a.order.length+'</b>'+a.order.map((id,i)=>`<span class="${i<a.index?'done':i===a.index?'current':''}">${i<a.index?'✓ ':''}${CHARACTERS.find(c=>c.id===id).cn}</span>`).join('');
}
function arcadeRecord(){try{const value=JSON.parse(localStorage.getItem('svg-fighter-records')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}}
function timeLabel(seconds){return Math.floor(seconds/60)+' 分 '+seconds%60+' 秒'}
function validArcadeResult(a){return !!(a&&a.matchStarted&&G.result&&G.wins[G.lastWinner]>=2&&fighters[0]?.ch.id===a.player&&fighters[1]?.ch.id===a.order[a.index])}
const playStart=startBattle;
startBattle=function(){
 restoreLessonSettings();const mode=$('mode').value;
 if(mode==='arcade'){
  const player=selected[0],boss=player==='iori'?'ryu':'iori',savedOpponent=selected[1];
  const order=CHARACTERS.map(c=>c.id).filter(id=>id!==player&&id!==boss);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  if(CHARACTERS.some(c=>c.id===boss)&&boss!==player)order.push(boss);
  G.arcade={player,order,index:0,retries:0,difficulty:$('difficulty').value,started:Date.now(),complete:false,matchStarted:false,cleared:-1,savedOpponent};selected[1]=order[0];
 }else G.arcade=null;
 playStart();if(G.arcade)G.arcade.matchStarted=true;applyStage();renderTour();$('trial-panel').hidden=G.mode!=='training';resetTrialPanel();$('arcade-next').hidden=true;
};
$('start-btn').onclick=startBattle;
const playBack=backToSelect;
backToSelect=function(){restoreLessonSettings();if(G.arcade?.savedOpponent)selected[1]=G.arcade.savedOpponent;G.arcade=null;tourStrip.hidden=true;$('trial-panel').hidden=true;playBack();};
$('back-btn').onclick=backToSelect;$('overlay-select').onclick=backToSelect;
const playPause=showPause;
showPause=function(result=false){
 playPause(result);$('arcade-next').hidden=true;const a=G.arcade;if(!result||!validArcadeResult(a))return;
 if(G.lastWinner!==0){$('pause-title').textContent='再挑战一次';$('pause-text').textContent=fighters[1].ch.cn+' 守住了这一关。调整距离和出招时机，再来一次。';$('rematch-btn').textContent='重试此关';return;}
 a.cleared=a.index;
 if(a.index<a.order.length-1){$('pause-title').textContent='下一位挑战者';$('pause-text').textContent='击败 '+fighters[1].ch.cn+'。下一场：'+CHARACTERS.find(c=>c.id===a.order[a.index+1]).cn+'。';$('arcade-next').hidden=false;$('arcade-next').textContent='继续巡回 →';$('rematch-btn').textContent='重打此关';return;}
 if(!a.complete){
  a.complete=true;a.completedSeconds=Math.max(0,Math.round((Date.now()-a.started)/1000));
  const records=arcadeRecord(),key=a.player+'-'+a.difficulty,old=records[key];
  const validOld=old&&Number.isFinite(old.seconds)&&old.seconds>=0;
  a.newBest=!validOld||a.completedSeconds<old.seconds||a.completedSeconds===old.seconds&&a.retries<(old.retries??Infinity);
  if(a.newBest)records[key]={seconds:a.completedSeconds,retries:a.retries,completedAt:Date.now()};
  a.best=records[key];try{localStorage.setItem('svg-fighter-records',JSON.stringify(records))}catch{}
 }
 $('pause-title').textContent='巡回制霸';$('pause-text').textContent=fighters[0].ch.cn+' 击败了全部 '+a.order.length+' 位对手。用时 '+timeLabel(a.completedSeconds)+' · 重试 '+a.retries+' 次。'+(a.newBest?' 本角色／难度新纪录！':' 最快纪录 '+timeLabel(a.best.seconds)+'。');$('rematch-btn').textContent='再战宿敌';renderTour();
};
$('arcade-next').onclick=()=>{
 const a=G.arcade;if(!validArcadeResult(a)||a.complete||G.lastWinner!==0||a.cleared!==a.index||a.index>=a.order.length-1)return;
 // Consume the settled result before resetting. A second click cannot skip a match.
 a.matchStarted=false;a.index++;selected[1]=a.order[a.index];G.difficulty=a.difficulty;
 makeFighters();resetMatch();a.matchStarted=true;applyStage(['neon','courtyard','rooftop'][a.index%3]);renderTour();syncMatchCaption();$('arcade-next').hidden=true;$('stage-wrap').focus({preventScroll:true});
};
const playReset=resetMatch;
resetMatch=function(){
 restoreLessonSettings();const a=G.arcade;if(a?.matchStarted&&!a.complete)a.retries++;
 G.lastCombatEvent=null;$('arcade-next').hidden=true;$('rematch-btn').textContent='重新对战';playReset();G.lastWinner=-1;resetTrialPanel();renderTour();
};
$('reset-btn').onclick=resetMatch;$('rematch-btn').onclick=resetMatch;SVG_FIGHTER.reset=resetMatch;
const LESSONS=[
 {name:'01 · 找到距离',text:'靠近木桩，用 J 轻拳命中。过远会挥空；靠近后让拳头真正够到对手。',move:'sLP',dist:245,type:'hit'},
 {name:'02 · 必杀命中',text:'使用 Z（第一必杀）命中；近身技能需要先靠近。也可以按角色招式表搓招，感受发力和收招。',move:null,dist:280,type:'special'},
 {name:'03 · 破防投技',text:'对手正在防御。靠近后按 V 投技，完成抓取与摔落。',move:'throw',dist:200,type:'throw'},
 {name:'04 · 命中接续',text:'靠近后按 K 中拳，看见命中立刻按 Z 接必杀。必须让中拳与必杀成为同一连段；只放多段必杀不算完成。',move:null,dist:215,type:'combo'},
 {name:'05 · 防御后反击',text:'慢放 ×0.5：背靠场边，按住 A 防御重拳。出现「现在反击」时松开 A，按 K 中拳，或用够快的必杀击中对手收招。',move:'sHP',dist:135,type:'punish'}
];
function resetTrialPanel(){if(!$('trial-title'))return;$('trial-title').textContent='实战入门';$('trial-instruction').textContent='五个小目标：找到距离、必杀命中、破防投技、命中接续、防御后反击。';$('trial-action').textContent='开始练习';$('trial-action').disabled=false;}
function syncLessonControl(){
 document.querySelectorAll('[data-assist]').forEach(b=>{b.disabled=G.control!=='assist';b.title=G.control!=='assist'?'选人页选择“辅助”操作可用':'快捷指令，仍遵守能量和硬直'});
 $('battle-hint').innerHTML=G.control==='classic'?'经典搓招：<b>↓ ↘ → + J</b>　·　招架后前前：<b>Q + D D</b>':'辅助：<b>Z X C B</b> 必杀　·　<b>1 2 3</b> 超级必杀　·　经典搓招仍可用';
}
function restoreLessonSettings(){
 const trial=G.trial,saved=trial?.saved;G.trial=null;defenseCue.setAttribute('visibility','hidden');if(!saved)return;
 if(trial.drill?.attack&&fighters[1]?.attack===trial.drill.attack){setState(fighters[1],'idle');fighters[1].input.queue=[];}
 G.artSpeed=saved.artSpeed??1;
 $('infinite').checked=saved.infinite;$('autohp').checked=saved.autohp;$('dummy').value=saved.dummy;G.control=saved.control;syncLessonControl();clearHeld();
}
function lessonInstructions(index,f){
 const first=BASESPECIALS[f.ch.id]?.[0],special=first&&getMove(f,first[0]+'_1');
 if(index===1&&special){
  if(special.kind==='store'&&special.damage>0)return '先按 D 靠近，再按 Z 使用「'+special.name+'」踢中木桩。风破刃还会储存风破，但只储存、没有踢中，不算完成。';
  const action=special.kind.includes('projectile')?'让飞行道具真正碰到木桩。':special.travel?'向前突进并击中木桩，观察结束后的收招。':'先靠近，让攻击真正够到木桩。';
  return '按 Z 使用「'+special.name+'」，'+action+(special.motion==='chargeB'?' 辅助 Z 可直接发动；经典输入需要先向后蓄力。':' 也可以按招式表的经典指令发动。');
 }
 if(index===3&&special){const normal=getMove(f,'sMP');return '靠近后按 K 使用「'+normal.name+'」，看见命中立刻按 Z 接「'+special.name+'」。'+(special.kind==='store'?'中拳与风破刃踢击必须连成一段；只储存风破不算第二次命中。':'两次攻击必须连成一段；单独使用多段必杀不算完成。');}
 return LESSONS[index].text;
}
function beginLesson(index=0){
 if(G.screen!=='battle'||G.mode!=='training'||!Number.isInteger(index)||!LESSONS[index])return false;
 const saved=G.trial?.saved||{infinite:$('infinite').checked,autohp:$('autohp').checked,dummy:$('dummy').value,control:G.control,artSpeed:G.artSpeed??1};
 G.trial=null;defenseCue.setAttribute('visibility','hidden');playReset();G.phase='fight';announce('','',0);G.paused=false;
 const lesson=LESSONS[index];G.trial={index,saved,done:false,opener:null};
 const f=fighters[0],d=fighters[1],startX=lesson.type==='punish'?105:520;f.x=f.px=startX;d.x=d.px=startX+lesson.dist;
 if(lesson.type==='punish'){G.artSpeed=.5;showDefenseCue('按住 A · 准备防御');G.trial.drill={phase:'cue',cueTick:G.tick+60,lastTick:-1,attack:null,blocked:null,response:null};}
 G.control='assist';syncLessonControl();$('infinite').checked=true;$('autohp').checked=true;$('dummy').value=index===2?'guard':'idle';G.lastCombatEvent=null;clearHeld();
 $('trial-title').textContent=lesson.name;$('trial-instruction').textContent=lessonInstructions(index,f);$('trial-action').textContent='重新试一次';$('trial-action').disabled=false;$('stage-wrap').focus({preventScroll:true});return true;
}
$('trial-action').onclick=()=>{if(!G.trial)beginLesson(0);else if(G.trial.done&&G.trial.index<LESSONS.length-1)beginLesson(G.trial.index+1);else if(G.trial.done)exitLessons();else beginLesson(G.trial.index);};
function exitLessons(){restoreLessonSettings();resetTrialPanel();if(G.screen==='battle')$('stage-wrap').focus({preventScroll:true});}
$('trial-exit').onclick=exitLessons;
function finishLesson(t){
 t.done=true;if(t.drill)showDefenseCue('防后反击成功！','#a9edbb');$('trial-instruction').textContent='完成。'+(t.index===LESSONS.length-1?'现在可以选择 CPU 对练，把这些动作放进实战。':'继续下一个目标。');$('trial-action').textContent=t.index===LESSONS.length-1?'完成训练':'下一项 →';sound('success');
}
// Observe actual contacts immediately. A HUD snapshot can miss two same-frame
// contacts and cannot distinguish a cancel from a standalone multi-hit special.
const lessonCombatEvent=combatEvent;
combatEvent=function(type,a,d,m,damage=0){
 lessonCombatEvent(type,a,d,m,damage);const t=G.trial;if(!t||t.done||G.mode!=='training')return;
 if(LESSONS[t.index].type==='punish'){observeDefenseLesson(t,type,a,d,m);return;}
 if(a.index!==0){t.opener=null;return;}
 const goal=LESSONS[t.index],hit=type==='hit';
 if(goal.type==='hit'){if(hit&&m.id===goal.move)finishLesson(t);return;}
 if(goal.type==='special'){if((hit||type==='throw')&&m.category==='special')finishLesson(t);return;}
 if(goal.type==='throw'){if(type==='throw')finishLesson(t);return;}
 if(hit&&m.id==='sMP'){t.opener={combo:a.combo,defender:d.index};$('trial-instruction').textContent='中拳命中！立即按 Z 接必杀；等对手恢复后再出招就不算连段。';return;}
 if(hit&&m.category==='special'&&t.opener&&t.opener.defender===d.index&&a.combo===t.opener.combo+1){finishLesson(t);return;}
 t.opener=null;
};
function failDefenseLesson(t,message){if(t.done||t.drill.phase==='failed')return;t.drill.phase='failed';showDefenseCue('再试一次 · 查看练习提示','#f5b297');$('trial-instruction').textContent=message+' 点「重新试一次」再练。';}
function observeDefenseLesson(t,type,a,d,m){
 const drill=t.drill;if(!drill||drill.phase==='failed')return;
 if(a.index===1&&d.index===0&&a.attack===drill.attack){
  if(type==='block'){drill.blocked=drill.attack;drill.phase='guarded';showDefenseCue('防住了 · 等待反击');$('trial-instruction').textContent='防住了！保持防御，等「现在反击」提示；每次只练这一拳。';}
  else if(type==='hit'||type==='throw')failDefenseLesson(t,'这一拳打中了你。先按住 A 防御，别急着出招。');
  else if(type==='parry')failDefenseLesson(t,'招架成功；这一课练习后退防御，请用 A 挡住重拳。');
  return;
 }
 if(a.index!==0||type!=='hit')return;
 const recovery=d.attack||d._attackAtContact,response=drill.response;
 const isPunish=drill.blocked===drill.attack&&recovery===drill.attack&&recovery&&recovery.t>=recovery.m.startup+recovery.m.active&&recovery.t<recovery.m.total;
 if(isPunish&&response&&a.attack===response&&response.m.id===m.id&&(m.id==='sMP'||m.category==='special')){finishLesson(t);return;}
 failDefenseLesson(t,drill.blocked?'打中了，但没有在重拳收招时用中拳或必杀反击。':'先防住这一拳，再还手；提前抢攻不算防后反击。');
}
function tickLessonDrill(){
 const t=G.trial,drill=t?.drill;if(!drill||t.done||drill.phase==='failed'||G.screen!=='battle'||G.mode!=='training'||G.phase!=='fight'||drill.lastTick===G.tick)return;
 drill.lastTick=G.tick;const f=fighters[0],d=fighters[1];
 if(drill.phase==='cue'){
  const remaining=drill.cueTick-G.tick;
  if(remaining>0){const seconds=Math.ceil(remaining/30);if(seconds!==drill.shownSecond){drill.shownSecond=seconds;showDefenseCue(seconds+' · 按住 A 防御');$('trial-instruction').textContent='慢放 ×0.5 · '+seconds+'：按住 A 防御。'+d.ch.cn+' 即将出重拳；挡住后看提示按 K 反击。';}return;}
  if(!requestMove(d,getMove(d,'sHP'),false)){failDefenseLesson(t,'木桩被提前打断了。等重拳出手，先防御再还手。');return;}
  drill.attack=d.attack;drill.phase='attack';showDefenseCue('重拳来了 · 按住 A');$('trial-instruction').textContent='重拳来了：按住 A！先挡住，稍后再松开方向按 K。';return;
 }
 if(drill.phase==='guarded'){
  if(f.attack&&!drill.response)drill.response=f.attack;
  if(!drill.ready&&(f.state==='block'&&f.stateT<=3||f.state==='idle')){drill.ready=true;showDefenseCue('现在反击 · 松开 A 按 K','#a9edbb');$('trial-instruction').textContent='现在反击！松开 A，按 K 中拳。也可以用够快的必杀；要赶在对手收招结束前命中。';}
 }
 if(d.attack!==drill.attack)failDefenseLesson(t,drill.blocked?'防御成功，但反击晚了；看到提示就松开 A 按 K。':'重拳挥空了。这次先留在场边，用 A 防住再还手。');
}
const trainingLessonHUD=updateHUD;
updateHUD=function(){trainingLessonHUD();tickLessonDrill();};
// Demonstrating a move in the manual is separate from completing a lesson.
const lessonPractice=practiceMove;
practiceMove=function(c,m){if(G.trial)exitLessons();return lessonPractice(c,m)};SVG_FIGHTER.practice=practiceMove;
// Expose focused controls for repeatable gameplay verification, using the same UI paths.
SVG_FIGHTER.experience={startArcade:()=>{$('mode').value='arcade';startBattle()},next:()=>$('arcade-next').click(),lesson:beginLesson,exitLessons,showResult:()=>showPause(true),back:backToSelect};

const externalStage=el('image',{x:0,y:0,width:1440,height:810,preserveAspectRatio:'xMidYMid slice'},null);$('camera').insertBefore(externalStage,$('ground-fx'));externalStage.setAttribute('visibility','hidden');
function applyStage(value=$('stage-choice').value){const names={neon:'雨夜街角 / NEON DISTRICT',courtyard:'朱桥庭院 / VERMILION GATE',rooftop:'午夜天台 / MOONLIT ROOFTOP'};$('background').setAttribute('visibility',value==='neon'?'visible':'hidden');externalStage.setAttribute('visibility',value==='neon'?'hidden':'visible');if(value!=='neon')externalStage.setAttribute('href','assets/stages/'+value+'.svg');$('stage-name').textContent=names[value]||names.neon;G.stage=value;}
SVG_FIGHTER.experience.stage=applyStage;

})();
