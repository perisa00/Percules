const TAU = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*t;

export const worlds = {
studio:[
{id:'sun',name:'Percules',kind:'Ko smo',radius:2,orbit:0,angle:0,color:[.65,.82,1],style:0,text:'Pravimo digitalne svetove kojima je svaki detalj važan.'},
{id:'neptune',name:'Sajtovi',kind:'Jasan nastup na internetu',radius:1.08,orbit:5.8,angle:2.4,color:[.06,.27,.64],atmosphere:[.15,.45,1],style:1,text:'Sajt koji jasno predstavlja tvoju priču i lako se koristi.'},
{id:'uranus',name:'Aplikacije',kind:'Ideja koja postaje alat',radius:1.18,orbit:8.9,angle:4.9,color:[.17,.72,.72],atmosphere:[.16,.85,.78],style:2,text:'Iskustvo oblikovano oko ljudi koji će ga koristiti.'},
{id:'mercury',name:'Podrška',kind:'Održavanje i razvoj',radius:1.05,orbit:12.2,angle:.42,color:[.69,.74,.81],atmosphere:[.32,.58,.91],style:3,text:'Ostajemo uz projekat i posle objave.'},
{id:'saturn',name:'Način rada',kind:'Od razgovora do objave',radius:1.25,orbit:15.5,angle:3.5,color:[.59,.66,.79],rings:true,style:4,text:'Razgovor, prvi prikaz, razvoj, testiranje i objava.'},
{id:'jupiter',name:'Projekti',kind:'Naši digitalni svetovi',radius:1.5,orbit:19,angle:5.48,color:[.48,.20,.74],atmosphere:[.65,.3,.95],style:5,text:'Svaki projekat dobija svoj karakter. Upoznaj Miličin svet.'},
{id:'venus',name:'Kontakt',kind:'Sve počinje razgovorom',radius:1.2,orbit:23,angle:2.05,color:[.95,.72,.47],atmosphere:[1,.69,.40],style:6,text:'Ispričaj nam šta želiš da napravimo.'}],
milica:[
{id:'sun',name:'Miličino sunce',kind:'Svet jednog projekta',radius:2,orbit:0,angle:0,color:[1,.32,.62],style:0,text:'Roze svet, posvećen jednom iskustvu.'},
{id:'earth',name:'Miličina aplikacija',kind:'Projekat · lični trener',radius:1.75,orbit:9,angle:.42,color:[1,.67,.81],atmosphere:[1,.41,.7],style:7,text:'Jedna ideja, puna posvećenost — od prvog razgovora do detalja.'}]};
Object.values(worlds).flat().forEach(b=>b.position=[Math.cos(b.angle)*b.orbit,0,Math.sin(b.angle)*b.orbit]);
export const bodies=worlds.studio;

export function createSolar(canvas, options={}) {
  let gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'});
  let width=1,height=1,dpr=1,time=0,distance=180,focus=null,focusZoom=1,center=[0,0,0],lost=false,framing=0,focusMix=0,roll=0,viewInitialized=false;
  let world='studio',bodies=worlds.studio;
  let resources,images=new Map(),highRequested=new Set(),earthExtras=false;
  const labelRoot=document.getElementById('planet-labels');
  const labelButtons=new Map();
  function labels(){
  labelRoot.replaceChildren();labelButtons.clear();
  for(const body of bodies){
    const button=document.createElement('button');button.className='planet-label';button.textContent=body.name;
    button.setAttribute('aria-label',`Približi: ${body.name}`);button.addEventListener('click',()=>select(body.id));
    labelRoot.append(button);labelButtons.set(body.id,button);
  }
  }
  labels();
  function setWorld(id){
    if(!worlds[id]||id===world)return false;
    world=id;bodies=worlds[id];focus=null;focusZoom=1;focusMix=0;viewInitialized=false;framing=0;
    canvas.dataset.world=id;canvas.dataset.focus='system';labels();options.onSelect?.(null);options.onInvalidate?.();return true;
  }
  function load(id,high=false){
    const key=high?id:`${id}-low`;
    if(images.has(key))return;
    const image=new Image();images.set(key,image);image.decoding='async';
    image.onload=()=>{if(!lost&&resources)upload(id,image,high);options.onInvalidate?.();};
    image.onerror=()=>{images.delete(key);if(high)highRequested.delete(id);};
    image.src=`assets/solar/${key}.webp`;
  }
  function upload(id,image,high){
    const record=resources.textures.get(id);if(!record||(record.high&&!high))return;
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,record.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    record.high=high;record.ready=true;
    if(high&&focus?.id===id)canvas.dataset.surface='detailed';
  }
  function select(id){
    const body=bodies.find(b=>b.id===id);if(!body)return;
    focus=body;focusZoom=1;canvas.dataset.focus=id;canvas.dataset.surface='procedural-detail';
    options.onSelect?.(body);
  }
  function clearFocus(){focus=null;focusZoom=1;canvas.dataset.focus='system';options.onSelect?.(null);}
  function zoom(delta){
    if(!focus)return false;
    focusZoom=clamp(focusZoom*Math.exp(delta*.0011),.66,3.1);
    if(focusZoom>=3.05&&delta>0)clearFocus();
    return true;
  }
  const project=(p,yaw,pitch)=>{
    const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];
    const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw);
    const v=y*Math.cos(pitch)-b*Math.sin(pitch),depth=distance-y*Math.sin(pitch)-b*Math.cos(pitch);
    const cr=Math.cos(roll),sr=Math.sin(roll);
    return {x:width/2+(a*cr-v*sr)*height*1.20710678/depth,y:height/2-(a*sr+v*cr)*height*1.20710678/depth-framing*height*.5,scale:height*1.20710678/depth,depth};
  };
  function init(){
    const derivatives=!!gl.getExtension('OES_standard_derivatives');
    function program(vs,fs){
      const p=gl.createProgram();for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
        const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);
      }gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
    }
    const view=`uniform vec3 uTarget;uniform float uYaw,uPitch,uDistance,uAspect,uFraming,uRoll;
      vec4 project(vec3 world){vec3 p=world-uTarget;float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
      vec3 q=vec3(p.x*cy-p.z*sy,p.y,p.x*sy+p.z*cy);q=vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp-uDistance);
      float cr=cos(uRoll),sr=sin(uRoll);q.xy=vec2(q.x*cr-q.y*sr,q.x*sr+q.y*cr);
      return vec4(q.x*2.41421356/uAspect,q.y*2.41421356-q.z*uFraming,-q.z*1.0001-.04,-q.z);}`;
    const surface=program(`precision highp float;attribute vec3 aPosition;attribute vec2 aUv;uniform vec3 uCenter;uniform float uRadius,uSpin,uTilt;varying vec3 vNormal,vWorld,vLocal;varying vec2 vUv;${view}
      void main(){vLocal=aPosition;vec3 p=aPosition;float c=cos(uSpin),s=sin(uSpin);p=vec3(p.x*c-p.z*s,p.y,p.x*s+p.z*c);c=cos(uTilt);s=sin(uTilt);p=vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);vNormal=p;vWorld=uCenter+p*uRadius;vUv=aUv;gl_Position=project(vWorld);}`,
      `precision highp float;varying vec3 vNormal,vWorld,vLocal;varying vec2 vUv;uniform vec3 uEye,uTint;uniform float uSun,uStyle,uTime,uOpacity;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.03+vec3(7.1,3.4,5.9);a*=.5;}return v;}
void main(){vec3 n=normalize(vNormal),light=normalize(-vWorld),eye=normalize(uEye-vWorld);float day=max(dot(n,light),0.);
float terrain=fbm(vLocal*4.8),detail=noise(vLocal*125.)*.035;
if(uSun>.5){float fire=fbm(vLocal*9.+vec3(0.,uTime*.015,0.));float edge=pow(max(dot(n,eye),0.),.3);gl_FragColor=vec4(uTint*(.88+fire*.6)*(.78+.22*edge),uOpacity);return;}
vec3 tex=uTint;
if(uStyle<1.5){float land=smoothstep(.43,.55,terrain+detail);tex=mix(vec3(.012,.032,.11),vec3(.055,.28,.48),land);float clouds=smoothstep(.55,.68,fbm(vLocal*8.+vec3(uTime*.002,0,0)));tex=mix(tex,vec3(.50,.67,.82),clouds*.6);}
else if(uStyle<2.5){float flow=sin(vLocal.y*17.+terrain*12.);tex=mix(vec3(.018,.22,.25),vec3(.44,.90,.83),smoothstep(-.8,.8,flow)*.65+terrain*.3);}
else if(uStyle<3.5){tex=mix(vec3(.18,.23,.3),vec3(.78,.82,.89),smoothstep(.2,.74,terrain+detail));}
else if(uStyle<4.5){float band=sin(vLocal.y*19.+terrain*4.);tex=mix(vec3(.28,.35,.5),vec3(.74,.78,.9),.5+band*.20+terrain*.22);}
else if(uStyle<5.5){float band=sin(vLocal.y*23.+terrain*10.);tex=mix(vec3(.14,.045,.3),vec3(.63,.35,.88),.42+band*.17+terrain*.43);}
else if(uStyle<6.5){tex=mix(vec3(.55,.31,.15),vec3(1.,.87,.67),smoothstep(.28,.71,terrain));}
else{float clouds=smoothstep(.30,.66,terrain+detail);tex=mix(vec3(.73,.22,.46),vec3(.99,.93,.97),clouds);float veins=pow(1.-abs(sin(terrain*26.+vLocal.y*6.)),9.);tex=mix(tex,vec3(1.,.63,.8),veins*.35);}
vec3 linear=pow(tex,vec3(2.2));vec3 color=linear*(.05+day*.98);
float spec=pow(max(dot(n,normalize(light+eye)),0.),uStyle<3.5?55.:28.);color+=vec3(.65,.77,.94)*spec*(uStyle>2.5&&uStyle<4.5?.22:.07);
float rim=pow(1.-max(dot(n,eye),0.),4.)*(.025+day*.08);color+=uTint*rim;
gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(1./2.2)),uOpacity);
}`);
    const atmosphere=program(`precision highp float;attribute vec3 aPosition;uniform vec3 uCenter;uniform float uRadius;varying vec3 vNormal,vWorld;${view}void main(){vNormal=aPosition;vWorld=uCenter+aPosition*uRadius;gl_Position=project(vWorld);}`,
      `precision mediump float;varying vec3 vNormal,vWorld;uniform vec3 uEye,uTint;uniform float uOpacity;void main(){vec3 n=normalize(vNormal),eye=normalize(uEye-vWorld);float facing=max(dot(n,eye),0.);float limb=pow(1.-facing,3.)*smoothstep(0.,.18,facing);float lit=.08+.92*max(dot(n,normalize(-vWorld)),0.);gl_FragColor=vec4(uTint,limb*lit*.43*uOpacity);}`);
    const ring=program(`precision highp float;attribute vec3 aPosition;uniform vec3 uCenter;uniform float uRadius;varying vec3 vWorld;varying float vRadius;${view}void main(){vec3 p=aPosition*uRadius;vRadius=length(aPosition.xz);p=vec3(p.x,p.z*sin(.46),p.z*cos(.46));vWorld=uCenter+p;gl_Position=project(vWorld);}`,
      `${derivatives?'#extension GL_OES_standard_derivatives : enable\n':''}precision highp float;varying float vRadius;varying vec3 vWorld;uniform vec3 uCenter;uniform float uRadius,uOpacity;
      float band(float r,float k){${derivatives?'return sin(r*k)*(1.-smoothstep(.7,3.14,k*fwidth(r)));':'return sin(r*min(k,45.));'}}
      void main(){float r=vRadius;
        float bands=.66+.1*sin(r*14.)+.045*band(r,175.)+.025*band(r,390.);float gap=1.-smoothstep(.015,.035,abs(r-1.95));
        float edge=smoothstep(1.24,1.31,r)*(1.-smoothstep(2.35,2.48,r));float alpha=bands*edge*(1.-gap*.85)*.82;
        vec3 toward=normalize(-vWorld),offset=vWorld-uCenter;float along=dot(offset,toward);float shadow=step(along,0.)*(1.-smoothstep(uRadius*.93,uRadius*1.05,length(offset-toward*along)));
        vec3 color=mix(vec3(.22,.29,.40),vec3(.77,.83,.94),bands)*(1.-shadow*.78);gl_FragColor=vec4(color,alpha*uOpacity);}`);
    const orbit=program(`precision highp float;attribute vec3 aPosition;${view}void main(){gl_Position=project(aPosition);}`,
      `precision mediump float;uniform float uAlpha;void main(){gl_FragColor=vec4(.40,.50,.66,uAlpha);}`);
    const corona=program(`attribute vec2 aPosition;uniform vec2 uCenter;uniform vec2 uSize;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(uCenter+aPosition*uSize,0.,1.);}`,
      `precision highp float;varying vec2 vUv;uniform float uTime,uOpacity;uniform vec3 uTint;void main(){float r=length(vUv),a=r>.0001?atan(vUv.y,vUv.x):0.;float ray=.72+.18*sin(a*17.+sin(a*7.+uTime*.12)*1.8)+.1*sin(a*31.-uTime*.15);float outer=exp(-r*5.5)*ray;float rim=exp(-abs(r-.285)*24.)*.21;float alpha=(outer*.45+rim)*(1.-smoothstep(.75,1.,r));gl_FragColor=vec4(uTint*alpha*uOpacity,alpha*uOpacity);}`);
    const backdrop=program(`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(aPosition,.999,1.);}`,
      `precision highp float;varying vec2 vUv;uniform vec2 uResolution;uniform float uYaw,uPitch;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=(vUv+1.)*.5*uResolution+vec2(uYaw*16.,uPitch*12.);vec2 cell=floor(p/28.),uv=fract(p/28.);float h=hash(cell),s=0.;if(h>.71){vec2 pos=vec2(hash(cell+3.7),hash(cell+8.1));float d=length((uv-pos)*28.);s=exp(-d*d*1.9)*(.2+h*.35);}float haze=exp(-pow((vUv.y+vUv.x*.32)*3.2,2.))*.009;gl_FragColor=vec4(vec3(.001,.002,.006)+vec3(.53,.66,.91)*s+vec3(.15,.23,.48)*haze,1.);}`);
    const sphere=[],indices=[],lat=64,lon=96;
    for(let y=0;y<=lat;y++)for(let x=0;x<=lon;x++){const a=x/lon*TAU,b=y/lat*Math.PI;sphere.push(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a),x/lon,1-y/lat);}
    for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;indices.push(a,a+1,b,a+1,b+1,b);}
    function buffer(data,type=gl.ARRAY_BUFFER){const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b;}
    const sphereBuffer=buffer(new Float32Array(sphere)),indexBuffer=buffer(new Uint16Array(indices),gl.ELEMENT_ARRAY_BUFFER);
    const ringMesh=[];for(let i=0;i<160;i++){const a=i/160*TAU,b=(i+1)/160*TAU;for(const [t,r] of [[a,1.24],[b,1.24],[a,2.48],[a,2.48],[b,1.24],[b,2.48]])ringMesh.push(Math.cos(t)*r,0,Math.sin(t)*r);}
    const ringBuffer=buffer(new Float32Array(ringMesh)),quad=buffer(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]));
    const orbitBuffers=new Map(Object.entries(worlds).map(([id,list])=>[id,list.slice(1).map(b=>{const pts=[];for(let i=0;i<=192;i++){const a=i/192*TAU;pts.push(Math.cos(a)*b.orbit,0,Math.sin(a)*b.orbit);}return buffer(new Float32Array(pts));})]));
    const textures=new Map();
    for(const id of [...new Set(Object.values(worlds).flat().map(b=>b.id)),'earth-night','earth-clouds']){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);textures.set(id,{texture,high:false,ready:false});
    }
    const programs={surface,atmosphere,ring,orbit,corona,backdrop},locations=new Map();
    for(const p of Object.values(programs)){
      const u={};for(const name of ['uStyle','uRoll','uOpacity','uTarget','uYaw','uPitch','uDistance','uAspect','uFraming','uCenter','uRadius','uSpin','uTilt','uEye','uTint','uSun','uEarth','uSaturn','uTime','uMap','uNight','uClouds','uHasMap','uHasNight','uHasClouds','uSize','uAlpha','uResolution'])u[name]=gl.getUniformLocation(p,name);
      u.position=gl.getAttribLocation(p,'aPosition');u.uv=gl.getAttribLocation(p,'aUv');locations.set(p,u);
    }
    resources={programs,locations,textures,sphereBuffer,indexBuffer,indexCount:indices.length,ringBuffer,ringCount:ringMesh.length/3,quad,orbitBuffers};
    for(const [key,image] of images)if(image.complete&&image.naturalWidth)upload(key.replace('-low',''),image,!key.endsWith('-low'));
    canvas.dataset.renderer='webgl';
  }
  function size(w,h,pixelRatio){width=w;height=h;dpr=Math.min(pixelRatio,1.6);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);if(gl)gl.viewport(0,0,canvas.width,canvas.height);}
  const enabled=new Set();
  function attributes(position,uv=-1){
    for(const index of enabled)if(index!==position&&index!==uv){gl.disableVertexAttribArray(index);enabled.delete(index);}
    gl.enableVertexAttribArray(position);enabled.add(position);
    if(uv>=0){gl.enableVertexAttribArray(uv);enabled.add(uv);gl.vertexAttribPointer(position,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);}
  }
  function camera(state){
    const {dt,target,distance:baseDistance,reducedMotion}=state;
    const blend=reducedMotion?1:1-Math.exp(-dt*4.5);
    const targetDistance=focus?focus.radius*(focus.rings?7.5:width<800?4.2:5.2)*focusZoom/Math.min(1,width/height):baseDistance;
    const targetCenter=focus?.position||target;
    const returning=!focus&&focusMix>.00001;
    if(!viewInitialized||(!focus&&(!returning||state.direct))){distance=targetDistance;center=[...targetCenter];viewInitialized=true;}
    else {distance=Math.exp(mix(Math.log(distance),Math.log(targetDistance),blend));center=center.map((v,i)=>mix(v,targetCenter[i],blend));}
    focusMix=mix(focusMix,focus?1:0,blend);framing=mix(framing,focus&&width<800?.40:0,blend);
    return {distance,target:[...center],framing};
  }
  function render(state){
    const {dt,yaw,pitch,progress,reducedMotion}=state;roll=state.roll||0;
    if(lost)return;
    if(!reducedMotion)time+=dt;
    if(!state.viewPrepared)camera({dt,target:[0,0,0],distance:Math.max(65,66/(width/height)),reducedMotion});
    if(!gl){renderFallback(yaw,pitch);return;}
    const {programs:p,locations,textures}=resources;
    const eye=[center[0]+Math.sin(yaw)*Math.cos(pitch)*distance,center[1]+Math.sin(pitch)*distance,center[2]+Math.cos(yaw)*Math.cos(pitch)*distance];
    function use(program){gl.useProgram(program);const u=locations.get(program);gl.uniform3fv(u.uTarget,center);gl.uniform1f(u.uYaw,yaw);gl.uniform1f(u.uPitch,pitch);gl.uniform1f(u.uDistance,distance);gl.uniform1f(u.uAspect,width/height);gl.uniform1f(u.uFraming,framing);gl.uniform1f(u.uRoll,roll);gl.uniform3fv(u.uEye,eye);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uOpacity,1);return u;}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
    let u;
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    u=use(p.orbit);gl.uniform1f(u.uAlpha,.16*(1-focusMix));
    for(const b of resources.orbitBuffers.get(world)){gl.bindBuffer(gl.ARRAY_BUFFER,b);attributes(u.position);gl.vertexAttribPointer(u.position,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.LINE_STRIP,0,193);}
    const sun=project([0,0,0],yaw,pitch),coronaRadius=Math.max(2,2*sun.scale*3.5);
    const emblem=document.getElementById('studio-emblem');if(emblem){emblem.hidden=world!=='studio'||progress<.94||sun.depth<=0||(focus&&focus.id!=='sun');if(!emblem.hidden){const extent=clamp(2*sun.scale*1.7,40,160);emblem.style.width=extent+'px';emblem.style.height=extent+'px';emblem.style.transform='translate('+sun.x.toFixed(1)+'px,'+sun.y.toFixed(1)+'px) translate(-50%,-50%)';}}
    
    if(sun.depth>0){u=use(p.corona);gl.uniform3fv(u.uTint,world==='milica'?[1,.24,.56]:[.32,.60,1]);gl.uniform1f(u.uOpacity,focus?.id==='sun'?1:1-focusMix);gl.bindBuffer(gl.ARRAY_BUFFER,resources.quad);attributes(u.position);gl.vertexAttribPointer(u.position,2,gl.FLOAT,false,0,0);gl.uniform2f(u.uCenter,sun.x/width*2-1,1-sun.y/height*2);gl.uniform2f(u.uSize,coronaRadius/width*2,coronaRadius/height*2);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,6);}
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
    const drawBodies=focus?[focus,...bodies.filter(b=>b!==focus)]:[...bodies];
    if(world==='studio'){const parent=bodies.find(b=>b.id==='jupiter');for(let i=0;i<2;i++){const a=time*.045+i*3.4;drawBodies.push({id:'jupiter',style:3,color:[.63,.68,.79],radius:.22+i*.07,position:[parent.position[0]+Math.cos(a)*(2.4+i*.8),Math.sin(a)*.24,parent.position[2]+Math.sin(a)*(2.4+i*.8)]});}}
    for(const b of drawBodies){
      const opacity=focus?.id===b.id?1:1-focusMix;if(opacity<.001||(b.id==='sun'&&world==='studio'))continue;
      gl.depthMask(opacity>.99);u=use(p.surface);gl.uniform1f(u.uOpacity,opacity);gl.bindBuffer(gl.ARRAY_BUFFER,resources.sphereBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,resources.indexBuffer);attributes(u.position,u.uv);
      gl.uniform3fv(u.uCenter,b.position);gl.uniform1f(u.uRadius,b.radius);gl.uniform1f(u.uTilt,b.id==='uranus'?1.55:b.id==='earth'?.409:b.rings?-.46:0);
      gl.uniform1f(u.uSpin,(b.id==='earth'?3.0:0)+time*.014);gl.uniform3fv(u.uTint,b.color);gl.uniform1f(u.uStyle,b.style);gl.uniform1f(u.uSun,b.id==='sun'?1:0);gl.uniform1f(u.uEarth,b.id==='earth'?1:0);gl.uniform1f(u.uSaturn,b.rings?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures.get(b.id).texture);gl.uniform1i(u.uMap,0);gl.uniform1f(u.uHasMap,textures.get(b.id).ready?1:0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures.get('earth-night').texture);gl.uniform1i(u.uNight,1);gl.uniform1f(u.uHasNight,textures.get('earth-night').ready?1:0);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,textures.get('earth-clouds').texture);gl.uniform1i(u.uClouds,2);gl.uniform1f(u.uHasClouds,textures.get('earth-clouds').ready?1:0);
      gl.drawElements(gl.TRIANGLES,resources.indexCount,gl.UNSIGNED_SHORT,0);
    }
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    const saturn=bodies.find(b=>b.rings);if(saturn){u=use(p.ring);gl.uniform1f(u.uOpacity,focus?.id==='saturn'?1:1-focusMix);gl.bindBuffer(gl.ARRAY_BUFFER,resources.ringBuffer);attributes(u.position);gl.vertexAttribPointer(u.position,3,gl.FLOAT,false,0,0);gl.uniform3fv(u.uCenter,saturn.position);gl.uniform1f(u.uRadius,saturn.radius);gl.drawArrays(gl.TRIANGLES,0,resources.ringCount);}
    gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    for(const b of bodies.filter(b=>b.atmosphere)){
      u=use(p.atmosphere);gl.uniform1f(u.uOpacity,focus?.id===b.id?1:1-focusMix);gl.bindBuffer(gl.ARRAY_BUFFER,resources.sphereBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,resources.indexBuffer);attributes(u.position);gl.vertexAttribPointer(u.position,3,gl.FLOAT,false,20,0);
      gl.uniform3fv(u.uCenter,b.position);gl.uniform1f(u.uRadius,b.radius*1.025);gl.uniform3fv(u.uTint,b.atmosphere);gl.drawElements(gl.TRIANGLES,resources.indexCount,gl.UNSIGNED_SHORT,0);
    }
    gl.depthMask(true);gl.activeTexture(gl.TEXTURE0);gl.disable(gl.CULL_FACE);updateLabels(yaw,pitch,progress);
  }
  function updateLabels(yaw,pitch,progress){
    const occupied=[];
    for(const b of bodies){const button=labelButtons.get(b.id),v=project(b.position,yaw,pitch),radius=b.radius*v.scale;
      const x=v.x,y=v.y+Math.max(radius,3)+15;
      const visible=!focus&&progress>.94&&v.depth>0&&x>40&&x<width-40&&y>100&&y<height-125&&!occupied.some(p=>Math.abs(p[0]-x)<72&&Math.abs(p[1]-y)<30);
      button.hidden=!visible;if(visible){button.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,0)`;occupied.push([x,y]);}
    }
  }
  function renderFallback(yaw,pitch){
    const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    for(const b of bodies){const v=project(b.position,yaw,pitch),r=Math.max(2,b.radius*v.scale);if(v.depth<=0)continue;
      const g=ctx.createRadialGradient(v.x-r*.28,v.y-r*.2,r*.1,v.x,v.y,r);g.addColorStop(0,`rgb(${b.color.map(c=>Math.round(c*255)).join(',')})`);g.addColorStop(1,'#070b14');ctx.fillStyle=g;ctx.beginPath();ctx.arc(v.x,v.y,r,0,TAU);ctx.fill();
    }updateLabels(yaw,pitch,1);
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});
  canvas.addEventListener('webglcontextrestored',()=>{try{enabled.clear();init();lost=false;size(width,height,dpr);}catch(e){options.onError?.(e);}});
  if(gl)init();else canvas.dataset.renderer='canvas';
  // Procedural surfaces stay sharp at every zoom without texture downloads.
  canvas.dataset.focus='system';canvas.dataset.world=world;
  return {render,camera,size,select,clearFocus,zoom,setWorld,worldId:()=>world,getBodies:()=>bodies,isFocused:()=>!!focus,focusId:()=>focus?.id||null};
}

