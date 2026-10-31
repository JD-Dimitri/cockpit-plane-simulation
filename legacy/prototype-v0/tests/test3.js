global.window = {};
const fs=require('fs'); eval(fs.readFileSync('src/core.js','utf8')+fs.readFileSync('src/flight.js','utf8')+`
function run(sec, cb, every){ let n=Math.round(sec/DT); for(let i=0;i<n;i++){ simStep(DT); if(cb && i%Math.round((every||10)/DT)===0) cb(); if(S.crash) break; } }
const log=(tag)=>{const a=S.ac; console.log(tag,'t',S.t.toFixed(0),S.phase,'alt',(a.alt/FT).toFixed(0),'path',pathAlt().toFixed(0),'rem',(S.nav.rem/NM).toFixed(0),'ias',ias().toFixed(0),'vs',(a.vs/FT*60).toFixed(0),'fma',S.fg.athrMode,S.fg.vert,'/',S.fg.vertArm,S.fg.lat,'/',S.fg.latArm,'wp',S.fms.wpts[S.fms.active].id,'flap',S.ctl.flapsLever,'gear',S.ctl.gearDown, S.crash||'', S.msg?S.msg.t:'');};
loadScenario('cruise','FMEE-LFPG'); const W=S.fms.wpts; const L=W.length;
const ia=W[L-4]; const back=gcBrg(ia.lat,ia.lon,W[L-5].lat,W[L-5].lon); const p=gcDest(ia.lat,ia.lon,back,110*NM); S.ac.lat=p.lat; S.ac.lon=p.lon; S.fms.active=L-4; S.ac.psi=gcBrg(p.lat,p.lon,ia.lat,ia.lon)*D2R; navUpdate();
log('start');
let set=false;
run(3600,()=>{ if(!set && S.nav.rem/NM < 128){ S.fcu.alt=5000; fcuAltPush(false); set=true; }
  const r=S.nav.rem/NM; if(r<24 && !S.fcu.appr){ S.fcu.appr=true; S.efis.ls=true; apEngage(2);} 
  if(r<22) S.ctl.flapsLever=Math.max(S.ctl.flapsLever,1); if(r<17) S.ctl.flapsLever=Math.max(S.ctl.flapsLever,2); if(r<13){S.ctl.gearDown=true; S.ctl.flapsLever=3;} if(r<10) S.ctl.flapsLever=4; S.ctl.spdArmed=true; S.ctl.autobrk=3;
  if(S.fg.retard) S.ctl.tla=[0,0];
  log('F'); if(S.ac.onGround && S.ac.V<1) {} },45);
console.log('TD',S.ac.lastTdVs.toFixed(0),'thr dist',S.ls.dThr.toFixed(0),'xtk',S.ls.xtk.toFixed(1), S.phase);
`);
