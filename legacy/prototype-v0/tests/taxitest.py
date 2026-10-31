import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1360,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1500)
        await pg.click('#btnSound')
        for route in ['FMEE-LFPO','LFPG-FMEE']:
            await pg.select_option('#routeSel',route); await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad')
            r = await pg.evaluate("""(()=>{ S.sys.adirs=[1,1,1]; Object.assign(S.ovh,{bat1:1,bat2:1,batEmer1:1,batEmer2:1,ir1:1,ir2:1,ir3:1,adr1:1,adr2:1,adr3:1,beacon:0});
              S.eng.forEach(e=>{e.st='run';e.n1=21;e.n2=58;e.n3=68;}); S.ctl.engMaster=[true,true]; for(let i=0;i<60;i++) simStep(DT);
              taxiToggleAuto(); let t=0; for(;t<60*900 && S.taxi && !S.taxi.done;t++) simStep(DT);
              return [S.taxi.done, Math.round(t/60)+' s', onRunwayThr(), Math.round(S.ac.psi*R2D), S.fms.depRwy, S.crash||'ok']; })()""")
            print(route,'départ', r)
        await pg.screenshot(path=SP+'taxi_lineup.png', clip={'x':0,'y':230,'width':1360,'height':900})
        await pg.select_option('#routeSel','FMEE-LFPO'); await pg.select_option('#scenSel','approach'); await pg.click('#btnLoad')
        r = await pg.evaluate("""(()=>{ for(let i=0;i<60*400 && !(S.ac.onGround&&S.ac.V<35*KT);i++){ simStep(DT); if(S.fg.retard) S.ctl.tla=[0,0]; }
              S.ctl.tla=[0,0]; S.ctl.autobrk=0; for(let i=0;i<60*3;i++) simStep(DT);
              taxiToggleAuto(); let t=0; for(;t<60*1200 && S.taxi && !S.taxi.done;t++) simStep(DT);
              for(let i=0;i<60*8;i++) simStep(DT);
              return [S.taxi && S.taxi.mode, S.taxi && S.taxi.done, Math.round(t/60)+' s', S.arrived, S.crash||'ok']; })()""")
        print('arrivée', r)
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=SP+'taxi_gate.png', clip={'x':0,'y':230,'width':1360,'height':900})
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
