import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for mobile in (False, True):
            ctx = await b.new_context(viewport={'width':412,'height':880} if mobile else {'width':1360,'height':900}, has_touch=mobile, is_mobile=mobile)
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
            await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad'); await pg.wait_for_timeout(300)
            await pg.click('.tab[data-view=ovhd]'); await pg.wait_for_timeout(300)
            el = pg.locator('#ctl-bat1 .pb')
            if mobile: await el.tap(); await pg.wait_for_timeout(120); await el.tap()
            else: await el.dblclick()
            await pg.wait_for_timeout(300)
            st = await pg.evaluate("[S.ovh.bat1, HELP.sel && HELP.sel.title]")
            await pg.click('#helpFab'); await pg.wait_for_timeout(300)
            title = await pg.text_content('#hTitle'); body = (await pg.text_content('#hBody'))[:90]
            await pg.screenshot(path=SP+('h_mob' if mobile else 'h_desk')+'.png')
            await pg.keyboard.press('Escape')
            # zone d'écran : bande vitesse du PFD
            await pg.click('.tab[data-view=main]'); await pg.wait_for_timeout(300)
            cv = pg.locator('#cvPFD'); await cv.scroll_into_view_if_needed(); await pg.wait_for_timeout(200); bb = await cv.bounding_box()
            x = bb['x'] + bb['width']*35/290; y = bb['y'] + bb['height']*140/290
            if mobile: await pg.touchscreen.tap(x,y); await pg.wait_for_timeout(120); await pg.touchscreen.tap(x,y)
            else: await pg.mouse.dblclick(x,y)
            await pg.wait_for_timeout(300)
            z = await pg.evaluate("HELP.sel && HELP.sel.title")
            # mode « ? » d'abord
            await pg.click('#helpFab'); await pg.wait_for_timeout(150)
            await pg.click('.tab[data-view=ped]') if False else None
            print('mobile' if mobile else 'desktop', '| BAT1 après double-tap:', st, '| fiche:', title, '|', body, '| zone PFD:', z, '|', errs or 'no errors')
            await ctx.close()
        await b.close()
asyncio.run(main())
