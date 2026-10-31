import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/2cb4c0be-96e0-582b-b476-fef40756af39/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1360,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
        await pg.goto(PREVIEW); await pg.wait_for_timeout(1200)
        await pg.select_option('#scenSel','cold'); await pg.click('#btnLoad')
        r = await pg.evaluate("""(()=>{ const pump=(n)=>{ for(let k=0;k<n;k++){ COMMS.nextAt=0; if(COMMS.pending) readback(k%2===0); commsUpdate(); logUpdate(); } };
          Object.assign(S.ovh,{bat1:1,bat2:1,batEmer1:1,batEmer2:1,extA:1,ir1:1,ir2:1,ir3:1,adr1:1,adr2:1,adr3:1}); S.sys.adirs=[1,1,1];
          for(let i=0;i<60;i++) simStep(DT); S.fms.initDone=true; S.fms.fuelDone=true; pump(10);
          S.ovh.beacon=0; S.eng.forEach(e=>{e.st='run';e.n1=21;e.n2=58;e.n3=68;}); S.ctl.engMaster=[true,true]; for(let i=0;i<60;i++) simStep(DT); pump(10);
          taxiToggleAuto(); for(let t=0;t<60*400 && !S.taxi.done;t++){ simStep(DT); if(t%60===0) pump(2);} pump(10);
          S.ctl.park=false; S.ctl.tla=[35,35]; for(let i=0;i<60*120;i++){ if(S.ac.onGround) S.ctl.pitch=(ias()>S.fms.vr&&S.ac.theta<9.5*D2R)?0.5:0; else {S.ctl.pitch=0; if(radAlt()>400&&!S.fcu.ap1) apEngage(1); if(radAlt()>1500) S.ctl.tla=[25,25]; S.ctl.gearDown=false;} simStep(DT); if(i%60===0) pump(2);} pump(10);
          return COMMS.log.map(m=>(m.who==='ATC'?m.st:m.who)+': '+m.text.slice(0,90)).join('\\n')+'\\n---LOG---\\n'+LOG.ev.map(e=>e.text).join('\\n'); })()""")
        print(r)
        for v in ['radio','log','calc']:
            await pg.click(f'.tab[data-view={v}]'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=SP+f'p_{v}.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
