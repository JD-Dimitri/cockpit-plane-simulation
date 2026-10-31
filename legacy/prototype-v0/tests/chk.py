import pathlib as _pl
PREVIEW=(_pl.Path(__file__).resolve().parent.parent/'preview.html').as_uri()
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(); await pg.goto(PREVIEW); await pg.wait_for_timeout(2000)
        print(await pg.evaluate("""(()=>{const out=[];for(const [ap,rw] of [['FMEE','12'],['LFPO','24'],['LFPG','26R']]){const r=rwyGeom(ap,rw);let worstA=1e9,worstD=1e9;
          for(let nm=0;nm<=30;nm+=0.5){const p=gcDest(r.thr.lat,r.thr.lon,r.hdg+180,nm*NM);const gs=r.elev/FT+nm*318;const t=surfaceElev(p.lat,p.lon)/FT;worstA=Math.min(worstA,gs-t);}
          for(let nm=0;nm<=12;nm+=0.5){const p=gcDest(r.end.lat,r.end.lon,r.hdg,nm*NM);const cl=r.elev/FT+400+nm*600;const t=surfaceElev(p.lat,p.lon)/FT;worstD=Math.min(worstD,cl-t);}
          out.push(ap+' marge mini approche '+Math.round(worstA)+' ft, départ '+Math.round(worstD)+' ft');}
          const W=S.fms.wpts;let mx=0,where='';for(let i=1;i<W.length;i++)for(let f=0;f<=1;f+=0.02){const q=gcInterp(W[i-1].lat,W[i-1].lon,W[i].lat,W[i].lon,f);const h=surfaceElev(q.lat,q.lon)/FT;if(h>mx){mx=h;where=W[i].id;}}
          out.push('relief max sous la route '+Math.round(mx)+' ft vers '+where);return out.join('\\n');})()"""))
        await b.close()
asyncio.run(main())
