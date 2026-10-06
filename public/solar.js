const TAU = Math.PI * 2;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*t;

export const bodies = [
  {id:'sun',name:'Sunce',kind:'Naša zvezda',radius:1.65,orbit:0,angle:0,color:[1,.59,.19],text:'Svetlost koja povezuje naš mali deo svemira.'},
  {id:'mercury',name:'Merkur',kind:'Prva planeta',radius:.24,orbit:3.4,angle:2.4,color:[.55,.51,.46],text:'Najmanja planeta i najbliža Suncu. Kameni svet prekriven kraterima.'},
  {id:'venus',name:'Venera',kind:'Druga planeta',radius:.39,orbit:5.1,angle:4.9,color:[.87,.69,.40],text:'Gusti oblaci obavijaju našeg suseda prema Suncu.'},
  {id:'earth',name:'Zemlja',kind:'Naš dom',radius:.43,orbit:7.0,angle:.42,color:[.18,.45,.77],atmosphere:[.12,.48,1],text:'Okeani, kontinenti i tanak plavi sloj atmosfere. Treća planeta od Sunca.'},
  {id:'mars',name:'Mars',kind:'Četvrta planeta',radius:.31,orbit:9.0,angle:3.5,color:[.76,.32,.17],atmosphere:[.65,.25,.13],text:'Crvena planeta. Svet pustinja, vulkana i dubokih kanjona.'},
  {id:'jupiter',name:'Jupiter',kind:'Gasoviti džin',radius:1.12,orbit:12.5,angle:5.48,color:[.72,.54,.37],text:'Najveća planeta, sa slojevima oblaka i Velikom crvenom pegom.'},
  {id:'saturn',name:'Saturn',kind:'Svet prstenova',radius:.95,orbit:16.1,angle:2.05,color:[.76,.66,.44],rings:true,text:'Ledeni prstenovi okružuju drugu najveću planetu našeg sistema.'},
  {id:'uranus',name:'Uran',kind:'Ledeni džin',radius:.65,orbit:20,angle:4.25,color:[.36,.70,.75],atmosphere:[.18,.58,.7],text:'Sedma planeta, prepoznatljiva po bledoj plavozelenoj atmosferi.'},
  {id:'neptune',name:'Neptun',kind:'Osma planeta',radius:.63,orbit:24,angle:.65,color:[.19,.37,.78],atmosphere:[.16,.34,.8],text:'Najudaljenija od osam planeta. Hladan svet oblaka i snažnih vetrova.'},
];
bodies.forEach(b=>b.position=[Math.cos(b.angle)*b.orbit,0,Math.sin(b.angle)*b.orbit]);

export function createSolar(canvas, options={}) {
  let gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'low-power'});
  let width=1,height=1,dpr=1,time=0,distance=180,focus=null,focusZoom=1,center=[0,0,0],lost=false,framing=0,focusMix=0,roll=0,viewInitialized=false;
  let resources,images=new Map(),highRequested=new Set(),earthExtras=false;
  const labelRoot=document.getElementById('planet-labels');
  const labelButtons=new Map();
  for(const body of bodies){
    const button=document.createElement('button');button.className='planet-label';button.textContent=body.name;
    button.setAttribute('aria-label',`Približi: ${body.name}`);button.addEventListener('click',()=>select(body.id));
    labelRoot.append(button);labelButtons.set(body.id,button);
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
    focus=body;focusZoom=1;canvas.dataset.focus=id;canvas.dataset.surface=resources?.textures.get(id)?.high?'detailed':'preview';
    if(!highRequested.has(id)){highRequested.add(id);load(id,true);}
    if(id==='earth'&&!earthExtras){earthExtras=true;load('earth-night',true);load('earth-clouds',true);}
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
    const surface=program(`precision highp float;attribute vec3 aPosition;attribute vec2 aUv;uniform vec3 uCenter;uniform float uRadius,uSpin,uTilt;varying vec3 vNormal,vWorld;varying vec2 vUv;${view}
      void main(){vec3 p=aPosition;float c=cos(uSpin),s=sin(uSpin);p=vec3(p.x*c-p.z*s,p.y,p.x*s+p.z*c);c=cos(uTilt);s=sin(uTilt);p=vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);vNormal=p;vWorld=uCenter+p*uRadius;vUv=aUv;gl_Position=project(vWorld);}`,
      `precision highp float;varying vec3 vNormal,vWorld;varying vec2 vUv;uniform sampler2D uMap,uNight,uClouds;uniform vec3 uEye,uTint,uCenter;uniform float uSun,uEarth,uSaturn,uRadius,uTime,uHasMap,uHasNight,uHasClouds,uOpacity;
      float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 n=normalize(vNormal),light=normalize(-vWorld),eye=normalize(uEye-vWorld);float day=max(dot(n,light),0.);
        vec3 tex=mix(uTint,texture2D(uMap,vUv).rgb,uHasMap);
        if(uSun>.5){float grain=noise(floor(vUv*800.+uTime*.4));float edge=pow(max(dot(n,eye),0.),.25);vec3 fire=tex*vec3(1.35,1.12,.72);fire+=vec3(.19,.08,.008)*grain;gl_FragColor=vec4(fire*(.76+.24*edge),uOpacity);return;}
        vec3 linear=pow(tex,vec3(2.2));vec3 color=linear*(.027+day*.98);
        if(uSaturn>.5){vec3 plane=vec3(0.,cos(.46),-sin(.46));float denom=dot(light,plane);float travel=dot(uCenter-vWorld,plane)/(abs(denom)<.001?.001:denom);vec3 hit=vWorld+light*travel-uCenter;float r=length(hit)/uRadius;float shadow=smoothstep(1.25,1.35,r)*(1.-smoothstep(2.25,2.48,r))*step(0.,travel);color*=1.-shadow*.58;}
        if(uEarth>.5){
          float clouds=texture2D(uClouds,vec2(fract(vUv.x+uTime*.0007),vUv.y)).r*uHasClouds;
          color=mix(color,vec3(.86)*(.055+day*.91),smoothstep(.13,.8,clouds)*.68);
          vec3 city=texture2D(uNight,vUv).rgb*uHasNight;color+=pow(city,vec3(1.5))*(1.-smoothstep(-.13,.13,dot(n,light)))*.85;
          float ocean=smoothstep(.03,.16,tex.b-max(tex.r,tex.g));float spec=pow(max(dot(n,normalize(light+eye)),0.),70.);
          color+=vec3(.65,.8,1.)*spec*ocean*.45;
        }
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
        vec3 color=mix(vec3(.34,.29,.22),vec3(.85,.75,.55),bands)*(1.-shadow*.78);gl_FragColor=vec4(color,alpha*uOpacity);}`);
    const orbit=program(`precision highp float;attribute vec3 aPosition;${view}void main(){gl_Position=project(aPosition);}`,
      `precision mediump float;uniform float uAlpha;void main(){gl_FragColor=vec4(.40,.50,.66,uAlpha);}`);
    const corona=program(`attribute vec2 aPosition;uniform vec2 uCenter;uniform vec2 uSize;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(uCenter+aPosition*uSize,0.,1.);}`,
      `precision highp float;varying vec2 vUv;uniform float uTime,uOpacity;void main(){float r=length(vUv),a=atan(vUv.y,vUv.x);float ray=.72+.18*sin(a*17.+sin(a*7.+uTime*.12)*1.8)+.1*sin(a*31.-uTime*.15);float outer=exp(-r*5.5)*ray;float rim=exp(-abs(r-.285)*24.)*.21;float alpha=(outer*.45+rim)*(1.-smoothstep(.75,1.,r));gl_FragColor=vec4(vec3(1.,.42,.08)*alpha*uOpacity,alpha*uOpacity);}`);
    const backdrop=program(`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition;gl_Position=vec4(aPosition,.999,1.);}`,
      `precision highp float;varying vec2 vUv;uniform vec2 uResolution;uniform float uYaw,uPitch;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=(vUv+1.)*.5*uResolution+vec2(uYaw*16.,uPitch*12.);vec2 cell=floor(p/28.),uv=fract(p/28.);float h=hash(cell),s=0.;if(h>.71){vec2 pos=vec2(hash(cell+3.7),hash(cell+8.1));float d=length((uv-pos)*28.);s=exp(-d*d*1.9)*(.2+h*.35);}float haze=exp(-pow((vUv.y+vUv.x*.32)*3.2,2.))*.009;gl_FragColor=vec4(vec3(.001,.002,.006)+vec3(.53,.66,.91)*s+vec3(.15,.23,.48)*haze,1.);}`);
    const sphere=[],indices=[],lat=64,lon=96;
    for(let y=0;y<=lat;y++)for(let x=0;x<=lon;x++){const a=x/lon*TAU,b=y/lat*Math.PI;sphere.push(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a),x/lon,1-y/lat);}
    for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;indices.push(a,a+1,b,a+1,b+1,b);}
    function buffer(data,type=gl.ARRAY_BUFFER){const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,data,gl.STATIC_DRAW);return b;}
    const sphereBuffer=buffer(new Float32Array(sphere)),indexBuffer=buffer(new Uint16Array(indices),gl.ELEMENT_ARRAY_BUFFER);
    const ringMesh=[];for(let i=0;i<160;i++){const a=i/160*TAU,b=(i+1)/160*TAU;for(const [t,r] of [[a,1.24],[b,1.24],[a,2.48],[a,2.48],[b,1.24],[b,2.48]])ringMesh.push(Math.cos(t)*r,0,Math.sin(t)*r);}
    const ringBuffer=buffer(new Float32Array(ringMesh)),quad=buffer(new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]));
    const orbitBuffers=bodies.slice(1).map(b=>{const pts=[];for(let i=0;i<=192;i++){let a=i/192*TAU;pts.push(Math.cos(a)*b.orbit,0,Math.sin(a)*b.orbit);}return buffer(new Float32Array(pts));});
    const textures=new Map();
    for(const id of [...bodies.map(b=>b.id),'earth-night','earth-clouds']){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);textures.set(id,{texture,high:false,ready:false});
    }
    const programs={surface,atmosphere,ring,orbit,corona,backdrop},locations=new Map();
    for(const p of Object.values(programs)){
      const u={};for(const name of ['uRoll','uOpacity','uTarget','uYaw','uPitch','uDistance','uAspect','uFraming','uCenter','uRadius','uSpin','uTilt','uEye','uTint','uSun','uEarth','uSaturn','uTime','uMap','uNight','uClouds','uHasMap','uHasNight','uHasClouds','uSize','uAlpha','uResolution'])u[name]=gl.getUniformLocation(p,name);
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
    focusMix=mix(focusMix,focus?1:0,blend);framing=mix(framing,focus&&width<800?.18:0,blend);
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
    for(const b of resources.orbitBuffers){gl.bindBuffer(gl.ARRAY_BUFFER,b);attributes(u.position);gl.vertexAttribPointer(u.position,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.LINE_STRIP,0,193);}
    const sun=project([0,0,0],yaw,pitch),coronaRadius=Math.max(2,1.65*sun.scale*3.5);
    if(sun.depth>0){u=use(p.corona);gl.uniform1f(u.uOpacity,focus?.id==='sun'?1:1-focusMix);gl.bindBuffer(gl.ARRAY_BUFFER,resources.quad);attributes(u.position);gl.vertexAttribPointer(u.position,2,gl.FLOAT,false,0,0);gl.uniform2f(u.uCenter,sun.x/width*2-1,1-sun.y/height*2);gl.uniform2f(u.uSize,coronaRadius/width*2,coronaRadius/height*2);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,6);}
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
    for(const b of (focus?[focus,...bodies.filter(b=>b!==focus)]:bodies)){
      const opacity=focus?.id===b.id?1:1-focusMix;if(opacity<.001)continue;
      gl.depthMask(opacity>.99);u=use(p.surface);gl.uniform1f(u.uOpacity,opacity);gl.bindBuffer(gl.ARRAY_BUFFER,resources.sphereBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,resources.indexBuffer);attributes(u.position,u.uv);
      gl.uniform3fv(u.uCenter,b.position);gl.uniform1f(u.uRadius,b.radius);gl.uniform1f(u.uTilt,b.id==='uranus'?1.55:b.id==='earth'?.409:b.rings?-.46:0);
      gl.uniform1f(u.uSpin,(b.id==='earth'?3.0:0)+time*.014);gl.uniform3fv(u.uTint,b.color);gl.uniform1f(u.uSun,b.id==='sun'?1:0);gl.uniform1f(u.uEarth,b.id==='earth'?1:0);gl.uniform1f(u.uSaturn,b.rings?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures.get(b.id).texture);gl.uniform1i(u.uMap,0);gl.uniform1f(u.uHasMap,textures.get(b.id).ready?1:0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures.get('earth-night').texture);gl.uniform1i(u.uNight,1);gl.uniform1f(u.uHasNight,textures.get('earth-night').ready?1:0);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,textures.get('earth-clouds').texture);gl.uniform1i(u.uClouds,2);gl.uniform1f(u.uHasClouds,textures.get('earth-clouds').ready?1:0);
      gl.drawElements(gl.TRIANGLES,resources.indexCount,gl.UNSIGNED_SHORT,0);
    }
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    const saturn=bodies.find(b=>b.rings);u=use(p.ring);gl.uniform1f(u.uOpacity,focus?.id==='saturn'?1:1-focusMix);gl.bindBuffer(gl.ARRAY_BUFFER,resources.ringBuffer);attributes(u.position);gl.vertexAttribPointer(u.position,3,gl.FLOAT,false,0,0);gl.uniform3fv(u.uCenter,saturn.position);gl.uniform1f(u.uRadius,saturn.radius);gl.drawArrays(gl.TRIANGLES,0,resources.ringCount);
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
  for(const b of bodies)load(b.id);
  canvas.dataset.focus='system';
  return {render,camera,size,select,clearFocus,zoom,isFocused:()=>!!focus,focusId:()=>focus?.id||null};
}

