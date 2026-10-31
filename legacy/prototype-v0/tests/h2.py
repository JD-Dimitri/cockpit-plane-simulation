import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':412,'height':880}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
        await pg.tap('.tab[data-view=ovhd]'); await pg.wait_for_timeout(300)
        await pg.tap('.tab[data-view=main]'); await pg.wait_for_timeout(400)
        print(await pg.evaluate("[VIEW, $('v-main').hidden, $('stageWrap').hidden, JSON.stringify($('cvPFD').getBoundingClientRect())]"))
        await pg.evaluate("$('cvPFD').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(300)
        bb = await pg.locator('#cvPFD').bounding_box(); x=bb['x']+bb['width']*35/290; y=bb['y']+bb['height']*140/290
        await pg.evaluate("window._pu=[]; document.addEventListener('pointerup', e=>window._pu.push(e.target.id||e.target.tagName), true); document.addEventListener('click', e=>window._pu.push('click:'+(e.target.id||e.target.tagName)), true);")
        await pg.touchscreen.tap(x,y); await pg.touchscreen.tap(x,y); await pg.wait_for_timeout(300)
        print(await pg.evaluate("window._pu"), await pg.evaluate("JSON.stringify(HELP.lastP)+' '+performance.now()+' '+typeof helpResolve"))
        print('zone:', await pg.evaluate("HELP.sel && HELP.sel.title"), errs or 'ok')
        await pg.tap('#helpFab'); await pg.wait_for_timeout(200)
        print('dlg:', await pg.text_content('#hTitle'))
        await b.close()
asyncio.run(main())
