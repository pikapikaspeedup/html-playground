'use strict';
(() => {
 const container=document.createElement('div');container.className='ink-game-controls';
 const title=document.createElement('strong');title.textContent='INK ENGINE 0.1';
 const toggle=document.createElement('button');toggle.className='small-btn';toggle.textContent='新轮廓 · 点击对照旧版';toggle.addEventListener('click',()=>{INK.Game.setEnabled(!INK.Game.enabled);toggle.textContent=INK.Game.enabled?'新轮廓 · 点击对照旧版':'旧版轮廓 · 切回 INK';});
 const modes=document.createElement('select');modes.setAttribute('aria-label','SVG 角色显示模式');for(const[v,t]of [['skin','角色轮廓'],['overlay','骨骼叠加'],['silhouette','纯剪影'],['rig','骨架']]){const o=document.createElement('option');o.value=v;o.textContent=t;modes.append(o);}modes.addEventListener('change',()=>INK.Game.setMode(modes.value));
 const text=document.createElement('span');text.textContent='仅替换渲染 · 搓招 / 伤害 / 不知火舞资源规则不变';container.append(title,toggle,modes,text);
 const toolbar=document.querySelector('.toolbar');toolbar.after(container);
 document.title='Street Fighter / INK SVG 引擎对战预览';
 SVG_FIGHTER.ink=INK.Game;
})();
