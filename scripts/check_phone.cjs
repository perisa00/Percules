'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={document:{getElementById:()=>null}};vm.createContext(scope);
vm.runInContext(fs.readFileSync('public/phone.js','utf8').replace('export function','function')+'\nglobalThis.make=createFairyPhone;',scope);
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function fixture({reduced=false,blocked=false,deferred=false}={}){
  const events=new Map(),windowEvents=new Map(),nodes=new Map(),animations=[];let finishPlay,playCalls=0,pauseCalls=0,liveStyle;
  const doc={hidden:false,body:{dataset:{}},getElementById:id=>nodes.get(id),addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},dispatchEvent:e=>{for(const fn of events.get(e.type)||[])fn(e);}};
  const node=id=>{const attrs=new Map(),classes=new Set();const e={id,hidden:false,inert:false,dataset:{},listeners:{},style:{left:'1062px',top:'352px',getPropertyValue:()=> '128px',setProperty(name,v){this[name]=v;}},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k),addEventListener:(name,fn)=>e.listeners[name]=fn,focus:()=>doc.activeElement=e};nodes.set(id,e);return e;};
  for(const id of ['milica-phone','milica-promo','phone-open','phone-close','phone-play','phone-backdrop','galaxy','menu'])node(id);
  const phone=nodes.get('milica-phone'),video=nodes.get('milica-promo'),galaxy=nodes.get('galaxy'),menu=nodes.get('menu');menu.inert=true;
  phone.parentElement={children:[phone,nodes.get('phone-backdrop'),galaxy,menu]};phone.contains=e=>['milica-phone','milica-promo','phone-open','phone-close','phone-play'].includes(e?.id);
  video.play=()=>{playCalls++;return blocked?Promise.reject(Error('play blocked')):deferred?new Promise(resolve=>finishPlay=resolve):Promise.resolve();};video.pause=()=>pauseCalls++;
  phone.animate=(frames,options)=>{
    let resolve,reject;const animation={frames,options,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),cancel(){liveStyle=null;reject(Error('cancelled'));},complete(){liveStyle=frames.at(-1);resolve();}};
    animations.push(animation);liveStyle=frames[0];return animation;
  };
  const motion={matches:reduced,addEventListener(){}};
  const win={innerWidth:1280,innerHeight:720,matchMedia:()=>motion,getComputedStyle:()=>liveStyle||{left:phone.style.left,top:phone.style.top,width:phone.style.getPropertyValue('--phone-width')},CustomEvent:function(type){this.type=type;},addEventListener:(name,fn)=>windowEvents.set(name,fn)};
  const api=scope.make(doc,win);
  return {api,doc,win,nodes,animations,windowEvents,video,phone,galaxy,menu,motion,playing:()=>playCalls,pauses:()=>pauseCalls,resolvePlay:()=>finishPlay(),setCurrent:s=>liveStyle=s};
}
(async()=>{
  const f=fixture();assert.equal(f.playing(),0,'No video request before opening');f.api.open();
  assert.equal(f.api.state(),'opening');assert.equal(f.playing(),1);assert.equal(f.galaxy.inert,true);assert.equal(f.phone.getAttribute('aria-modal'),'true');
  f.api.open();assert.equal(f.playing(),1,'Double click must not start a second flight or playback');
  f.animations.at(-1).complete();await flush();assert.equal(f.api.state(),'open');
  f.win.innerWidth=390;f.win.innerHeight=844;f.windowEvents.get('resize')();f.animations.at(-1).complete();await flush();
  const front=f.animations.at(-1).frames.at(-1);assert.ok(parseFloat(front.width)<290.1);assert.ok(parseFloat(front.top)-parseFloat(front.width)-70>0,'Close control stays in the viewport');
  f.phone.style.left='285px';f.phone.style.top='245px';f.phone.style.getPropertyValue=()=> '78px';f.api.close();
  assert.ok(f.pauses()>0,'Closing must stop audio immediately');assert.equal(f.galaxy.inert,true,'Background remains inert during return');
  assert.equal(f.animations.at(-1).frames.at(-1).left,'285px','Return follows the current dock after resize');
  f.animations.at(-1).complete();await flush();assert.equal(f.api.state(),'docked');assert.equal(f.video.hidden,true);assert.equal(f.galaxy.inert,false);assert.equal(f.menu.inert,true,'Preserve previously inert elements');assert.equal(f.doc.activeElement.id,'phone-open');
  const rapid=fixture({deferred:true});rapid.api.open();rapid.setCurrent({left:'790px',top:'290px',width:'210px'});
  let prevented=false;rapid.doc.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){prevented=true;},stopImmediatePropagation(){}});
  assert.ok(prevented);assert.equal(rapid.api.state(),'closing');assert.equal(rapid.animations.at(-1).frames[0].left,'790px','Interrupted flight returns from its current position');
  rapid.resolvePlay();await flush();assert.ok(rapid.pauses()>=2,'Late play resolution must not restart closed video');rapid.animations.at(-1).complete();await flush();assert.equal(rapid.api.state(),'docked');
  const fallback=fixture({blocked:true});fallback.api.open();await flush();assert.equal(fallback.nodes.get('phone-play').hidden,false,'Provide a play control when autoplay policy blocks the click playback');fallback.api.close(true);assert.equal(fallback.galaxy.inert,false);
  const still=fixture({reduced:true});still.api.open();assert.equal(still.animations.at(-1).options.duration,0);still.animations.at(-1).complete();await flush();still.doc.hidden=true;still.doc.dispatchEvent({type:'visibilitychange'});assert.ok(still.pauses()>0);still.doc.dispatchEvent({type:'percules:scene',detail:{world:'studio',scene:'system'}});assert.equal(still.api.state(),'docked','Navigation cleans up the player and focus lock');
  const html=fs.readFileSync('public/index.html','utf8');assert.equal((html.match(/id="milica-promo"/g)||[]).length,1,'There must be only one player');assert.ok(!html.slice(html.indexOf('<article id="content-milica"'),html.indexOf('</article>',html.indexOf('<article id="content-milica"'))).includes('<video'),'Story content must not contain the video');
  console.log('Phone checks passed: single player, flight/return, interruption, resize, keyboard, focus restoration, playback failure, visibility and reduced motion.');
})().catch(error=>{console.error(error);process.exitCode=1;});
