// Extracted from the user's milky-way-jump.html demonstration.
// Retains its star geometry, soft trail shaders, tunnel noise and velocity curve.
// Live galaxy/solar renderers supply the destination instead of demo photographs.
export const JUMP_DURATION=.5;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
export function jumpPhase(progress){const t=clamp(progress,0,1)*6.2;return smooth(.85,1.7,t)*(1-smooth(3.65,4.55,t));}
const travelTable=[0],step=1/240;
for(let i=1;i<=1488;i++){const t=(i-.5)*step;travelTable.push(travelTable[i-1]+(.35+jumpPhase(t/6.2)*72)*step);}
export function jumpTravel(progress){const t=clamp(progress,0,1)*6.2,index=clamp(Math.floor(t/step),0,travelTable.length-2),f=clamp(t/step-index,0,1);return travelTable[index]*(1-f)+travelTable[index+1]*f;}
const backgroundVertex=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
const backgroundFragment=`
precision highp float;
uniform vec2 u_size;
uniform float u_time,u_warp,u_travel;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float sum=0.,amplitude=.5;mat2 m=mat2(.8,-.6,.6,.8);for(int k=0;k<5;k++){sum+=noise(p)*amplitude;p=m*p*2.07+vec2(3.1,5.7);amplitude*=.5;}return sum;}

void main(){
 vec2 uv=(gl_FragCoord.xy-u_size*.5)/min(u_size.x,u_size.y);
 float radius=length(uv);
 // Volumetric-looking blue light is confined to the jump, with an open dark center.
 float angle=atan(uv.y,uv.x);
 vec2 tunnel=vec2(angle*2.2,log(radius+.04)*2.2-u_travel*.065);
 float vapor=fbm(tunnel+vec2(12.,20.));
 float vapor2=noise(tunnel*4.+vec2(3.,7.));
 float shafts=pow(max(0.,vapor*.7+vapor2*.3),5.);
 float rim=smoothstep(.025,.18,radius);
 vec3 jumpLight=vec3(.018,.10,.22)*shafts*rim*.70;
 jumpLight+=vec3(.006,.035,.080)*pow(vapor,3.)*rim;

 vec3 color=jumpLight*u_warp;
 float exitFlash=exp(-pow((u_time-4.12)/.12,2.));
 color+=vec3(.028,.046,.064)*exitFlash*exp(-radius*1.8);
 color*=1.-smoothstep(.2,1.1,radius)*.35;
 color=vec3(1.)-exp(-color*1.8);
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 // Premultiplied transparent output reveals the actual shared-camera scene.
 float alpha=max(u_warp*.93,max(color.r,max(color.g,color.b)));
 gl_FragColor=vec4(color,alpha);
}`;
const starVertex=`
precision highp float;
attribute vec3 a_star;
attribute vec3 a_meta;
attribute vec2 a_corner;
uniform vec2 u_size;
uniform float u_warp;
uniform float u_travel;
uniform float u_speed;
uniform float u_pixelScale;
uniform float u_progress;
uniform vec2 u_goal;
varying float v_side;
varying float v_along;
varying float v_length;
varying float v_width;
varying float v_core;
varying vec3 v_color;
varying float v_light;
void main(){
 float z=mod(a_star.z-u_travel,74.)+1.3;
 float shutter=.010+u_warp*.93;
 float backZ=z+u_speed*shutter;
 float focal=.84+u_warp*.095;
 vec2 head=a_star.xy*focal/z*min(u_size.x,u_size.y);
 vec2 tail=a_star.xy*focal/backZ*min(u_size.x,u_size.y);
 vec2 delta=head-tail;
 float trailLength=length(delta);
 vec2 tangent=trailLength>.001?delta/trailLength:vec2(0.,1.);
 vec2 perpendicular=vec2(-tangent.y,tangent.x);
 float size=((.62+.72*a_meta.x)*clamp(17./z,.85,1.75)+u_warp*.65)*u_pixelScale;
 float width=size*4.5;
 vec2 pixel=mix(tail,head,a_corner.y)+tangent*(a_corner.y*2.-1.)*width+perpendicular*a_corner.x*width;
 pixel+=u_goal*(1.-smoothstep(0.,.32,u_progress))*min(u_size.x,u_size.y);
 gl_Position=vec4(pixel*2./u_size,0.,1.);
 v_side=a_corner.x*width;
 v_along=mix(-width,trailLength+width,a_corner.y);
 v_length=trailLength;
 v_width=width;
 v_core=size;
 vec3 quietColor=mix(vec3(.84,.91,1.),vec3(1.,.86,.67),a_meta.y);
 v_color=mix(quietColor,vec3(.68,.85,1.),u_warp*.65);
 float entrance=smoothstep(1.3,4.8,z)*(1.-smoothstep(69.,75.3,z));
 v_light=(.16+.62*a_meta.x*a_meta.x)*entrance*(1.-u_warp*.40);
 vec2 screenPoint=pixel/min(u_size.x,u_size.y);
 v_light*=.18+.82*smoothstep(.20,.6,u_progress);
}`;
const starFragment=`
precision highp float;
uniform float u_visibility;
varying float v_side;
varying float v_along;
varying float v_length;
varying float v_width;
varying float v_core;
varying vec3 v_color;
varying float v_light;
void main(){
 float cap=max(max(-v_along,v_along-v_length),0.);
 float distance2=v_side*v_side+cap*cap;
 float core=exp(-distance2/(v_core*v_core*.47));
 float halo=exp(-distance2/(v_core*v_core*5.))* .047;
 float brightness=.15+.85*smoothstep(0.,1.,clamp(v_along/max(1.,v_length),0.,1.));
 if(v_length<1.)brightness=1.;
 vec3 color=v_color*(core+halo)*v_light*brightness;
 gl_FragColor=vec4(color*u_visibility,0.);
}`;

export function createJump(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 if(!gl)return {render(){canvas.style.opacity='0';}};
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,v),fs=compile(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const bg=program(backgroundVertex,backgroundFragment),stars=program(starVertex,starFragment);
 const bgBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bgBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 let seed=23457;
 function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 const starData=[],corners=[[-1,0],[1,0],[-1,1],[-1,1],[1,0],[1,1]],count=matchMedia('(pointer: coarse)').matches?1200:2200;
 for(let i=0;i<count;i++){
  const angle=random()*Math.PI*2,radius=Math.sqrt(random())*42;
  const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,z=random()*74;
  const brightness=Math.pow(random(),1.6),warmth=Math.pow(random(),3),extra=random();
  for(const [side,along] of corners)starData.push(x,y,z,brightness,warmth,extra,side,along);
 }
 const starBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(starData),gl.STATIC_DRAW);
 const bgAttrib=gl.getAttribLocation(bg,'a_position');
 const starAttribs=[['a_star',3,0],['a_meta',3,12],['a_corner',2,24]].map(([name,size,offset])=>({location:gl.getAttribLocation(stars,name),size,offset}));
 const uniforms=p=>Object.fromEntries(['u_size','u_time','u_warp','u_travel','u_speed','u_pixelScale','u_progress','u_goal','u_visibility'].map(name=>[name,gl.getUniformLocation(p,name)]));
 const bu=uniforms(bg),su=uniforms(stars);
 let visible=false,lost=false,pixelScale=1;
 canvas.dataset.source='milky-way-jump';canvas.dataset.duration=String(JUMP_DURATION);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.style.opacity='0';});
 canvas.addEventListener('webglcontextrestored',()=>{lost=true;});
 function setUniforms(u,p,warp,goal,arrival){
  const exiting=arrival>=0,decay=exiting?Math.exp(-arrival*4):0;
  gl.uniform2f(u.u_size,canvas.width,canvas.height);gl.uniform1f(u.u_time,p*6.2);gl.uniform1f(u.u_warp,warp);
  gl.uniform1f(u.u_travel,exiting?jumpTravel(1)+.35*arrival+1.62*(1-decay):jumpTravel(p));
  gl.uniform1f(u.u_speed,exiting?.35+6.48*decay:.35+warp*72);gl.uniform1f(u.u_pixelScale,pixelScale);gl.uniform1f(u.u_progress,p);gl.uniform2f(u.u_goal,goal[0],goal[1]);
  gl.uniform1f(u.u_visibility,exiting?.40*Math.exp(-arrival*1.8)*(1-smooth(.9,1.35,arrival)):smooth(0,.09,p)*(1-.60*smooth(.75,1,p)));
 }
 return {render(progress,width,height,dpr,goal=[0,0],arrival=-1){
  if(arrival>=0)arrival*=1.35/1.1;
  const exiting=arrival>=0&&arrival<1.35;
  if(lost||(!exiting&&(progress<0||progress>=1))){
   if(visible&&!lost){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
   visible=false;canvas.style.opacity='0';canvas.dataset.phase='idle';return;
  }
  const ratio=Math.min(dpr,1.5,Math.sqrt(1400000/Math.max(1,width*height)));
  const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));pixelScale=ratio;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  const p=exiting?1:clamp(progress,0,1),warp=exiting?.09*Math.exp(-arrival*4):jumpPhase(p)+.09*smooth(.73,1,p);
  visible=true;canvas.style.opacity='1';canvas.dataset.phase=exiting?'braking':p<.14?'entrance':p<.74?'jump':'exit';
  gl.disable(gl.BLEND);gl.useProgram(bg);gl.bindBuffer(gl.ARRAY_BUFFER,bgBuffer);
  for(const a of starAttribs)gl.disableVertexAttribArray(a.location);
  gl.enableVertexAttribArray(bgAttrib);gl.vertexAttribPointer(bgAttrib,2,gl.FLOAT,false,0,0);setUniforms(bu,p,warp,goal,arrival);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(stars);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.disableVertexAttribArray(bgAttrib);
  for(const a of starAttribs){gl.enableVertexAttribArray(a.location);gl.vertexAttribPointer(a.location,a.size,gl.FLOAT,false,32,a.offset);}
  setUniforms(su,p,warp,goal,arrival);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,starData.length/8);gl.disable(gl.BLEND);
 }};
}
