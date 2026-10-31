import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':412,'height':900}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
        # rejoue l'accident : roulage plein gaz sans cabrer puis piqué
        await pg.evaluate("S.ctl.park=false; S.ctl.tla=[45,45]; for(let i=0;i<60*60 && S.ac.onGround;i++) simStep(DT); S.ctl.pitch=-0.6; let w=[]; for(let i=0;i<60*20 && !S.crash;i++){ simStep(DT); if(S.gpws&&S.gpws.lvl&&!w.includes(S.gpws.lvl)) w.push(S.gpws.lvl+'@'+Math.round(radAlt())); } window._w=w;")
        print('alarmes:', await pg.evaluate("window._w"), 'crash:', await pg.evaluate("S.crash"))
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=SP+'mob_crash.png')
        await pg.tap('#gRestart'); await pg.wait_for_timeout(500)
        print('après recommencer:', await pg.evaluate("[S.crash, S.scenario, S.ac.onGround]"))
        await pg.screenshot(path=SP+'mob_bar.png')
        print('touchbar visible:', await pg.evaluate("!document.getElementById('touchBar').hidden"), 'scrollW', await pg.evaluate("document.documentElement.scrollWidth"))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
