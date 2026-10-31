global.window = {};
const fs=require('fs'); eval(fs.readFileSync('src/core.js','utf8')+fs.readFileSync('src/flight.js','utf8')+`
function run(sec, cb, every){ let n=Math.round(sec/DT); for(let i=0;i<n;i++){ simStep(DT); if(cb && i%Math.round((every||10)/DT)===0) cb(); if(S.crash) break; } }
const log=(tag)=>{const a=S.ac; console.log(tag,'t',S.t.toFixed(0),S.phase,'alt',(a.alt/FT).toFixed(0),'ias',ias().toFixed(0),'vs',(a.vs/FT*60).toFixed(0),'pit',(a.theta*R2D).toFixed(1),'fma',S.fg.athrMode,S.fg.vert,'/',S.fg.vertArm,S.fg.lat,'/',S.fg.latArm,'ra',radAlt().toFixed(0), S.tailstrike?'TAIL':'', S.crash||'');};
loadScenario('ready','LFPG-FMEE'); S.ctl.park=false; S.ctl.tla=[35,35]; S.fcu.alt=10000;
run(70,()=>{ if(ias()>S.fms.vr && S.ac.theta<9.5*D2R) S.ctl.pitch=0.5; else S.ctl.pitch=0; if(!S.ac.onGround) S.ctl.pitch=0; if(!S.ac.onGround||ias()>140) log('TO');},2);
console.log('---- cold start');
loadScenario('cold','FMEE-LFPO');
const o=S.ovh; o.bat1=o.bat2=o.batEmer1=o.batEmer2=1; o.extA=1; run(2); console.log('elec',S.sys.elec.src,S.sys.elec.ac);
o.ir1=o.ir2=o.ir3=1; o.adr1=o.adr2=o.adr3=1; o.apuMaster=1; run(10); o.apuStart=1; run(50); console.log('apu n',S.sys.apu.n.toFixed(0),'avail',S.sys.apu.avail,'egt',S.sys.apu.egt.toFixed(0));
o.apuBleed=1; run(2); console.log('duct',S.sys.duct, 'xbleed', S.sys.xbleedOpen);
S.ctl.engMode=2; S.ctl.engMaster[1]=true; run(60,()=>{const e=S.eng[1]; console.log(' E2',e.st,'n3',e.n3.toFixed(0),'n1',e.n1.toFixed(0),'egt',e.egt.toFixed(0),'ff',e.ff.toFixed(0));},10);
S.ctl.engMaster[0]=true; run(60); S.ctl.engMode=1; console.log('E1',S.eng[0].st,'E2',S.eng[1].st,'elec',S.sys.elec.src,'hyd',S.sys.hyd,'adirs',S.sys.adirs.map(x=>x.toFixed(2)));
run(100); ecamUpdate(); console.log('alerts',S.ecam.alerts.map(x=>x.title),'memo',S.ecam.memo.map(x=>x.t));
console.log('---- descent');
loadScenario('cruise','FMEE-LFPO'); S.fms.active=S.fms.wpts.length-5; navUpdate(); S.ac.lat=S.fms.wpts[S.fms.active-1].lat; S.ac.lon=S.fms.wpts[S.fms.active-1].lon; S.ac.psi=gcBrg(S.ac.lat,S.ac.lon,S.fms.wpts[S.fms.active].lat,S.fms.wpts[S.fms.active].lon)*D2R; navUpdate();
console.log('rem NM',(S.nav.rem/NM).toFixed(0),'path',pathAlt().toFixed(0));
S.fcu.alt=4000; fcuAltPush(false);
run(2400,()=>{log('DES'); console.log('   rem',(S.nav.rem/NM).toFixed(0),'path',pathAlt().toFixed(0),'wp',S.fms.wpts[S.fms.active].id); },120);
`);
