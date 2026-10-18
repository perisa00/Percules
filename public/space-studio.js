// Small, static vertex buffers. Built only on the first visit to the 3D workshop.
export function createStudioGeometry() {
  const groups = new Map();
  const ink=[.035,.075,.11], steel=[.14,.23,.29], mint=[.23,.9,.75], white=[.72,.92,.94];
  let group='room';
  function face(points, normal, color, glow=0) {
    if(!groups.has(group))groups.set(group,[]);
    for(const i of [0,1,2,0,2,3])groups.get(group).push(...points[i],...normal,...color,glow);
  }
  function box(x,y,z,w,h,d,color,glow=0) {
    const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
    face([[a,e,f],[a,e,g],[b,e,g],[b,e,f]],[0,1,0],color,glow);
    face([[a,c,g],[a,c,f],[b,c,f],[b,c,g]],[0,-1,0],color,glow);
    face([[a,c,g],[b,c,g],[b,e,g],[a,e,g]],[0,0,1],color,glow);
    face([[b,c,f],[a,c,f],[a,e,f],[b,e,f]],[0,0,-1],color,glow);
    face([[b,c,g],[b,c,f],[b,e,f],[b,e,g]],[1,0,0],color,glow);
    face([[a,c,f],[a,c,g],[a,e,g],[a,e,f]],[-1,0,0],color,glow);
  }
  box(0,-.35,0,13,.5,9,ink);
  box(0,-.07,0,12.7,.08,8.7,steel);
  for(const x of [-6.4,6.4])box(x,0,0,.07,.08,9,mint,1);
  for(const z of [-4.4,4.4])box(0,0,z,12.8,.08,.07,mint,1);
  for(let x=-5;x<=5;x++)box(x,-.015,0,.012,.015,8.7,white,.2);
  for(let z=-4;z<=4;z++)box(0,-.015,z,12.7,.015,.012,white,.2);
  for(const x of [-6,6])box(x,2,-4,.12,4,.12,steel);
  box(0,4,-4,12,.12,.12,mint,.8);
  // Input desk and screen with a small pixel-art source image.
  group='studio-input';
  box(-4,1.1,-.6,3,.16,2,steel);
  for(const x of [-5.2,-2.8])box(x,.5,-.6,.12,1.1,1.5,ink);
  box(-4,2,-1.15,2.7,1.6,.15,ink);
  box(-4,2,-1.05,2.4,1.35,.03,mint,.35);
  box(-4,2,-1.02,.5,.65,.03,white,.7);
  box(-4,1.7,-1.01,1.1,.15,.03,white,.7);
  box(-4,1.22,-.1,1.6,.07,.6,ink);
  // Reconstruction chamber and a deliberately geometric hologram.
  group='studio-model';
  box(0,.2,0,3,.4,3,ink);
  for(const x of [-1.5,1.5])for(const z of [-1.5,1.5])box(x,1.65,z,.06,3.1,.06,mint,.8);
  for(const y of [.45,3.2]){box(0,y,-1.5,3,.05,.05,mint,1);box(0,y,1.5,3,.05,.05,mint,1);box(-1.5,y,0,.05,.05,3,mint,1);box(1.5,y,0,.05,.05,3,mint,1);}
  box(0,1.85,0,.85,.85,.85,white,.5);
  box(0,1.3,0,1.6,.12,1.6,mint,.5);
  // Result shelves with three lightweight model silhouettes.
  group='studio-export';
  for(const y of [.4,1.7,3])box(4,y,-1,3.2,.1,1.5,steel);
  for(const x of [2.5,5.5])box(x,1.7,-1.65,.1,3.4,.1,mint,.4);
  for(let i=0;i<3;i++){const y=.8+i*1.3;box(3.2,y,-1,.5,.6,.5,white);box(4.1,y,-1,.4,.5,.4,mint);box(4.9,y,-1,.65,.4,.5,white);}
  group='generator';
  box(0,2.8,-4.05,4.4,1.35,.18,ink);
  for(const y of [2.15,3.45])box(0,y,-3.94,4.4,.045,.04,mint,1);
  // Three vertical strokes and a model frame evoke the 3D studio mark.
  for(const x of [-1.4,-.9,-.4])box(x,2.8,-3.92,.13,.75,.04,white,1);
  for(const y of [2.45,3.15])box(.9,y,-3.92,1,.07,.04,mint,1);
  for(const x of [.4,1.4])box(x,2.8,-3.92,.07,.7,.04,mint,1);
  return [...groups].map(([id,data])=>({id,zone:id,data:new Float32Array(data)}));
}
