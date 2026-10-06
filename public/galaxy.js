(() => {
  'use strict';
  const canvas = document.getElementById('galaxy');
  const error = document.getElementById('render-error');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cameraLimits = { minPitch: .12, maxPitch: 1.35, minZoom: .06, maxZoom: 1.25 };
  const smoothstep=(a,b,v)=>{const x=clamp((v-a)/(b-a),0,1);return x*x*(3-2*x);};
  const limitPitch = value => clamp(value, cameraLimits.minPitch, cameraLimits.maxPitch);
  const limitZoom = value => clamp(value, cameraLimits.minZoom, cameraLimits.maxZoom);
  let seed = 724913;
  function random() { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
  function gaussian() { return Math.sqrt(-2 * Math.log(Math.max(random(), .00001))) * Math.cos(TAU * random()); }

  // The procedural disk is also the immediate, offline-safe loading fallback.
  const stars = [], sky = [];
  const count = coarse ? 8000 : 16000;
  for (let i = 0; i < count; i++) {
    const r = Math.pow(random(), .72) * 7.5 + .06;
    const arm = Math.floor(random() * 4);
    const loose = random() < .25;
    const theta = loose ? random() * TAU : arm * TAU / 4 + Math.log(r + .8) * 3.9 + gaussian() * (.17 + r * .032) + Math.sin(r * 2.6 + arm * 1.7) * .10;
    const radius = r + gaussian() * (.045 + r * .018);
    const h = gaussian() * (.045 + .12 * Math.exp(-r * .7));
    const warmth = Math.exp(-r * .7), blue = random();
    let red = lerp(.43 + blue * .14, 1, warmth), green = lerp(.60 + blue * .18, .78, warmth), cobalt = lerp(.94, .46, warmth);
    if (random() < .07 && r > 2.4) { red = .85; green = .37; cobalt = .62; }
    const edge = clamp((7.6 - r) / 1.8, 0, 1), bright = Math.pow(random(), 3);
    stars.push(Math.cos(theta) * radius, h, Math.sin(theta) * radius, red, green, cobalt, .70 + bright * 2.2, (.12 + bright * .36) * edge * (loose ? .45 : 1));
  }
  for (let i = 0; i < (coarse ? 1200 : 2400); i++) {
    const r = Math.pow(random(), 1.7) * 1.8, theta = random() * TAU, white = random();
    stars.push(Math.cos(theta) * r, gaussian() * .18 * (1 - r / 2.2), Math.sin(theta) * r, 1, .84 + white * .14, .64 + white * .3, .85 + random() * 1.55, .14 + random() * .16);
  }
  for (let i = 0; i < 950; i++) {
    const r = 1 + random() * 9, theta = random() * TAU;
    stars.push(Math.cos(theta) * r, gaussian() * .8, Math.sin(theta) * r, .67, .76, .98, random() < .025 ? 5 + random() * 3 : 1 + random() * 1.4, .13 + random() * .38);
  }
  for (let i = 0; i < (coarse ? 600 : 1100); i++) {
    const size = random() < .015 ? 3.2 + random() * 2.8 : .65 + random() * 1.2, tint = random();
    sky.push(random() * 2 - 1, random() * 2 - 1, random(), .62 + tint * .25, .71 + tint * .13, .95, size, .1 + random() * .5);
  }

  let width = 0, height = 0, dpr = 1, fit = 20;
  let yaw = .25, pitch = .73, zoom = 1, toYaw = yaw, toPitch = pitch, toZoom = zoom;
  let vx = 0, vy = 0, cameraRoll = -.20, breathingEnabled = !motion.matches;
  let effectYaw = 0, effectPitch = 0, effectEnergy = 0, effectTime = 0;
  let breathPhase = 0, breath = 0, compression = 0, flowPull = 0, flowVelocity = 0;
  let frameId = 0, previousTime = 0, lost = false;
  let pointers = new Map(), lastPinch = 0;
  let draw, resizeRenderer;
  let flight=null,alignment=null,arrival=null,navigationTarget=null,pendingTeleport=false,teleportEnergy=0,worldDistance=20,worldFraming=0;
  let solar=null,solarLoading=null,journey=0,center=[0,0,0],quality=1,slowFrames=0,qualityFrames=0,focusedBody=null,uiScene='';
  const el=id=>document.getElementById(id),solarCanvas=el('solar'),marker=el('sun-marker'),planetNav=el('planet-nav');
  const solarPoint=[3.8,0,-1.2],solarScale=.00008;
  let solarAnchor=[...solarPoint];
  function sound(detail){if(typeof CustomEvent!=='undefined')document.dispatchEvent?.(new CustomEvent('percules:audio',{detail}));}
  // The shield and half-second jump share the same start time after centering.
  const warpCanvas=el('hyperspace');
  let shieldAge=-1,shieldStart=null,shieldRenderer=null,shieldDuration=1.65;
  const arrivalDuration=1.1;
  let jumpRenderer=null,jumpDuration=.5,jumpProgress=-1,jumpGoal=[0,0];
  let phaseForJump=()=>0;
  function drawHyperspace(time){
    if(motion.matches)shieldStart=null;
    shieldAge=shieldStart===null?-1:Math.max(0,(time-shieldStart)/1000);
    if(shieldAge>=shieldDuration){shieldStart=null;shieldAge=-1;}
    warpCanvas.dataset.shield=shieldAge>=0?'water-regeneration':'idle';
    jumpRenderer?.render(motion.matches?-1:jumpProgress,width,height,dpr,jumpGoal,motion.matches?-1:arrival?.age??-1);
  }
  function flightOrigin(){
    const x=solarAnchor[0]-center[0],y=solarAnchor[1]-center[1],z=solarAnchor[2]-center[2];
    const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw),v=y*Math.cos(pitch)-b*Math.sin(pitch);
    const depth=Math.max(.001,worldDistance-y*Math.sin(pitch)-b*Math.cos(pitch)),cr=Math.cos(cameraRoll),sr=Math.sin(cameraRoll),scale=height*1.2071/depth/Math.min(width,height);
    return [(a*cr-v*sr)*scale,(a*sr+v*cr)*scale];
  }
  function beginTeleport(target,to){
    // The selected world position becomes the view target before accelerating.
    // Every destination uses this same sequence, regardless of its screen position.
    navigationTarget=target;arrival=null;shieldStart=null;shieldAge=-1;jumpProgress=-1;jumpGoal=[0,0];
    vx=vy=0;toYaw=yaw;toPitch=pitch;toZoom=zoom;
    if(motion.matches){alignment=null;flight=null;toZoom=to;center=[...target()];wake();return;}
    alignment={from:[...center],start:performance.now(),duration:.24,to};
    sound({type:'jump',delay:alignment.duration,duration:jumpDuration,shieldDuration});
    flight=null;wake();
  }
  function cancelTeleport(){sound({type:'cancel'});alignment=arrival=navigationTarget=null;flight=null;jumpProgress=-1;shieldStart=null;shieldAge=-1;teleportEnergy=0;}
  function flowPoint(p){
    const r=Math.hypot(p[0],p[2]),envelope=smoothstep(.3,1.6,r)*(1-smoothstep(7,8.5,r));
    const angle=envelope*flowPull*(.12+r*.10),c=Math.cos(angle),s=Math.sin(angle);
    const scale=(1+breath*envelope)*(1-compression*(.06+.24*smoothstep(.5,7,r)));
    return [(p[0]*c-p[2]*s)*scale,p[1]*(1-compression*.16)+breath*2.6*envelope,(p[0]*s+p[2]*c)*scale];
  }
  function updateScene(scene){
    const key=scene+(focusedBody?.id||'')+(flight?'teleport':'');if(uiScene===key)return;uiScene=key;document.body.dataset.scene=scene;
    const planet=scene==='planet',system=scene==='system',galaxy=scene==='galaxy';
    sound({type:'scene',local:system||planet});
    el('location').textContent=planet?focusedBody.name.toLocaleUpperCase('sr-Latn'):system?'SUNČEV SISTEM':galaxy?'MLEČNI PUT':flight?'TELEPORT':'PRILAZAK SUNČEVOM SISTEMU';
    el('location-index').textContent=planet?'03 / 03':galaxy?'01 / 03':'02 / 03';
    el('scene-eyebrow').textContent=planet?focusedBody.kind.toLocaleUpperCase('sr-Latn'):system?'NAŠ DEO SVEMIRA':'ISTRAŽI SVOJIM POKRETOM';
    el('scene-title').textContent=planet?focusedBody.name:system?'Sunčev sistem.':'Mlečni put.';
    el('scene-description').textContent=planet?focusedBody.text:system?'Jedna zvezda. Osam svetova. Izaberi svoj sledeći korak.':'Od beskraja do našeg malog sveta.';
    el('enter-solar').hidden=!galaxy;el('back-system').hidden=!planet;el('back-galaxy').hidden=galaxy||scene==='travel';
    planetNav.hidden=!(system||planet);el('scale-note').hidden=galaxy||scene==='travel';
    el('planet-labels').hidden=!system;
    canvas.setAttribute('aria-label',planet?`Interaktivni prikaz: ${focusedBody.name}`:system?'Interaktivni Sunčev sistem':'Interaktivna galaksija');
    planetNav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planet===focusedBody?.id)));
  }
  function ensureSolar(){
    if(solar||solarLoading)return solarLoading;
    el('enter-solar').setAttribute('aria-busy','true');
    solarLoading=import('./solar.js?v=8b').then(async module=>{
      try{const {createShield,SHIELD_DURATION}=await import('./shield.js?v=19');shieldDuration=SHIELD_DURATION;shieldRenderer=createShield(el('shield'));}
      catch(e){console.warn('Arrival shield unavailable:',e);}
      try{const {createJump,JUMP_DURATION,jumpPhase}=await import('./jump.js?v=17');jumpDuration=JUMP_DURATION;phaseForJump=jumpPhase;jumpRenderer=createJump(warpCanvas);}
      catch(e){console.warn('Jump effect unavailable:',e);}
      solar=module.createSolar(solarCanvas,{onInvalidate:wake,onSelect:body=>{
        if(body){cancelTeleport();sound({type:'select'});}focusedBody=body;vx=vy=0;
        if(body){const angle=body.id==='sun'?.25:Math.atan2(-body.position[0],-body.position[2])+.6;toYaw=yaw+Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw));toPitch=.32;}
        else {toPitch=.73;toYaw=yaw+Math.atan2(Math.sin(.25-yaw),Math.cos(.25-yaw));}
        uiScene='';wake();
      },onError:()=>{error.textContent='Detaljan prikaz je prekinut. Vratite se na galaksiju ili osvežite stranicu.';error.hidden=false;}});
      for(const body of module.bodies){const button=document.createElement('button');button.textContent=body.name;button.dataset.planet=body.id;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{solar.select(body.id);wake();});planetNav.append(button);}
      solar.size(width,height,dpr);canvas.dataset.solar='ready';error.hidden=true;wake();
    }).catch(e=>{console.error('Solar initialization failed:',e);flight=null;toZoom=1;error.textContent='Sunčev sistem nije učitan. Pokušajte ponovo dugmetom Istraži.';error.hidden=false;solarLoading=null;wake();}).finally(()=>el('enter-solar').removeAttribute('aria-busy'));
    return solarLoading;
  }
  function enterSolar(){
    if(!solar){pendingTeleport=true;ensureSolar()?.then(()=>{if(solar&&pendingTeleport){pendingTeleport=false;enterSolar();}});return;}
    pendingTeleport=false;beginTeleport(()=>flowPoint(solarPoint),cameraLimits.minZoom);
  }
  function changeZoom(delta){
    pendingTeleport=false;if(flight||alignment)toZoom=zoom;cancelTeleport();
    if(journey>.92&&solar?.zoom(delta)){wake();return;}
    if(delta<0&&toZoom<=cameraLimits.minZoom+.0001&&solar){solar.select('earth');wake();return;}
    toZoom=limitZoom(toZoom*Math.exp(clamp(delta,-500,500)*.00165));
    if(toZoom<.9)ensureSolar();wake();
  }
  function toggleMotion(){breathingEnabled=!breathingEnabled&&!motion.matches;el('motion-toggle').setAttribute('aria-pressed',String(!breathingEnabled));el('motion-toggle').textContent=breathingEnabled?'Pauziraj blage animacije':'Nastavi blage animacije';wake();}
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });

  function sampleStellarCloud(image) {
    const surface = document.createElement('canvas');
    surface.width = surface.height = 384;
    const ctx = surface.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(image, 0, 0, 384, 384);
    const pixels = ctx.getImageData(0, 0, 384, 384).data;
    const points = [], total = coarse ? 18000 : 32000;
    let attempts = 0;
    while (points.length / 8 < total && attempts++ < total * 25) {
      const u = random(), v = random(), x = (u - .5) * 17, z = (v - .5) * 17;
      const radius = Math.hypot(x, z);
      if (radius > 8.1) continue;
      const offset = (Math.floor(v * 384) * 384 + Math.floor(u * 384)) * 4;
      const r = pixels[offset] / 255, g = pixels[offset + 1] / 255, b = pixels[offset + 2] / 255;
      const luminance = r * .2126 + g * .7152 + b * .0722;
      if (luminance < .035 || random() > Math.pow(luminance, .8) * 1.35) continue;
      const warp = Math.sin(Math.atan2(z,x)*2 + radius*.55)*.085*Math.min(radius/4,1);
      const h = warp + gaussian() * (.045 + .28 * Math.exp(-radius * .7));
      const highlight = Math.pow(random(), 12);
      const attenuation = .5 + .5 * Math.min(radius / 1.7, 1);
      points.push(x, h, z, lerp(r, .95, .3), lerp(g, .95, .3), lerp(b, 1, .3),
        .70 + highlight * 4.5, (.045 + highlight * .48) * attenuation);
    }
    // Sparse above-plane stars give parallax and volume when viewed edge-on.
    for (let i = 0; i < 1600; i++) {
      const r = Math.pow(random(), .7) * 6, a = random() * TAU;
      points.push(Math.cos(a)*r, gaussian()*(.10+.48*Math.exp(-r*.7)), Math.sin(a)*r,
        .72,.80,1, .75+Math.pow(random(),7)*4, .075+random()*.10);
    }
    for (let i = 0; i < (coarse ? 1400 : 2400); i++) {
      const r=Math.pow(random(),1.6)*1.8, a=random()*TAU;
      points.push(Math.cos(a)*r,gaussian()*.26*Math.exp(-r*.6),Math.sin(a)*r,
        1,.88,.70,.70+random()*1.6,.045+random()*.08);
    }
    stars.length = points.length;
    for (let i = 0; i < points.length; i++) stars[i] = points[i];
    return new Float32Array(points);
  }

  function setupGL() {
    function compile(type, source) {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vertex, fragment) {
      const p = gl.createProgram(), vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    }
    const transform = `
      uniform float uYaw, uPitch, uDistance, uAspect, uRoll, uNear, uFraming;
      uniform vec3 uCenter,uAnchor;
      vec3 view(vec3 p) {
        p-=uCenter;
        float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
        vec3 v=vec3(p.x*cy-p.z*sy,p.y,p.x*sy+p.z*cy);
        v=vec3(v.x,v.y*cp-v.z*sp,v.y*sp+v.z*cp-uDistance);
        float cr=cos(uRoll),sr=sin(uRoll);
        return vec3(v.x*cr-v.y*sr,v.x*sr+v.y*cr,v.z);
      }
      vec4 project(vec3 v){return vec4(v.x*2.41421356/uAspect,v.y*2.41421356-v.z*uFraming,-v.z*1.000002-uNear*2.,-v.z);}
    `;
    // Deform both the textured mesh and its stars in the same material space.
    // Rest only changes radius slightly. Angular deformation comes from input;
    // rotation speed pulls the outer arms inward while preserving the core.
    const liquidFlow = `
      uniform float uBreath,uCompression,uFlowPull;
      vec3 flow(vec3 p){
        float r=length(p.xz);
        float envelope=smoothstep(.3,1.6,r)*(1.-smoothstep(7.,8.5,r));
        float curl=envelope*uFlowPull*(.12+r*.10);
        float c=cos(curl),s=sin(curl);
        vec2 xz=vec2(p.x*c-p.z*s,p.x*s+p.z*c);
        float pull=.06+.24*smoothstep(.5,7.,r);
        xz*=(1.+uBreath*envelope)*(1.-uCompression*pull);
        float lift=uBreath*2.6*envelope;
        return vec3(xz.x,p.y*(1.-uCompression*.16)+lift,xz.y);
      }
    `;
    const pointProgram = program(`
      precision highp float;
      attribute vec3 aPosition,aColor;
      attribute float aSize,aStrength;
      uniform float uDpr,uBackground,uTime,uEnergy,uLocal,uZoom,uJourney;
      varying vec3 vColor;
      varying float vStrength,vSparkle;
      ${transform}
      ${liquidFlow}
      void main(){
        vec3 v=view(uBackground>.5?aPosition:(uLocal>.5?aPosition+uAnchor:flow(aPosition)));
        if(uBackground>0.5){
          vec2 drift=vec2(sin(uYaw*0.3)*0.07,(uPitch-0.73)*0.045);
          gl_Position=vec4(mod(aPosition.xy+drift+1.0,2.0)-1.0,0.99,1.0);
          gl_PointSize=aSize*uDpr*(1.15+uEnergy*.28);
        }else{
          gl_Position=project(v);
          float stellarScale=mix(20.,2.8,smoothstep(.035,.28,uJourney));
          gl_PointSize=clamp(aSize*uDpr*(uLocal>.5?.024:stellarScale)/max(-v.z,.00001),.65,uLocal>.5?7.:12.);
          if(-v.z<uNear)gl_PointSize=0.;
        }
        float shimmer=sin(uTime*.65+dot(aPosition,vec3(11.7,23.1,7.9)));
        vColor=aColor;vStrength=aStrength*(uLocal>.5?smoothstep(.08,.5,1.-uZoom):1.)*(1.+shimmer*.16+uEnergy*.28);vSparkle=smoothstep(3.0,7.0,aSize);
      }
    `, `
      precision mediump float;
      varying vec3 vColor;
      varying float vStrength,vSparkle;
      void main(){
        vec2 p=gl_PointCoord*2.0-1.0;float r2=dot(p,p);if(r2>1.0)discard;
        float core=exp(-r2*8.0),halo=exp(-r2*2.5)*0.065;
        float rays=(exp(-abs(p.x)*30.0)+exp(-abs(p.y)*30.0))*exp(-r2*3.0)*vSparkle*0.15;
        gl_FragColor=vec4(vColor*(core+halo+rays)*vStrength,1.0);
      }
    `);
    const diskProgram = program(`
      precision highp float;
      attribute vec3 aPosition;varying vec2 vDisk;uniform float uLayer;
      ${transform}
      ${liquidFlow}
      void main(){
        vDisk=aPosition.xz;
        vec3 p=aPosition;float r=length(p.xz);
        p.y+=uLayer*(0.045+0.26*exp(-r*r*0.55));
        p.y+=sin(atan(p.z,p.x)*2.0+r*0.55)*0.085*min(r/4.0,1.0);
        gl_Position=project(view(flow(p)));
      }
    `, `
      precision highp float;
      varying vec2 vDisk;
      uniform sampler2D uTexture;
      uniform float uTextureMix,uLayerWeight,uDiskDetail;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*0.53+noise(p*2.03+13.1)*0.27+noise(p*4.09+27.7)*0.13+noise(p*8.21)*0.07;}
      void main(){
        vec2 p=vDisk;float r=length(p),edge=1.0-smoothstep(5.4,8.0,r);if(edge<=0.0)discard;
        float angle=atan(p.y,p.x),spiral=angle-log(r+0.8)*3.9;
        float turbulent=fbm(p*2.4);
        float arms=pow(0.5+0.5*cos(spiral*4.0+(turbulent-0.5)*1.35),4.0);
        float broken=smoothstep(0.18,0.82,fbm(p*5.0+3.7));
        float lane=pow(0.5+0.5*cos(spiral*4.0-0.8),9.0);
        float disk=exp(-r*0.3)*0.026;
        float clouds=arms*(0.03+broken*0.36)*(0.4+turbulent)*smoothstep(0.25,1.5,r)*(1.0-lane*0.75);
        vec3 cool=mix(vec3(0.18,0.25,0.62),vec3(0.42,0.56,0.85),broken);
        vec3 color=cool*(disk+clouds);
        color+=vec3(1.0,0.70,0.38)*exp(-r*r*1.2)*0.19;
        color+=vec3(1.0,0.91,0.72)*exp(-r*r*14.0)*0.47;
        color+=vec3(0.2,0.11,0.2)*turbulent*exp(-r*0.6)*0.028;
        vec2 uv=vDisk/17.0+0.5;
        vec3 photo=texture2D(uTexture,uv).rgb;
        float photoEdge=1.0-smoothstep(7.5,8.45,r);
        photo=max(photo-vec3(0.004),vec3(0.0))*photoEdge;
        // A small lift preserves dusty midtones without clipping the luminous core.
        photo=pow(photo,vec3(0.93))*0.93;
        color=mix(color*edge,photo,uTextureMix);
        gl_FragColor=vec4(color*uLayerWeight*uDiskDetail,1.0);
      }
    `);
    const glowProgram = program(`
      precision highp float;attribute vec2 aPosition;varying vec2 vUv;
      void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.9,1.0);}
    `, `
      precision mediump float;varying vec2 vUv;uniform float uAspect,uZoom,uRoll,uEnergy,uJourney,uYaw,uPitch;
      void main(){
        vec2 p=vUv*vec2(uAspect,1.0);float c=cos(uRoll),s=sin(uRoll);
        p=vec2(p.x*c+p.y*s,-p.x*s+p.y*c)*uZoom;
        float glow=exp(-dot(p*vec2(2.4,4.2),p*vec2(2.4,4.2)));
        float space=exp(-dot(p*vec2(0.65,0.95),p*vec2(0.65,0.95)));
        float core=exp(-dot(p*vec2(3.2,5.0),p*vec2(3.2,5.0)));
        vec3 haze=vec3(.008,.016,.041)*glow+vec3(.003,.004,.012)*space;
        haze+=vec3(.085,.045,.018)*core*(.35+uEnergy*.8);
        vec2 band=vUv+vec2(sin(uYaw)*.45,(uPitch-.7)*.32);
        float lane=exp(-pow((band.y+band.x*.36)*3.2,2.));
        vec3 inside=vec3(.001,.002,.005)+vec3(.007,.009,.018)*lane;
        gl_FragColor=vec4(mix(vec3(.001,.002,.005)+haze,inside,smoothstep(.2,.65,uJourney)),1.0);
      }
    `);
    // Integrate light through a 3D density field for grazing views and close approach.
    // The wide view keeps its photograph; it resolves into volume before it stretches.
    const volumeProgram=program(`
      attribute vec2 aPosition;varying vec2 vUv;
      void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.,1.);}
    `,`
      precision highp float;varying vec2 vUv;
      uniform sampler2D uTexture,uNoise;
      uniform float uFogStrength,uTextureMix;
      ${transform}
      ${liquidFlow}
      vec3 unview(vec3 p){
        float cr=cos(uRoll),sr=sin(uRoll),cp=cos(uPitch),sp=sin(uPitch),cy=cos(uYaw),sy=sin(uYaw);
        p=vec3(p.x*cr+p.y*sr,-p.x*sr+p.y*cr,p.z);
        p=vec3(p.x,p.y*cp+p.z*sp,-p.y*sp+p.z*cp);
        return vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
      }
      float volumeNoise(vec3 p){
        p=mod(p,32.);float slice=floor(p.z),next=mod(slice+1.,32.);
        vec2 xy=p.xy+.5;
        vec2 a=(vec2(mod(slice,8.),floor(slice/8.))*33.+xy)/vec2(264.,132.);
        vec2 b=(vec2(mod(next,8.),floor(next/8.))*33.+xy)/vec2(264.,132.);
        return mix(texture2D(uNoise,a).r,texture2D(uNoise,b).r,fract(p.z));
      }
      vec3 materialPoint(vec3 p){
        float r=length(p.xz),envelope=smoothstep(.3,1.6,r)*(1.-smoothstep(7.,8.5,r));
        float scale=(1.+uBreath*envelope)*(1.-uCompression*(.06+.24*smoothstep(.5,7.,r)));
        p.xz/=max(.5,scale);r=length(p.xz);
        float angle=-envelope*uFlowPull*(.12+r*.10),c=cos(angle),s=sin(angle);
        p.xz=vec2(p.x*c-p.z*s,p.x*s+p.z*c);
        p.y=(p.y-uBreath*2.6*envelope)/(1.-uCompression*.16);
        return p;
      }
      void main(){
        vec3 eye=uCenter+unview(vec3(0.,0.,uDistance));
        vec3 ray=normalize(unview(vec3(vUv.x*uAspect/2.41421356,(vUv.y-uFraming)/2.41421356,-1.)));
        vec3 inv=1./(ray+vec3(.0000001));
        vec3 a=(vec3(-9.,-1.6,-9.)-eye)*inv,b=(vec3(9.,1.6,9.)-eye)*inv;
        vec3 lo=min(a,b),hi=max(a,b);
        float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));
        if(end<=start){gl_FragColor=vec4(0.);return;}
        float stepSize=(end-start)/${coarse?'16.':'24.'};
        float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        vec3 light=vec3(0.);float transmission=1.;
        for(int i=0;i<${coarse?'16':'24'};i++){
          vec3 p=materialPoint(eye+ray*(start+(float(i)+jitter)*stepSize));
          float r=length(p.xz),edge=1.-smoothstep(6.4,8.4,r);
          vec3 photo=texture2D(uTexture,p.xz/17.+.5).rgb;
          float luminance=dot(photo,vec3(.2126,.7152,.0722));
          float warp=sin(atan(p.z,p.x)*2.+r*.55)*.085*min(r/4.,1.);
          float thickness=.15+.44*exp(-r*.65);
          float height=(p.y-warp)/thickness;
          float n=volumeNoise(p*vec3(1.7,4.8,1.7)+32.);
          float grain=volumeNoise(p*vec3(6.,8.,6.)+11.);
          float density=luminance*4.2*edge*exp(-height*height)*(.22+1.8*smoothstep(.15,.8,n))*(.45+.55*grain);
          float opacity=1.-exp(-density*stepSize*1.35);
          vec3 tint=clamp(photo/max(.018,luminance),vec3(0.),vec3(2.6));
          vec3 emission=tint*vec3(.14,.16,.20)*(.85+n*.3);
          light+=transmission*opacity*emission;transmission*=1.-opacity;
        }
        gl_FragColor=vec4(light*uFogStrength*uTextureMix,1.);
      }
    `);
    const volumeCopyProgram=program(`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`,`
      precision mediump float;varying vec2 vUv;uniform sampler2D uSource;
      void main(){gl_FragColor=texture2D(uSource,vUv);}
    `);
    const volumePosition=gl.getAttribLocation(volumeProgram,'aPosition'),volumeCopyPosition=gl.getAttribLocation(volumeCopyProgram,'aPosition'),volumeCopySource=gl.getUniformLocation(volumeCopyProgram,'uSource');
    function buffer(data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b;}
    const starsBuffer=buffer(stars),skyBuffer=buffer(sky);
    const nearby=[];
    for(let i=0;i<(coarse?650:1200);i++){
      const r=Math.exp(lerp(Math.log(.035),Math.log(1.9),random())),a=random()*TAU,h=(random()*2-1)*.7;
      const plane=Math.sqrt(1-h*h),bright=Math.pow(random(),6);
      nearby.push(Math.cos(a)*r*plane,h*r,Math.sin(a)*r*plane,.68+random()*.3,.76+random()*.2,1,.4+bright*1.1,.14+random()*.25);
    }
    const nearbyBuffer=buffer(nearby);
    const diskMesh=[], cells=48, extent=8.5;
    for(let row=0;row<cells;row++)for(let col=0;col<cells;col++){
      const x=-extent+col*extent*2/cells,z=-extent+row*extent*2/cells,step=extent*2/cells;
      diskMesh.push(x,0,z,x+step,0,z,x,0,z+step,x,0,z+step,x+step,0,z,x+step,0,z+step);
    }
    const diskBuffer=buffer(diskMesh);
    const screenBuffer=buffer([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
    const uniforms=new Map();
    [pointProgram,diskProgram,glowProgram,volumeProgram].forEach(p=>{const u={};['uNoise','uFogStrength','uAnchor','uNear','uFraming','uLocal','uDiskDetail','uJourney','uCenter','uYaw','uPitch','uDistance','uAspect','uRoll','uDpr','uBackground','uZoom','uTexture','uTextureMix','uLayer','uLayerWeight','uEnergy','uTime','uBreath','uCompression','uFlowPull'].forEach(key=>u[key]=gl.getUniformLocation(p,key));uniforms.set(p,u);});
    let textureBlend=0,textureReady=false;
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    // Seamless 32³ scalar noise, packed in a tiny bilinearly filtered slice atlas.
    const voxels=new Uint8Array(32*32*32),atlas=new Uint8Array(264*132*4);
    for(let i=0;i<voxels.length;i++)voxels[i]=Math.floor(random()*256);
    for(let z=0;z<32;z++)for(let y=0;y<33;y++)for(let x=0;x<33;x++){
      const offset=((Math.floor(z/8)*33+y)*264+(z%8)*33+x)*4,value=voxels[(z*32+y%32)*32+x%32];
      atlas[offset]=atlas[offset+1]=atlas[offset+2]=value;atlas[offset+3]=255;
    }
    const noiseTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,264,132,0,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    const galaxyImage=new Image();
    galaxyImage.onload=()=>{
      if(gl.isContextLost())return;
      const surface=document.createElement('canvas');surface.width=surface.height=coarse?1024:2048;
      surface.getContext('2d').drawImage(galaxyImage,0,0,surface.width,surface.height);
      gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);
      gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
      if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      gl.bindBuffer(gl.ARRAY_BUFFER,starsBuffer);gl.bufferData(gl.ARRAY_BUFFER,sampleStellarCloud(galaxyImage),gl.STATIC_DRAW);
      textureReady=true;canvas.dataset.detail='high';wake();
    };
    galaxyImage.onerror=()=>{canvas.dataset.detail='procedural';};
    galaxyImage.src='assets/galaxy-face-on-v2.webp';
    const pa=['aPosition','aColor','aSize','aStrength'].map(n=>gl.getAttribLocation(pointProgram,n));
    const da=gl.getAttribLocation(diskProgram,'aPosition'),ga=gl.getAttribLocation(glowProgram,'aPosition'),enabled=new Set();
    function attributes(descriptors){
      const next=new Set(descriptors.map(d=>d[0]));
      enabled.forEach(i=>{if(!next.has(i)){gl.disableVertexAttribArray(i);enabled.delete(i);}});
      descriptors.forEach(([location,size,stride,offset])=>{gl.enableVertexAttribArray(location);enabled.add(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,stride,offset);});
    }
    function use(p){
      gl.useProgram(p);const u=uniforms.get(p);
      const volumeBlend=postAvailable?Math.max(smoothstep(.015,.15,journey),1-smoothstep(.2,.58,pitch)):0;
      gl.uniform1f(u.uYaw,yaw);gl.uniform1f(u.uPitch,pitch);gl.uniform1f(u.uDistance,worldDistance);gl.uniform3fv(u.uCenter,center);gl.uniform3fv(u.uAnchor,solarAnchor);gl.uniform1f(u.uNear,Math.max(.0000001,worldDistance*.0002));gl.uniform1f(u.uFraming,worldFraming);gl.uniform1f(u.uJourney,journey);gl.uniform1f(u.uDiskDetail,(1-volumeBlend)*(1-smoothstep(.28,.68,journey)));gl.uniform1f(u.uFogStrength,volumeBlend*(1-smoothstep(.42,.72,journey)));gl.uniform1f(u.uLocal,0);
      gl.uniform1f(u.uAspect,width/height);gl.uniform1f(u.uRoll,cameraRoll);gl.uniform1f(u.uDpr,dpr);gl.uniform1f(u.uZoom,zoom);
      gl.uniform1f(u.uEnergy,effectEnergy);gl.uniform1f(u.uTime,motion.matches?0:effectTime);
      gl.uniform1f(u.uBreath,breath);gl.uniform1f(u.uCompression,compression);gl.uniform1f(u.uFlowPull,flowPull);
      return u;
    }
    const pointLayout=[[pa[0],3,32,0],[pa[1],3,32,12],[pa[2],1,32,24],[pa[3],1,32,28]];
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    // A small quarter-resolution glow pass preserves crisp stars and softens only light.
    const postVertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
    const blurProgram=program(postVertex,`
      precision mediump float;varying vec2 vUv;uniform sampler2D uSource;
      uniform vec2 uStep;uniform float uExtract;
      void main(){
        vec3 c=texture2D(uSource,vUv).rgb*.227027;
        c+=(texture2D(uSource,vUv+uStep*1.384615).rgb+texture2D(uSource,vUv-uStep*1.384615).rgb)*.316216;
        c+=(texture2D(uSource,vUv+uStep*3.230769).rgb+texture2D(uSource,vUv-uStep*3.230769).rgb)*.070270;
        if(uExtract>.5)c*=smoothstep(.075,.48,max(c.r,max(c.g,c.b)));
        gl_FragColor=vec4(c,1.);
      }
    `);
    const compositeProgram=program(postVertex,`
      precision highp float;varying vec2 vUv;uniform sampler2D uScene,uBloom;
      uniform vec2 uMotion;uniform float uEnergy,uAspect,uPitch,uRoll,uTeleport;
      // Reproject the galaxy plane along the orbit: light follows the rotation,
      // while a sharp current-frame sample keeps the dust lanes legible.
      vec2 orbitUv(float shutter){
        vec2 p=(vUv*2.-1.)*vec2(uAspect,1.);
        float cr=cos(uRoll),sr=sin(uRoll);
        p=vec2(p.x*cr+p.y*sr,-p.x*sr+p.y*cr)/2.41421356;
        float cp=cos(uPitch),sp=sin(uPitch);
        float denom=sp-p.y*cp;
        if(denom<.10)return vUv;
        float z=-p.y/denom,x=p.x*(1.-z*cp);
        float angle=uMotion.x*shutter,c=cos(angle),s=sin(angle);
        vec2 q=vec2(x*c-z*s,x*s+z*c);
        float tilt=uPitch+uMotion.y*shutter,depth=max(.2,1.-q.y*cos(tilt));
        vec2 projected=vec2(q.x,-q.y*sin(tilt))*2.41421356/depth;
        projected=vec2(projected.x*cr-projected.y*sr,projected.x*sr+projected.y*cr);
        return projected/vec2(uAspect,1.)*.5+.5;
      }
      void main(){
        vec3 base=texture2D(uScene,vUv).rgb,light=texture2D(uBloom,vUv).rgb;
        vec3 streak=base;
        if(uEnergy>.001){
          streak=vec3(0.);
          for(int i=1;i<=7;i++){
            float t=float(i)/7.;vec2 uv=orbitUv(t);
            streak+=texture2D(uScene,uv).rgb*(1.-t*.7);
          }
          streak/=4.2;
        }
        vec3 color=mix(base,streak,.32*uEnergy);
        if(uTeleport>.001){vec3 warp=vec3(0.);for(int i=1;i<=5;i++){float t=float(i)/5.;vec2 uv=.5+(vUv-.5)*(1.-t*uTeleport*.48);warp+=texture2D(uScene,uv).rgb*(1.-t*.55);}color=mix(color,warp/3.35,.6*uTeleport);color+=vec3(.035,.07,.13)*uTeleport*exp(-length((vUv-.5)*vec2(uAspect,1.))*3.);}

        color+=light*(.58+uEnergy*.62)*(1.-base*.6);
        // A cool, short-lived light trail blooms over the warm stellar core.
        color+=max(streak-base*.65,vec3(0.))*vec3(.12,.23,.42)*uEnergy;
        float peak=max(color.r,max(color.g,color.b));
        if(peak>.70)color*=(.70+.30*(1.-exp(-(peak-.70)/.30)))/peak;
        gl_FragColor=vec4(color,1.);
      }
    `);
    const blurLocations={position:gl.getAttribLocation(blurProgram,'aPosition'),source:gl.getUniformLocation(blurProgram,'uSource'),step:gl.getUniformLocation(blurProgram,'uStep'),extract:gl.getUniformLocation(blurProgram,'uExtract')};
    const compositeLocations={position:gl.getAttribLocation(compositeProgram,'aPosition'),scene:gl.getUniformLocation(compositeProgram,'uScene'),bloom:gl.getUniformLocation(compositeProgram,'uBloom')};
    for(const name of ['uMotion','uEnergy','uAspect','uPitch','uRoll','uTeleport'])compositeLocations[name]=gl.getUniformLocation(compositeProgram,name);
    let targets=[],postAvailable=false;
    function renderTarget(w,h){
      const texture=gl.createTexture(),framebuffer=gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      return {texture,framebuffer,w,h,valid:gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE};
    }
    resizeRenderer=()=>{
      targets.forEach(t=>{gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.framebuffer);});
      const smallW=Math.max(1,Math.round(canvas.width/4)),smallH=Math.max(1,Math.round(canvas.height/4));
      targets=[renderTarget(canvas.width,canvas.height),renderTarget(smallW,smallH),renderTarget(smallW,smallH),renderTarget(Math.max(1,Math.round(canvas.width*.42)),Math.max(1,Math.round(canvas.height*.42)))];
      postAvailable=targets.every(t=>t.valid);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
      canvas.dataset.glow=postAvailable?'orbital':'direct';
    };
    function blur(source,destination,x,y,extract){
      gl.bindFramebuffer(gl.FRAMEBUFFER,destination.framebuffer);gl.viewport(0,0,destination.w,destination.h);
      gl.useProgram(blurProgram);gl.bindBuffer(gl.ARRAY_BUFFER,screenBuffer);attributes([[blurLocations.position,2,0,0]]);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,source.texture);gl.uniform1i(blurLocations.source,0);
      gl.uniform2f(blurLocations.step,x/source.w,y/source.h);gl.uniform1f(blurLocations.extract,extract);gl.drawArrays(gl.TRIANGLES,0,6);
    }
    draw=()=>{
      gl.bindFramebuffer(gl.FRAMEBUFFER,postAvailable?targets[0].framebuffer:null);gl.viewport(0,0,canvas.width,canvas.height);
      gl.disable(gl.BLEND);use(glowProgram);gl.bindBuffer(gl.ARRAY_BUFFER,screenBuffer);attributes([[ga,2,0,0]]);gl.drawArrays(gl.TRIANGLES,0,6);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
      let u=use(pointProgram);gl.uniform1f(u.uBackground,1);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);attributes(pointLayout);gl.drawArrays(gl.POINTS,0,sky.length/8);
      u=use(diskProgram);gl.bindBuffer(gl.ARRAY_BUFFER,diskBuffer);attributes([[da,3,0,0]]);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(u.uTexture,0);
      textureBlend=textureReady?1:0;
      gl.uniform1f(u.uTextureMix,textureBlend);
      if(journey<.68){gl.uniform1f(u.uLayer,0);gl.uniform1f(u.uLayerWeight,1);gl.drawArrays(gl.TRIANGLES,0,diskMesh.length/3);}
      if(postAvailable&&journey<.72&&(journey>.015||pitch<.58)){
        const target=targets[3];gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.viewport(0,0,target.w,target.h);gl.disable(gl.BLEND);
        u=use(volumeProgram);gl.uniform1i(u.uTexture,0);gl.uniform1f(u.uTextureMix,textureReady?1:0);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noiseTexture);gl.uniform1i(u.uNoise,1);
        gl.bindBuffer(gl.ARRAY_BUFFER,screenBuffer);attributes([[volumePosition,2,0,0]]);gl.drawArrays(gl.TRIANGLES,0,6);
        gl.bindFramebuffer(gl.FRAMEBUFFER,targets[0].framebuffer);gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
        gl.useProgram(volumeCopyProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,target.texture);gl.uniform1i(volumeCopySource,0);
        attributes([[volumeCopyPosition,2,0,0]]);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      u=use(pointProgram);gl.uniform1f(u.uBackground,0);gl.bindBuffer(gl.ARRAY_BUFFER,starsBuffer);attributes(pointLayout);gl.drawArrays(gl.POINTS,0,stars.length/8);
      if(journey>.08){gl.uniform1f(u.uLocal,1);gl.bindBuffer(gl.ARRAY_BUFFER,nearbyBuffer);attributes(pointLayout);gl.drawArrays(gl.POINTS,0,nearby.length/8);}
      if(postAvailable){
        gl.disable(gl.BLEND);
        blur(targets[0],targets[1],2,0,1);blur(targets[1],targets[2],3.2+effectEnergy*1.6,0,0);blur(targets[2],targets[1],0,3.2+effectEnergy*1.6,0);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(compositeProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER,screenBuffer);attributes([[compositeLocations.position,2,0,0]]);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].texture);gl.uniform1i(compositeLocations.scene,0);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,targets[1].texture);gl.uniform1i(compositeLocations.bloom,1);
        gl.uniform2f(compositeLocations.uMotion,-effectYaw*.075,-effectPitch*.06);
        gl.uniform1f(compositeLocations.uTeleport,0);gl.uniform1f(compositeLocations.uEnergy,effectEnergy);gl.uniform1f(compositeLocations.uAspect,width/height);
        gl.uniform1f(compositeLocations.uPitch,pitch);gl.uniform1f(compositeLocations.uRoll,cameraRoll);
        gl.drawArrays(gl.TRIANGLES,0,6);gl.activeTexture(gl.TEXTURE0);
      }
    };
    canvas.dataset.renderer='webgl';
    canvas.dataset.flow='breathing-gravity';
  }

  function setupFallback(){
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Grafički prikaz nije dostupan.');
    resizeRenderer=()=>{};
    draw=()=>{
      const w=canvas.width,h=canvas.height;ctx.fillStyle='#020309';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
      for(let i=0;i<sky.length;i+=8){ctx.fillStyle=`rgba(170,190,245,${sky[i+7]})`;ctx.fillRect((sky[i]+1)*w/2,(sky[i+1]+1)*h/2,dpr,dpr);}
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(-.2),sr=Math.sin(-.2);
      for(let i=0;i<stars.length;i+=24){
        const radius=Math.hypot(stars[i],stars[i+2]),radialScale=(1+breath)*(1-compression*(.06+.24*clamp(radius/7,0,1)));
        const px0=stars[i]*radialScale-center[0],pz0=stars[i+2]*radialScale-center[2],py0=stars[i+1]-center[1],x=px0*cy-pz0*sy,z=px0*sy+pz0*cy,y=py0*cp-z*sp,depth=worldDistance-py0*sp-z*cp;
        if(depth<.1)continue;
        const scale=h*1.2071/depth,px=(x*cr-y*sr)*scale+w/2,py=h/2-(x*sr+y*cr)*scale,size=Math.max(.65,stars[i+6]*dpr*.52);
        ctx.fillStyle=`rgba(${Math.round(stars[i+3]*255)},${Math.round(stars[i+4]*255)},${Math.round(stars[i+5]*255)},${stars[i+7]})`;
        ctx.fillRect(px,py,size,size);
      }
      ctx.globalCompositeOperation='source-over';
    };
    canvas.dataset.renderer='canvas';
  }

  function resize(){
    width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);dpr=Math.min(devicePixelRatio||1,coarse?1.25:1.6)*quality;
    el('gesture-hint').textContent=coarse?'PREVUCI ZA ROTACIJU · DVA PRSTA ZA ZUM':'PREVUCI DA OKRENEŠ · SKROLUJ DA ISTRAŽIŠ';
    const pixels=width*height*dpr*dpr;if(pixels>2000000)dpr*=Math.sqrt(2000000/pixels);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);fit=Math.max(21.8,22.4/(width/height));resizeRenderer();solar?.size(width,height,dpr);canvas.dataset.quality=quality<1?'balanced':'full';wake();
  }
  function frame(time){
    frameId=0;if(document.hidden||lost)return;
    const rawDt=previousTime?(time-previousTime)/1000:1/60,dt=Math.min(rawDt,.05);previousTime=time;
    if(rawDt<.15&&!motion.matches){qualityFrames++;slowFrames+=rawDt>.027?1:0;if(qualityFrames>=180){if(slowFrames>110&&quality>.66){quality=Math.max(.65,quality*.82);resize();}qualityFrames=slowFrames=0;}}
    if(!pointers.size){
      const damping=Math.exp(-dt*3.8),travel=(1-damping)/3.8;
      toYaw+=vx*travel;toPitch=limitPitch(toPitch+vy*travel);vx*=damping;vy*=damping;
      if(toPitch===cameraLimits.minPitch||toPitch===cameraLimits.maxPitch)vy=0;
    }
    const ease=motion.matches?1:1-Math.exp(-dt*8.5);
    const oldYaw=yaw,oldPitch=pitch;
    yaw=lerp(yaw,toYaw,ease);pitch=lerp(pitch,toPitch,ease);
    let teleportTarget=0;
    if(arrival){arrival.age=(time-arrival.start)/1000;if(arrival.age>=arrivalDuration)arrival=null;}
    if(alignment&&time-alignment.start>=alignment.duration*1000){
      toZoom=alignment.to;flight={from:Math.log(zoom),to:Math.log(toZoom),elapsed:0,start:alignment.start+alignment.duration*1000,duration:jumpDuration};alignment=null;
    }
    jumpProgress=-1;
    if(flight){
      flight.elapsed=Math.max(0,(time-flight.start)/1000);
      const t=clamp(flight.elapsed/flight.duration,0,1),e=smoothstep(.02,.86,t);
      jumpProgress=t;teleportTarget=phaseForJump(t);zoom=Math.exp(lerp(flight.from,flight.to,e));
      if(flight.to<flight.from&&shieldStart===null)shieldStart=flight.start;
      if(t===1){if(flight.to<flight.from)arrival={start:flight.start+flight.duration*1000,age:Math.max(0,(time-flight.start-flight.duration*1000)/1000)};zoom=toZoom;flight=null;jumpProgress=-1;}
    }
    else zoom=Math.exp(lerp(Math.log(zoom),Math.log(toZoom),motion.matches?1:1-Math.exp(-dt*4.5)));
    teleportEnergy=motion.matches?0:teleportTarget;
    canvas.dataset.teleport=flight||teleportEnergy>.01?'active':'idle';
    document.body.dataset.flight=alignment?'aligning':flight||teleportEnergy>.08?'active':arrival?'arrival':'idle';
    journey=clamp(Math.log(1/zoom)/Math.log(1/cameraLimits.minZoom),0,1);
    
    cameraRoll=lerp(cameraRoll,-.20+(motion.matches?0:clamp(toYaw-yaw,-.3,.3)*.018)+(breathingEnabled&&journey>.98&&!focusedBody?Math.sin(effectTime*.38)*.009:0),ease);
    effectYaw=motion.matches?0:lerp(effectYaw,clamp((yaw-oldYaw)/dt,-2.4,2.4),1-Math.exp(-dt*5));
    effectPitch=motion.matches?0:lerp(effectPitch,clamp((pitch-oldPitch)/dt,-1.2,1.2),1-Math.exp(-dt*5));
    const energyTarget=motion.matches?0:(1-smoothstep(.28,.65,journey))*clamp((Math.hypot(effectYaw,effectPitch)-.035)*1.4,0,1);
    effectEnergy=motion.matches?0:lerp(effectEnergy,energyTarget,1-Math.exp(-dt*(energyTarget>effectEnergy?10:2.7)));
    if(breathingEnabled&&!motion.matches){breathPhase=(breathPhase+dt*.75)%TAU;breath=Math.sin(breathPhase)*.012*(1-smoothstep(.28,.62,journey));effectTime+=dt;}
    compression=motion.matches?0:lerp(compression,energyTarget,1-Math.exp(-dt*(energyTarget>compression?6.5:1.8)));
    if(motion.matches){flowPull=flowVelocity=0;}
    else {
      const pullTarget=clamp(effectYaw*.42+effectPitch*.16,-.8,.8)*(1-smoothstep(.28,.65,journey));
      flowVelocity+=(pullTarget-flowPull)*24*dt;
      flowVelocity*=Math.exp(-dt*7);
      flowPull+=flowVelocity*dt;
    }
    const effectState=effectEnergy>.025?'flowing':'resting';
    if(canvas.dataset.effect!==effectState)canvas.dataset.effect=effectState;
    const shape=compression>.04?'contracted':'relaxed';
    if(canvas.dataset.shape!==shape)canvas.dataset.shape=shape;
    // One world-space camera: the local system is anchored inside the galactic arm.
    solarAnchor=flowPoint(solarPoint);
    if(alignment){const t=clamp((time-alignment.start)/1000/alignment.duration,0,1),e=t*t*t*(10+t*(-15+6*t)),target=navigationTarget();center=alignment.from.map((v,i)=>lerp(v,target[i],e));}
    else center=navigationTarget?[...navigationTarget()]:solarAnchor.map(v=>v*smoothstep(0,.4,journey));
    const systemFit=Math.max(65,66/(width/height));
    worldDistance=journey>0?fit*Math.exp(-journey*Math.log(fit/(systemFit*solarScale))):fit*zoom;
    const braking=arrival?arrival.age*1.35/arrivalDuration:-1;
    if(flight&&flight.to<flight.from)worldDistance*=1+.20*smoothstep(.66,1,jumpProgress);
    else if(braking>=0&&!motion.matches)worldDistance*=1+.20*Math.exp(-braking*4)*Math.cos(braking*4.5)*(1-smoothstep(1,1.35,braking));
    else if(breathingEnabled&&journey>.98&&!focusedBody)worldDistance*=1+Math.sin(effectTime*.6)*.004;
    worldFraming=0;
    if(solar){
      const view=solar.camera({dt,target:center.map((v,i)=>(v-solarAnchor[i])/solarScale),distance:worldDistance/solarScale,reducedMotion:motion.matches||!breathingEnabled,direct:!!flight||!!alignment||!!arrival});
      worldDistance=view.distance*solarScale;center=view.target.map((v,i)=>solarAnchor[i]+v*solarScale);worldFraming=view.framing;
    }
    // Both layers remain present. The local canvas has no separate background.
    canvas.style.opacity='1';solarCanvas.style.opacity='1';draw();
    if(solar){try{solar.render({dt,yaw,pitch,roll:cameraRoll,progress:journey,reducedMotion:motion.matches||!breathingEnabled,quality,viewPrepared:true});}catch(e){console.error('Solar frame failed:',e);solar=null;solarLoading=null;focusedBody=null;flight=null;jumpProgress=-1;planetNav.replaceChildren();el('planet-labels').replaceChildren();toZoom=1;error.textContent='Detaljan prikaz je prekinut. Pokušajte ponovo dugmetom Istraži.';error.hidden=false;}}
    drawHyperspace(time);
    shieldRenderer?.render(shieldAge,width,height,dpr);
    updateScene(flight?'travel':journey<.12?'galaxy':journey>.98&&solar?(focusedBody?'planet':'system'):'travel');
    canvas.dataset.journey=journey>.995?'arrived':journey<.005?'galaxy':'travel';canvas.dataset.navigation=alignment?'centering':flight?'jump':arrival?'braking':'continuous';
    const goal=flightOrigin();canvas.dataset.targetOffset=Math.hypot(...goal).toFixed(6);
    marker.hidden=journey>.91;
    if(!marker.hidden){
      const x=solarAnchor[0]-center[0],y=solarAnchor[1]-center[1],z=solarAnchor[2]-center[2],a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw),v=y*Math.cos(pitch)-b*Math.sin(pitch),depth=worldDistance-y*Math.sin(pitch)-b*Math.cos(pitch),cr=Math.cos(cameraRoll),sr=Math.sin(cameraRoll);
      const sx=width/2+(a*cr-v*sr)*height*1.2071/depth,sy=height/2-(a*sr+v*cr)*height*1.2071/depth;
      marker.dataset.side=sx>width-155?'left':'right';
      marker.style.transform=`translate(${(clamp(sx,22,width-22)-22).toFixed(1)}px,${(clamp(sy,100,height-150)-22).toFixed(1)}px)`;
      marker.querySelector('.marker-dot').style.opacity=(1-smoothstep(.56,.83,journey)).toFixed(3);
    }
    const unsettled=Math.abs(toYaw-yaw)+Math.abs(toPitch-pitch)+Math.abs(toZoom-zoom)+Math.abs(vx)+Math.abs(vy)>.0001;
    if(shieldAge>=0||teleportEnergy>.001||flight||alignment||arrival||breathingEnabled||pointers.size||unsettled||effectEnergy>.0001||compression>.0001||Math.abs(flowPull)+Math.abs(flowVelocity)>.0001||Math.abs(cameraRoll+.20)>.00001)frameId=requestAnimationFrame(frame);
  }
  function wake(){if(!frameId&&!document.hidden&&!lost)frameId=requestAnimationFrame(frame);}
  function interact(){wake();}
  function reset(){pendingTeleport=false;cancelTeleport();jumpGoal=[0,0];flight=journey>.2&&!motion.matches?{from:Math.log(zoom),to:0,elapsed:0,start:performance.now(),duration:jumpDuration}:null;if(flight)sound({type:'jump',duration:jumpDuration,shield:false});solar?.clearFocus();toYaw=yaw+Math.atan2(Math.sin(.25-yaw),Math.cos(.25-yaw));toPitch=.73;toZoom=1;vx=vy=0;interact();}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;if(flight||alignment)toZoom=zoom;cancelTeleport();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:e.timeStamp});vx=vy=0;lastPinch=0;canvas.classList.add('dragging');interact();
  });
  canvas.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:e.timeStamp});
    if(pointers.size===1){
      const dx=e.clientX-old.x,dy=e.clientY-old.y,elapsed=clamp((e.timeStamp-old.time)/1000,.004,.08);
      toYaw+=dx*.0042;toPitch=limitPitch(toPitch+dy*.0028);
      const weight=1-Math.exp(-elapsed*22);
      vx=motion.matches?0:lerp(vx,clamp(dx*.0042/elapsed,-1.15,1.15),weight);
      vy=motion.matches?0:lerp(vy,clamp(dy*.0028/elapsed,-.65,.65),weight);
    }
    else {const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch>0)changeZoom(Math.log(lastPinch/Math.max(distance,1))*700);lastPinch=distance;vx=vy=0;}
    interact();
  });
  function release(e){const pointer=pointers.get(e.pointerId);if(!pointer)return;if(e.type!=='pointerup'||e.timeStamp-pointer.time>100)vx=vy=0;pointers.delete(e.pointerId);lastPinch=0;if(!pointers.size)canvas.classList.remove('dragging');interact();}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1));},{passive:false});
  canvas.addEventListener('dblclick',reset);
  canvas.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    switch(e.key){
      case 'ArrowLeft':toYaw-=.12;break;case 'ArrowRight':toYaw+=.12;break;
      case 'ArrowUp':toPitch=limitPitch(toPitch+.09);break;case 'ArrowDown':toPitch=limitPitch(toPitch-.09);break;
      case '+':case '=':changeZoom(-160);break;case '-':case '_':changeZoom(160);break;
      case 'Home':reset();break;case ' ':toggleMotion();break;default:return;
    }
    e.preventDefault();vx=vy=0;interact();
  });
  el('enter-solar').addEventListener('click',enterSolar);marker.addEventListener('click',enterSolar);
  for(const button of [el('enter-solar'),marker]){button.addEventListener('pointerenter',ensureSolar);button.addEventListener('focus',ensureSolar);}
  for(const id of ['brand-home','back-galaxy','reset-view'])el(id).addEventListener('click',reset);
  el('back-system').addEventListener('click',()=>{solar?.clearFocus();toZoom=.06;wake();});
  el('zoom-in').addEventListener('click',()=>changeZoom(-260));el('zoom-out').addEventListener('click',()=>changeZoom(260));
  el('motion-toggle').addEventListener('click',toggleMotion);
  el('about-toggle').addEventListener('click',()=>{const panel=el('about-panel');panel.hidden=!panel.hidden;el('about-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){el('about-panel').hidden=true;el('about-toggle').setAttribute('aria-expanded','false');if(focusedBody)solar.clearFocus();wake();}});
  addEventListener('resize',resize);
  addEventListener('blur',()=>{pointers.clear();vx=vy=0;canvas.classList.remove('dragging');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else{previousTime=0;wake();}});
  motion.addEventListener('change',()=>{breathingEnabled=!motion.matches;el('motion-toggle').setAttribute('aria-pressed',String(!breathingEnabled));el('motion-toggle').textContent=breathingEnabled?'Pauziraj blage animacije':'Nastavi blage animacije';vx=vy=effectYaw=effectPitch=effectEnergy=breath=compression=flowPull=flowVelocity=0;wake();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frameId);frameId=0;});
  canvas.addEventListener('webglcontextrestored',()=>{try{setupGL();lost=false;resize();}catch(e){error.textContent='Prikaz je prekinut. Osvežite stranicu da ponovo otvorite galaksiju.';error.hidden=false;}});
  try{if(gl)setupGL();else setupFallback();resize();canvas.dataset.ready='true';}
  catch(e){console.error('Galaxy initialization failed:',e);error.textContent='Galaksija nije mogla da se pokrene. Pokušajte da osvežite stranicu ili otvorite drugi pregledač.';error.hidden=false;}
})();





