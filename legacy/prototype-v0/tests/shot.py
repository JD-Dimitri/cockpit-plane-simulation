import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio, sys
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1360,'height':1000})
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(PREVIEW)
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=SP+'main.png', full_page=True)
        # décollage auto
        await pg.keyboard.press('z'); await pg.keyboard.press('z')
        await pg.evaluate("S.ctl.park=false")
        await pg.wait_for_timeout(500)
        await pg.click('.tab[data-view=ovhd]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=SP+'ovhd.png', full_page=True)
        await pg.click('.tab[data-view=ped]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=SP+'ped.png', full_page=True)
        await pg.click('#mfdtab-FPLN'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SP+'fpln.png', full_page=False)
        await pg.click('.tab[data-view=main]')
        await pg.evaluate("for(let i=0;i<60*45;i++){ if(ias()>S.fms.vr && S.ac.theta<9.5*D2R) S.ctl.pitch=0.5; else S.ctl.pitch=0; simStep(DT);} S.ctl.pitch=0;")
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=SP+'takeoff.png', full_page=False)
        await pg.select_option('#scenSel','approach'); await pg.click('#btnLoad'); await pg.wait_for_timeout(300)
        await pg.evaluate("for(let i=0;i<60*240;i++){ simStep(DT); if(S.fg.retard) S.ctl.tla=[0,0]; if(radAlt()<200) break; }")
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=SP+'approach.png', full_page=False)
        await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad'); await pg.wait_for_timeout(800)
        await pg.screenshot(path=SP+'cold.png', full_page=False)
        await pg.set_viewport_size({'width':400,'height':860}); await pg.wait_for_timeout(600)
        await pg.screenshot(path=SP+'mobile.png', full_page=True)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        print('mobile scrollWidth', sw)
        print('\n'.join(errs[:30]) or 'no console errors')
        await b.close()
asyncio.run(main())
