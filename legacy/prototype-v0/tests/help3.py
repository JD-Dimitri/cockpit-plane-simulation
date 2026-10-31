import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for mobile in (False, True):
            ctx = await b.new_context(viewport={'width':412,'height':880} if mobile else {'width':1360,'height':900}, has_touch=mobile, is_mobile=mobile)
            pg = await ctx.new_page(); await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
            await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad'); await pg.wait_for_timeout(300)
            await pg.click('.tab[data-view=ovhd]'); await pg.wait_for_timeout(300)
            a = await pg.evaluate("S.ovh.bat1")
            if mobile: await pg.tap('#helpFab'); await pg.tap('#ctl-bat1 .pb')
            else: await pg.click('#helpFab'); await pg.click('#ctl-bat1 .pb')
            await pg.wait_for_timeout(200)
            bb = await pg.evaluate("[S.ovh.bat1, $('helpDlg2').open, HELP.pick]")
            await pg.evaluate("$('helpDlg2').close()")
            if mobile: await pg.tap('.tab[data-view=main]')
            else: await pg.click('.tab[data-view=main]')
            await pg.wait_for_timeout(300)
            v = await pg.evaluate("[VIEW, $('helpDlg2').open, JSON.stringify($('fcu').getBoundingClientRect())]")
            print('mobile' if mobile else 'desktop', 'bat1 avant', a, 'après', bb, v)
            await ctx.close()
        await b.close()
asyncio.run(main())
