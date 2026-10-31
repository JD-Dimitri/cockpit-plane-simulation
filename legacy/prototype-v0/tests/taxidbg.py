import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(); await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
        await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad')
        print(await pg.evaluate("""(()=>{ S.sys.adirs=[1,1,1]; Object.assign(S.ovh,{bat1:1,bat2:1,ir1:1,adr1:1,beacon:0});
          S.eng.forEach(e=>{e.st='run';e.n1=21;e.n2=58;e.n3=68;}); S.ctl.engMaster=[true,true]; for(let i=0;i<60;i++) simStep(DT);
          taxiToggleAuto(); const out=[];
          for(let t=0;t<60*240;t++){ simStep(DT); if(t%(60*20)===0){ const inf=taxiInfo(); out.push([Math.round(t/60), S.taxi.i, S.taxi.auto, inf&&Math.round(inf.d), Math.round(S.ac.V/KT*10)/10, S.ctl.tla[0].toFixed(2), S.ctl.brake.toFixed(2), S.ctl.park, Math.round(S.ac.psi*R2D), inf&&Math.round(inf.brg), S.ctl.tiller.toFixed(2), Math.round(S.eng[0].thr)].join(' ')); } }
          return out.join('\\n'); })()"""))
        await b.close()
asyncio.run(main())
