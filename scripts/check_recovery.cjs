'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let builds=0,draws=0;
const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,createShader:()=>({}),createProgram:()=>{builds++;return {};},createBuffer:()=>({}),getAttribLocation:()=>0,getUniformLocation:()=>({}),drawArrays:()=>draws++},{get:(o,k)=>k in o?o[k]:()=>{}});
for(const [file,creator,progress] of [['jump','createJump',.2],['shield','createShield',.3]]){
 const context={console,Math,Float32Array,matchMedia:()=>({matches:false})};vm.createContext(context);
 vm.runInContext(fs.readFileSync('public/'+file+'.js','utf8').replace(/export /g,'')+'\nglobalThis.make='+creator+';',context);
 const handlers={},canvas={style:{},dataset:{},width:1280,height:720,getContext:()=>gl,addEventListener:(type,fn)=>{assert.ok(!handlers[type],'Only one lifecycle handler per event');handlers[type]=fn;}};
 let wakes=0;const renderer=context.make(canvas,{onInvalidate:()=>wakes++});
 for(let cycle=0;cycle<3;cycle++){
  renderer.render(progress,1280,720,1);assert.equal(canvas.style.opacity,'1');
  const previousDraws=draws,previousBuilds=builds;
  handlers.webglcontextlost({preventDefault(){}});assert.equal(canvas.style.opacity,'0');
  renderer.render(progress,1280,720,1);assert.equal(draws,previousDraws,'Lost effects must not issue GL calls');
  handlers.webglcontextrestored();assert.ok(builds>previousBuilds,'Restoration must rebuild GPU resources');
  renderer.render(progress,1280,720,1);assert.equal(canvas.style.opacity,'1');assert.ok(draws>previousDraws);
 }
 assert.equal(wakes,6,'Loss and restoration must wake even a paused scene');
}
console.log('Recovery checks passed: jump and shield rebuild after repeated losses with one listener and paused-scene invalidation.');

