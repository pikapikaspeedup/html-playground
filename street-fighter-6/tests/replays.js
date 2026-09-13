() => {
 const A=SVG_FIGHTER, out=[];A.start('ryu','ken','training','classic');A.state.paused=false;
 for(const ch of A.characters){
  for(const m of A.moves[ch.id]){
   try{
    let ok=A.practice(ch.id,m.id);const f=A.fighters[0],d=A.fighters[1];
    const started=!!ok&&((f.attack?.m.id===m.id)||['PAR','RUSH'].includes(m.id)||m.kind==='stance'||m.kind==='denjin');
    let finite=true,badSVG=false,minHp=d.hp,seen=new Set,activeBounds=[];
    for(let i=0;i<Math.min(210,m.total+75);i++){
     A.step(1);minHp=Math.min(minHp,d.hp);
     if(i%4===0){for(const x of A.fighters){const p=A.pose(x);if(!Object.values(p).flat().every(v=>typeof v!=='number'||Number.isFinite(v)))finite=false;}A.render();badSVG||=/NaN|Infinity/.test(f.root.outerHTML);seen.add(f.state);if(f.attack&&f.attack.t>=m.startup&&f.attack.t<m.startup+m.active)activeBounds.push(A.geometry(f).hit.length);}
    }
    out.push({ch:ch.id,id:m.id,started,finite,validSVG:!badSVG,damage:10000-minHp,activeFramesWithGeometry:activeBounds.filter(n=>n>0).length});
   }catch(e){out.push({ch:ch.id,id:m.id,error:String(e)})}
  }
 }
 A.state.paused=true;return out;
}
