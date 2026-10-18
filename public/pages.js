(() => {
'use strict';
const routes=Object.freeze({"studio":{"path":"/ko-smo/","title":"Ko smo","content":"sun","description":"Upoznaj Percules Digital Studio i ljude koji tvojoj ideji posvećuju punu pažnju."},"websites":{"path":"/sajtovi/","title":"Sajtovi","content":"neptune","description":"Izrada i redizajn sajtova, uz pažnju prema sadržaju, brzini i korišćenju na telefonu i računaru."},"apps":{"path":"/aplikacije/","title":"Aplikacije","content":"uranus","description":"Od ideje i tokova korišćenja do razvoja, testiranja i doterivanja tvoje aplikacije."},"support":{"path":"/podrska/","title":"Održavanje i podrška","content":"mercury","description":"Izmene, ispravke i dalji razvoj sajtova i aplikacija prema potrebama projekta."},"process":{"path":"/nacin-rada/","title":"Način rada","content":"saturn","description":"Razgovor, prvi prikaz, razvoj, testiranje i objava. Puna pažnja u svakoj fazi."},"milica":{"path":"/projekti/","title":"Projekti · Milica","content":"milica","description":"Upoznaj Miličinu aplikaciju i posvećenost iza projekta kroz njenu roze teretanu u svemiru."},"generator":{"path":"/3d-studio/","title":"3D studio","content":"generator","description":"Istraži Percules 3D studio i njegov prostor za ideje."},"contact":{"path":"/kontakt/","title":"Kontakt","content":"venus","description":"Ispričaj nam šta želiš da napraviš. Kontaktiraj Percules Digital Studio e-mailom ili telefonom."}});
function worldAtPath(){const path=window.location.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');return Object.keys(routes).find(world=>routes[world].path===path)||null;}
let current=worldAtPath(),live=false;
const homeTitle='Percules Digital Studio — Tvoja ideja. Naša puna pažnja';
const homeDescription='Percules Digital Studio — izrada sajtova i aplikacija, uz punu posvećenost od prvog razgovora do objave i daljeg razvoja.';
function updateDocument(world){
  current=world;const route=routes[world];document.title=route?route.title+' — Percules Digital Studio':homeTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content',route?.description||homeDescription);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href','https://percules.rs'+(route?.path||'/'));
  document.body.dataset.entryWorld=world||'';
}
function commit(world){
  if(!live)return false;
  try{window.history.pushState({percules:true},'',routes[world]?.path||'/');updateDocument(world);return true;}
  catch{live=false;return false;}
}
function enable(){live=typeof window.history?.pushState==='function';return live;}
const transferKey='percules-page-flight-v1';
function takeTransfer(){
  let saved;
  try{saved=JSON.parse(sessionStorage.getItem(transferKey)||'null');sessionStorage.removeItem(transferKey);}catch{return null;}
  if(!saved||saved.world!==current||Date.now()-saved.time>15000||Date.now()<saved.time)return null;
  const view=saved.view;
  if(!view||!['yaw','pitch','zoom','panX','panY'].every(key=>Number.isFinite(view[key])))return null;
  if(Math.abs(view.yaw)>100000||view.pitch<.12||view.pitch>1.35||view.zoom<.35||view.zoom>2||Math.abs(view.panX)>4||Math.abs(view.panY)>4)return null;
  return view;
}
function go(world,view=null){
  const destination=routes[world];if(!destination||world===current)return false;
  // Keep the scene and its GPU resources alive; direct links remain real documents.
  if(commit(world))return false;
  try{sessionStorage.removeItem(transferKey);if(view)sessionStorage.setItem(transferKey,JSON.stringify({world,view,time:Date.now()}));}catch{}
  window.location.assign(destination.path);return true;
}
function prepareHome(){
  if(!current||typeof document==='undefined'||document.querySelector('link[data-home-prefetch]'))return;
  const link=document.createElement('link');link.rel='prefetch';link.href='/';link.dataset.homePrefetch='true';document.head.append(link);
}
function home(view=null){
  if(!current)return false;
  if(commit(null))return true;
  try{sessionStorage.removeItem(transferKey);if(view)sessionStorage.setItem(transferKey,JSON.stringify({world:null,view,time:Date.now()}));}catch{}
  window.location.assign('/');return true;
}
window.addEventListener?.('popstate',()=>{
  if(!live)return;const world=worldAtPath();
  if(!world&&!['/','/index.html'].includes(window.location.pathname)){window.location.reload();return;}
  updateDocument(world);document.dispatchEvent(new CustomEvent('percules:route',{detail:{world}}));
});
globalThis.PerculesPages=Object.freeze({routes,get current(){return current;},enable,go,home,prepareHome,takeTransfer});
})();
