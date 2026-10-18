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
assert.equal(fixture('/missing/').api.current,null);
assert.equal(fixture('/aplikacije/index.html').api.current,'apps');
const blocked=fixture('/',new Map(),true);assert.equal(blocked.api.go('process',view),true);assert.deepEqual(blocked.assigned,['/nacin-rada/']);
const old=new Map([['percules-page-flight-v1',JSON.stringify({world:'apps',view,time:Date.now()-16000})]]);
assert.equal(fixture('/aplikacije/',old).api.takeTransfer(),null);
const bad=new Map([['percules-page-flight-v1',JSON.stringify({world:'apps',view:{...view,pitch:100},time:Date.now()})]]);
assert.equal(fixture('/aplikacije/',bad).api.takeTransfer(),null);
for(const [world,item] of Object.entries(root.api.routes)){
 const html=fs.readFileSync('public'+item.path+'index.html','utf8');
 assert.ok(html.includes('data-entry-world="'+world+'"'),'Direct route must boot its own world');
 assert.ok(html.includes('rel="canonical" href="https://percules.rs'+item.path+'"'));
 assert.ok(html.includes('<script src="/pages.js?v=1" defer>'));
 assert.ok(html.includes('<a')&&html.includes('href="/"'),'Each page must have a native way back');
 assert.ok(!/(?:href|src)="(?:assets\/|[a-z-]+\.js)/.test(html),'Nested page assets must resolve from the site root');
}
console.log('Page checks passed: eight real documents, native navigation, direct entry, reload handoff, storage failure and invalid/expired state.');

