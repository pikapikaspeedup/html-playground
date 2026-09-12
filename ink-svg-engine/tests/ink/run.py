#!/usr/bin/env python3
"""Rebuild, run math/animation tests, then verify the real Chromium game adapter.
Requires Node.js, Python 3.10+, playwright and Chromium. CHROMIUM overrides path.
"""
from pathlib import Path
import subprocess,sys,os,json,time,hashlib,datetime
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
QA=OUT/'screenshots';QA.mkdir(exist_ok=True)
def main():
    subprocess.run([sys.executable,str(ROOT/'tools/build_ink.py')],check=True)
    subprocess.run(['node',str(ROOT/'tests/ink/core.test.js')],check=True)
    errors=[];results=[]
    with sync_playwright() as playwright:
        browser_path=os.environ.get('CHROMIUM') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        browser=playwright.chromium.launch(executable_path=browser_path,headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1600,'height':1050},device_scale_factor=1)
        page.on('pageerror',lambda error:errors.append(error.stack))
        html=(ROOT/'dist/svg-fighter-engine-studio.html').read_text()
        page.set_content(html,wait_until='load')
        def check(name,fn):
            try:
                detail=fn();results.append({'name':name,'pass':True,'detail':detail})
            except Exception as ex:
                results.append({'name':name,'pass':False,'error':str(ex)})
        def evaluate_assert(expr):
            value=page.evaluate(expr)
            assert value,repr(value)
            return value
        check('Studio loads eight character selectors and 27 clips',lambda:evaluate_assert('Object.keys(INKStudio.registry).length===27 && document.querySelectorAll(".roster-item").length===8'))
        def replay_studio():
            return page.evaluate('''() => {const results=[];for(const id of Object.keys(INKStudio.registry)){
                INKStudio.selectClip(id);INKStudio.seek(0);const before=INKStudio.renderer.group.querySelectorAll('*').length;let bad=false;
                for(let f=0;f<=INKStudio.active.duration;f+=2){INKStudio.seek(f);const r=INKStudio.renderer;bad||=/NaN|Infinity/.test(r.group.outerHTML);for(const chain of Object.values(r.lastRig))for(const q of chain)bad||=!q.every(Number.isFinite);}
                const after=INKStudio.renderer.group.querySelectorAll('*').length;
                results.push({id,finite:!bad,retained:before===after,before,after});}
                if(results.some(r=>!r.finite||!r.retained))throw Error(JSON.stringify(results.filter(r=>!r.finite||!r.retained)));return results;}''')
        check('All authored clips render through every second frame with stable node counts',replay_studio)
        page.evaluate("INKStudio.selectClip('mai:hishou-ryuuenjin');INKStudio.seek(22)")
        check('Only one head attachment and one expression are visible',lambda:evaluate_assert('''() => {const root=INKStudio.renderer.head;const heads=[...root.children].filter(n=>getComputedStyle(n).display!=='none');const expressions=[...heads[0].querySelectorAll('[data-expression]')].filter(n=>getComputedStyle(n).display!=='none');return heads.length===1&&expressions.length===1&&expressions[0].dataset.expression==='power';}'''))
        check('Rig mode really hides art despite child visibility attributes',lambda:evaluate_assert('''() => {INKStudio.setMode('rig');const a=INKStudio.renderer.art;const visible=getComputedStyle(a).display!=='none';INKStudio.setMode('skin');return !visible;}'''))
        def ghost_test():
            page.locator('#onion').check();page.evaluate('INKStudio.draw()');assert page.locator('#ghosts').evaluate('(n)=>getComputedStyle(n).display!=="none"');page.locator('#onion').uncheck();assert page.locator('#ghosts').evaluate('(n)=>getComputedStyle(n).display==="none"');return True
        check('Onion skins show and hide without stray visible descendants',ghost_test)
        def key_edit():
            page.evaluate("INKStudio.selectClip('ryu:hadoken');INKStudio.seek(12)")
            page.locator('#editPose').check();handle=page.locator('[data-handle="fw"] circle');box=handle.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+36,y-22,steps=8);page.mouse.up();page.locator('#commitPose').click()
            out=page.evaluate('INKStudio.active.toJSON().tracks.fw.find(k=>k[0]===12)');assert out is not None
            page.locator('#undo').click();assert page.evaluate('!INKStudio.active.tracks.fw.some(k=>k[0]===12)')
            return out
        check('Pointer drag writes a real hand-target key and undo removes it',key_edit)
        def roundtrip():
            page.evaluate("INKStudio.override({chest:13});INKStudio.commitPose()")
            with page.expect_download() as info:page.locator('#exportClip').click()
            download=info.value;save=OUT/'roundtrip.ink.json';download.save_as(save);data=json.loads(save.read_text());assert data['version']==1
            before=page.evaluate('INKStudio.active.toJSON()');page.set_input_files('#fileInput',str(save));page.wait_for_timeout(100);after=page.evaluate('INKStudio.active.toJSON()');assert before==after
            return {'name':download.suggested_filename,'bytes':save.stat().st_size}
        check('Motion JSON export/import is lossless after edits',roundtrip)
        check('Malformed JSON rejected without replacing the current clip',lambda:evaluate_assert('''() => {const id=INKStudio.active.id;try{INKStudio.importClip({version:1,id:'bad',duration:0,tracks:{}});return false;}catch(e){return INKStudio.active.id===id;}}'''))
        def svg_export():
            with page.expect_download() as info:page.locator('#exportSVG').click()
            dest=OUT/'export-frame.svg';info.value.save_as(dest);text=dest.read_text();assert '<svg' in text and '<path' in text and '<script' not in text
            return {'bytes':dest.stat().st_size}
        check('Current-frame export contains SVG paths and no script/image embedding',svg_export)
        def profile_roundtrip():
            page.evaluate("INKStudio.selectClip('ryu:hadoken');INKStudio.seek(12)")
            before=page.evaluate('INKStudio.active.toJSON()')
            data=page.evaluate('INKStudio.exportProfile()');data['arm']=[20,9,7];data['rigLengths']=[71,74,96,98];data['style']={'head':1.12,'volume':.94}
            dest=OUT/'roundtrip-profile.json';dest.write_text(json.dumps(data))
            page.set_input_files('#fileInput',str(dest));page.wait_for_timeout(80)
            after=page.evaluate('INKStudio.exportProfile()');assert after==data
            assert before==page.evaluate('INKStudio.active.toJSON()')
            assert page.evaluate('INKStudio.renderer.c.arm[0]===20 && INKStudio.renderer.style.head===1.12')
            page.evaluate("INKStudio.selectClip('mai:hishou-ryuuenjin');INKStudio.selectClip('ryu:hadoken')")
            assert page.evaluate('INKStudio.exportProfile()')==data
            return {'kind':data['kind'],'profileRestored':True,'motionUnchanged':True,'switchRetainsSettings':True}
        check('Character profile import/export restores proportions without rewriting motion',profile_roundtrip)
        check('Invalid character profile is rejected before mutating assets',lambda:evaluate_assert('''() => {const before=INKStudio.exportProfile(),bad=JSON.parse(JSON.stringify(before));bad.rigLengths=[0,1,2,3];try{INKStudio.importProfile(bad);return false;}catch(e){return JSON.stringify(before)===JSON.stringify(INKStudio.exportProfile());}}'''))
        def keyboard():
            page.locator('#editPose').uncheck();page.evaluate("INKStudio.selectClip('mai:kachousen');INKStudio.seek(0)");page.locator('h1').click();page.keyboard.press('Space');page.wait_for_timeout(180);assert page.evaluate('INKStudio.playing&&INKStudio.player.frame>0');page.keyboard.press('Space');f=page.evaluate('INKStudio.player.frame');page.keyboard.press('ArrowRight');assert page.evaluate('INKStudio.player.frame')==f+1;return True
        check('Space playback and arrow-key frame stepping work',keyboard)
        page.evaluate("INKStudio.selectClip('mai:hishou-ryuuenjin');INKStudio.seek(22);INKStudio.setMode('overlay')")
        page.locator('#toast').evaluate('(node)=>node.classList.remove("visible")')
        page.screenshot(path=str(QA/'engine-studio-desktop.png'),full_page=True)
        perf=page.evaluate('INKStudio.benchmark(240)')
        def mobile():
            page.set_viewport_size({'width':390,'height':844});page.evaluate("INKStudio.selectClip('chun:legs');INKStudio.seek(27)");page.screenshot(path=str(QA/'engine-studio-mobile.png'),full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.locator('#clipSelect').select_option('chun:bird');assert page.evaluate('INKStudio.active.id')=='chun:bird'
            return True
        check('Mobile layout has no horizontal overflow and controls remain functional',mobile)
        page.set_viewport_size({'width':1600,'height':1050})
        page.set_content((ROOT/'dist/street-fighter-6-ink.html').read_text(),wait_until='load')
        page.wait_for_timeout(100)
        print('Studio checks',sum(r['pass'] for r in results),'/',len(results),flush=True)
        check('Renderer toggles old/new while preserving authoritative state',lambda:evaluate_assert('''() => {
          const A=SVG_FIGHTER;A.start('mai','ryu','training','classic');A.state.phase='fight';A.state.paused=true;A.render();
          const state=A.fighters.map(f=>[f.hp,f.drive,f.super,f.x,f.y,JSON.stringify(A.pose(f))]);
          INK.Game.setEnabled(false);A.render();if(A.fighters.some(f=>f.inkRenderer.group.style.display!=='none'))return false;
          INK.Game.setEnabled(true);A.render();return JSON.stringify(state)===JSON.stringify(A.fighters.map(f=>[f.hp,f.drive,f.super,f.x,f.y,JSON.stringify(A.pose(f))]));}'''))
        check('New renderer uses exactly the original game solved rig',lambda:evaluate_assert('''() => {const A=SVG_FIGHTER;for(const c of A.characters){A.start(c.id,'ryu','training','classic');A.state.phase='fight';A.state.paused=true;A.render();const f=A.fighters[0],r=A.rig(f,A.pose(f));if(JSON.stringify(r)!==JSON.stringify(f.inkRenderer.lastRig))return false;}return true;}'''))
        mechanics=page.evaluate((ROOT/'tests/mechanics.js').read_text())
        print('Mechanics',sum(t.get('pass',False) for t in mechanics),'/',len(mechanics),flush=True)
        started=time.monotonic();replays=page.evaluate((ROOT/'tests/replays.js').read_text())
        print('Move replays',sum(all(t.get(k) for k in ['started','finite','validSVG']) for t in replays),'/',len(replays),'seconds',round(time.monotonic()-started,1),flush=True)
        page.evaluate("SVG_FIGHTER.start('mai','ryu','training','classic');SVG_FIGHTER.state.phase='fight';SVG_FIGHTER.state.paused=true;SVG_FIGHTER.render();")
        page.wait_for_timeout(200);page.screenshot(path=str(QA/'game-ink-desktop.png'),full_page=True)
        timings=page.evaluate('''() => {const A=SVG_FIGHTER,results={};for(const enabled of [false,true]){
          INK.Game.setEnabled(enabled);A.start('ryu','ken','training','classic');A.state.phase='fight';A.state.paused=true;A.move(0,'hadoken_1');const f=A.fighters[0],a=f.attack;const samples=[];
          for(let i=0;i<250;i++){a.t=i%a.m.total;const start=performance.now();A.render();if(i>30)samples.push(performance.now()-start);}
          samples.sort((a,b)=>a-b);results[enabled?'ink':'legacy']={n:samples.length,median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1)};
        }return results;}''')
        report={'timeUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':browser.version,'baseCommit':'f38977c5a46a420a9e91695fa74e5ab5e2749038','scope':'Animation/renderer prototype. Checks do not certify artistic perfection, official move accuracy, production rollback netcode or device FPS. CPU timings measure synchronous JavaScript update only, excluding paint/presentation.','studioChecks':results,'mechanics':mechanics,'replays':replays,'browserErrors':errors,'studioRendererCpuMs':perf,'gameRenderCpuMs':timings,'sha256':{name:hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest() for name in ['svg-fighter-engine-studio.html','street-fighter-6-ink.html']}}
        (OUT/'ink-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));browser.close()
    failed=[r for r in results+mechanics if not r.get('pass')]+[r for r in replays if not all(r.get(k) for k in ['started','finite','validSVG'])]
    print(json.dumps({'failed':failed,'browserErrors':errors,'cpuMs':timings,'studioCpuMs':perf},ensure_ascii=False,indent=2),flush=True)
    return bool(failed or errors)
if __name__=='__main__':sys.exit(main())
