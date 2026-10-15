const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={Math};vm.createContext(context);
const source=['gym-workout.js','space-gym.js'].map(file=>fs.readFileSync('public/'+file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')).join('\n');
vm.runInContext(source+'\nglobalThis.api={workoutFrame,workoutStations,WORKOUT_SLOT,createGymGeometry,transformGymPoint};',context);
const {workoutFrame,workoutStations,WORKOUT_SLOT,createGymGeometry,transformGymPoint}=context.api;
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
// Derive collision boxes from the rendered bench, including its cushion and legs.
const geometry=createGymGeometry(),bench=geometry.find(mesh=>mesh.id==='bench').data,boxes=[];
for(let offset=0;offset<bench.length;offset+=360){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let vertex=offset;vertex<offset+360;vertex+=10)for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],bench[vertex+axis]);max[axis]=Math.max(max[axis],bench[vertex+axis]);}
  boxes.push({min,max});
}
const legs=geometry.filter(mesh=>/^(thigh|shin|shoe)[LR]$/.test(mesh.part));
for(let local=0;local<WORKOUT_SLOT;local+=1/30){
  const f=workoutFrame(WORKOUT_SLOT+local);
  for(const mesh of legs)for(let i=0;i<mesh.data.length;i+=10){
    const p=transformGymPoint(f.models[mesh.part],mesh.data.slice(i,i+3));
    assert.ok(!boxes.some(box=>p.every((v,axis)=>v>box.min[axis]+.002&&v<box.max[axis]-.002)),'Leg geometry intersects bench at '+local.toFixed(3)+' / '+mesh.part+' / '+p.join(','));
  }
  if(local>=1.5&&local<=14.5)for(let side=0;side<2;side++)close(f.joints.feet[side],f.pose.feet[side],.001,'Bench feet must reach their planted position');
}
console.log('Workout checks passed: complete routine, fixed limb lengths, floor/belt contact, held props, continuous transitions and bench clearance.');
