'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers=new Map(),nodes=new Map(),navigations=[];
function node(id,tagName='BUTTON'){
 if(nodes.has(id))return nodes.get(id);
 const value={id,tagName,dataset:{},hidden:true,style:{},listeners:{},isConnected:true,
 setAttribute(){},focus(){},closest(){return null;},addEventListener(type,fn){this.listeners[type]=fn;},querySelector:()=>node(id+'-heading'),querySelectorAll:()=>[]};
 nodes.set(id,value);return value;
}
const body=node('body','BODY');body.dataset.world='apps';
const articles=[...fs.readFileSync('public/index.html','utf8').matchAll(/<article id="([^"]+)" data-content="([^"]+)"/g)].map(([,id,key])=>{const a=node(id,'ARTICLE');a.dataset.content=key;return a;});
node('detail-scroll').querySelectorAll=()=>articles;
const contact=node('contact-link','A');contact.dataset.destination='venus';contact.dataset.world='contact';
const doc={body,getElementById:node,querySelectorAll(selector){
 return [...nodes.values()].filter(e=>selector.split(',').some(part=>{const m=part.trim().match(/^(button|a)?\[data-(destination|world)\]$/i);return m&&(!m[1]||e.tagName===m[1].toUpperCase())&&e.dataset[m[2]]!==undefined;}));
},addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},
dispatchEvent(e){if(e.type==='percules:navigate')navigations.push(e.detail);for(const fn of handlers.get(e.type)||[])fn(e);}};
const context={console,document:doc,matchMedia:()=>({matches:false}),CustomEvent:function(type,{detail}={}){this.type=type;this.detail=detail;},innerWidth:1280,innerHeight:720};
vm.createContext(context);vm.runInContext(fs.readFileSync('public/destinations.js','utf8'),context);vm.runInContext(fs.readFileSync('public/studio.js','utf8'),context);
function click(element){const event={button:0,preventDefault(){}};element.listeners.click?.(event);body.listeners.click?.(event);}
click(node('menu-toggle'));assert.equal(node('studio-menu').hidden,false,'A destination page body must not intercept menu clicks');
click(contact);assert.equal(navigations.length,1,'A native link must navigate only once');assert.equal(navigations[0].world,'contact');
node('galaxy').dataset.zoomTarget='contact';
doc.dispatchEvent({type:'percules:request',detail:{world:'apps'}});
node('loading-content').listeners.click();assert.equal(articles.find(a=>a.dataset.content==='uranus').hidden,false,'Reading during loading must use the chosen star, not the previous zoom target');
doc.dispatchEvent({type:'percules:unavailable',detail:{world:'process'}});
assert.equal(articles.find(a=>a.dataset.content==='saturn').hidden,false,'Failure must retain the exact destination');
assert.equal(articles.filter(a=>!a.hidden).length,1);
console.log('Studio UI checks passed: page body isolation, menu, one link action, loading story and failure destination.');
