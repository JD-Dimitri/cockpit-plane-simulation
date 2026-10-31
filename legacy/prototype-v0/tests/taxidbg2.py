import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(); await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
        await pg.select_option('#scenSel','approach'); await pg.click('#btnLoad')
        print(await pg.evaluate("""(()=>{ for(let i=0;i<60*400 && !(S.ac.onGround&&S.ac.V<35*KT);i++){ simStep(DT); if(S.fg.retard) S.ctl.tla=[0,0]; }
          S.ctl.tla=[0,0]; S.ctl.autobrk=0; for(let i=0;i<60*3;i++) simStep(DT);
          const r0=[S.taxi&&S.taxi.mode, S.taxi&&S.taxi.pts.map(p=>p.al+'/'+p.sd).join(' '), Math.round(aptFrame(S.fms.to).proj(S.ac.lat,S.ac.lon).al)];
          taxiToggleAuto(); const out=[JSON.stringify(r0), 'auto '+S.taxi.auto, S.msg&&S.msg.t];
          for(let t=0;t<60*300;t++){ simStep(DT); if(t%(60*20)===0){ const inf=taxiInfo(); out.push([Math.round(t/60), S.taxi.i, S.taxi.auto, inf&&Math.round(inf.d), (S.ac.V/KT).toFixed(1), S.ctl.tla[0].toFixed(2), S.ctl.brake.toFixed(2), Math.round(S.ac.psi*R2D), inf&&Math.round(inf.brg), S.ctl.spdArmed, S.sys.gndSpl.toFixed(2), S.sys.ab.active, S.fcu.ap1, S.fg.vert].join(' ')); } }
          return out.join('\\n'); })()"""))
        await b.close()
asyncio.run(main())
