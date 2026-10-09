'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync('public/solar.js','utf8');
const shaderPairs=[],draws=[],uploads=[],viewUniforms=new Map();
let currentSources=[],id=0;
const gl=new Proxy({
VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
getExtension:()=>({}),createProgram:()=>({shaders:[]}),createShader:type=>({type}),
shaderSource:(s,text)=>{s.source=text;},attachShader:(p,s)=>p.shaders.push(s),
linkProgram:p=>shaderPairs.push(p.shaders),getShaderParameter:()=>true,getProgramParameter:()=>true,
getAttribLocation:(p,name)=>name==='aUv'?1:0,getUniformLocation:(p,name)=>({name}),uniform3fv:(u,v)=>viewUniforms.set(u.name,Array.from(v)),uniform1f:(u,v)=>viewUniforms.set(u.name,v),
bufferSubData:(target,offset,data)=>uploads.push(Array.from(data)),createBuffer:()=>({}),createTexture:()=>({}),drawElements:(...args)=>draws.push(args),
}, {get:(object,key)=>key in object?object[key]:()=>{}});
function element(){return {dataset:{},style:{},children:[],listeners:{},hidden:false,
setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},
append(child){this.children.push(child);},getContext:()=>gl};}
const labels=element(),emblem=element(),canvas=element(),selections=[],previews=[],portals=[];
const context={Math,Map,Set,Float32Array,Uint16Array,Uint8Array,
document:{getElementById:id=>id==='planet-labels'?labels:emblem,createElement:element},
Image:function(){throw Error('Procedural studio must not download planetary images');}};
vm.createContext(context);
vm.runInContext(source.replace(/export /g,'')+'\nglobalThis.api={createSolar,worlds,bodies};',context);
const {createSolar,worlds}=context.api;
assert.equal(Object.keys(worlds).length,8);assert.equal(worlds.milica.length,2);
for(const [id,list] of Object.entries(worlds)){
assert.equal(list.length,id==='milica'?2:id==='projects'?3:4,'Each main destination must have its own world');
assert.equal(new Set(list.map(b=>b.id)).size,list.length);
for(const b of list){assert.ok(b.position.every(Number.isFinite));assert.ok(b.radius>0);}
}
const solar=createSolar(canvas,{onSelect:body=>selections.push(body?.id||null),onHover:detail=>previews.push(detail),onDestination:world=>portals.push(world)});
solar.size(390,844,1.25);
assert.equal(labels.children.length,4);assert.equal(solar.worldId(),'studio');
solar.setWorld('contact');solar.select('venus');assert.equal(solar.focusId(),'venus');
solar.select('invalid');assert.equal(solar.focusId(),'venus');
for(const rate of [30,60,120]){
solar.setWorld('milica');solar.clearFocus();solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:true});
solar.select('earth');let camera;
for(let i=0;i<rate*3;i++)camera=solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:false});
assert.ok(camera.target.every(Number.isFinite));assert.ok(camera.distance>0);
const expected=worlds.milica.find(b=>b.id==='earth').position;
for(let i=0;i<3;i++)assert.ok(Math.abs(camera.target[i]-expected[i])<.001);
assert.ok(Math.abs(camera.framing-.4)<.001);
}
solar.render({dt:1/60,yaw:.25,pitch:.73,roll:-.2,progress:1,reducedMotion:false,viewPrepared:true});
assert.ok(draws.length>0);assert.equal(solar.setWorld('invalid'),false);
solar.setWorld('studio');assert.equal(solar.setWorld('milica'),true);assert.equal(solar.isFocused(),false);
assert.equal(labels.children.length,2);assert.equal(canvas.dataset.world,'milica');
solar.camera({dt:1/60,target:[0,0,0],distance:80,reducedMotion:true});
solar.render({dt:1/60,yaw:.25,pitch:.73,progress:1,reducedMotion:true,viewPrepared:true});
assert.equal(emblem.hidden,true);
labels.children[1].listeners.click({detail:0});assert.equal(solar.focusId(),'earth');
solar.zoom(2500);assert.equal(solar.isFocused(),false);
for(const region of ['studio','websites','apps','support','process','projects','contact']){
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
solar.setWorld('projects');solar.activate('milica-portal');assert.equal(portals.at(-1),'milica');
assert.equal(solar.isFocused(),false);
console.log('Studio checks passed: seven separate galactic worlds, pink system, mobile camera at 30/60/120 FPS, rendering, content and contact.');

async function checkNavigation(reduced,coarse=false,useWebGL=false){
  let now=0,sequence=0;
  const frames=new Map(),nodes=new Map(),events=new Map(),sceneEvents=[],shieldFrames=[],hoverEvents=[];let localSolar;
  const ctx2d=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
  function node(id){
    if(nodes.has(id))return nodes.get(id);
    const el=element();el.id=id;const destination=Object.entries(context.PerculesDestinations||{}).find(([,d])=>d.marker===id);if(destination)el.dataset.world=destination[0];el.classList={add(){},remove(){}};el.focus=()=>{};
    el.getContext=type=>type==='2d'?ctx2d:(useWebGL?gl:null);el.removeAttribute=()=>{};el.setPointerCapture=()=>{};
    el.querySelector=()=>node(id+'-child');el.querySelectorAll=()=>el.children;nodes.set(id,el);return el;
  }
  const body={dataset:{}};
  const document={body,hidden:false,getElementById:node,createElement:()=>element(),
    addEventListener:(type,fn)=>{if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},
    dispatchEvent:event=>{if(event.type==='percules:scene')sceneEvents.push(event.detail);if(event.type==='percules:hover')hoverEvents.push(event.detail);for(const fn of events.get(event.type)||[])fn(event);}};
  const context={console,Math,Map,Set,Float32Array,Uint8Array,Uint16Array,Image:function(){},
    document,innerWidth:390,innerHeight:844,devicePixelRatio:1,
    matchMedia:query=>({matches:query.includes('reduced-motion')?reduced:coarse,addEventListener(){}}),
    performance:{now:()=>now},CustomEvent:function(type,options){this.type=type;this.detail=options?.detail;},
    addEventListener(){},requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    solarModule:{createSolar:(canvas,options)=>localSolar=createSolar(canvas,options),worlds,bodies:worlds.studio},
    shieldModule:{SHIELD_DURATION:1.65,createShield:()=>({render:age=>shieldFrames.push(age)})},
    jumpModule:{JUMP_DURATION:.5,jumpPhase:t=>Math.sin(t*Math.PI),createJump:()=>({render(){}})}};
  let script=galaxy.replace("import('./solar.js?v=11')","Promise.resolve(solarModule)")
    .replace("import('./shield.js?v=19')","Promise.resolve(shieldModule)")
    .replace("import('./jump.js?v=17')","Promise.resolve(jumpModule)")
    .replace('  let solarPoint=', '  globalThis.galaxyPoints=()=>mapPoints;\n  let solarPoint=');
  vm.createContext(context);vm.runInContext(fs.readFileSync('public/destinations.js','utf8'),context);vm.runInContext(script,context);
  const points=Object.values(context.PerculesDestinations).filter(d=>d.marker).map(d=>d.point.join(','));assert.equal(new Set(points).size,7);
  function tick(count){for(let i=0;i<count;i++){now+=1000/60;const queued=[...frames.values()];frames.clear();assert.ok(queued.length<=1,'More than one animation frame scheduled');for(const fn of queued)fn(now);}}
  function navigate(world,id){document.dispatchEvent({type:'percules:navigate',detail:{world,id}});}
  tick(1);if(useWebGL)assert.equal(node('galaxy').dataset.renderer,'webgl','Exercise the actual galaxy shader pipeline');
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
    tick(45);const lit=uploads.filter(data=>data.length===112).at(-1);
    assert.ok(lit,'Destination lights must reach the galaxy GPU buffer');
    assert.ok(lit[base+7]>5,'Hover should smoothly brighten the actual rendered star');
    for(let star=0;star<7;star++){
      assert.ok(lit[star*16+6]>=7,'Every destination must have a visible resting core');
      assert.ok(lit[star*16+7]>=2.34,'Resting stars must emit light without hover');
      assert.ok(lit[star*16+14]>=24&&lit[star*16+15]>=.2199,'Every destination must keep a soft colored halo at rest');
    }
    const expected=Object.values(context.PerculesDestinations).find(d=>d.marker==='destination-websites').point;assert.ok(lit.slice(base,base+3).every((v,i)=>Math.abs(v-expected[i])<.00001),'Light stays at its 3D destination');
  }
  assert.equal(node('star-contact').dataset.active,'false','Highlight the matching star only');
  assert.equal(body.dataset.scene,'galaxy','Hover must not begin navigation');
  websiteLabel.listeners.pointerleave();assert.equal(websiteStar.dataset.active,'false','Clear star after leaving the label');
  if(useWebGL){tick(45);const rest=uploads.filter(data=>data.length===112).at(-1),index=Object.values(context.PerculesDestinations).filter(d=>d.marker).findIndex(d=>d.marker==='destination-websites');assert.ok(Math.abs(rest[index*16+7]-2.35)<.002,'Rendered light must settle after leaving, including with breathing paused');}
  websiteLabel.listeners.focus();assert.equal(websiteStar.dataset.active,'true','Keyboard focus should light the same star');
  websiteLabel.listeners.blur();assert.equal(websiteStar.dataset.active,'false');
  assert.equal(websiteLabel.style.transform,undefined,'Camera rendering must not move the fixed labels');
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
    assert.equal(body.dataset.world,destinationId,'Star tap must select its matching world');
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
  tick(reduced?3:65);assert.equal(body.dataset.world,'milica');assert.equal(body.dataset.scene,'system');
  document.dispatchEvent({type:'percules:object',detail:{id:'earth'}});tick(4);assert.equal(node('scene-title').textContent,'Miličina aplikacija');
  navigate('projects','jupiter');tick(reduced?3:70);assert.equal(body.dataset.world,'projects');assert.equal(body.dataset.scene,'system');
  document.dispatchEvent({type:'percules:object',detail:{id:'milica-portal'}});tick(reduced?3:70);assert.equal(body.dataset.world,'milica');assert.equal(body.dataset.scene,'system');
  node('brand-home').listeners.click();tick(reduced?3:70);assert.equal(body.dataset.scene,'galaxy');
  assert.ok(sceneEvents.some(event=>event.world==='milica'));
  if(reduced)assert.ok(shieldFrames.every(age=>age<0),'Reduced motion should skip shield');
  else assert.ok(shieldFrames.some(age=>age>=0),'Shared shield must run on the jump');
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
checkNavigation(false).then(()=>checkNavigation(false,true)).then(()=>checkNavigation(true,true)).then(()=>checkNavigation(false,false,true)).then(()=>{checkShaders();console.log('Navigation checks passed: stage-two arrivals, object preview and selection, touch/drag/pinch, pink project portal, return, reduced motion and single frame loop.');}).catch(error=>{console.error(error);process.exitCode=1;});

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