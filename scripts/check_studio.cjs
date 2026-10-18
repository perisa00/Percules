'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=['gym-workout.js','space-gym.js','space-studio.js','generated-rock.js','space-debris.js','solar.js'].map(file=>fs.readFileSync('public/'+file,'utf8').replace(/^import .*;\r?\n/gm,'')).join('\n');
const shaderPairs=[],draws=[],uploads=[],gymUniforms=[],viewUniforms=new Map();
let currentSources=[],id=0;const textureRequests=[],mapUsage=[];
const gl=new Proxy({
VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
getExtension:()=>({}),createProgram:()=>({shaders:[]}),createShader:type=>({type}),
shaderSource:(s,text)=>{s.source=text;},attachShader:(p,s)=>p.shaders.push(s),
linkProgram:p=>shaderPairs.push(p.shaders),getShaderParameter:()=>true,getProgramParameter:()=>true,
getAttribLocation:(p,name)=>name==='aUv'?1:0,getUniformLocation:(p,name)=>({name}),uniform3fv:(u,v)=>{viewUniforms.set(u.name,Array.from(v));if(u.name==='uOffset')gymUniforms.push(Array.from(v));},uniform1f:(u,v)=>{viewUniforms.set(u.name,v);if(u.name==='uAngle')gymUniforms.push(v);if(u.name==='uHasMap')mapUsage.push(v);},
uniformMatrix4fv:(u,transpose,v)=>{if(u.name==='uModel')gymUniforms.push(Array.from(v));},
bufferSubData:(target,offset,data)=>uploads.push(Array.from(data)),createBuffer:()=>({}),createTexture:()=>({}),drawElements:(...args)=>draws.push(args),drawArrays:(...args)=>draws.push(args),
}, {get:(object,key)=>key in object?object[key]:()=>{}});
function element(){return {dataset:{},style:{setProperty(name,value){this[name]=value;}},children:[],listeners:{},hidden:false,
setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},
append(child){this.children.push(child);},getContext:()=>gl};}
const labels=element(),emblem=element(),canvas=element(),selections=[],previews=[],portals=[],externalLinks=[];
let fallbackDraws=0;
const fallbackCanvas=element(),fallback2d=new Proxy({createRadialGradient:()=>({addColorStop(){}}),fill(){fallbackDraws++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
fallbackCanvas.getContext=()=>fallback2d;
const context={Math,Map,Set,Float32Array,Uint16Array,Uint8Array,
document:{getElementById:id=>id==='planet-labels'?labels:id==='solar-fallback'?fallbackCanvas:emblem,createElement:element},
Image:function(){textureRequests.push(this);}};
vm.createContext(context);
vm.runInContext(source.replace(/export /g,'')+'\nglobalThis.api={createSolar,worlds,bodies};',context);
const {createSolar,worlds}=context.api;
const debris=vm.runInContext('createDebrisGeometry(true)',context),debrisDesktop=vm.runInContext('createDebrisGeometry(false)',context);
assert.equal(debris.instances,5);assert.equal(debrisDesktop.instances,9);assert.ok(debris.count/3<4200,'Phone debris must stay below 4200 triangles in one batch');assert.ok(debris.data.every(Number.isFinite));
for(let i=0;i<debris.data.length;i+=9)assert.ok(Math.abs(Math.hypot(...debris.data.slice(i+3,i+6))-1)<.001);
const provenance=JSON.parse(fs.readFileSync('public/assets/debris/provenance.json','utf8'));
assert.equal(provenance.generator,'TRELLIS.2');assert.ok(provenance.triangles<1000&&provenance.sourceTriangles>400000);assert.ok(fs.statSync('public/generated-rock.js').size<45000);
assert.equal(Object.keys(worlds).length,8);assert.equal(worlds.milica.length,4);
const gymMeshes=vm.runInContext('createGymGeometry()',context);
const smallGym=vm.runInContext('createGymGeometry({lowDetail:true})',context);
const faces=list=>list.reduce((n,mesh)=>n+mesh.data.length/30,0);
assert.ok(faces(smallGym)<faces(gymMeshes)*.3,'CPU fallback must contain less than 30% of the full triangle count');
console.log('Gym triangles: full='+faces(gymMeshes)+', fallback='+faces(smallGym));
assert.deepEqual(Array.from(gymMeshes.filter(mesh=>!mesh.motion),mesh=>mesh.id).sort(),['bench','cardio','earth','room','stretch','sun']);
assert.equal(gymMeshes.filter(mesh=>mesh.motion==='belt').length,24,'Both treadmill belts need moving treads');
assert.ok(gymMeshes.some(mesh=>mesh.part==='handL')&&gymMeshes.some(mesh=>mesh.part==='handR'),'The trainer needs articulated hands for each station');
for(const mesh of gymMeshes){
  assert.equal(mesh.data.length%30,0,'Gym buffers must contain complete triangles');
  assert.ok(mesh.data.every(Number.isFinite),'Gym vertices must be finite');
  for(let i=0;i<mesh.data.length;i+=10){
    assert.ok(Math.abs(Math.hypot(...mesh.data.slice(i+3,i+6))-1)<.001,'Lighting requires unit normals');
    assert.ok(mesh.data[i+6]>mesh.data[i+8]&&mesh.data[i+8]>mesh.data[i+7],'Every gym material must stay pink');
  }
}
for(const [id,list] of Object.entries(worlds)){
assert.equal(list.length,4,'Each main destination must have its own world');
assert.equal(new Set(list.map(b=>b.id)).size,list.length);
for(const b of list){assert.ok(b.position.every(Number.isFinite));assert.ok(b.radius>0);}
}
const solar=createSolar(canvas,{onSelect:body=>selections.push(body?.id||null),onHover:detail=>previews.push(detail),onDestination:world=>portals.push(world),onExternal:url=>externalLinks.push(url)});
assert.equal(textureRequests.length,0,'Idle renderer creation must not fetch planet textures');
solar.size(390,844,1.25);
assert.equal(labels.children.length,4);assert.equal(solar.worldId(),'studio');
solar.setWorld('contact');solar.select('venus');assert.equal(solar.focusId(),'venus');
assert.ok(textureRequests.some(image=>image.src==='/assets/solar/venus.webp'),'A selected planet must request its high-resolution surface');
for(const image of textureRequests){assert.ok(fs.existsSync('public'+image.src),'A mapped surface must exist');image.onload();}
solar.camera({dt:1/60,target:[0,0,0],distance:80,reducedMotion:true});mapUsage.length=0;solar.render({dt:1/60,yaw:.25,pitch:.73,progress:1,reducedMotion:true,viewPrepared:true});assert.ok(mapUsage.some(v=>v===1),'Actual planet maps must reach the surface shader');
solar.select('invalid');assert.equal(solar.focusId(),'venus');
for(const rate of [30,60,120]){
solar.setWorld('milica');solar.clearFocus();solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:true});
solar.select('cardio');let camera;
for(let i=0;i<rate*3;i++)camera=solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:false});
assert.ok(camera.target.every(Number.isFinite));assert.ok(camera.distance>0);
const expected=worlds.milica.find(b=>b.id==='cardio').position;
for(let i=0;i<3;i++)assert.ok(Math.abs(camera.target[i]-expected[i])<.001);
assert.ok(Math.abs(camera.framing-.4)<.001);
}
solar.render({dt:1/60,yaw:.25,pitch:.73,roll:-.2,progress:1,reducedMotion:false,viewPrepared:true});
assert.ok(draws.length>0);assert.equal(solar.setWorld('invalid'),false);
solar.setWorld('studio');assert.equal(solar.setWorld('milica'),true);assert.equal(solar.isFocused(),false);
assert.equal(labels.children.length,0);assert.equal(canvas.dataset.world,'milica');
solar.camera({dt:1/60,target:[0,0,0],distance:80,reducedMotion:true});
solar.render({dt:1/60,yaw:.25,pitch:.73,progress:1,reducedMotion:true,viewPrepared:true});
assert.equal(emblem.hidden,true);
const gymFrame=reduced=>{gymUniforms.length=0;solar.render({dt:.25,yaw:.25,pitch:.73,progress:1,reducedMotion:reduced,viewPrepared:true});return JSON.stringify(gymUniforms);};
const movingA=gymFrame(false),movingB=gymFrame(false);assert.notEqual(movingA,movingB,'Belt and weight poses must advance');
assert.equal(gymFrame(true),movingB,'Reduced motion and pause must freeze equipment and trainer');
assert.equal(gymFrame(true),movingB,'A paused frame must not reset the pose');
solar.pauseWorkout();assert.equal(gymFrame(false),movingB,'The workout pause freezes the whole routine');
solar.stepWorkout(1);assert.equal(canvas.dataset.exercise,'curls');gymFrame(false);assert.equal(canvas.dataset.exercise,'bench');
solar.stepWorkout(-1);gymFrame(false);assert.equal(canvas.dataset.exercise,'curls');solar.pauseWorkout();
solar.hover('sun');assert.equal(previews.at(-1),null,'No hover panels should cover the gym');
solar.activate('cardio',true);assert.equal(solar.focusId(),'cardio','Gym controls should work with one tap');
solar.zoom(2500);assert.equal(solar.isFocused(),false);
for(const region of ['studio','websites','apps','support','process','contact','generator']){
solar.setWorld(region);assert.equal(labels.children.length,worlds[region].length);solar.select(worlds[region][1].id);
solar.camera({dt:.016,target:[0,0,0],distance:80,reducedMotion:true});
solar.render({dt:.016,yaw:-.65,pitch:.32,progress:1,reducedMotion:false,viewPrepared:true});
}
const html=fs.readFileSync('public/index.html','utf8');
for(const body of Object.values(worlds).flat().filter(body=>!body.destination))assert.ok(html.includes('data-content="'+body.content+'"'),body.id+' content missing');
assert.ok(html.includes('data-content="milica"'));
assert.ok(html.includes('mailto:aleksa.perisic2000@gmail.com'));
assert.ok(html.includes('tel:+381695312480'));
const galaxy=fs.readFileSync('public/galaxy.js','utf8');
assert.ok(galaxy.includes('solar.setWorld(worldFlight.world)'));
assert.ok(galaxy.includes("shieldStart=worldFlight.start+400"));
assert.ok(galaxy.includes('if(!frameId&&('),'Only one animation loop may be scheduled');
solar.setWorld('apps');solar.clearFocus();solar.size(1280,720,1);
const overview=solar.camera({dt:.016,target:[0,0,0],distance:44,reducedMotion:true});
solar.render({dt:.016,yaw:.25,pitch:.73,roll:0,progress:1,reducedMotion:true,viewPrepared:true});
solar.probe(640,360);assert.equal(previews.at(-1).body.id,'sun');
assert.equal(previews.at(-1).body.headline,'Od ideje do iskustva koje radi.');
assert.equal(solar.isFocused(),false,'Hover must not select a body');
assert.deepEqual(solar.camera({dt:.016,target:[0,0,0],distance:44,reducedMotion:true}),overview,'Hover must not move the camera');
for(const body of solar.getBodies()){solar.hover(body.id);assert.equal(previews.at(-1).body.id,body.id);assert.equal(solar.isFocused(),false);}
solar.activate('uranus',true);assert.equal(solar.isFocused(),false,'First touch only previews');
solar.activate('uranus',true);assert.equal(solar.focusId(),'uranus','Second touch opens details');
solar.clearFocus();solar.hover('uranus');solar.activate('uranus',true);assert.equal(solar.isFocused(),false,'Keyboard/browser focus must not skip the first touch');
solar.activate('uranus');assert.equal(solar.focusId(),'uranus');
solar.clearFocus();solar.zoom(-3000);assert.equal(solar.isFocused(),false,'Overview zoom must not auto-select');
assert.equal(worlds.projects,undefined,'The old project planets must be removed');
solar.setWorld('milica');solar.activate('earth');assert.equal(externalLinks.at(-1),'https://www.milicapersonaltrainer.com/');
assert.equal(solar.isFocused(),false);
console.log('Studio checks passed: eight separate galactic worlds, animated pink gym, mobile camera at 30/60/120 FPS, rendering, content and contact.');

function checkCursorZoom(){
  const s=createSolar(element());s.size(390,844,1);const state={dt:1/60,target:[0,0,0],distance:80,yaw:.25,pitch:.73,roll:-.2,reducedMotion:false};
  const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch),cr=Math.cos(state.roll),sr=Math.sin(state.roll);
  const right=[cr*cy+sr*sy*sp,-sr*cp,-cr*sy+sr*cy*sp],up=[sr*cy-cr*sy*sp,cr*cp,-sr*sy-cr*cy*sp],forward=[sy*cp,sp,cy*cp];
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),x=285,y=335,f=844*1.20710678;
  for(const focused of [false,true]){
    s.clearFocus();if(focused)s.select('sun');
    let view;for(let i=0;i<240;i++)view=s.camera(state);
    const before=view.distance,point=view.target.map((v,i)=>v+right[i]*(x-195)*before/f+up[i]*(422-y-view.framing*422)*before/f);
    s.zoom(-260,x,y);let first;
    for(let i=0;i<240;i++){
      view=s.camera(state);if(i===0)first=view.distance;
      const relative=point.map((v,i)=>v-view.target[i]),depth=view.distance-dot(relative,forward);
      const px=195+dot(relative,right)*f/depth,py=422-dot(relative,up)*f/depth-view.framing*422;
      assert.ok(Math.hypot(px-x,py-y)<.001,'Local '+(focused?'focused':'overview')+' zoom must hold its cursor through every eased frame');
    }
    assert.ok(first<before&&first>view.distance,'Zoom must ease toward its target');assert.equal(s.isMoving(),false);
  }
  console.log('Cursor zoom checks passed: overview, focused object and all eased frames.');
}
checkCursorZoom();

async function checkNavigation(reduced,coarse=false,useWebGL=false,fault=null){
  let now=0,sequence=0;
  const frames=new Map(),nodes=new Map(),events=new Map(),sceneEvents=[],shieldFrames=[],hoverEvents=[];let localSolar,resolveCore,rejectCore,coreCreations=0;const imageEvents=[],unavailable=[],homeCalls=[],idle=[],routeEvents={},assigned=[],history=[];
  const corePromise=['slow','reject','live-start'].includes(fault)?new Promise((resolve,reject)=>{resolveCore=resolve;rejectCore=reject;}):null;
  const ctx2d=new Proxy({createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8Array(384*384*4).fill(180)})},{get:(o,k)=>k in o?o[k]:()=>{}});
  function node(id){
    if(nodes.has(id))return nodes.get(id);
    const el=element();el.id=id;const destination=Object.entries(context.PerculesDestinations||{}).find(([,d])=>d.marker===id);if(destination)el.dataset.world=destination[0];el.classList={add(){},remove(){}};el.focus=()=>{};
    el.getContext=type=>type==='2d'?ctx2d:(useWebGL?gl:null);el.removeAttribute=()=>{};el.setPointerCapture=()=>{};
    el.querySelector=()=>node(id+'-child');el.querySelectorAll=()=>el.children;nodes.set(id,el);return el;
  }
  const body={dataset:{}};
  const document={body,hidden:false,getElementById:node,createElement:()=>element(),
    addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},
    dispatchEvent:event=>{if(event.type==='percules:unavailable')unavailable.push(event.detail);if(event.type==='percules:scene')sceneEvents.push(event.detail);if(event.type==='percules:hover')hoverEvents.push(event.detail);for(const fn of events.get(event.type)||[])fn(event);}};
  const context={console,Math,Map,Set,Float32Array,Uint8Array,Uint16Array,Image:function(){imageEvents.push(this);},corePromise,
    window:{open:url=>externalLinks.push(url)},document,innerWidth:390,innerHeight:844,devicePixelRatio:1,
    matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:coarse,addEventListener(){}}),
    performance:{now:()=>now},CustomEvent:function(type,options){this.type=type;this.detail=options?.detail;},
    addEventListener(){},requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    solarModule:{createSolar:(canvas,options)=>{coreCreations++;return localSolar=createSolar(canvas,options);},worlds,bodies:worlds.studio},
    shieldModule:{SHIELD_DURATION:1.65,createShield:()=>({render:age=>shieldFrames.push(age)})},
    jumpModule:{JUMP_DURATION:.5,jumpPhase:t=>Math.sin(t*Math.PI),createJump:()=>({render(){}})}};
  if(fault==='home')context.PerculesPages={current:'apps',takeTransfer:()=>null,go:()=>false,prepareHome(){},home:view=>{homeCalls.push({time:now,view});return true;}};
  if(['live','live-start','live-data'].includes(fault)){
    document.createElement=()=>{const el=element();el.getContext=type=>type==='2d'?ctx2d:gl;return el;};
    document.head={children:[],append(element){this.children.push(element);}};
    document.querySelector=selector=>selector.includes('data-home-prefetch')?document.head.children.find(e=>e.dataset.homePrefetch):node(selector);
    context.window.location={pathname:fault==='live-start'?'/aplikacije/':'/',assign:url=>assigned.push(url)};
    context.window.history={pushState:(state,title,url)=>{history.push(url);context.window.location.pathname=url;}};
    context.window.addEventListener=(type,fn)=>routeEvents[type]=fn;
    context.requestIdleCallback=fn=>idle.push(fn);context.setTimeout=fn=>idle.push(fn);
    if(fault==='live-data')context.navigator={connection:{saveData:true}};
  }
  let script=galaxy.replace("import('./solar.js?v=space-realism-1')",corePromise?"corePromise":"Promise.resolve(solarModule)")
    .replace("import('./shield.js?v=recovery-1')",fault==='effects'?"new Promise(()=>{})":"Promise.resolve(shieldModule)")
    .replace("import('./jump.js?v=recovery-1')",fault==='effects'?"new Promise(()=>{})":"Promise.resolve(jumpModule)")
    .replace('  let solarPoint=', '  globalThis.galaxyPoints=()=>mapPoints;\n  let solarPoint=');
  vm.createContext(context);if(fault?.startsWith('live'))vm.runInContext(fs.readFileSync('public/pages.js','utf8'),context);vm.runInContext(fs.readFileSync('public/destinations.js','utf8'),context);vm.runInContext(script,context);
  const points=Object.values(context.PerculesDestinations).filter(d=>d.marker).map(d=>d.point.join(','));assert.equal(new Set(points).size,8);
  function tick(count){for(let i=0;i<count;i++){now+=1000/60;const queued=[...frames.values()];frames.clear();assert.ok(queued.length<=1,'More than one animation frame scheduled');for(const fn of queued)fn(now);}}
  function navigate(world,id){document.dispatchEvent({type:'percules:navigate',detail:{world,id}});}
  tick(1);if(useWebGL)assert.equal(node('galaxy').dataset.renderer,'webgl','Exercise the actual galaxy shader pipeline');
  if(fault==='live-start'){
    context.window.location.pathname='/';routeEvents.popstate();resolveCore(context.solarModule);
    for(let i=0;i<12;i++)await Promise.resolve();tick(100);
    assert.equal(context.PerculesPages.current,null);assert.equal(body.dataset.scene,'galaxy');assert.equal(body.dataset.entryLoading,'false','Back during initial loading must not leave the root hidden');return;
  }
  if(fault==='live-data'){
    idle.shift()();for(let i=0;i<12;i++)await Promise.resolve();assert.equal(coreCreations,0,'Save Data must not prewarm the local renderer');
    navigate('apps');for(let i=0;i<12;i++)await Promise.resolve();tick(140);assert.equal(coreCreations,1);assert.equal(body.dataset.world,'apps');return;
  }
  if(fault==='live'){
    const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
    assert.equal(idle.length,1);idle.shift()();await flush();tick(2);
    assert.equal(coreCreations,1,'Prepare one renderer before the first phone tap');assert.equal(body.dataset.scene,'galaxy');assert.equal(node('solar').style.visibility,'hidden');assert.notEqual(node('galaxy').dataset.loading,'true');
    const surface=node('galaxy');navigate('apps');await flush();tick(20);
    assert.equal(context.window.location.pathname,'/aplikacije/');assert.equal(body.dataset.scene,'travel');
    imageEvents[0].onload();idle.shift()();assert.notEqual(node('galaxy').dataset.detail,'high','Texture processing waits until the phone finishes its flight');
    tick(140);for(let i=0;i<3&&idle.length;i++)idle.shift()();
    assert.equal(node('galaxy').dataset.detail,'high');assert.equal(body.dataset.world,'apps');assert.equal(body.dataset.scene,'system');
    node('brand-home').listeners.click();tick(90);assert.equal(context.window.location.pathname,'/');assert.equal(body.dataset.scene,'galaxy');
    navigate('websites');navigate('contact');await flush();tick(150);assert.equal(body.dataset.world,'contact','Rapid taps must keep only the last pending selection');
    const count=history.length;context.window.location.pathname='/aplikacije/';routeEvents.popstate();await flush();tick(150);assert.equal(body.dataset.world,'apps');assert.equal(history.length,count,'Back must not create another history entry');
    context.window.location.pathname='/';routeEvents.popstate();tick(90);assert.equal(body.dataset.scene,'galaxy');
    assert.equal(surface,node('galaxy'));assert.equal(coreCreations,1,'All round trips must reuse the prepared renderer');assert.equal(assigned.length,0,'Phone round trips must not replace the document');
    return;
  }
  if(fault==='home'){
    for(let i=0;i<12;i++)await Promise.resolve();tick(3);
    assert.equal(body.dataset.scene,'system');assert.equal(body.dataset.world,'apps');
    const start=now;node('brand-home').listeners.click();
    if(!reduced){assert.equal(homeCalls.length,0,'Do not change documents before the return flight');tick(10);assert.equal(homeCalls.length,0);assert.equal(body.dataset.scene,'travel');node('brand-home').listeners.click();}
    tick(70);assert.equal(homeCalls.length,1,'A repeated logo click must not restart the flight');
    assert.ok(homeCalls[0].time-start>=(reduced?0:500));
    assert.ok(homeCalls[0].view&&homeCalls[0].view.zoom>=.35,'Hand the final map camera to the home document');
    return;
  }
  if(fault==='zoom'){
    const before=context.galaxyPoints().find(p=>p.depth>.1&&p.x>40&&p.x<350&&p.y>80&&p.y<760&&Math.hypot(p.x-195,p.y-422)>30);
    assert.ok(before);
    node('galaxy').listeners.wheel({deltaY:-220,deltaMode:0,clientX:before.x,clientY:before.y,preventDefault(){}});tick(4);
    const after=context.galaxyPoints().find(p=>p.id===before.id);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01,'Wheel zoom must hold the star under the cursor');
    assert.equal(body.dataset.scene,'galaxy','Exploring with wheel must not teleport to a different star');
    const gesture=(type,id,x,y)=>node('galaxy').listeners[type]({type,button:0,pointerId:id,clientX:x,clientY:y,timeStamp:now,pointerType:'touch'});
    gesture('pointerdown',1,after.x-25,after.y);gesture('pointerdown',2,after.x+25,after.y);
    gesture('pointermove',1,after.x-45,after.y);tick(4);gesture('pointermove',2,after.x+45,after.y);tick(4);
    const pinched=context.galaxyPoints().find(p=>p.id===before.id);
    assert.ok(Math.hypot(pinched.x-before.x,pinched.y-before.y)<.02,'Pinch must hold its midpoint, including movement of both fingers');
    gesture('pointerup',1,after.x-45,after.y);gesture('pointerup',2,after.x+45,after.y);
    return;
  }
  if(fault){
    const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
    if(fault==='context'){
      node('galaxy').listeners.webglcontextlost({preventDefault(){}});tick(2);
      assert.equal(node('galaxy').dataset.renderer,'canvas');assert.equal(node('galaxy-fallback').hidden,false);
      assert.doesNotThrow(()=>imageEvents[0]?.onload(),'A late galaxy texture must be ignored after switching to Canvas');
    }
    navigate('apps');tick(150);
    if(corePromise){
      assert.equal(node('galaxy').dataset.loading,'true');assert.equal(body.dataset.scene,'galaxy','Keep the galaxy visible while the core is delayed');
      if(fault==='reject')rejectCore(Error('simulated network interruption'));else resolveCore(context.solarModule);
    }
    await flush();tick(100);
    assert.equal(node('galaxy').dataset.loading,'false');
    if(fault==='reject'){
      assert.equal(body.dataset.scene,'galaxy');assert.equal(node('render-error').hidden,false);assert.equal(unavailable.at(-1).world,'apps','Failure must retain the exact requested star');
      assert.ok(events.has('percules:navigate'),'Navigation remains available for retry');
    }else{
      assert.equal(body.dataset.scene,'system');assert.equal(body.dataset.world,'apps','Core world loads even when optional effects never respond');
    }
    if(fault==='context'){
      node('galaxy').listeners.webglcontextrestored();tick(2);assert.equal(node('galaxy').dataset.renderer,'webgl');
      assert.equal(node('galaxy-fallback').hidden,true);assert.doesNotThrow(()=>imageEvents[0]?.onload(),'A previous generation image must stay ignored after restoration');
    }
    return;
  }
  const cameraSurface=node('galaxy');
  const key=(name,shiftKey=false)=>cameraSurface.listeners.keydown({key:name,shiftKey,preventDefault(){}});
  const gesture=(type,id,x,y,button=0,shiftKey=false)=>cameraSurface.listeners[type]({type,button,shiftKey,pointerId:id,clientX:x,clientY:y,timeStamp:now,pointerType:coarse?'touch':'mouse'});
  const pan=()=>node('galaxy').dataset.pan.split(',').map(Number);
  const startYaw=viewUniforms.get('uYaw'),startPitch=viewUniforms.get('uPitch');
  key('ArrowRight',true);tick(45);assert.ok(pan()[0]>.05,'Shift+arrows should translate the view');
  if(useWebGL){assert.ok(Math.hypot(...viewUniforms.get('uCenter'))>.1,'Panning must reach the world-space camera');assert.equal(viewUniforms.get('uYaw'),startYaw);assert.equal(viewUniforms.get('uPitch'),startPitch);}
  key('Home');tick(65);assert.ok(pan().every(v=>Math.abs(v)<.001),'Home should reset translation');
  gesture('pointerdown',101,100,240,2);gesture('pointermove',101,180,270,2);gesture('pointerup',101,180,270,2);tick(45);
  assert.ok(pan()[0]>.18&&pan()[1]>.02,'Right dragging should move the galaxy on both axes');
  assert.equal(body.dataset.scene,'galaxy','Panning must not select or navigate');
  if(useWebGL){assert.equal(viewUniforms.get('uYaw'),startYaw);assert.equal(viewUniforms.get('uPitch'),startPitch);}
  key('Home');tick(65);
  gesture('pointerdown',102,100,200);gesture('pointerdown',103,200,200);
  gesture('pointermove',102,130,220);gesture('pointermove',103,230,220);
  gesture('pointerup',103,230,220);gesture('pointerup',102,130,220);tick(55);
  assert.ok(pan()[0]>.06&&pan()[1]>.015,'Two fingers should translate using their midpoint');
  assert.equal(body.dataset.scene,'galaxy','Parallel two-finger movement should preserve the zoom');
  key('Home');tick(65);
  gesture('pointerdown',104,100,240,0,true);gesture('pointermove',104,4000,4000,0,true);gesture('pointerup',104,4000,4000,0,true);tick(45);
  assert.ok(pan()[0]<=.3201&&pan()[1]<=.2601,'Panning should keep the galaxy within reach');
  key('Home');tick(65);
  const websiteLabel=node('destination-websites'),websiteStar=node('star-websites');
  websiteLabel.listeners.pointerenter();assert.equal(websiteStar.dataset.active,'true');
  if(useWebGL){
    node('galaxy').listeners.keydown({key:' ',preventDefault(){}});
    const index=Object.values(context.PerculesDestinations).filter(d=>d.marker).findIndex(d=>d.marker==='destination-websites'),base=index*16;
    tick(45);const lit=uploads.filter(data=>data.length===Object.values(context.PerculesDestinations).filter(d=>d.marker).length*16).at(-1);
    assert.ok(lit,'Destination lights must reach the galaxy GPU buffer');
    assert.ok(lit[base+7]>6.5,'Hover should smoothly brighten the actual rendered star');
    for(let star=0;star<Object.values(context.PerculesDestinations).filter(d=>d.marker).length;star++){
      assert.ok(lit[star*16+6]>=12,'Every destination must have a visible resting core');
      assert.ok(lit[star*16+7]>=3.39,'Resting stars must emit light without hover');
      assert.ok(lit[star*16+14]>=36&&lit[star*16+15]>=.3999,'Every destination must keep a soft colored halo at rest');
    }
    const expected=Object.values(context.PerculesDestinations).find(d=>d.marker==='destination-websites').point;assert.ok(lit.slice(base,base+3).every((v,i)=>Math.abs(v-expected[i])<.00001),'Light stays at its 3D destination');
  }
  assert.equal(node('star-contact').dataset.active,'false','Highlight the matching star only');
  assert.equal(body.dataset.scene,'galaxy','Hover must not begin navigation');
  websiteLabel.listeners.pointerleave();assert.equal(websiteStar.dataset.active,'false','Clear star after leaving the label');
  if(useWebGL){tick(45);const rest=uploads.filter(data=>data.length===Object.values(context.PerculesDestinations).filter(d=>d.marker).length*16).at(-1),index=Object.values(context.PerculesDestinations).filter(d=>d.marker).findIndex(d=>d.marker==='destination-websites');assert.ok(Math.abs(rest[index*16+7]-3.4)<.002,'Rendered light must settle after leaving, including with breathing paused');}
  websiteLabel.listeners.focus();assert.equal(websiteStar.dataset.active,'true','Keyboard focus should light the same star');
  websiteLabel.listeners.blur();assert.equal(websiteStar.dataset.active,'false');
  assert.equal(websiteLabel.style.transform,undefined,'Camera rendering must not move the fixed labels');
  if(!coarse){
    const processPoint=context.galaxyPoints().find(p=>p.id==='process');
    gesture('pointermove',300,processPoint.x,processPoint.y);
    assert.equal(node('destination-process').dataset.highlighted,'true','Hovering the process star must light the full Način rada title');
    assert.equal(node('star-process').dataset.active,'true');
    assert.equal(websiteLabel.dataset.highlighted,'false','Another title must not stay lit');
    gesture('pointermove',300,0,0);
    assert.equal(node('destination-process').dataset.highlighted,'false','Leaving the star must restore the title');
    node('destination-process').listeners.pointerenter();
    assert.equal(node('star-process').dataset.active,'true','Hovering the title must light the same process star');
    node('destination-process').listeners.pointerleave();
  }
  // Select the actual projected lights after moving and rotating the camera.
  key('ArrowRight');key('ArrowUp');key('ArrowRight',true);tick(80);
  let beacon=context.galaxyPoints().find(p=>p.id==='websites');
  gesture('pointermove',200,beacon.x,beacon.y);
  if(!coarse){assert.equal(websiteStar.dataset.active,'true');assert.equal(cameraSurface.style.cursor,'pointer');
    node('destination-apps').listeners.focus();gesture('pointermove',200,beacon.x,beacon.y);assert.equal(websiteStar.dataset.active,'true','Direct star hover must override another label keyboard focus');node('destination-apps').listeners.blur();}
  gesture('pointerdown',200,beacon.x,beacon.y);gesture('pointermove',200,beacon.x+35,beacon.y);gesture('pointerup',200,beacon.x+35,beacon.y);tick(80);
  assert.equal(body.dataset.scene,'galaxy','Dragging a bright destination must not teleport');
  beacon=context.galaxyPoints().find(p=>p.id==='websites');
  gesture('pointerdown',201,beacon.x,beacon.y);gesture('pointercancel',201,beacon.x,beacon.y);gesture('pointerup',201,beacon.x,beacon.y);tick(4);
  assert.equal(body.dataset.scene,'galaxy','Cancelled star tap must not teleport');
  gesture('pointerdown',202,beacon.x,beacon.y,2);gesture('pointerup',202,beacon.x,beacon.y,2);tick(4);
  assert.equal(body.dataset.scene,'galaxy','Right-click on a star must stay in the galaxy');
  gesture('pointerdown',203,beacon.x,beacon.y,0,true);gesture('pointerup',203,beacon.x,beacon.y,0,true);tick(4);
  assert.equal(body.dataset.scene,'galaxy','Shift tap must stay a pan gesture');
  gesture('pointerdown',204,beacon.x,beacon.y);gesture('pointerdown',205,beacon.x+20,beacon.y);
  gesture('pointerup',205,beacon.x+20,beacon.y);gesture('pointerup',204,beacon.x,beacon.y);tick(4);
  assert.equal(body.dataset.scene,'galaxy','Two-finger star gesture must not teleport');
  gesture('pointerdown',206,1,1);gesture('pointerup',206,1,1);tick(4);
  assert.equal(body.dataset.scene,'galaxy','Empty space must not teleport');
  for(const [destinationId,destination] of Object.entries(context.PerculesDestinations).filter(([,d])=>d.marker)){
    key('Home');tick(80);key('ArrowLeft');key('ArrowDown');key('ArrowRight',true);tick(80);
    const target=context.galaxyPoints().find(p=>p.id===destinationId);
    assert.ok(target&&target.x>0&&target.x<390&&target.y>0&&target.y<844,'Projected destination should be on screen');
    const dx=coarse?12:0;
    gesture('pointerdown',207,target.x+dx,target.y);gesture('pointerup',207,target.x+dx,target.y);
    for(let i=0;i<12;i++)await Promise.resolve();tick(reduced?4:80);
    assert.equal(body.dataset.scene,'system','One direct star tap must reach the whole system');
    assert.equal(body.dataset.world,destination.world||destinationId,'Star tap must select its matching world');
    assert.equal(localSolar.isFocused(),false,'Star teleport must not open planet details');
    assert.ok(Number(node('galaxy').dataset.targetOffset)<.00001,'Direct star teleport must center its destination');
    node('brand-home').listeners.click();tick(reduced?4:80);
  }
  navigate('contact','venus');for(let i=0;i<12;i++)await Promise.resolve();tick(reduced?4:80);
  assert.equal(body.dataset.scene,'system');assert.equal(node('scene-title').textContent,'Kontakt');
  assert.equal(localSolar.isFocused(),false,'Arrival must show the entire system');
  assert.ok(!sceneEvents.some(event=>event.scene==='planet'),'No detail scene on arrival');
  localSolar.hover('venus');const point=hoverEvents.at(-1);assert.equal(point.body.id,'venus');
  assert.equal(body.dataset.scene,'system');
  const surface=node('galaxy');
  const pointer=(type,id,x,y)=>surface.listeners[type]({type,button:0,pointerId:id,clientX:x,clientY:y,timeStamp:now,pointerType:coarse?'touch':'mouse'});
  pointer('pointerdown',1,point.x,point.y);pointer('pointermove',1,point.x+30,point.y);pointer('pointerup',1,point.x+30,point.y);
  assert.equal(localSolar.isFocused(),false,'Dragging an object must not open details');
  pointer('pointerdown',2,point.x,point.y);pointer('pointerdown',3,point.x+10,point.y);
  pointer('pointerup',3,point.x+10,point.y);pointer('pointerup',2,point.x,point.y);
  assert.equal(localSolar.isFocused(),false,'A pinch must not select');
  pointer('pointerdown',4,point.x,point.y);pointer('pointercancel',4,point.x,point.y);
  pointer('pointerup',4,point.x,point.y);assert.equal(localSolar.isFocused(),false,'Cancelled gesture must not select');
  localSolar.hover('venus');const fresh=hoverEvents.at(-1);
  pointer('pointerdown',5,fresh.x,fresh.y);pointer('pointerup',5,fresh.x,fresh.y);
  if(coarse){assert.equal(localSolar.isFocused(),false);pointer('pointerdown',6,fresh.x,fresh.y);pointer('pointerup',6,fresh.x,fresh.y);}
  tick(4);assert.equal(localSolar.focusId(),'venus');assert.equal(body.dataset.scene,'planet');
  document.dispatchEvent({type:'percules:unfocus'});tick(50);assert.equal(body.dataset.scene,'system');assert.equal(body.dataset.world,'contact');

  navigate('milica',null);if(!reduced){tick(10);assert.equal(node('solar').dataset.world,'contact');}
  tick(reduced?3:65);assert.equal(body.dataset.world,'milica');assert.equal(body.dataset.scene,'system');assert.equal(body.dataset.theme,'pink');
  assert.equal(node('planet-labels').hidden,true,'Gym labels must stay out of the scene');
  const appLink=node('planet-nav').children.find(child=>child.dataset.planet==='earth');assert.equal(appLink.href,'https://www.milicapersonaltrainer.com/');assert.equal(appLink.target,'_blank');
  document.dispatchEvent({type:'percules:object',detail:{id:'earth'}});tick(4);assert.equal(externalLinks.at(-1),'https://www.milicapersonaltrainer.com/');assert.equal(localSolar.isFocused(),false);
  document.dispatchEvent({type:'percules:object',detail:{id:'cardio'}});tick(4);assert.equal(node('scene-title').textContent,'Kardio zona');
  navigate('projects','jupiter');tick(reduced?3:70);assert.equal(body.dataset.world,'milica');assert.equal(body.dataset.scene,'system');
  assert.ok(!sceneEvents.some(event=>event.world==='projects'),'No intermediate project-planet scene');
  node('brand-home').listeners.click();tick(reduced?3:70);assert.equal(body.dataset.scene,'galaxy');assert.equal(body.dataset.theme,'space');
  key('Home');tick(80);key('ArrowLeft');key('ArrowRight',true);tick(80);
  const nearest=context.galaxyPoints().filter(p=>p.depth>.1&&p.x>=0&&p.x<=390&&p.y>=0&&p.y<=844).sort((a,b)=>Math.hypot(a.x-195,a.y-422)-Math.hypot(b.x-195,b.y-422))[0];
  const expectedWorld=context.PerculesDestinations[nearest.id].world||nearest.id;
  key('+');
  for(let i=0;i<12;i++)key('+');tick(120);
  assert.equal(body.dataset.scene,'galaxy','Manual zoom stays on the map until a destination is chosen');
  navigate(expectedWorld);for(let i=0;i<12;i++)await Promise.resolve();tick(120);
  assert.equal(body.dataset.world,expectedWorld);assert.equal(body.dataset.scene,'system');
  assert.ok(sceneEvents.some(event=>event.world==='milica'));
  if(reduced)assert.ok(shieldFrames.every(age=>age<0),'Reduced motion should skip shield');
  else if(useWebGL&&!coarse)assert.ok(shieldFrames.some(age=>age>=0),'Shared shield must run on the jump');
}
function checkTouch(){
 const handlers={};const main={addEventListener:(name,fn)=>handlers[name]=fn};
 const context={document:{querySelector:()=>main}};vm.createContext(context);
 vm.runInContext(fs.readFileSync('public/touch.js','utf8'),context);
 const panel={id:'detail-scroll',scrollTop:0,scrollHeight:1000,clientHeight:400};
 const target={closest:selector=>selector.includes('#detail-scroll')?panel:null};
 const start=(x=0,y=100)=>handlers.touchstart({target,touches:[{clientX:x,clientY:y}]});
 const move=(y,two=false)=>{let prevented=false;handlers.touchmove({cancelable:true,touches:two?[{clientY:y},{clientY:y}]:[{clientX:0,clientY:y}],preventDefault(){prevented=true;}});return prevented;};
 start();assert.equal(move(150),true,'Top edge must freeze the page');
 start();assert.equal(move(50),false,'Content must scroll inside the panel');
 panel.scrollTop=600;start();assert.equal(move(50),true,'Bottom edge must freeze the page');
 start();assert.equal(move(50,true),true,'Two fingers must not move the page');
 handlers.touchstart({target:{closest:()=>null},touches:[{clientX:0,clientY:100}]});
 assert.equal(move(50),true,'Galaxy gesture must freeze the document');
 console.log('Touch checks passed: panel scrolling, edge containment, galaxy drag and multi-touch.');
}
checkTouch();
const cameraOnly=process.argv.includes('--camera');
(cameraOnly?Promise.resolve():checkNavigation(false).then(()=>checkNavigation(false,true)).then(()=>checkNavigation(true,true)).then(()=>checkNavigation(false,false,true))).then(async()=>{
  for(const fault of cameraOnly?['home']:['slow','reject','effects','context','home'])await checkNavigation(false,false,fault==='effects'||fault==='context'||fault==='home',fault);
  await checkNavigation(true,false,true,'home');await checkNavigation(true,true,true,'zoom');for(const mode of ['live','live-start','live-data'])await checkNavigation(false,true,true,mode);
  checkSolarRecovery();checkSound();checkShaders();console.log('Navigation and resilience checks passed: center zoom, slow/failed core, stalled effects, WebGL recovery, quiet opt-in audio and single frame loop.');
}).catch(error=>{console.error(error);process.exitCode=1;});

function checkSolarRecovery(){
  for(const failure of ['no-webgl','shader','context']){
    const surface=element();surface.getContext=type=>type==='2d'?null:failure==='no-webgl'?null:gl;
    const original=gl.getShaderParameter;if(failure==='shader')gl.getShaderParameter=()=>false;
    const renderer=createSolar(surface);gl.getShaderParameter=original;renderer.size(390,844,1);
    if(failure==='context')surface.listeners.webglcontextlost({preventDefault(){}});
    assert.equal(surface.dataset.renderer,'canvas','A dedicated Canvas must survive '+failure);
    renderer.setWorld('apps');renderer.select('uranus');
    renderer.camera({dt:1/60,target:[0,0,0],distance:44,reducedMotion:true});
    const before=fallbackDraws;renderer.render({dt:1/60,yaw:.25,pitch:.73,progress:1,reducedMotion:true,viewPrepared:true});
    assert.ok(fallbackDraws>before,'Fallback must actually draw the selected world');
    if(failure==='context'){
      surface.listeners.webglcontextrestored();assert.equal(surface.dataset.renderer,'webgl');
      assert.equal(renderer.worldId(),'apps');assert.equal(renderer.focusId(),'uranus','Restore must retain the selected planet');
    }
  }
}
function checkSound(){
  const oscillators=[];const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const audio={currentTime:0,state:'running',destination:{},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBiquadFilter:()=>({frequency:param(),connect(){},disconnect(){}}),createOscillator:()=>{const o={frequency:param(),connect(){},disconnect(){},start(t){this.startAt=t;},stop(t){this.stopAt=t;}};oscillators.push(o);return o;}};
  const scope={document:{getElementById:()=>null}};vm.createContext(scope);
  vm.runInContext(fs.readFileSync('public/audio.js','utf8').replace('export function','function')+'\nglobalThis.make=createSoundEngine;',scope);
  const sound=scope.make(audio);sound.jump();sound.select();assert.equal(oscillators.length,0,'Sound must be off until enabled');
  sound.setEnabled(true);sound.scene(true);assert.equal(oscillators.length,0,'No ambient drone');sound.jump();sound.select();
  assert.equal(oscillators.length,3);assert.ok(oscillators.every(o=>o.type==='sine'&&o.stopAt-o.startAt<.4),'Only short, finite cues');
  sound.setEnabled(false);const count=oscillators.length;sound.select();assert.equal(oscillators.length,count);
}

function checkShaders(){
assert.ok(shaderPairs.length>6,'Galaxy shaders must be captured alongside planetary shaders');
if(process.argv.includes('--shaders')){
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'percules-shaders-'));
for(let index=0;index<shaderPairs.length;index++){
const files=shaderPairs[index].map(shader=>{
const filename=path.join(directory,'program-'+index+(shader.type===35633?'.vert':'.frag'));
fs.writeFileSync(filename,shader.source);return filename;
});
const result=spawnSync('glslangValidator',['-l',...files],{encoding:'utf8'});
assert.equal(result.status,0,'Shader '+index+' failed:\n'+result.stdout+'\n'+result.stderr);
}
console.log('Validated '+shaderPairs.length+' WebGL shader pairs.');
}
}

