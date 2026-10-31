import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
        await pg.goto(PREVIEW); await pg.wait_for_timeout(2500)
        print('3D', await pg.evaluate("[T3.ok, T3.hReady, Math.round(surfaceElev(-21.1,55.48)), Math.round(surfaceElev(-3.07,37.35)), Math.round(surfaceElev(48.72,2.38))]"))
        await pg.evaluate("window.scrollTo(0,250)")
        await pg.screenshot(path=SP+'t3_rwy.png', clip={'x':0,'y':230,'width':1360,'height':660})
        # décollage puis montée vers l'île
        await pg.evaluate("S.ctl.park=false; S.ctl.tla=[35,35]; for(let i=0;i<60*120;i++){ if(S.ac.onGround) S.ctl.pitch=(ias()>S.fms.vr&&S.ac.theta<9.5*D2R)?0.5:0; else {S.ctl.pitch=0; if(radAlt()>400&&!S.fcu.ap1) apEngage(1); if(radAlt()>1500) S.ctl.tla=[25,25]; S.ctl.gearDown=false;} simStep(DT);} S.fcu.alt=37000; fcuAltPush(false); S.fcu.hdgMan=false; S.fg.lat='HDG'; S.fcu.hdg=230; for(let i=0;i<60*60;i++) simStep(DT);")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=SP+'t3_climb.png', clip={'x':0,'y':230,'width':1360,'height':660})
        await pg.select_option('#scenSel','cruise'); await pg.click('#btnLoad'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=SP+'t3_crz.png', clip={'x':0,'y':230,'width':1360,'height':660})
        print(errs[:8] or 'no errors'); await b.close()
asyncio.run(main())
