import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':412,'height':880}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
        await pg.tap('#btnTutor'); await pg.wait_for_timeout(500)
        await pg.evaluate("loadScenario('approach','FMEE-LFPO'); guideReset('approach'); S.ctl.flapsLever=1; S.fcu.ap2=false; TUT.last=-1;")
        await pg.wait_for_timeout(1000)
        await pg.evaluate("S.fcu.ap2=true;")   # étape AP2 réussie -> passage à l'étape volets
        await pg.evaluate("window._f=0; (function c(){window._f++; requestAnimationFrame(c)})()")
        await pg.wait_for_timeout(3000)
        print('cur', await pg.evaluate("[currentStep(), VIEW, TUT.scrolledFor, document.getElementById('tutRings').children.length, window._f]"))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
