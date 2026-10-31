global.window = {};
const fs=require('fs'); eval(fs.readFileSync('src/core.js','utf8')+fs.readFileSync('src/flight.js','utf8')+`
function run(sec, cb, every){ let n=Math.round(sec/DT); for(let i=0;i<n;i++){ simStep(DT); if(cb && i%Math.round((every||10)/DT)===0) cb(); if(S.crash) break; } }
const log=(tag)=>{const a=S.ac; console.log(tag, 't',S.t.toFixed(0),'ph',S.phase,'alt',(a.alt/FT).toFixed(0),'ias',ias().toFixed(0),'M',machNow().toFixed(3),'vs',(a.vs/FT*60).toFixed(0),'hdg',(a.psi*R2D).toFixed(0),'pit',(a.theta*R2D).toFixed(1),'bank',(a.phi*R2D).toFixed(1),'fma',S.fg.athrMode,S.fg.vert,'/',S.fg.vertArm,S.fg.lat,'/',S.fg.latArm,'n1',S.eng[0].n1.toFixed(0),'ff',(S.eng[0].ff+S.eng[1].ff).toFixed(0),'fob',fob().toFixed(0),'wp',S.fms.active, S.crash||'', S.msg?S.msg.t:'');};
// ---- TAKEOFF ----
loadScenario('ready','FMEE-LFPO');
console.log('V1/VR/V2',S.fms.v1,S.fms.vr,S.fms.v2,'TOW',S.fms.tow,'block',S.fms.block,'route NM',(S.fms.totalDist/NM).toFixed(0),'wpts',S.fms.wpts.length);
S.ctl.park=false; S.ctl.tla=[35,35]; S.fcu.alt=37000;
run(60,()=>{ if(ias()>S.fms.vr) S.ctl.pitch=0.6; if(!S.ac.onGround) S.ctl.pitch=0; log('TO'); },5);
for(let k=0;k<12;k++){ run(10); if(!S.ac.onGround && radAlt()>S.fms.thrRed){ S.ctl.tla=[25,25]; } if(radAlt()>400&&!S.fcu.ap1){apEngage(1);} if(radAlt()>500) {S.ctl.gearDown=false;} if(ias()>220) S.ctl.flapsLever=0; log('CLB'); }
run(1500,()=>log('CLB2'),150);
// ---- CRUISE ----
loadScenario('cruise','FMEE-LFPG'); log('CRZ0'); run(600,()=>log('CRZ'),120);
// ---- APPROACH ----
loadScenario('approach','LFPO-FMEE'); log('APP0'); S.ctl.tla=[25,25];
run(400,()=>{ log('APP'); if(S.fg.retard) S.ctl.tla=[0,0]; },4);
console.log('TD vs', S.ac.lastTdVs.toFixed(0), 'crash', S.crash, 'xtk', S.ls.xtk.toFixed(1), 'dist past thr', S.ls.dThr.toFixed(0));
`);
