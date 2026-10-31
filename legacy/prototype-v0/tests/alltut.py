import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for mobile in (True, False):
            ctx = await b.new_context(viewport={'width':412,'height':880} if mobile else {'width':1360,'height':900}, has_touch=mobile, is_mobile=mobile)
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
            await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
            await pg.click('#btnTutor'); await pg.wait_for_timeout(300)
            res = await pg.evaluate("""(()=>{ const miss=[]; for(let i=0;i<STEPS.length;i++){ TUT.view=i; TUT.scrolledFor=-1; tutorUpdate(0.016); if(!tutorTargets(i).length) miss.push((i+1)+':'+STEPS[i].v+'/'+VIEW); } TUT.view=null; return miss; })()""")
            await pg.evaluate("loadScenario('approach','FMEE-LFPO'); guideReset('approach'); S.ctl.flapsLever=1; S.fcu.ap2=true; window._f=0; (function c(){window._f++; requestAnimationFrame(c)})()")
            await pg.wait_for_timeout(2000)
            print('mobile' if mobile else 'desktop', '| étapes sans cible visible:', res, '| étape', await pg.evaluate("currentStep()+1"), 'vue', await pg.evaluate("VIEW"), '| boucle:', await pg.evaluate("[S.t.toFixed(1), window._f, S.paused, S.crash]"), '|', errs or 'no errors')
            await ctx.close()
        await b.close()
asyncio.run(main())
