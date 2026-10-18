import {workoutFrame,workoutTransform,transformGymPoint} from './gym-workout.js?v=3';
// Static buffers plus joint transforms, shared by WebGL and Canvas.
export function createGymGeometry({lowDetail=false}={}) {
  const meshes = new Map();
  const motions = new Map();
  const rose = [0.86, 0.19, 0.46], blush = [1, 0.54, 0.74];
  const pale = [1, 0.76, 0.88], dark = [0.27, 0.035, 0.13], neon = [1, 0.25, 0.61];
  let group = 'room';
  function face(points, normal, color, glow = 0) {
    if (!meshes.has(group)) meshes.set(group, []);
    for (const i of [0, 1, 2, 0, 2, 3]) meshes.get(group).push(...points[i], ...(Array.isArray(normal[0])?normal[i]:normal), ...color, glow);
  }
  function box(x, y, z, w, h, d, color, glow = 0) {
    const a = x-w/2, b = x+w/2, c = y-h/2, e = y+h/2, f = z-d/2, g = z+d/2;
    face([[a,e,f],[a,e,g],[b,e,g],[b,e,f]], [0,1,0], color, glow);
    face([[a,c,g],[a,c,f],[b,c,f],[b,c,g]], [0,-1,0], color, glow);
    face([[a,c,g],[b,c,g],[b,e,g],[a,e,g]], [0,0,1], color, glow);
    face([[b,c,f],[a,c,f],[a,e,f],[b,e,f]], [0,0,-1], color, glow);
    face([[b,c,g],[b,c,f],[b,e,f],[b,e,g]], [1,0,0], color, glow);
    face([[a,c,f],[a,c,g],[a,e,g],[a,e,f]], [-1,0,0], color, glow);
  }
  function tube(start, end, radius, color, glow = 0, segments = 12) {
    if(lowDetail)segments=Math.min(segments,4);
    const axis = end.map((v,i)=>v-start[i]), length = Math.hypot(...axis);
    const n = axis.map(v=>v/length), ref = Math.abs(n[1])>.9 ? [1,0,0] : [0,1,0];
    const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const raw = cross(n,ref), u = raw.map(v=>v/Math.hypot(...raw)), v = cross(n,u);
    const radial = angle=>u.map((p,i)=>p*Math.cos(angle)+v[i]*Math.sin(angle));
    const point = (p,r)=>p.map((a,i)=>a+radius*r[i]);
    for (let i=0;i<segments;i++) {
      const r = radial(i/segments*Math.PI*2), s = radial((i+1)/segments*Math.PI*2);
      const normal = radial((i+.5)/segments*Math.PI*2);
      face([point(start,r),point(end,r),point(end,s),point(start,s)],normal,color,glow);
      face([start,point(start,s),point(start,r),start],n.map(a=>-a),color,glow);
      face([end,point(end,r),point(end,s),end],n,color,glow);
    }
  }
  function ellipsoid(x,y,z,rx,ry,rz,color) {
    const point=(a,b)=>[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];
    const lat=lowDetail?3:10,lon=lowDetail?5:16;
    for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){
      const a=i/lon*Math.PI*2,c=(i+1)/lon*Math.PI*2,b=j/lat*Math.PI,d=(j+1)/lat*Math.PI;
      const points=[point(a,b),point(c,b),point(c,d),point(a,d)],normals=points.map(p=>{const n=[(p[0]-x)/(rx*rx),(p[1]-y)/(ry*ry),(p[2]-z)/(rz*rz)],length=Math.hypot(...n);return n.map(v=>v/length);});
      face(points,normals,color);
    }
  }
  function dumbbell(x,y,z,length=1.1,r=.24) {
    tube([x-length/2,y,z],[x+length/2,y,z],.07,pale);
    for(const side of [-1,1]) for(const offset of [0,.12]) {
      const p=x+side*(length*.31+offset);
      tube([p-.07,y,z],[p+.07,y,z],r,offset?rose:blush,0,16);
    }
  }
  // Floating deck, luminous tile seams and a rose undercarriage.
  box(0,-.52,0,12.4,.5,9.5,dark);
  box(0,-.21,0,12,.15,9.2,rose);
  if(lowDetail)box(0,-.035,0,11.9,.07,8.9,blush);
  else for(let x=-5.5;x<=5.5;x++)for(let z=-4;z<=4;z++)box(x,-.035,z,.975,.07,.975,blush);
  for(const x of [-6,6])box(x,0,0,.065,.07,9.2,neon,1);
  for(const z of [-4.6,4.6])box(0,0,z,12,.07,.065,neon,1);
  box(0,-.57,4.76,11.7,.06,.04,pale,1);
  for(const x of [-4.5,4.5])tube([x,-.65,-2.8],[x,-1.15,-2.8],.52,neon,.8,24);
  // Open observatory arches leave the stars visible through the gym.
  for(const x of [-6,6]) {
    tube([x,0,-4.5],[x,4,-4.5],.11,rose);
    tube([x,4,-4.5],[x,4,3.5],.11,rose);
    tube([x,4,3.5],[x,0,4.5],.11,rose);
    tube([x,3.92,-4.5],[x,3.92,3.5],.035,pale,1);
  }
  tube([-6,4,-4.5],[6,4,-4.5],.11,rose);
  tube([-6,3.94,-4.46],[6,3.94,-4.46],.035,pale,1);
  for(const x of [-6,6])tube([x,.9,-4.5],[x,.9,3.6],.055,pale);
  tube([-6,.9,-4.5],[6,.9,-4.5],.055,pale);

  group='sun';
  // Squat rack and loaded barbell.
  for(const x of [-4.7,-2.1]) {
    box(x,.08,-2.4,.48,.16,2.5,rose);
    tube([x,.15,-3.25],[x,3.1,-3.25],.1,pale);
    for(let y=.65;y<2.7;y+=.35)box(x,y,-3.1,.13,.06,.15,dark);
    tube([x,1.73,-3.25],[x,1.73,-2.60],.06,rose);tube([x,1.73,-2.60],[x,1.90,-2.60],.06,rose);
  }
  tube([-4.7,3.1,-3.25],[-2.1,3.1,-3.25],.085,rose);
  group='barbell';motions.set(group,{zone:'sun',motion:'prop',part:'barbell'});
  tube([-1.85,0,0],[1.85,0,0],.06,pale);
  for(const x of [-1.55,-1.35,1.35,1.55])tube([x-.075,0,0],[x+.075,0,0],.40,rose,0,24);
  for(const x of [-1.65,1.65])tube([x-.025,0,0],[x+.025,0,0],.26,blush,0,20);
  group='sun';
  // Upholstered bench in front of the rack.
  group='bench';motions.set(group,{zone:'sun'});
  box(-3.4,.72,-2.2,.85,.23,1.6,rose);
  box(-3.4,.86,-2.2,.81,.07,1.5,blush);
  for(const z of [-2.75,-1.65]){box(-3.4,.36,z,.13,.68,.17,pale);box(-3.4,.08,z,1.3,.12,.35,rose);}
  group='sun';
  // Two-tier dumbbell shelf and a loose pair.
  for(const z of [.25,2.7])box(-4.9,.65,z,.16,1.3,.16,rose);
  for(const y of [.55,1.15]) {
    box(-4.9,y,1.5,.8,.12,2.7,rose);
    for(const z of [.5,1.4,2.3])dumbbell(-4.9,y+.23,z,.93,.20);
  }
  for(const part of ['dumbbellL','dumbbellR']){group=part;motions.set(group,{zone:'sun',motion:'prop',part});dumbbell(0,0,0,.69,.18);}

  group='cardio';
  for(const x of [2.05,4.25]) {
    box(x,.18,-.8,1.55,.32,3.2,rose);
    box(x,.36,-.55,1.15,.055,2.55,dark);
    for(let i=0;i<12;i++){
      group=`belt-${x}-${i}`;motions.set(group,{zone:'cardio',motion:'belt',phase:i*.2});
      box(x,.393,0,1.12,.012,.018,blush);
    }
    group='cardio';
    for(const side of [-.68,.68]) {
      box(x+side,.4,-.8,.13,.13,3,pale);
      tube([x+side,.4,-2],[x+side,1.95,-2.25],.065,pale);
      tube([x+side,1.95,-2.25],[x+side,1.8,-.9],.055,rose);
    }
    box(x,1.96,-2.25,1.5,.18,.48,rose);
    box(x,2.07,-2.25,.72,.025,.3,neon,1);
    for(const side of [-.23,0,.23])box(x+side,2.09,-2.25,.10,.01,.15,pale,.8);
  }

  group='stretch';
  for(const x of [-.9,1.15]) {
    box(x,.01,2.5,1.55,.12,2.8,rose);
    box(x,.08,2.5,1.4,.025,2.65,blush);
    for(const z of [1.4,3.6])box(x,.1,z,1.1,.015,.035,pale);
  }
  box(.67,.26,3.1,.4,.32,.55,blush);
  box(1.63,.26,3.1,.4,.32,.55,rose);
  group='roller';motions.set(group,{zone:'stretch',motion:'prop',part:'roller'});
  tube([-.6,0,0],[.6,0,0],.35,rose,0,24);
  tube([.62,0,0],[.66,0,0],.16,dark,0,20);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;tube([-.58,Math.cos(a)*.35,Math.sin(a)*.35],[.58,Math.cos(a)*.35,Math.sin(a)*.35],.018,blush,0,6);}
  // A kettlebell with a loop handle.
  group='kettle';motions.set(group,{zone:'stretch',motion:'prop',part:'kettle'});
  ellipsoid(0,-.42,0,.27,.28,.25,rose);
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;
    tube([Math.cos(a)*.22,-.12+Math.sin(a)*.16,0],[Math.cos(b)*.22,-.12+Math.sin(b)*.16,0],.045,pale,0,6);
  }

  // Separate smooth body segments follow the shared inverse-kinematics rig.
  for(let side=0;side<2;side++)for(let ring=0;ring<(lowDetail?1:2);ring++){
    group='foot-shadow-'+side+'-'+ring;motions.set(group,{motion:'shadow',side,opacity:ring?.12:.07});
    const r=ring?.20:.31;
    for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;face([[0,0,0],[Math.cos(b)*r,0,Math.sin(b)*r*1.35],[Math.cos(a)*r,0,Math.sin(a)*r*1.35],[0,0,0]],[0,1,0],dark,1);}
  }
  const skin=[1,.68,.82],hair=[.38,.055,.19];
  const part=name=>{group='milica-'+name;motions.set(group,{motion:'rig',part:name});};
  part('pelvis');ellipsoid(0,.02,0,.29,.20,.19,rose);ellipsoid(0,.17,0,.235,.08,.165,dark);
  part('torso');ellipsoid(0,.35,0,.23,.28,.165,skin);ellipsoid(0,.61,0,.29,.22,.19,rose);
  ellipsoid(0,.43,.006,.235,.06,.177,dark);
  for(const side of [-1,1])tube([side*.20,.62,.13],[side*.20,.80,-.03],.045,blush);
  tube([0,.75,0],[0,.94,0],.09,skin);
  part('head');ellipsoid(0,.17,0,.20,.25,.19,skin);
  ellipsoid(0,.23,-.10,.211,.23,.14,hair);ellipsoid(0,.37,-.015,.205,.08,.17,hair);
  for(const side of [-1,1]){
    ellipsoid(side*.068,.19,.178,.019,.024,.014,hair);
    ellipsoid(side*.20,.15,0,.04,.06,.04,skin);
    tube([side*.041,.24,.177],[side*.09,.25,.171],.008,hair,0,6);
  }
  ellipsoid(0,.13,.187,.029,.035,.025,skin);
  tube([-.035,.062,.18],[.035,.062,.18],.012,rose,0,8);
  part('hair');ellipsoid(0,0,-.05,.10,.10,.12,hair);ellipsoid(.025,-.20,-.12,.09,.25,.095,hair);
  tube([0,-.03,-.08],[0,-.04,-.08],.108,neon,0,12);
  for(const suffix of ['L','R']){
    part('upperArm'+suffix);ellipsoid(0,.03,0,.12,.13,.12,skin);ellipsoid(0,.25,0,.095,.26,.095,skin);
    part('forearm'+suffix);ellipsoid(0,.01,0,.085,.085,.085,skin);ellipsoid(0,.25,0,.075,.25,.075,skin);
    part('hand'+suffix);ellipsoid(0,-.02,0,.075,.10,.065,skin);
    part('thigh'+suffix);ellipsoid(0,.20,0,.145,.35,.145,rose);ellipsoid(0,.46,0,.12,.14,.12,rose);
    part('shin'+suffix);ellipsoid(0,0,0,.115,.10,.115,rose);ellipsoid(0,.27,0,.09,.29,.09,rose);
    part('shoe'+suffix);ellipsoid(0,-.025,.075,.125,.10,.23,pale);box(0,-.105,.075,.24,.035,.39,blush);
    for(const z of [.08,.13,.18])box(0,.057,z,.12,.012,.015,rose);
  }

  group='earth';
  // Illuminated sign with mesh lettering, readable without an image download.
  box(.35,3.05,-4.18,5.9,1.32,.16,dark);
  for(const y of [2.42,3.68])box(.35,y,-4.06,5.92,.04,.06,neon,1);
  for(const x of [-2.58,3.28])box(x,3.05,-4.06,.04,1.3,.06,neon,1);
  const letters={M:['10001','11011','10101','10001','10001','10001','10001'],I:['111','010','010','010','010','010','111'],L:['100','100','100','100','100','100','111'],C:['1111','1000','1000','1000','1000','1000','1111'],A:['01110','10001','10001','11111','10001','10001','10001'],W:['10001','10001','10001','10101','10101','10101','01010'],P:['1110','1001','1001','1110','1000','1000','1000'],E:['1111','1000','1000','1110','1000','1000','1111'],R:['1110','1001','1001','1110','1010','1001','1001'],S:['0111','1000','1000','0110','0001','0001','1110'],O:['0110','1001','1001','1001','1001','1001','0110'],N:['1001','1101','1101','1011','1011','1001','1001'],T:['11111','00100','00100','00100','00100','00100','00100'],'.':['0','0','0','0','0','0','1']};
  for(const [text,size,top] of [['MILICA',.09,3.48],['WWW.MILICAPERSONALTRAINER.COM',.037,2.82]]){
    let cursor=.35-([...text].reduce((sum,char)=>sum+letters[char][0].length+1,0)-1)*size/2;
    for(const char of text){
      const rows=letters[char];
      rows.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1'){const a=cursor+x*size,b=top-y*size,h=size*.41;face([[a-h,b-h,-4.04],[a+h,b-h,-4.04],[a+h,b+h,-4.04],[a-h,b+h,-4.04]],[0,0,1],pale,1);}}));
      cursor+=(rows[0].length+1)*size;
    }
  }
  return [...meshes].map(([id,data])=>({id,zone:id,...motions.get(id),data:new Float32Array(data)}));
}

export function gymPose(mesh,time,frame=workoutFrame(time)) {
  if(mesh.motion==='belt')return {matrix:workoutTransform([0,0,-1.72+(time*.9+mesh.phase)%2.4]),zone:'cardio'};
  if(mesh.motion==='rig')return {matrix:frame.models[mesh.part],zone:frame.station.zone};
  if(mesh.motion==='prop')return {matrix:frame.props[mesh.part],zone:mesh.zone};
  if(mesh.motion==='shadow'){
    const p=frame.joints.feet[mesh.side],floor=p[0]>1.3&&p[0]<5.1&&p[2]>-1.8&&p[2]<.8?.407:p[0]>-1.65&&p[0]<1.95&&p[2]>1.1&&p[2]<3.9?.107:.012;
    return {matrix:workoutTransform([p[0],floor,p[2]],frame.pose.yaw),zone:frame.station.zone,opacity:mesh.opacity};
  }
  return {matrix:workoutTransform(),zone:mesh.zone};
}

export function drawGymFallback(ctx, meshes, project, focusId,time=0,frame=workoutFrame(time)) {
  const triangles=[];
  for(const mesh of meshes){
    const pose=gymPose(mesh,time,frame),m=pose.matrix;
    for(let i=0;i<mesh.data.length;i+=30) {
    const d=mesh.data,points=[0,10,20].map(j=>project(transformGymPoint(m,[d[i+j],d[i+j+1],d[i+j+2]])));
    if(points.some(p=>p.depth<=0))continue;
    const light=.55+Math.max(0,m[1]*d[i+3]+m[5]*d[i+4]+m[9]*d[i+5])*.35+d[i+9]*.4;
    triangles.push({points,depth:points.reduce((s,p)=>s+p.depth,0)/3,color:[d[i+6],d[i+7],d[i+8]].map(v=>Math.min(255,Math.round(v*light*255))),alpha:(focusId&&pose.zone!==focusId?.4:1)*(pose.opacity??1)});
    }
  }
  triangles.sort((a,b)=>b.depth-a.depth);
  for(const t of triangles){ctx.globalAlpha=t.alpha;ctx.fillStyle=`rgb(${t.color.join(',')})`;ctx.beginPath();ctx.moveTo(t.points[0].x,t.points[0].y);ctx.lineTo(t.points[1].x,t.points[1].y);ctx.lineTo(t.points[2].x,t.points[2].y);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;
}

