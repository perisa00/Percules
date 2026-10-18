'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/pages.js','utf8');
function fixture(path='/',storage=new Map(),fail=false){
 const assigned=[],context={console,Date,JSON,Number,Object,sessionStorage:{getItem:key=>{if(fail)throw Error('disabled');return storage.get(key);},setItem:(key,value)=>{if(fail)throw Error('disabled');storage.set(key,value);},removeItem:key=>{if(fail)throw Error('disabled');storage.delete(key);}},window:{location:{pathname:path,assign:url=>assigned.push(url)}}};
 vm.createContext(context);vm.runInContext(source,context);
 return {api:context.PerculesPages,assigned,storage};
}
const view={yaw:.37,pitch:.72,zoom:1,panX:.1,panY:-.1};
const root=fixture();assert.equal(root.api.current,null);assert.equal(root.api.home(),false);
assert.equal(root.api.go('apps',view),true);assert.deepEqual(root.assigned,['/aplikacije/']);
const arrival=fixture('/aplikacije/',root.storage);assert.equal(arrival.api.current,'apps');assert.deepEqual(JSON.parse(JSON.stringify(arrival.api.takeTransfer())),view);assert.equal(arrival.api.takeTransfer(),null,'The transfer is single use; reload must open the system directly');
assert.equal(arrival.api.go('apps'),false);assert.equal(arrival.api.home(),true);assert.deepEqual(arrival.assigned,['/']);
const returning=fixture('/aplikacije/');assert.equal(returning.api.home(view),true);
const home=fixture('/',returning.storage);assert.deepEqual(JSON.parse(JSON.stringify(home.api.takeTransfer())),view,'Home must resume the final camera after the reverse flight');assert.equal(home.api.takeTransfer(),null);
const zoomed=fixture();zoomed.api.go('apps',{...view,zoom:.35,panX:1,panY:-1});assert.ok(fixture('/aplikacije/',zoomed.storage).api.takeTransfer(),'A close map view remains valid across documents');
assert.equal(fixture('/missing/').api.current,null);
assert.equal(fixture('/aplikacije/index.html').api.current,'apps');
const blocked=fixture('/',new Map(),true);assert.equal(blocked.api.go('process',view),true);assert.deepEqual(blocked.assigned,['/nacin-rada/']);
const old=new Map([['percules-page-flight-v1',JSON.stringify({world:'apps',view,time:Date.now()-16000})]]);
assert.equal(fixture('/aplikacije/',old).api.takeTransfer(),null);
const bad=new Map([['percules-page-flight-v1',JSON.stringify({world:'apps',view:{...view,pitch:100},time:Date.now()})]]);
assert.equal(fixture('/aplikacije/',bad).api.takeTransfer(),null);
{
 const paths=[],assigned=[],handlers={},metadata=new Map(),body={dataset:{}};
 const document={body,title:'',querySelector:selector=>({setAttribute:(key,value)=>metadata.set(selector+':'+key,value)}),dispatchEvent:event=>paths.push({event:event.detail.world})};
 const window={location:{pathname:'/',assign:url=>assigned.push(url)},history:{pushState:(state,title,url)=>{paths.push(url);window.location.pathname=url;}},addEventListener:(type,fn)=>handlers[type]=fn};
 const context={window,document,console,Date,JSON,Number,Object,CustomEvent:function(type,{detail}){this.type=type;this.detail=detail;}};
 vm.createContext(context);vm.runInContext(source,context);const api=context.PerculesPages;
 assert.equal(api.enable(),true);assert.equal(api.go('apps'),false,'Enhanced routes keep the current document alive');
 assert.equal(api.current,'apps');assert.equal(document.title,'Aplikacije — Percules Digital Studio');assert.equal(body.dataset.entryWorld,'apps');
 assert.equal(metadata.get('link[rel="canonical"]:href'),'https://percules.rs/aplikacije/');
 assert.equal(api.go('apps'),false);assert.equal(paths.length,1,'No duplicate history entry for the current world');
 assert.equal(api.home(),true);assert.equal(api.current,null);assert.deepEqual(paths,['/aplikacije/','/']);assert.equal(assigned.length,0);
 window.location.pathname='/kontakt/';handlers.popstate();assert.equal(api.current,'contact');assert.deepEqual(paths.at(-1),{event:'contact'});
 window.history.pushState=()=>{throw Error('history unavailable');};api.go('process');assert.deepEqual(assigned,['/nacin-rada/'],'A failed enhanced route must still open a real document');
}
for(const [world,item] of Object.entries(root.api.routes)){
 const html=fs.readFileSync('public'+item.path+'index.html','utf8');
 assert.ok(html.includes('data-entry-world="'+world+'"'),'Direct route must boot its own world');
 assert.ok(html.includes('rel="canonical" href="https://percules.rs'+item.path+'"'));
 assert.ok(html.includes('<script src="/pages.js?v=3" defer>'));
 for(const item of Object.values(root.api.routes))assert.ok(html.includes('href="'+item.path+'"'),'All destinations must expose a native link');
 assert.ok(html.includes('<a')&&html.includes('href="/"'),'Each page must have a native way back');
 assert.ok(!/(?:href|src|poster)="(?:assets\/|[a-z-]+\.js)/.test(html),'Nested page assets must resolve from the site root');
}
console.log('Page checks passed: eight real documents, native navigation, direct entry, reload handoff, storage failure and invalid/expired state.');

