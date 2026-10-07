'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync('public/solar.js','utf8');
const shaderPairs=[],draws=[];
let currentSources=[],id=0;
const gl=new Proxy({
VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
getExtension:()=>({}),createProgram:()=>({shaders:[]}),createShader:type=>({type}),
shaderSource:(s,text)=>{s.source=text;},attachShader:(p,s)=>p.shaders.push(s),
linkProgram:p=>shaderPairs.push(p.shaders),getShaderParameter:()=>true,getProgramParameter:()=>true,
getAttribLocation:(p,name)=>name==='aUv'?1:0,getUniformLocation:()=>({}),
createBuffer:()=>({}),createTexture:()=>({}),drawElements:(...args)=>draws.push(args),
}, {get:(object,key)=>key in object?object[key]:()=>{}});
function element(){return {dataset:{},style:{},children:[],listeners:{},hidden:false,
setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},
append(child){this.children.push(child);},getContext:()=>gl};}
const labels=element(),emblem=element(),canvas=element(),selections=[];
const context={Math,Map,Set,Float32Array,Uint16Array,Uint8Array,
document:{getElementById:id=>id==='planet-labels'?labels:emblem,createElement:element},
Image:function(){throw Error('Procedural studio must not download planetary images');}};
vm.createContext(context);
vm.runInContext(source.replace(/export /g,'')+'\nglobalThis.api={createSolar,worlds,bodies};',context);
const {createSolar,worlds}=context.api;
assert.equal(worlds.studio.length,7);assert.equal(worlds.milica.length,2);
assert.deepEqual(Array.from(worlds.studio,b=>b.name),['Percules','Sajtovi','Aplikacije','Podrška','Način rada','Projekti','Kontakt']);
for(const list of Object.values(worlds)){
assert.equal(new Set(list.map(b=>b.id)).size,list.length);
for(const b of list){assert.ok(b.position.every(Number.isFinite));assert.ok(b.radius>0);}
}
const solar=createSolar(canvas,{onSelect:body=>selections.push(body?.id||null)});
solar.size(390,844,1.25);
assert.equal(labels.children.length,7);assert.equal(solar.worldId(),'studio');
solar.select('venus');assert.equal(solar.focusId(),'venus');
solar.select('invalid');assert.equal(solar.focusId(),'venus');
for(const rate of [30,60,120]){
solar.clearFocus();solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:true});
solar.select('neptune');let camera;
for(let i=0;i<rate*3;i++)camera=solar.camera({dt:1/rate,target:[0,0,0],distance:150,reducedMotion:false});
assert.ok(camera.target.every(Number.isFinite));assert.ok(camera.distance>0);
const expected=worlds.studio.find(b=>b.id==='neptune').position;
for(let i=0;i<3;i++)assert.ok(Math.abs(camera.target[i]-expected[i])<.001);
assert.ok(Math.abs(camera.framing-.4)<.001);
}
solar.render({dt:1/60,yaw:.25,pitch:.73,roll:-.2,progress:1,reducedMotion:false,viewPrepared:true});
assert.ok(draws.length>0);
assert.equal(solar.setWorld('invalid'),false);
assert.equal(solar.setWorld('milica'),true);assert.equal(solar.isFocused(),false);
assert.equal(labels.children.length,2);assert.equal(canvas.dataset.world,'milica');
solar.camera({dt:1/60,target:[0,0,0],distance:80,reducedMotion:true});
solar.render({dt:1/60,yaw:.25,pitch:.73,progress:1,reducedMotion:true,viewPrepared:true});
assert.equal(emblem.hidden,true);
labels.children[1].listeners.click();assert.equal(solar.focusId(),'earth');
solar.zoom(2500);assert.equal(solar.isFocused(),false);
solar.setWorld('studio');assert.equal(labels.children.length,7);
solar.select('jupiter');solar.render({dt:.016,yaw:.2,pitch:.32,progress:1,reducedMotion:false,viewPrepared:true});
const html=fs.readFileSync('public/index.html','utf8');
for(const body of worlds.studio)assert.ok(html.includes('data-content="'+body.id+'"'),body.id+' content missing');
assert.ok(html.includes('data-content="milica"'));
assert.ok(html.includes('mailto:aleksa.perisic2000@gmail.com'));
assert.ok(html.includes('tel:+381695312480'));
const galaxy=fs.readFileSync('public/galaxy.js','utf8');
assert.ok(galaxy.includes('solar.setWorld(worldFlight.world)'));
assert.ok(galaxy.includes("shieldStart=worldFlight.start+400"));
assert.ok(galaxy.includes('if(!frameId&&('),'Only one animation loop may be scheduled');
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
console.log('Studio checks passed: destinations, mobile camera at 30/60/120 FPS, both worlds, render paths, content and contact.');
