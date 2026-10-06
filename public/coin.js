// Original cutout emblem with rounded metal edges; alpha openings remain empty.
const TAU = Math.PI * 2;
const TURN_SECONDS = 16;
function advanceRotation(rotation,dt,paused,reducedMotion){
  if(reducedMotion){rotation.speed=0;return;}
  const target=paused?0:TAU/TURN_SECONDS;
  const smoothing=paused ? .20 : .48;
  const decay=Math.exp(-dt/smoothing);
  // Integrate the eased speed exactly, so 30, 60 and 120 Hz follow the same turn.
  rotation.angle=(rotation.angle+target*dt+(rotation.speed-target)*smoothing*(1-decay))%TAU;
  rotation.speed=target+(rotation.speed-target)*decay;
}
const vertex = `
attribute vec3 aPosition, aNormal;
attribute float aFace;
attribute vec2 aMaterialPosition;
uniform mat3 uRotation;
uniform vec2 uViewport;
varying vec3 vPosition, vNormal, vLocal;
varying vec2 vMaterialPosition;
varying float vFace;
void main(){
  vLocal=aPosition;vFace=aFace;vMaterialPosition=aMaterialPosition;
  vPosition=uRotation*aPosition;
  vNormal=uRotation*aNormal;
  float depth=4.3-vPosition.z;
  vec2 aspect=vec2(uViewport.y/uViewport.x,1.);
  gl_Position=vec4(vPosition.xy*3.22*aspect, -vPosition.z*.15, depth);
}`;
const fragment = `
precision highp float;
uniform sampler2D uLogo;
uniform vec2 uTextureCenter, uTextureScale;
varying vec3 vPosition,vNormal,vLocal;
varying vec2 vMaterialPosition;
varying float vFace;
float softbox(vec3 r,vec3 light,float sharpness){
 return pow(max(0.,dot(r,normalize(light))),sharpness);
}
void main(){
 vec3 n=normalize(vNormal);
 vec3 view=normalize(vec3(0.,0.,4.3)-vPosition);
 vec3 base=vec3(.20,.205,.215);
 float alpha=0.;vec3 emblem=vec3(0.);
 if(vFace>.5){
   // Identical material coordinates on the back keep silhouette and side walls aligned.
   vec2 uv=vLocal.xy*uTextureScale+uTextureCenter;
   vec4 logo=texture2D(uLogo,uv);
   if(logo.a<.5)discard;
   alpha=1.;
   emblem=logo.rgb;
 }else{
   // Follow the brightness of the original metal while keeping edges neutral gray.
   vec4 source=texture2D(uLogo,vMaterialPosition*uTextureScale+uTextureCenter);
   float luminance=dot(source.rgb,vec3(.2126,.7152,.0722));
   base=mix(base,vec3(clamp(luminance,.12,.42)),source.a*.45);
 }
 float diffuse=max(0.,dot(n,normalize(vec3(-.55,.8,1.7))));
 vec3 reflection=reflect(-view,n);
 float key=softbox(reflection,vec3(-.6,.9,1.7),26.);
 float fill=softbox(reflection,vec3(.8,.2,1.),42.);
 float cyan=softbox(reflection,vec3(-1.,-.2,.4),20.);
 float fresnel=pow(1.-max(0.,dot(n,view)),3.);
 vec3 metal=base*(.55+diffuse*.95)+key*vec3(.65,.655,.67)+fill*vec3(.32,.325,.34)+cyan*vec3(.085,.088,.095);
 // The source is already a metallic render; retain its fine highlights.
 vec3 logoColor=emblem*(.85+diffuse*.42)+key*.12+cyan*vec3(.01,.09,.14);
 vec3 color=mix(metal,logoColor,alpha);
 color+=fresnel*mix(vec3(.065,.067,.072),vec3(.025,.09,.14),alpha)*(.45+diffuse);
 color=color/(1.+color*.32);
 gl_FragColor=vec4(color,1.);
}`;

function createCoin(canvas) {
  const host=canvas.parentElement;
  const fallback=host.querySelector('img');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:true,powerPreference:'low-power'});
  if(!gl)return;
  let program,buffer,texture,frame=0,previous=0,visible=true,ready=false,lost=false,lastReport=0;
  const rotation={angle:-.2,speed:0},matrix=new Float32Array(9);
  let rotationUniform,viewportUniform,pixelRatio=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const pauseButton=document.getElementById('coin-pause');
  const siteMotion=document.getElementById('motion-toggle');
  let paused=false;
  const isPaused=()=>motion.matches||paused||siteMotion?.getAttribute('aria-pressed')==='true';
  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function init(){
    program=gl.createProgram();
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    rotationUniform=gl.getUniformLocation(program,'uRotation');
    viewportUniform=gl.getUniformLocation(program,'uViewport');
    const data=[];
    const add=(p,n,f,material=p)=>data.push(...p,...n,f,material[0],material[1]);
    const halfDepth=.045,roundRadius=.008,roundSteps=6;
    const [cx,cy]=outline.center,[width,height]=outline.size,scale=outline.scale;
    const xmin=-cx/scale,xmax=(width-cx)/scale,ymin=(cy-height)/scale,ymax=cy/scale;
    for(const side of [1,-1]){
      const corners=[[xmin,ymin,side*halfDepth],[xmax,ymin,side*halfDepth],[xmax,ymax,side*halfDepth],[xmin,ymax,side*halfDepth]];
      const indices=side===1?[0,1,2,0,2,3]:[0,2,1,0,3,2];
      for(const i of indices)add(corners[i],[0,0,side],1);
    }
    for(const contour of outline.contours){
      const normals=contour.map((a,i)=>{
        const b=contour[(i+1)%contour.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
        return [-dy/length,dx/length,0];
      });
      const smooth=contour.map((_,i)=>{
        const a=normals[(i+normals.length-1)%normals.length],b=normals[i];
        const length=Math.hypot(a[0]+b[0],a[1]+b[1]);
        return length<.01?b:[(a[0]+b[0])/length,(a[1]+b[1])/length,0];
      });
      // Circular fillets meet both textured faces tangentially, rather than
      // faking rounded edges by smoothing the normals of a square extrusion.
      const profile=[];
      for(let step=0;step<=roundSteps;step++){
        const t=step/roundSteps*Math.PI/2;
        profile.push({offset:roundRadius*Math.sin(t),z:halfDepth-roundRadius+roundRadius*Math.cos(t),radial:Math.sin(t),axial:Math.cos(t)});
      }
      for(let step=roundSteps;step>=0;step--){
        const t=step/roundSteps*Math.PI/2;
        profile.push({offset:roundRadius*Math.sin(t),z:-halfDepth+roundRadius-roundRadius*Math.cos(t),radial:Math.sin(t),axial:-Math.cos(t)});
      }
      const point=(a,n,p)=>[a[0]+n[0]*p.offset,a[1]+n[1]*p.offset,p.z];
      const normal=(n,p)=>[n[0]*p.radial,n[1]*p.radial,p.axial];
      for(let i=0;i<contour.length;i++){
        const j=(i+1)%contour.length,a=contour[i],b=contour[j],na=smooth[i],nb=smooth[j];
        const materialA=[a[0]-na[0]*roundRadius,a[1]-na[1]*roundRadius];
        const materialB=[b[0]-nb[0]*roundRadius,b[1]-nb[1]*roundRadius];
        for(let band=0;band<profile.length-1;band++){
          const top=profile[band],bottom=profile[band+1];
          add(point(a,na,top),normal(na,top),0,materialA);
          add(point(b,nb,top),normal(nb,top),0,materialB);
          add(point(a,na,bottom),normal(na,bottom),0,materialA);
          add(point(b,nb,top),normal(nb,top),0,materialB);
          add(point(b,nb,bottom),normal(nb,bottom),0,materialB);
          add(point(a,na,bottom),normal(na,bottom),0,materialA);
        }
      }
    }
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aFace',1,24],['aMaterialPosition',2,28]]){
      const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,36,offset);
    }
    canvas.vertexCount=data.length/9;
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,fallback);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform2f(gl.getUniformLocation(program,'uTextureCenter'),(cx+.5)/width,1-(cy+.5)/height);
    gl.uniform2f(gl.getUniformLocation(program,'uTextureScale'),scale/width,scale/height);
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
    ready=true;host.dataset.coinState='ready';resize();wake();
  }
  function resize(){
    const box=canvas.getBoundingClientRect();pixelRatio=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(box.width*pixelRatio)),h=Math.max(1,Math.round(box.height*pixelRatio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if(ready&&!lost){gl.viewport(0,0,w,h);gl.uniform2f(viewportUniform,w,h);wake();}
  }
  function draw(time){
    frame=0;if(!ready||lost||document.hidden||!visible){previous=0;return;}
    const dt=previous?Math.max(0,Math.min((time-previous)/1000,.1)):0;previous=time;
    const pausedNow=isPaused();advanceRotation(rotation,dt,pausedNow,motion.matches);
    if(pixelRatio!==Math.min(devicePixelRatio||1,2))resize();
    const tilt=-.13,c=Math.cos(rotation.angle),s=Math.sin(rotation.angle),ct=Math.cos(tilt),st=Math.sin(tilt);
    // Reuse uniforms and matrix; no per-frame layout read or typed-array allocation.
    matrix[0]=c;matrix[1]=st*s;matrix[2]=-ct*s;matrix[3]=0;matrix[4]=ct;matrix[5]=st;
    matrix[6]=s;matrix[7]=-st*c;matrix[8]=ct*c;
    gl.uniformMatrix3fv(rotationUniform,false,matrix);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,canvas.vertexCount);
    if(time-lastReport>250){host.dataset.coinAngle=rotation.angle.toFixed(3);lastReport=time;}
    if(!pausedNow||rotation.speed>.00002){if(!frame)frame=requestAnimationFrame(draw);}else{rotation.speed=0;previous=0;}
  }
  function wake(){if(!frame&&ready&&!lost&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;previous=0;rotation.speed=0;wake();});
  motion.addEventListener('change',wake);
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize',resize);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;previous=0;rotation.speed=0;}else wake();}).observe(canvas);
  if(siteMotion)new MutationObserver(wake).observe(siteMotion,{attributes:true,attributeFilter:['aria-pressed']});
  pauseButton?.addEventListener('click',()=>{paused=!paused;pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.textContent=paused?'Nastavi rotaciju':'Pauziraj rotaciju';wake();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;ready=false;cancelAnimationFrame(frame);frame=0;host.dataset.coinState='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;load();});
  let outline;
  async function load(){try{
    if(!outline){const response=await fetch('assets/brand/percules-outline.json');if(!response.ok)throw new Error('Emblem outline unavailable');outline=await response.json();}
    init();
  }catch(error){host.dataset.coinState='fallback';console.warn('Percules emblem:',error.message);}}
  document.getElementById('logo-backdrop')?.addEventListener('click',event=>{
    const checked=event.currentTarget.getAttribute('aria-pressed')!=='true';
    event.currentTarget.setAttribute('aria-pressed',String(checked));document.body.classList.toggle('show-transparency',checked);
  });
  if(fallback.complete&&fallback.naturalWidth)load();else fallback.addEventListener('load',load,{once:true});
}
document.querySelectorAll('[data-coin] canvas').forEach(createCoin);
