// A deterministic, joint-driven routine. One clock drives the body and held props.
const PI=Math.PI, clamp01=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp01(x);return x*x*x*(10+x*(-15+6*x));};
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/Math.max(.00001,Math.hypot(...a)));
const mix3=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export const WORKOUT_SLOT=22;
export const workoutStations=[
  {id:'curls',name:'Tegovi · biceps',zone:'sun',entry:[-2.6,0,1.55],yaw:0},
  {id:'bench',name:'Klupa · potisak',zone:'sun',entry:[-3.4,0,-.25],yaw:0},
  {id:'squat',name:'Tegovi · čučnjevi',zone:'sun',entry:[-2.6,0,1.55],yaw:0},
  {id:'run',name:'Traka 01 · trčanje',zone:'cardio',entry:[2.05,0,1.02],yaw:PI},
  {id:'walk',name:'Traka 02 · brzi hod',zone:'cardio',entry:[4.25,0,1.02],yaw:PI},
  {id:'kettle',name:'Girja · čučnjevi',zone:'stretch',entry:[3.25,0,1.45],yaw:0},
  {id:'lunge',name:'Strunjača 01 · iskorak',zone:'stretch',entry:[-.9,.1,2.5],yaw:0},
  {id:'stretch',name:'Strunjača 02 · istezanje',zone:'stretch',entry:[1.15,.1,2.5],yaw:0},
  {id:'roller',name:'Valjak · oporavak',zone:'stretch',entry:[4.1,0,3.95],yaw:PI}
];
export function workoutTransform(origin=[0,0,0],yaw=0,lean=0){
  const c=Math.cos(yaw),s=Math.sin(yaw),a=Math.cos(lean),b=Math.sin(lean);
  return [c,0,-s,0,s*b,a,c*b,0,s*a,-b,c*a,0,...origin,1];
}
export function transformGymPoint(m,p,normal=false){
  return [0,1,2].map(i=>m[i]*p[0]+m[i+4]*p[1]+m[i+8]*p[2]+(normal?0:m[i+12]));
}
const at=(p,yaw,v)=>transformGymPoint(workoutTransform(p,yaw),v);
const bone=(a,b,length,forward)=>{
  const y=unit(sub(b,a)),x=unit(cross(y,forward)),z=unit(cross(x,y));
  const scale=Math.hypot(...sub(b,a))/length;
  return [...x,0,...mul(y,scale),0,...z,0,...a,1];
};
// Two-bone IK preserves limb lengths and keeps hands/feet on their contact points.
function joint(a,target,hint,l1,l2){
  const raw=sub(target,a),distance=Math.hypot(...raw),d=Math.max(.03,Math.min(distance,l1+l2-.0001)),v=unit(raw);
  const projected=sub(hint,mul(v,dot(hint,v))),bend=unit(Math.hypot(...projected)<.001?cross(v,[1,0,0]):projected);
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  return {mid:add(a,add(mul(v,along),mul(bend,height))),end:add(a,mul(v,d))};
}
function neutral(position,yaw=0){
  return {root:add(position,[0,1.16,0]),yaw,lean:0,
    hands:[at(position,yaw,[-.43,1.02,.02]),at(position,yaw,[.43,1.02,.02])],
    feet:[at(position,yaw,[-.20,.14,.06]),at(position,yaw,[.20,.14,.06])],
    elbows:[[-.3,-.1,-1],[.3,-.1,-1]],knees:[[0,0,1],[0,0,1]],toe:[0,0]};
}
function blendPose(a,b,t){
  return {root:mix3(a.root,b.root,t),yaw:angleMix(a.yaw,b.yaw,t),lean:a.lean+(b.lean-a.lean)*t,
    hands:a.hands.map((v,i)=>mix3(v,b.hands[i],t)),feet:a.feet.map((v,i)=>mix3(v,b.feet[i],t)),
    elbows:a.elbows.map((v,i)=>mix3(v,b.elbows[i],t)),knees:a.knees.map((v,i)=>mix3(v,b.knees[i],t)),toe:a.toe.map((v,i)=>v+(b.toe[i]-v)*t)};
}
function footfall(phase,stride,lift){
  const cycle=((phase/(2*PI))%1+1)%1;
  if(cycle<.5)return {z:stride*(1-4*cycle),y:0,toe:-.12*ease((cycle-.35)/.15)};
  const swing=(cycle-.5)*2;
  return {z:-stride+2*stride*ease(swing),y:Math.sin(swing*PI)*lift,toe:-.18*Math.sin(swing*PI)};
}
function exercise(station,t){
  const {id,entry,yaw}=station,p=neutral(entry,yaw),wave=(1-Math.cos(t*PI*.72))/2;
  if(id==='curls'){
    for(let i=0;i<2;i++){const s=i?1:-1,q=(1-Math.cos(t*2.1+i*.25))/2;p.hands[i]=add(entry,[s*.44,1.01+q*.72,.04+Math.sin(q*PI)*.39]);p.elbows[i]=[s*.15,-1,-.25];}
    p.root[1]+=.012*Math.sin(t*2.1);p.lean=-.025*Math.sin(t*2.1);
  }else if(id==='bench'){
    // Hips rest at the foot end; planted ankles remain within the leg's reach.
    p.root=[-3.4,1.10,-1.38];p.lean=-PI/2;
    p.feet=[[-3.88,.14,-.93],[-2.92,.14,-.93]];p.knees=[[-.45,1,1],[.45,1,1]];
    p.hands=[[-4.02,1.45+wave*.66,-2.13],[-2.78,1.45+wave*.66,-2.13]];p.elbows=[[-1,0,.2],[1,0,.2]];
  }else if(id==='squat'||id==='kettle'){
    p.root[1]-=wave*.48;p.root[2]-=wave*.22;p.lean=wave*.33;
    p.feet=[add(entry,[-.32,.14,.12]),add(entry,[.32,.14,.12])];
    const frame=workoutTransform(p.root,0,p.lean);
    p.hands=id==='squat'?[transformGymPoint(frame,[-.46,.70,.25]),transformGymPoint(frame,[.46,.70,.25])]:[transformGymPoint(frame,[-.14,.62,.38]),transformGymPoint(frame,[.14,.62,.38])];
    p.elbows=[[-1,-1,.2],[1,-1,.2]];
  }else if(id==='run'||id==='walk'){
    const run=id==='run',phase=t*(run?8:5.6),base=[entry[0],.4,-.45];
    p.root=add(base,[.025*Math.sin(phase),1.12+(run?.045:.015)*(1-Math.cos(phase*2)),0]);p.lean=run?.09:.025;
    for(let i=0;i<2;i++){
      const s=i?1:-1,a=phase+i*PI,step=footfall(a,run?.36:.28,run?.32:.12);
      p.feet[i]=at(base,PI,[s*.19,.14+step.y,step.z]);
      p.hands[i]=at(p.root,PI,[s*.40,.36+Math.sin(a)*.10,.22-Math.cos(a)*(run?.30:.19)]);
      p.toe[i]=step.toe;p.elbows[i]=[s*.2,-1,-1];
    }
  }else if(id==='lunge'){
    p.root=add(entry,[0,.91-wave*.13,-.08]);p.lean=.08;
    p.feet=[add(entry,[-.20,.14,.65]),add(entry,[.20,.17,-.69])];
    p.hands=[add(entry,[-.28,1.09-wave*.10,.52]),add(entry,[.17,1.13-wave*.10,.46])];
    p.knees=[[0,0,1],[0,-1,1]];p.toe=[0,-.45];
  }else if(id==='stretch'){
    p.root=add(entry,[0,.91-wave*.06,-.12]);p.lean=.93+wave*.17;
    p.hands=[add(entry,[-.48,.38,.60]),add(entry,[.48,.38,.60])];
    p.feet=[add(entry,[-.25,.14,-.15]),add(entry,[.25,.14,-.15])];p.elbows=[[-.3,0,-1],[.3,0,-1]];
  }else if(id==='roller'){
    p.root=[4.1,.40,3.47+Math.sin(t*1.8)*.08];p.lean=-.38;
    // Targets follow the same local left/right convention as the turned torso.
    p.feet=[at([4.1,0,2.55],yaw,[-.23,.87,0]),at([4.1,0,2.55],yaw,[.23,.87,0])];
    p.hands=[at([4.1,0,3.87],yaw,[-.50,.12,0]),at([4.1,0,3.87],yaw,[.50,.12,0])];
    p.knees=[[0,1,.1],[0,1,.1]];p.elbows=[[-1,0,-1],[1,0,-1]];
  }
  return p;
}
function contact(station){
  const p=exercise(station,0),{id,entry}=station;
  if(id==='curls'||id==='squat'||id==='kettle'){
    p.root=add(entry,[0,.68,-.12]);p.lean=.88;
    p.hands=id!=='kettle'?[add(entry,[-.46,.19,.33]),add(entry,[.46,.19,.33])]:[add(entry,[-.14,.70,.15]),add(entry,[.14,.70,.15])];
    p.elbows=[[-.4,0,-1],[.4,0,-1]];
  }else if(id==='bench'){
    p.hands=[[-4.02,1.85,-2.65],[-2.78,1.85,-2.65]];
  }
  return p;
}
// Routes pass through the aisles; curved samples give constant-speed footfalls.
const routeVia=[
  [[-2.6,.1]], [[-1.5,-.15]], [[.35,-1.0],[.4,.9]], [],
  [[4.25,1.05]], [[2.25,1.0],[.1,1.0]], [], [[1.15,4.15],[4.1,4.15]],
  [[2.3,4.15],[-2.6,3.6]]
];
const routes=workoutStations.map((s,i)=>{
  const end=workoutStations[(i+1)%workoutStations.length],points=[s.entry,...routeVia[i].map(([x,z])=>[x,0,z]),end.entry];
  const samples=[{p:points[0],d:0}];
  for(let j=0;j<points.length-1;j++)for(let k=1;k<=32;k++){
    const t=k/32,p0=points[Math.max(0,j-1)],p1=points[j],p2=points[j+1],p3=points[Math.min(points.length-1,j+2)];
    const p=p1.map((v,n)=>.5*((2*v)+(-p0[n]+p2[n])*t+(2*p0[n]-5*v+4*p2[n]-p3[n])*t*t+(-p0[n]+3*v-3*p2[n]+p3[n])*t*t*t));
    const prev=samples.at(-1);samples.push({p,d:prev.d+Math.hypot(...sub(p,prev.p))});
  }
  return samples;
});
function walking(index,t){
  const route=routes[index],s=workoutStations[index],next=workoutStations[(index+1)%workoutStations.length];
  const distance=ease(t)*route.at(-1).d,i=Math.max(1,route.findIndex(p=>p.d>=distance)),a=route[i-1],b=route[i];
  const p=mix3(a.p,b.p,(distance-a.d)/Math.max(.00001,b.d-a.d));
  let yaw=Math.atan2(b.p[0]-a.p[0],b.p[2]-a.p[2]);
  yaw=angleMix(s.yaw,yaw,ease(t/.18));yaw=angleMix(yaw,next.yaw,ease((t-.82)/.18));
  const pose=neutral(p,yaw);
  // Ease the stride at the start/end without sliding the last planted foot.
  const amount=Math.min(1,t/.12,(1-t)/.12),phase=distance*PI/.5;
  pose.root[1]+=.025*Math.sin(phase*2)*amount;
  for(let side=0;side<2;side++){
    const sign=side?1:-1,q=phase+side*PI,step=footfall(q,.25,.13);
    pose.feet[side]=at(p,yaw,[sign*.20,.14+step.y*amount,.06+step.z*amount]);
    pose.hands[side]=at(p,yaw,[sign*.43,1.02,.02-Math.cos(q)*.20*amount]);pose.toe[side]=step.toe*amount;
  }
  return pose;
}
function rig(p,time){
  const m={},torso=workoutTransform(p.root,p.yaw,p.lean),forward=transformGymPoint(workoutTransform([0,0,0],p.yaw),[0,0,1],true);
  m.torso=torso;m.pelvis=workoutTransform(p.root,p.yaw,p.lean*.45);
  m.head=workoutTransform(transformGymPoint(torso,[0,.91,0]),p.yaw,p.lean);
  m.hair=workoutTransform(transformGymPoint(m.head,[0,.25,-.17]),p.yaw+Math.sin(time*3)*.08,p.lean+.08*Math.sin(time*4));
  const joints={hands:[],feet:[],elbows:[],knees:[],shoulders:[],hips:[]};
  for(let i=0;i<2;i++){
    const sign=i?1:-1,suffix=i?'R':'L',shoulder=transformGymPoint(torso,[sign*.34,.70,0]),hip=transformGymPoint(m.pelvis,[sign*.18,0,0]);
    const arm=joint(shoulder,p.hands[i],transformGymPoint(workoutTransform([0,0,0],p.yaw),p.elbows[i],true),.49,.49);
    const leg=joint(hip,p.feet[i],transformGymPoint(workoutTransform([0,0,0],p.yaw),p.knees[i],true),.57,.57);
    m['upperArm'+suffix]=bone(shoulder,arm.mid,.49,forward);m['forearm'+suffix]=bone(arm.mid,arm.end,.49,forward);
    m['thigh'+suffix]=bone(hip,leg.mid,.57,forward);m['shin'+suffix]=bone(leg.mid,leg.end,.57,forward);
    m['shoe'+suffix]=workoutTransform(leg.end,p.yaw,p.toe[i]);m['hand'+suffix]=workoutTransform(arm.end,p.yaw);
    joints.hands.push(arm.end);joints.feet.push(leg.end);joints.elbows.push(arm.mid);joints.knees.push(leg.mid);joints.shoulders.push(shoulder);joints.hips.push(hip);
  }
  return {models:m,joints};
}
export function workoutFrame(time){
  const total=WORKOUT_SLOT*workoutStations.length,clock=((time%total)+total)%total,index=Math.floor(clock/WORKOUT_SLOT),local=clock%WORKOUT_SLOT;
  const station=workoutStations[index],idle=neutral(station.entry,station.yaw),touch=contact(station),start=exercise(station,0),finish=exercise(station,10);
  let pose,holding=false,stage='Vežba';
  if(local<1.5){pose=blendPose(idle,touch,ease(local/1.5));stage='Priprema';}
  else if(local<3){pose=blendPose(touch,start,ease((local-1.5)/1.5));holding=true;stage='Priprema';}
  else if(local<13){pose=exercise(station,local-3);holding=true;}
  else if(local<14.5){pose=blendPose(finish,touch,ease((local-13)/1.5));holding=true;stage='Odmor';}
  else if(local<16){pose=blendPose(touch,idle,ease((local-14.5)/1.5));stage='Odmor';}
  else{pose=walking(index,(local-16)/(WORKOUT_SLOT-16));stage='Sledeća stanica';}
  const result=rig(pose,time),props={
    dumbbellL:workoutTransform([-3.06,.19,1.88]),dumbbellR:workoutTransform([-2.14,.19,1.88]),
    barbell:workoutTransform([-3.4,1.85,-2.65]),kettle:workoutTransform([3.25,.70,1.60]),
    roller:workoutTransform([4.1,.37,2.7],0,station.id==='roller'?-Math.sin((local-3)*1.8)*.34*ease((local-1.5)/1.5)*(1-ease((local-13)/1.5)):0)
  };
  if(holding){
    const hands=result.joints.hands;
    if(station.id==='curls'||station.id==='squat'){props.dumbbellL=workoutTransform(hands[0]);props.dumbbellR=workoutTransform(hands[1]);}
    if(station.id==='bench')props.barbell=workoutTransform(mix3(hands[0],hands[1],.5));
    if(station.id==='kettle')props.kettle=workoutTransform(mix3(hands[0],hands[1],.5));
  }
  return {...result,props,index,station,stage,progress:local/WORKOUT_SLOT,pose};
}
