// Extracted from the approved 2-second holographic-wave.html prototype.
// The wave, liquid tiles, optics and timing are preserved; black becomes transparency.
export const SHIELD_DURATION=1.65;
export function createShield(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'low-power'});
  if(!gl)return {render(){}};
  const vertex=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
  const fragment=`
precision highp float;
uniform vec2 u_size;
uniform float u_time;
uniform float u_reduce;
vec3 environment(vec3 d){
 if(d.y<0.)return vec3(.012,.022,.025);
 float overhead=pow(max(0.,d.y),.65);
 float light=exp(-pow((d.x+.08)/.48,2.)-pow((d.z-.06)/.52,2.));
 float strip=exp(-pow((d.x-.43)/.13,2.)-pow((d.z+.25)/.55,4.));
 return vec3(.15,.20,.22)*(.4+.6*overhead)+vec3(.46,.48,.49)*light+vec3(.38,.40,.41)*strip*overhead;
}
// Radial surface height and its analytic derivative: a small damped capillary wave packet.
vec2 surface(float r,float elapsed){
 if(elapsed<=0.||elapsed>=5.2)return vec2(0.);
 float t=elapsed;
 float fade=1.-smoothstep(3.8,5.2,t);
 float speed=.82,width=.19+.075*t;
 float front=r-speed*t;
 float packet=exp(-front*front/(width*width));
 float amplitude=.027*exp(-t*.53)/sqrt(1.+2.*r);
 float phase=front*26.;
 float h=amplitude*packet*sin(phase);
 float slope=amplitude*packet*(26.*cos(phase)-sin(phase)*(2.*front/(width*width)+1./(1.+2.*r)));
 float hollow=-.029*exp(-r*r/.010)*exp(-t*11.);
 float crown=.035*exp(-r*r/.007)*sin(t*17.)*exp(-t*6.);
 h+=hollow+crown;
 slope+=hollow*(-2.*r/.010)+crown*(-2.*r/.007);
 return vec2(h,slope)*fade;
}
vec3 triangleTile(vec2 point){
 float side=.24,height=.2078461;
 vec2 grid=vec2((point.x-point.y/1.7320508)/side,point.y/height);
 vec2 base=floor(grid),f=fract(grid);
 float lower=step(f.x+f.y,1.);
 float fraction=mix(2./3.,1./3.,lower);
 vec2 center=vec2(side*(base.x+fraction+.5*(base.y+fraction)),height*(base.y+fraction));
 return vec3(center,lower*2.-1.);
}
vec3 water(vec3 origin,vec3 direction,float elapsed){
 if(elapsed<=0.||elapsed>=5.2)return vec3(0.);
 float distance=-origin.y/direction.y;
 for(int k=0;k<4;k++){
  vec3 point=origin+direction*distance;
  float r=length(point.xz);
  vec2 wave=surface(r,elapsed);
  vec2 radial=point.xz/max(r,.0001);
  float derivative=direction.y-wave.y*dot(radial,direction.xz);
  derivative=sign(derivative)*max(.09,abs(derivative));
  distance+=(wave.x-point.y)/derivative;
 }
 vec3 p=origin+direction*distance;
 float r=length(p.xz);
 vec2 wave=surface(r,elapsed);
 vec2 radial=p.xz/max(r,.0001);
 float front=r-.82*elapsed,width=.19+.075*elapsed;
 float packet=exp(-front*front/(width*width));
 float fade=(1.-smoothstep(3.8,5.2,elapsed))*smoothstep(0.,.15,elapsed);
 float active=(1.-smoothstep(-.02,.13,front))*exp(-max(0.,-front)*3.8)*fade;
 // Each triangle is a separate patch of liquid, with a soft meniscus at its free edges.
 vec2 offset=vec2(.027,.019);
 vec2 lattice=p.xz+radial*wave.y*.038;
 vec3 tile=triangleTile(lattice+offset);
 vec2 center=tile.xy-offset;
 float centerR=length(center),centerFront=centerR-.82*elapsed;
 float centerPacket=exp(-centerFront*centerFront/(width*width));
 vec2 centerRadial=center/max(centerR,.001);
 vec2 shift=centerRadial*.015*centerPacket*sin(centerFront*13.);
 float scale=1.-.09*centerPacket;
 vec2 local=(lattice-center-shift)/scale;
 vec2 q=vec2(local.x,local.y*tile.z);
 float bottom=-q.y,diagonal=.8660254*sqrt(q.x*q.x+.006*.006)+.5*q.y;
 float roundedPlane=max(bottom,diagonal)+.006*log(1.+exp(-abs(bottom-diagonal)/.006));
 float edge=.06928203-roundedPlane;
 vec2 edgeGradient=bottom>diagonal?vec2(0.,tile.z):vec2(-sign(q.x)*.8660254,-.5*tile.z);
 edge+=.0006*sin(local.x*125.+elapsed)*sin(local.y*131.-elapsed)*centerPacket;
 float gap=.0015+.014*centerPacket;
 float pixel=3.2/(1.65*min(u_size.x,u_size.y));
 float coverage=smoothstep(gap-pixel*.6,gap+pixel*.6,edge);
 if(coverage<.001)return vec3(0.);
 float meniscus=exp(-max(0.,edge-gap)*135.);
 vec2 liquidSlope=radial*wave.y+edgeGradient*meniscus*.17-local*1.7*(.3+.7*centerPacket);
 // The normal faces the submerged camera; rays refract through the individual water patches.
 vec3 n=normalize(vec3(liquidSlope.x,-1.,liquidSlope.y));
 float cosine=max(.001,dot(n,-direction));
 float eta=1.333,sinSquared=eta*eta*(1.-cosine*cosine);
 float fresnel=1.;
 vec3 airRay=refract(direction,n,eta);
 if(sinSquared<1.){
  float cosTransmitted=sqrt(1.-sinSquared);
  float rs=(eta*cosine-cosTransmitted)/(eta*cosine+cosTransmitted);
  float rp=(cosine-eta*cosTransmitted)/(cosine+eta*cosTransmitted);
  fresnel=(rs*rs+rp*rp)*.5;
 }
 vec3 absorption=exp(-max(0.,distance)*vec3(.115,.045,.030));
 vec3 transmitted=absorption*(1.-fresnel);
 vec3 reflection=environment(reflect(direction,n));
 vec3 flatAir=refract(direction,vec3(0.,-1.,0.),eta);
 float optical=abs(dot(environment(airRay)-environment(flatAir),vec3(.2126,.7152,.0722)));
 vec3 tint=vec3(.48,.83,.94),pearl=vec3(.44,.66,.73);
 vec3 color=environment(airRay)*transmitted*tint*.17*active;
 color+=reflection*fresnel*.12*active;
 color+=pearl*optical*.70*packet*fade;
 vec3 light=normalize(vec3(-.4,-1.,.6)),halfway=normalize(light-direction);
 float highlight=pow(max(0.,dot(n,halfway)),95.);
 color+=vec3(.70,.83,.87)*highlight*meniscus*.25*(active+packet*fade);
 color+=pearl*meniscus*.008*active;
 return color*coverage;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-u_size*.5)/min(u_size.x,u_size.y);
 vec3 origin=vec3(0.,-3.2,0.);
 vec3 direction=normalize(vec3(uv.x,1.65,-uv.y));
 float impact=.08,elapsed=(u_time-impact)*2.72;
 float waveTime=elapsed*(1.-u_reduce);
 vec3 color=water(origin,direction,waveTime);
 color=vec3(1.)-exp(-max(color,vec3(0.))*1.25);
 color=pow(color,vec3(1./2.2));
 float alpha=clamp(max(color.r,max(color.g,color.b)),0.,1.);
 gl_FragColor=vec4(color,alpha);
}`;
  function compile(type,source){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'a_position');
  const time=gl.getUniformLocation(program,'u_time'),size=gl.getUniformLocation(program,'u_size'),reduce=gl.getUniformLocation(program,'u_reduce');
  let visible=false,lost=false;
  canvas.dataset.source='holographic-wave';canvas.dataset.material='separating-water-triangles';canvas.dataset.duration=String(SHIELD_DURATION);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;visible=false;canvas.style.opacity='0';});
  return {render(age,width,height,dpr){
    if(lost)return;
    if(age<0||age>=SHIELD_DURATION){if(visible){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);canvas.style.opacity='0';visible=false;}return;}
    let ratio=Math.min(dpr,1.25,1280/width);
    const pixels=width*height*ratio*ratio;if(pixels>800000)ratio*=Math.sqrt(800000/pixels);
    const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    // Skip the demonstration's empty lead-in so the wave starts with the jump.
    const shaderTime=.08+age*(2-.08)/SHIELD_DURATION;
    gl.uniform1f(time,shaderTime);gl.uniform2f(size,w,h);gl.uniform1f(reduce,0);gl.drawArrays(gl.TRIANGLES,0,6);
    canvas.style.opacity='1';visible=true;
  }};
}
