global.window = {};
const fs=require('fs'); eval(fs.readFileSync('src/core.js','utf8')+fs.readFileSync('src/flight.js','utf8')+`
function todRemaining(){ pathAlt(); const t=S.fms.pathTbl, crz=S.fms.crzFL*100; for(let i=0;i<t.length;i++) if(t[i]>=crz) return i*NM; return null; }
function fly(route){
  loadScenario('ready', route); S.ctl.park=false; S.ctl.tla=[35,35]; S.fcu.alt=S.fms.crzFL*100;
  const t0=S.t; let des=false, tAir=null, set3=false;
  for(let i=0;i<60*3600*14;i++){
    simStep(DT); if(S.crash) return route+' CRASH '+S.crash;
    const a=S.ac, ra=radAlt();
    if(a.onGround && !S.tookOff){ S.ctl.pitch = (ias()>S.fms.vr && a.theta<9.5*D2R)?0.5:0; continue; }
    S.ctl.pitch=0;
    if(tAir===null) tAir=S.t;
    if(ra>S.fms.thrRed && S.ctl.tla[0]>25) S.ctl.tla=[25,25];
    if(ra>400 && !S.fcu.ap1 && !a.onGround) apEngage(1);
    if(ra>300) S.ctl.gearDown=false;
    if(ias()>210 && S.phase!=='APPROACH') S.ctl.flapsLever=0;
    const td=todRemaining();
    if(!des && S.nav && td && S.nav.rem < td + 2*NM){ S.fcu.alt=3000; fcuAltPush(false); des=true; }
    const r=S.nav?S.nav.rem/NM:999;
    if(r<26 && !S.fcu.appr){ S.fcu.appr=true; S.efis.ls=true; apEngage(2); S.ctl.spdArmed=true; S.ctl.autobrk=3; }
    if(S.phase==='APPROACH'){ const sp=speeds(); if(ias()<sp.gd+5) S.ctl.flapsLever=Math.max(S.ctl.flapsLever,1); if(ias()<sp.s+5) S.ctl.flapsLever=Math.max(S.ctl.flapsLever,2); if(r<12){S.ctl.gearDown=true;} if(ias()<sp.f+5 && S.ctl.gearDown) S.ctl.flapsLever=Math.max(S.ctl.flapsLever,3); if(S.ctl.flapsLever>=3 && ias()<200) S.ctl.flapsLever=4; }
    if(S.fg.retard) S.ctl.tla=[0,0];
    if(S.arrived) break;
  }
  const blk=(S.t-t0)/3600, air=(S.ac.tdT-tAir)/3600;
  return route+' : sol→sol '+air.toFixed(2)+' h, total (avec roulage décollage/atterrissage) '+blk.toFixed(2)+' h, arrivé '+S.arrived+', TD '+Math.round(S.ac.lastTdVs)+' ft/min, carburant restant '+Math.round(fob())+' kg, route '+Math.round(S.fms.totalDist/NM)+' NM';
}
for (const r of ['FMEE-LFPO','LFPO-FMEE','FMEE-LFPG','LFPG-FMEE']) console.log(fly(r));
`);
