const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={Math};vm.createContext(context);
vm.runInContext(fs.readFileSync('public/gym-workout.js','utf8').replace(/export /g,'')+'\nglobalThis.api={workoutFrame,workoutStations,WORKOUT_SLOT};',context);
const {workoutFrame,workoutStations,WORKOUT_SLOT}=context.api;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const close=(a,b,tolerance,message)=>assert.ok(distance(a,b)<tolerance,message+': '+distance(a,b));
assert.deepEqual(Array.from(workoutStations,s=>s.id),['curls','bench','squat','run','walk','kettle','lunge','stretch','roller'],'The routine must cover every equipment station');
for(let i=0;i<workoutStations.length;i++)assert.notDeepEqual(workoutFrame(i*WORKOUT_SLOT+3).models,workoutFrame(i*WORKOUT_SLOT+5.17).models,'Each station needs its own moving exercise');
for(let time=0;time<workoutStations.length*WORKOUT_SLOT;time+=.125){
  const f=workoutFrame(time),j=f.joints;
  for(const matrix of [...Object.values(f.models),...Object.values(f.props)])assert.ok(matrix.length===16&&matrix.every(Number.isFinite),'All pose matrices must be finite');
  for(let i=0;i<2;i++){
    for(const [a,b,length] of [[j.shoulders[i],j.elbows[i],.49],[j.elbows[i],j.hands[i],.49],[j.hips[i],j.knees[i],.57],[j.knees[i],j.feet[i],.57]])assert.ok(Math.abs(distance(a,b)-length)<.001,'Limb lengths must remain constant');
    assert.ok(j.feet[i][1]>=.08,'Shoes must stay above the floor');
  }
  const local=time%WORKOUT_SLOT;
  if(local>=3&&local<13){
    if(['curls','squat'].includes(f.station.id))for(let i=0;i<2;i++)close(f.props[i?'dumbbellR':'dumbbellL'].slice(12,15),j.hands[i],.001,'Dumbbells must stay in the hands');
    if(['bench','kettle'].includes(f.station.id)){const center=j.hands[0].map((v,i)=>(v+j.hands[1][i])/2);close(f.props[f.station.id==='bench'?'barbell':'kettle'].slice(12,15),center,.001,'Shared weight must stay between the hands');}
    if(['run','walk'].includes(f.station.id))assert.ok(j.feet.every(p=>p[1]>.48),'Treadmill feet must clear the belt');
  }
}
for(let i=0;i<workoutStations.length;i++)for(const boundary of [0,1.5,3,13,14.5,16,WORKOUT_SLOT]){
  const a=workoutFrame(i*WORKOUT_SLOT+boundary-.0001),b=workoutFrame(i*WORKOUT_SLOT+boundary+.0001);
  for(const part of Object.keys(a.models))close(a.models[part],b.models[part],.03,'Body must not jump at station '+i+' / '+boundary+' / '+part);
  for(const prop of Object.keys(a.props))close(a.props[prop],b.props[prop],.08,'Equipment must not jump at station '+i+' / '+boundary+' / '+prop);
}
console.log('Workout checks passed: complete routine, fixed limb lengths, floor/belt contact, held props and continuous transitions.');
