// A small, static mesh: the same pink space gym is used by WebGL and Canvas.
export function createGymGeometry() {
  const meshes = new Map();
  const rose = [0.86, 0.19, 0.46], blush = [1, 0.54, 0.74];
  const pale = [1, 0.76, 0.88], dark = [0.27, 0.035, 0.13], neon = [1, 0.25, 0.61];
  let group = 'room';
  function face(points, normal, color, glow = 0) {
    if (!meshes.has(group)) meshes.set(group, []);
    for (const i of [0, 1, 2, 0, 2, 3]) meshes.get(group).push(...points[i], ...normal, ...color, glow);
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
  function arc(cx, y, cz, rx, rz, radius, color, glow=0, start=0, end=Math.PI*2, segments=64) {
    for(let i=0;i<segments;i++) {
      const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
      tube([cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz],[cx+Math.cos(b)*rx,y,cz+Math.sin(b)*rz],radius,color,glow,6);
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
  for(let x=-5.5;x<=5.5;x++)for(let z=-4;z<=4;z++)box(x,-.1,z,.975,.07,.975,blush);
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
  arc(0,5.1,0,6.4,5,.05,neon,1);
  for(const x of [-6,6])tube([x,.9,-4.5],[x,.9,3.6],.055,pale);
  tube([-6,.9,-4.5],[6,.9,-4.5],.055,pale);

  group='sun';
  // Squat rack and loaded barbell.
  for(const x of [-4.7,-2.1]) {
    box(x,.08,-2.4,.48,.16,2.5,rose);
    tube([x,.15,-3.25],[x,3.1,-3.25],.1,pale);
    for(let y=.65;y<2.7;y+=.35)box(x,y,-3.1,.13,.06,.15,dark);
  }
  tube([-4.7,3.1,-3.25],[-2.1,3.1,-3.25],.085,rose);
  tube([-5.25,2.05,-2.95],[-1.55,2.05,-2.95],.075,pale);
  for(const x of [-4.95,-4.75,-2.05,-1.85])tube([x-.075,2.05,-2.95],[x+.075,2.05,-2.95],.46,rose,0,24);
  // Upholstered bench in front of the rack.
  box(-3.4,.72,-1.9,.85,.23,2.25,rose);
  box(-3.4,.86,-1.9,.81,.07,2.15,blush);
  for(const z of [-2.65,-1.15]){box(-3.4,.36,z,.13,.68,.17,pale);box(-3.4,.08,z,1.3,.12,.35,rose);}
  // Two-tier dumbbell shelf and a loose pair.
  for(const z of [.25,2.7])box(-4.9,.65,z,.16,1.3,.16,rose);
  for(const y of [.55,1.15]) {
    box(-4.9,y,1.5,.8,.12,2.7,rose);
    for(const z of [.5,1.4,2.3])dumbbell(-4.9,y+.23,z,.93,.20);
  }
  dumbbell(-2.5,.27,.5);dumbbell(-2.5,.27,1.2);

  group='cardio';
  for(const x of [2.05,4.25]) {
    box(x,.18,-.8,1.55,.32,3.2,rose);
    box(x,.36,-.55,1.15,.055,2.55,dark);
    for(let z=-1.6;z<.8;z+=.22)box(x,.393,z,1.12,.012,.018,blush);
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
  tube([3.5,.37,2.7],[4.7,.37,2.7],.35,rose,0,24);
  tube([4.72,.37,2.7],[4.76,.37,2.7],.16,dark,0,20);
  box(2.9,.18,3.7,.55,.36,.8,blush);
  box(3.6,.18,3.7,.55,.36,.8,rose);
  // A kettlebell with a loop handle.
  tube([3.25,.25,1.5],[3.25,.65,1.5],.3,rose,0,20);
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;
    tube([3.25+Math.cos(a)*.22,.83+Math.sin(a)*.23,1.5],[3.25+Math.cos(b)*.22,.83+Math.sin(b)*.23,1.5],.055,pale,0,6);
  }

  group='earth';
  // Illuminated sign with mesh lettering, readable without an image download.
  box(0,2.65,-4.18,3.7,1.32,.16,dark);
  for(const y of [2.02,3.28])box(0,y,-4.06,3.72,.04,.06,neon,1);
  for(const x of [-1.83,1.83])box(x,2.65,-4.06,.04,1.3,.06,neon,1);
  const letters={M:['10001','11011','10101','10001','10001','10001','10001'],I:['111','010','010','010','010','010','111'],L:['100','100','100','100','100','100','111'],C:['1111','1000','1000','1000','1000','1000','1111'],A:['01110','10001','10001','11111','10001','10001','10001']};
  let cursor=-1.43;
  for(const char of 'MILICA') {
    const rows=letters[char];
    rows.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1')box(cursor+x*.095,2.94-y*.095,-4.05,.077,.077,.06,pale,1);}));
    cursor+=(rows[0].length+1)*.095;
  }
  return [...meshes].map(([id,data])=>({id,data:new Float32Array(data)}));
}

export function drawGymFallback(ctx, meshes, project, focusId) {
  const triangles=[];
  for(const mesh of meshes)for(let i=0;i<mesh.data.length;i+=30) {
    const d=mesh.data,points=[0,10,20].map(j=>project([d[i+j],d[i+j+1],d[i+j+2]]));
    if(points.some(p=>p.depth<=0))continue;
    const light=.55+Math.max(0,d[i+4])*.35+d[i+9]*.4;
    triangles.push({points,depth:points.reduce((s,p)=>s+p.depth,0)/3,color:[d[i+6],d[i+7],d[i+8]].map(v=>Math.min(255,Math.round(v*light*255))),alpha:focusId&&mesh.id!==focusId?.4:1});
  }
  triangles.sort((a,b)=>b.depth-a.depth);
  for(const t of triangles){ctx.globalAlpha=t.alpha;ctx.fillStyle=`rgb(${t.color.join(',')})`;ctx.beginPath();ctx.moveTo(t.points[0].x,t.points[0].y);ctx.lineTo(t.points[1].x,t.points[1].y);ctx.lineTo(t.points[2].x,t.points[2].y);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;
}
