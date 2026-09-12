/* INK / SVG fighting-animation runtime, v0.1.0
 * Independent implementation. No Spine/Rive runtime, raster skin or dependency.
 * Simulation is integer-frame; evaluation and drawing are separate and seekable.
 */
'use strict';
globalThis.INK = (() => {
  const VERSION = '0.1.0';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = a => a * Math.PI / 180;
  const vec = {
    add: (a,b) => [a[0]+b[0],a[1]+b[1]], sub: (a,b) => [a[0]-b[0],a[1]-b[1]],
    mul: (a,k) => [a[0]*k,a[1]*k], length: a => Math.hypot(a[0],a[1]),
    normal: a => { const d=Math.hypot(...a); return d<1e-9?[1,0]:[a[0]/d,a[1]/d]; },
    mix: (a,b,t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t)]
  };
  const mat = {
    identity: () => [1,0,0,1,0,0],
    compose(x=0,y=0,angle=0,sx=1,sy=1) {const c=Math.cos(rad(angle)),s=Math.sin(rad(angle));return [c*sx,s*sx,-s*sy,c*sy,x,y];},
    multiply(a,b) {return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];},
    point: (m,p) => [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]],
    inverse(m) {const d=m[0]*m[3]-m[1]*m[2];if(Math.abs(d)<1e-12)throw Error('Singular bind matrix');return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];},
    svg: m => 'matrix('+m.map(n=>Math.round(n*10000)/10000).join(' ')+')'
  };
  const finite = (v,label='value') => {if(typeof v!=='number'||!Number.isFinite(v))throw TypeError(label+' must be finite');return v;};
  const copy = o => Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v.slice():v]));
  const blend = (a,b,t) => {const p=copy(a);for(const k in b){const bv=b[k],av=a[k]??(Array.isArray(bv)?bv.map(()=>0):0);p[k]=Array.isArray(bv)?bv.map((v,i)=>lerp(av[i],v,t)):lerp(av,bv,t);}return p;};

  /** Two-bone IK with an explicit pole sign. No history-dependent bend flips.
   * Equal root/target is defined rather than yielding zero-length NaNs.
   * `margin` exists for the existing game's historical reach convention.
   */
  function twoBone(root,target,l1,l2,side=1,margin=0) {
    for (const [label, point] of [['root',root],['target',target]]) {
      if (!Array.isArray(point) || point.length!==2) throw TypeError(label+' must be a two-vector');
      point.forEach(value=>finite(value,label));
    }
    finite(l1);finite(l2);finite(side);finite(margin);
    side=side<0?-1:1;
    if(l1<=0||l2<=0)throw RangeError('Bone length must be positive');
    if(margin<0||Math.abs(l1-l2)+margin*3>=l1+l2-margin)throw RangeError('Invalid reach margin');
    const delta=vec.sub(target,root),u=vec.normal(delta);
    const d=clamp(vec.length(delta),Math.abs(l1-l2)+Math.max(1e-7,margin*3),l1+l2-Math.max(1e-7,margin));
    const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
    return [root.slice(),[root[0]+u[0]*a-u[1]*h*side,root[1]+u[1]*a+u[0]*h*side],[root[0]+u[0]*d,root[1]+u[1]*d]];
  }
  function bodyMatrix(p) {return mat.multiply(mat.compose(0,-181+(p.bob||0),p.lean||0),mat.compose(0,181));}
  function bodyPoint(p,q) {return mat.point(bodyMatrix(p),q);}
  const basePose = {lean:0,bob:0,head:0,chest:0,pelvis:0,spin:0,turn:0,depth:1,floor:0,rootShift:0,open:0,fan:0,fanAngle:0,ffoot:0,rfoot:0,reachScale:1,reachFoot:0,frontArmProjection:1,rearArmProjection:1,frontLegProjection:1,rearLegProjection:1,rw:[-8,-286],fw:[89,-298],ra:[-86,-16],fa:[103,-16]};
  /** Generic forward-kinematics graph. Asset data, not character names, defines
   * the graph. Parents precede children; cycles and singular transforms fail fast.
   */
  class Skeleton {
    constructor(bones) {
      if(!Array.isArray(bones)||!bones.length||bones.length>256)throw TypeError('Skeleton requires 1…256 bones');
      this.bones=[];this.index=Object.create(null);this.world=[];
      for(const data of bones){
        if(typeof data.name!=='string'||!data.name||this.index[data.name]!==undefined)throw Error('Unique bone name required');
        const parent=data.parent==null?-1:this.index[data.parent];if(parent===undefined)throw Error('Parent must precede child');
        const b={name:data.name,parent,x:data.x||0,y:data.y||0,rotation:data.rotation||0,sx:data.sx??1,sy:data.sy??1};
        for(const k of ['x','y','rotation','sx','sy'])finite(b[k]);if(Math.abs(b.sx*b.sy)<1e-9)throw Error('Singular bone scale');
        this.index[b.name]=this.bones.length;this.bones.push(b);
      }this.update();this.bind=this.world.map(m=>m.slice());this.inverseBind=this.bind.map(mat.inverse);
    }
    update(pose={}) {
      for(let i=0;i<this.bones.length;i++){const b=this.bones[i],v={...b,...(pose[b.name]||{})};for(const k of ['x','y','rotation','sx','sy'])finite(v[k]);if(Math.abs(v.sx*v.sy)<1e-9)throw Error('Singular animated scale');const local=mat.compose(v.x,v.y,v.rotation,v.sx,v.sy);this.world[i]=b.parent<0?local:mat.multiply(this.world[b.parent],local);}return this.world;
    }
    point(name,point=[0,0]) {const i=this.index[name];if(i===undefined)throw Error('Unknown bone '+name);return mat.point(this.world[i],point);}
  }
  class Rig {
    constructor(profile) {this.profile=profile;}
    solve(p) {return Rig.solveAnimation(this.profile,p);}
    static torsoMatrices(p) {
      const body=bodyMatrix(p),hip=mat.multiply(body,mat.compose(0,-191,p.pelvis||0));
      const middle=mat.multiply(hip,mat.compose(0,-55,(p.chest||0)*.35-(p.pelvis||0)*.5));
      const chest=mat.multiply(middle,mat.compose(0,-49,(p.chest||0)*.65-(p.pelvis||0)*.5));
      return [hip,middle,chest];
    }
    static solveAnimation(c,p) {
      const matrices=Rig.torsoMatrices(p),t=mat.multiply(mat.inverse(bodyMatrix(p)),mat.multiply(matrices[2],mat.compose(0,295)));
      const adjusted={...c,rigRearShoulder:mat.point(t,c.rigRearShoulder||[-42,-292]),rigFrontShoulder:mat.point(t,c.rigFrontShoulder||[42,-290])};
      const r=Rig.solveLegacy(adjusted,p),thigh=(c.rigLengths||[])[2]||(c.id==='chun'?100:96),shin=(c.rigLengths||[])[3]||98;
      if(p.pelvis){r.rearLeg=twoBone(mat.point(matrices[0],[-26,0]),p.ra,thigh,shin,p.rearLegPole??1,1);r.frontLeg=twoBone(mat.point(matrices[0],[26,0]),p.fa,thigh,shin,p.frontLegPole??-1,1);}
      // Artist-authored 2.5D projection, not anatomical stretch. Shorten the
      // projected bones at an edge-on pose instead of bending a straight limb
      // into a knee-to-chest fold. Gameplay's compatibility rig bypasses this.
      const lengths=c.rigLengths||[c.id==='iori'?67:c.female?64:68,c.id==='iori'?76:c.female?67:71,thigh,shin];
      for(const [name,target] of [['rearArm',p.rw],['frontArm',p.fw],['rearLeg',p.ra],['frontLeg',p.fa]]) {
        const k=clamp(p[name+'Projection']??1,.12,1);
        if(k===1)continue;
        const leg=name.includes('Leg'),i=leg?2:0,side=p[name+'Pole']??(name==='frontLeg'?-1:1);
        r[name]=twoBone(r[name][0],target,lengths[i]*k,lengths[i+1]*k,side,.1);
      }
      return r;
    }
    static solveLegacy(c,p) {
      const male=!c.female,as=c.id==='iori'?40:male?43:35;
      const ua=c.id==='iori'?67:male?68:64,la=c.id==='iori'?76:male?71:67;
      const thigh=c.id==='chun'?100:96;
      const lengths=c.rigLengths||[ua,la,thigh,98];
      const r={rearArm:twoBone(c.rigRearShoulder||[-as,-291],p.rw,lengths[0],lengths[1],p.rearArmPole??1,1),frontArm:twoBone(c.rigFrontShoulder||[as,-288],p.fw,lengths[0],lengths[1],p.frontArmPole??1,1),rearLeg:twoBone(bodyPoint(p,[-26,-191]),p.ra,lengths[2],lengths[3],p.rearLegPole??1,1),frontLeg:twoBone(bodyPoint(p,[26,-191]),p.fa,lengths[2],lengths[3],p.frontLegPole??-1,1)};
      const reach=p.reachScale||1;if(Math.abs(reach-1)>1e-5){const l=p.reachFoot?r.frontLeg:r.frontArm;l[1]=vec.mix(l[0],l[1],reach);l[2]=vec.mix(l[0],l[2],reach);}return r;
    }
    static sockets(p,rig) {
      const o={};for(const [name,chain] of Object.entries(rig))o[name]=chain.map(q=>name.includes('Arm')?bodyPoint(p,q):q.slice());
      const matrices=Rig.torsoMatrices(p),chest=matrices[2];o.pelvis=mat.point(matrices[0],[0,0]);o.chest=mat.point(chest,[0,3]);o.neck=mat.point(chest,[5,-29]);o.head=mat.point(chest,[6,-46]);return o;
    }
    static world(p,q,{x=0,y=0,scale=1,facing=1}={}) {
      const m=mat.multiply(mat.compose(x,y,0,scale*facing*(p.depth||1),scale),mat.multiply(mat.compose(p.rootShift||0,(p.floor||0)-180,p.spin||0),mat.compose(0,180)));
      return mat.point(m,q);
    }
  }

  function easing(u,curve='smooth') {
    u=clamp(u);if(curve==='hold')return u===1?1:0;if(curve==='linear')return u;
    if(curve==='strike')return 1-(1-u)**3;if(curve==='load')return u*u*u;
    if(Array.isArray(curve)) {
      const [x1,y1,x2,y2]=curve;
      const bez=(t,a,b)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t*t*t;
      let lo=0,hi=1,t=u;for(let i=0;i<18;i++){if(bez(t,x1,x2)<u)lo=t;else hi=t;t=(lo+hi)/2;}return bez(t,y1,y2);
    }
    return u*u*(3-2*u);
  }
  function validateClip(data) {
    if(!data||typeof data!=='object'||data.version!==1)throw TypeError('Clip version must be 1');
    if(typeof data.id!=='string'||!data.id||data.id.length>120||['__proto__','constructor','prototype'].includes(data.id))throw TypeError('Clip id required');
    if(!Number.isInteger(data.duration)||data.duration<1||data.duration>3600)throw RangeError('Clip duration 1…3600 frames');
    if(!data.tracks||typeof data.tracks!=='object'||Array.isArray(data.tracks)||Object.keys(data.tracks).length>64)throw TypeError('Invalid tracks');
    for(const [channel,keys] of Object.entries(data.tracks)){
      if(['__proto__','prototype','constructor'].includes(channel))throw TypeError('Unsafe channel');
      if(!Object.hasOwn(basePose,channel)&&!['rootX','rootY','squash','fanOpen','rearArmPole','frontArmPole','rearLegPole','frontLegPole'].includes(channel))throw TypeError('Unknown channel '+channel);
      if(!Array.isArray(keys)||!keys.length||keys.length>4096)throw RangeError('Invalid keys');
      let last=-1,shape;
      for(const key of keys){
        if(!Array.isArray(key)||key.length<2)throw TypeError('Invalid keyframe');
        const [time,value,curve]=key;finite(time);if(time<0||time>data.duration||time<=last)throw RangeError('Keys must be strictly ordered within clip');last=time;
        const sz=Array.isArray(value)?value.length:0;if(sz&&!Array.isArray(basePose[channel]))throw TypeError('Scalar channel expected');
        if(Array.isArray(basePose[channel])&&sz!==2)throw TypeError('Two-vector channel expected');
        if(shape!==undefined&&shape!==sz)throw TypeError('Track shape changed');shape=sz;
        for(const v of sz?value:[value])if(Math.abs(finite(v))>10000)throw RangeError('Excessive key value');
        if(curve!==undefined){if(Array.isArray(curve)){if(curve.length!==4)throw TypeError('Bezier needs four values');curve.forEach(v=>finite(v));if(curve[0]<0||curve[0]>1||curve[2]<0||curve[2]>1)throw RangeError('Bezier x must be 0…1');}else if(!['smooth','linear','strike','load','hold'].includes(curve))throw TypeError('Unknown curve');}
      }
    }
    if(data.phases){for(const name of ['startup','active','recovery']){const q=data.phases[name];if(!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite)||q[0]<0||q[1]<q[0]||q[1]>data.duration)throw TypeError('Invalid phase '+name);}}
    if(data.events!==undefined&&!Array.isArray(data.events))throw TypeError('Events must be an array');
    if((data.events||[]).length>512)throw RangeError('Too many events');
    const sockets=['rearArm','frontArm','rearLeg','frontLeg','pelvis','chest','neck','head'];
    if(data.meta!==undefined){
      if(!data.meta||typeof data.meta!=='object'||Array.isArray(data.meta))throw TypeError('Invalid clip metadata');
      if(data.meta.socket!==undefined&&!sockets.includes(data.meta.socket))throw TypeError('Unknown attachment socket');
    }
    for(const e of data.events||[]){
      if(!e||!Number.isInteger(e.frame)||e.frame<0||e.frame>=data.duration||typeof e.type!=='string'||e.type.length>80)throw TypeError('Invalid event');
      if(e.socket!==undefined&&!sockets.includes(e.socket))throw TypeError('Unknown event socket');
      if(e.amplitude!==undefined&&Math.abs(finite(e.amplitude))>1000)throw RangeError('Excessive impulse amplitude');
      for(const key of ['decay','frequency'])if(e[key]!==undefined&&(finite(e[key])<0||e[key]>10))throw RangeError('Invalid impulse '+key);
    }
    return data;
  }
  class Clip {
    constructor(data) {validateClip(data);this.data=JSON.parse(JSON.stringify(data));this.id=data.id;this.duration=data.duration;this.tracks=this.data.tracks;this.events=(this.data.events||[]).slice().sort((a,b)=>a.frame-b.frame);}
    sample(frame,base=basePose) {
      const p=copy(base),t=clamp(frame,0,this.duration);
      for(const [channel,keys] of Object.entries(this.tracks)){
        let value=keys[0][1];if(t>=keys.at(-1)[0])value=keys.at(-1)[1];
        else for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],u=easing((t-a[0])/(b[0]-a[0]),b[2]);value=Array.isArray(a[1])?a[1].map((v,j)=>lerp(v,b[1][j],u)):lerp(a[1],b[1],u);break;}}
        p[channel]=Array.isArray(value)?value.slice():value;
      }return p;
    }
    /** Seek never dispatches events or damage. */
    eventsBetween(from,to) {return this.events.filter(e=>e.frame>from&&e.frame<=to);}
    toJSON() {return JSON.parse(JSON.stringify(this.data));}
  }
  class Player {
    constructor(clip,base=basePose) {this.clip=clip;this.base=copy(base);this.frame=0;this.cycle=0;this.frozen=0;this.eventCursor=-1;this.ended=false;this.transition=null;}
    play(clip,blendFrames=0) {const old=this.sample(0);this.clip=clip;this.frame=0;this.cycle=0;this.eventCursor=-1;this.ended=false;this.frozen=0;this.transition=blendFrames>0?{from:old,length:blendFrames}:null;}
    freeze(frames) {this.frozen=Math.max(this.frozen,Math.max(0,Math.floor(frames)));}
    seek(frame) {this.frame=clamp(Math.floor(frame),0,this.clip.duration);this.eventCursor=this.frame;this.ended=this.frame===this.clip.duration;this.frozen=0;this.transition=null;}
    step() {
      if(this.frozen>0){this.frozen--;return [];}if(this.ended)return [];
      // Frame denotes the entered pose. A contact event at f therefore freezes
      // pose f, not f+1. Initial frame-zero events dispatch on the first tick.
      const next=Math.min(this.frame+1,this.clip.duration);
      const events=this.clip.eventsBetween(this.eventCursor,next).map(e=>({...e,cycle:this.cycle}));
      this.eventCursor=next;this.frame=next;
      if(this.frame>=this.clip.duration){
        if(this.clip.data.loop){this.frame=0;this.eventCursor=-1;this.cycle++;}
        else this.ended=true;
      }
      return events;
    }
    sample(alpha=0) {let p=this.clip.sample(this.frame+(this.frozen>0?0:clamp(alpha,0,.99999)),this.base);if(this.transition&&this.frame<this.transition.length)p=blend(this.transition.from,p,easing(this.frame/this.transition.length));return p;}
    snapshot() {return {clip:this.clip.id,frame:this.frame,cycle:this.cycle,frozen:this.frozen,eventCursor:this.eventCursor,ended:this.ended,transition:this.transition?JSON.parse(JSON.stringify(this.transition)):null};}
    restore(s,registry) {const c=registry[s.clip];if(!c)throw Error('Missing clip '+s.clip);if(!Number.isInteger(s.frame)||s.frame<0||s.frame>c.duration)throw Error('Invalid snapshot frame');this.clip=c;for(const k of ['frame','cycle','frozen','eventCursor','ended','transition'])this[k]=s[k];}
  }
  class FixedClock {
    constructor(hz=60,maxSteps=8) {finite(hz);if(hz<=0||hz>1000||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>1000)throw RangeError('Invalid fixed clock settings');this.hz=hz;this.maxSteps=maxSteps;this.dt=1000/hz;this.accumulator=0;this.last=null;this.dropped=0;}
    reset() {this.accumulator=0;this.last=null;}
    advance(now,step,speed=1) {
      finite(now);finite(speed);if(this.last===null){this.last=now;return 0;}const elapsed=Math.max(0,now-this.last);this.last=now;
      this.accumulator+=Math.min(elapsed,250)*Math.max(0,speed);let n=0;
      while(this.accumulator+1e-7>=this.dt&&n<this.maxSteps){step();this.accumulator-=this.dt;n++;}
      if(this.accumulator>=this.dt){this.dropped+=Math.floor(this.accumulator/this.dt);this.accumulator%=this.dt;}
      return clamp(this.accumulator/this.dt);
    }
  }

  /** Compile SVG to absolute M/L/Q/C/Z. Smooth shorthand is resolved ONCE.
   * SVG arc commands are deliberately rejected with an actionable error: author
   * curves as cubics rather than silently distorting imported arc flags.
   */
  function compilePath(d) {
    if(typeof d!=='string'||d.length>250000)throw TypeError('Invalid SVG path');
    const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
    if(d.replace(/[\s,]/g,'')!==tokens.join(''))throw TypeError('Invalid SVG path character');
    if(tokens.length&&!/^[Mm]$/.test(tokens[0]))throw TypeError('SVG path must start with moveto');
    const sizes={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,Z:0};let i=0,cmd='',x=0,y=0,sx=0,sy=0,last='',control=null;const commands=[],values=[];
    const emit=(c,v)=>{commands.push({op:c,start:values.length,count:v.length});values.push(...v);};
    while(i<tokens.length){
      if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];
      const op=cmd.toUpperCase(),relative=cmd!==op;if(!(op in sizes))throw Error('Unsupported SVG command '+cmd+'; convert arcs to cubic paths before binding');
      if(op==='Z'){emit('Z',[]);x=sx;y=sy;last='Z';control=null;cmd='';continue;}
      const n=sizes[op];if(i+n>tokens.length)throw Error('Incomplete path command');
      const v=tokens.slice(i,i+n).map(Number);if(v.some(n=>!Number.isFinite(n)))throw Error('Invalid path number');i+=n;
      const at=(j)=>[v[j]+(relative?x:0),v[j+1]+(relative?y:0)];let end;
      if(op==='M'||op==='L'){end=at(0);emit(op,end);if(op==='M'){[sx,sy]=end;cmd=relative?'l':'L';}control=null;}
      else if(op==='H'){end=[v[0]+(relative?x:0),y];emit('L',end);control=null;}
      else if(op==='V'){end=[x,v[0]+(relative?y:0)];emit('L',end);control=null;}
      else if(op==='C'){const a=at(0),b=at(2);end=at(4);emit('C',[...a,...b,...end]);control=b;}
      else if(op==='Q'){const a=at(0);end=at(2);emit('Q',[...a,...end]);control=a;}
      else if(op==='S'){const a=last==='C'||last==='S'?[2*x-control[0],2*y-control[1]]:[x,y],b=at(0);end=at(2);emit('C',[...a,...b,...end]);control=b;}
      else if(op==='T'){const a=last==='Q'||last==='T'?[2*x-control[0],2*y-control[1]]:[x,y];end=at(0);emit('Q',[...a,...end]);control=a;}
      [x,y]=end;last=op;
    }
    return {commands,values:new Float64Array(values)};
  }
  function pathString(path,values=path.values) {let d='';for(const c of path.commands){d+=c.op;for(let i=0;i<c.count;i++)d+=(i?' ':'')+(Math.round(values[c.start+i]*100)/100);}return d;}
  class WeightedPath {
    constructor(d,weightsAt,bindMatrices) {
      this.path=compilePath(d);this.out=new Float64Array(this.path.values.length);this.bindInverse=bindMatrices.map(mat.inverse);this.weights=[];
      for(let i=0;i<this.path.values.length;i+=2){const q=[this.path.values[i],this.path.values[i+1]],w=weightsAt(q),total=w.reduce((s,v)=>s+v,0);if(w.length!==bindMatrices.length||w.some(v=>!Number.isFinite(v)||v<0)||Math.abs(total-1)>1e-5)throw Error('Skin weights must be nonnegative and sum to one');this.weights.push(w.map((weight,j)=>({weight,bind:mat.point(this.bindInverse[j],q)})));}
    }
    deform(worldMatrices) {
      for(let i=0;i<this.weights.length;i++){let x=0,y=0;for(let j=0;j<this.weights[i].length;j++){const w=this.weights[i][j];if(!w.weight)continue;const m=worldMatrices[j];x+=(m[0]*w.bind[0]+m[2]*w.bind[1]+m[4])*w.weight;y+=(m[1]*w.bind[0]+m[3]*w.bind[1]+m[5])*w.weight;}this.out[i*2]=x;this.out[i*2+1]=y;}
      return pathString(this.path,this.out);
    }
  }
  /** Optional artist-authored corrective contours. Unlike arbitrary SVG
   * crossfades, each target must share the exact normalized path topology.
   */
  class MorphPath {
    constructor(rest,targets={}) {
      this.rest=compilePath(rest);this.targets=Object.create(null);this.out=new Float64Array(this.rest.values.length);
      const signature=p=>p.commands.map(c=>c.op+':'+c.count).join('|');
      for(const [name,d]of Object.entries(targets)){const p=compilePath(d);if(signature(p)!==signature(this.rest))throw Error('Morph topology mismatch: '+name);this.targets[name]=p.values;}
    }
    sample(weights={}) {
      let sum=0;for(const [key,w]of Object.entries(weights)){finite(w);if(w<0||!this.targets[key])throw Error('Invalid morph target/weight');sum+=w;}if(sum>1.000001)throw Error('Morph weights must sum to at most one');
      for(let i=0;i<this.out.length;i++){let v=this.rest.values[i]*(1-sum);for(const [key,w]of Object.entries(weights))v+=this.targets[key][i]*w;this.out[i]=v;}return pathString(this.rest,this.out);
    }
  }
  /** An analytic damped accessory track: random access and reverse seeking are
   * deterministic. It is cosmetic, never a source for hitboxes or resources. */
  function followThrough(frame,impulses=[],idleAmplitude=0) {
    let result=Math.sin(frame*.052)*idleAmplitude;
    for(const {frame:at,amplitude=8,decay=.065,frequency=.31} of impulses){const t=frame-at;if(t>=0)result+=amplitude*Math.exp(-decay*t)*Math.sin(frequency*t);}
    return clamp(result,-38,38);
  }
  return {VERSION,clamp,lerp,rad,vec,mat,finite,copy,blend,twoBone,bodyMatrix,bodyPoint,basePose,Rig,Skeleton,easing,Clip,Player,FixedClock,validateClip,compilePath,pathString,WeightedPath,MorphPath,followThrough};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=globalThis.INK;
