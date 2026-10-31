import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for mobile in (False, True):
            ctx = await b.new_context(viewport={'width':412,'height':880} if mobile else {'width':1360,'height':900}, has_touch=mobile, is_mobile=mobile)
            pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
            tap = (lambda s: pg.tap(s)) if mobile else (lambda s: pg.click(s))
            async def ask(sel, view=None, pos=None):
                if view: await tap(f'.tab[data-view={view}]'); await pg.wait_for_timeout(200)
                await pg.locator(sel).first.scroll_into_view_if_needed()
                await tap('#helpFab'); await pg.wait_for_timeout(100)
                if pos: 
                    bb = await pg.locator(sel).bounding_box(); x=bb['x']+bb['width']*pos[0]; y=bb['y']+bb['height']*pos[1]
                    if mobile: await pg.touchscreen.tap(x,y)
                    else: await pg.mouse.click(x,y)
                else: await tap(sel)
                await pg.wait_for_timeout(200)
                t = await pg.text_content('#hTitle'); n = await pg.evaluate("document.querySelectorAll('#hBody dt').length")
                g = await pg.evaluate("!$('hGroup').hidden && $('hGroup').textContent")
                await pg.evaluate("$('helpDlg2').close()"); return f'{t} [{n} éléments]' + (f' · bouton «{g}»' if g else '')
            r=[]
            r.append(await ask('#ctl-bat1 .pb','ovhd'))
            r.append(await ask('#ctl-bat1', None, (0.5,0.95)))
            r.append(await ask('.opnl >> nth=4', None, (0.5,0.03)))
            r.append(await ask('#fcu', 'main', (0.5,0.06)))
            r.append(await ask('#cvPFD', None, (35/290,140/290)))
            r.append(await ask('#stickPad'))
            st = await pg.evaluate("[S.ovh.bat1, S.ctl.pitch]")
            print('mobile' if mobile else 'desktop'); [print('  ',x) for x in r]; print('   état BAT1/manche inchangé:', st, errs or 'no errors')
            await ctx.close()
        await b.close()
asyncio.run(main())
