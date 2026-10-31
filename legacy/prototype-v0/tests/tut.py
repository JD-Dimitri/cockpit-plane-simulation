import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1360,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
        await pg.click('#btnTutor'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=SP+'tut1.png')
        for i in ['bat1','batEmer1','batEmer2','bat2']: await pg.click(f'#ctl-{i} .pb')
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=SP+'tut2.png')
        print('step', await pg.evaluate("[currentStep(), document.getElementById('tutTxt').textContent]"))
        # replay crash : GPWS
        await pg.evaluate("loadScenario('ready','LFPO-FMEE'); S.ctl.park=false; S.ctl.tla=[45,45]; for(let i=0;i<60*70 && S.ac.onGround;i++) simStep(DT); S.ctl.pitch=-0.6; window._w=[]; for(let i=0;i<60*20 && !S.crash;i++){ simStep(DT); if(S.gpws&&S.gpws.lvl&&!window._w.includes(S.gpws.lvl)) window._w.push(S.gpws.lvl);} ")
        print('gpws', await pg.evaluate("window._w"), await pg.evaluate("S.crash"))
        ctx = await b.new_context(viewport={'width':412,'height':880}, has_touch=True, is_mobile=True, device_scale_factor=2)
        m = await ctx.new_page(); m.on('pageerror', lambda e: errs.append('M '+str(e)))
        await m.goto(PREVIEW); await m.wait_for_timeout(1200)
        await m.tap('#btnTutor'); await m.wait_for_timeout(1500)
        await m.screenshot(path=SP+'tut_mob.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
