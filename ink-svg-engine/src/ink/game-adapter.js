/* Adapter boundary: use the original game's authoritative pose + solved rig.
 * No edits to frame data, collision, command parser, damage or Mai resources.
 * Authoring root motion stays in the studio until deliberately integrated.
 */
'use strict';
INK.Game={
 enabled:true,mode:'skin',version:'0.1.0',
 legacyNodes(f){return[f.core,f.rearLeg.g,f.frontLeg.g,f.trailing,f.beltLink].filter(Boolean);},
 show(f,enabled){for(const n of this.legacyNodes(f))n.style.display=enabled?'none':'';if(f.inkRenderer)f.inkRenderer.group.style.display=enabled?'':'none';},
 mount(f){if(f.inkRenderer)return f.inkRenderer;const r=new INK.Renderer(f.facing,f.ch);f.inkRenderer=r;f.facing.insertBefore(r.group,f.charge);r.setMode(this.mode);return r;},
 update(f,pose,rig,frame,expression,freeze){
  const r=this.mount(f);this.show(f,true);if(r.mode!==this.mode)r.setMode(this.mode);
  if(!freeze||f.inkAccessoryFrame===undefined)f.inkAccessoryFrame=frame;
  const m=f.attack?.m;const impulses=m?[{frame:m.startup,amplitude:m.super?13:7}]:[];
  return r.render(pose,{rig,frame:f.inkAccessoryFrame,expression,impulses,secondary:true});
 },
 setEnabled(value){this.enabled=!!value;globalThis.SVG_FIGHTER?.render();},
 setMode(value){if(!['skin','rig','silhouette','overlay'].includes(value))throw Error('Unknown render mode');this.mode=value;globalThis.SVG_FIGHTER?.render();}
};
