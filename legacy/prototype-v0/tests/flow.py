import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1360,'height':1000})
        errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
        await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad')
        await pg.click('.tab[data-view=ovhd]')
        for i in ['bat1','bat2','batEmer1','batEmer2','extA','adr1','adr2','adr3','ir1','ir2','ir3','apuMaster']:
            await pg.click(f'#ctl-{i} .pb')
        await pg.click('#ctl-navLogo .tog button >> nth=0')
        await pg.wait_for_timeout(300)
        await pg.evaluate("for(let i=0;i<60*12;i++) simStep(DT)")
        await pg.click('#ctl-apuStart .pb')
        await pg.evaluate("for(let i=0;i<60*45;i++) simStep(DT)")
        await pg.click('#ctl-apuBleed .pb')
        await pg.wait_for_timeout(400)
        await pg.screenshot(path=SP+'ovhd_cold.png')
        print(await pg.evaluate("[S.sys.elec.src, S.sys.apu.avail, S.sys.adirs.map(v=>v.toFixed(2)).join(','), document.getElementById('gTxt').textContent]"))
        await pg.click('.tab[data-view=ped]'); await pg.click('[data-mf=init]'); await pg.click('#mfdtab-FUELLOAD'); await pg.click('[data-mf=fuel]'); await pg.click('#mfdtab-PERF'); await pg.click('[data-mf=perf]')
        await pg.click('#ctl-seatBelts .tog button >> nth=0') if False else None
        await pg.evaluate("S.ovh.seatBelts=0; S.ovh.beacon=0; S.ctl.engMode=2; S.ctl.engMaster[1]=true")
        await pg.evaluate("for(let i=0;i<60*55;i++) simStep(DT)")
        await pg.click('.tab[data-view=main]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=SP+'start.png')
        print(await pg.evaluate("[S.eng[1].st, S.eng[1].n3.toFixed(0), S.sys.adirs.map(v=>v.toFixed(2)).join(','), document.getElementById('gTxt').textContent, S.ecam.page]"))
        print('\n'.join(errs) or 'no page errors')
        await b.close()
asyncio.run(main())
