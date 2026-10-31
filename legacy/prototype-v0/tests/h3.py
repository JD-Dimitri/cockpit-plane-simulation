import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':412,'height':880}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page()
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""(()=>{ const c=$('cvPFD'); c.scrollIntoView({block:'center'}); const r=c.getBoundingClientRect(); const x=r.left+r.width*35/290, y=r.top+r.height*140/290;
          const fire=()=>c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x,clientY:y,pointerType:'touch'}));
          fire(); const a=JSON.stringify(HELP.lastP); fire(); return [a, HELP.sel&&HELP.sel.title, typeof T3]; })()""")
        print(r); await b.close()
asyncio.run(main())
