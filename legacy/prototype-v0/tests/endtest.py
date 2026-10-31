import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1360,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1000)
        await pg.select_option('#scenSel','cruise'); await pg.click('#btnLoad'); await pg.wait_for_timeout(300)
        for k in range(60):
            if await pg.is_visible('#gSkip') and (await pg.text_content('#gSkip'))=='Passer': await pg.click('#gSkip')
        await pg.wait_for_timeout(300)
        print('en vol, tout passé :', await pg.text_content('#gPhase'), '|', await pg.text_content('#gTxt'))
        await pg.select_option('#scenSel','approach'); await pg.click('#btnLoad')
        await pg.evaluate("for(let i=0;i<60*420;i++){ simStep(DT); if(S.fg.retard) S.ctl.tla=[0,0]; }")
        await pg.wait_for_timeout(400)
        print('à destination :', await pg.evaluate("S.arrived"), '|', await pg.text_content('#gPhase'), '|', await pg.text_content('#gTxt'))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
