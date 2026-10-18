(() => {
'use strict';
const routes=Object.freeze({"studio":{"path":"/ko-smo/","title":"Ko smo","content":"sun","description":"Upoznaj Percules Digital Studio i ljude koji tvojoj ideji posvećuju punu pažnju."},"websites":{"path":"/sajtovi/","title":"Sajtovi","content":"neptune","description":"Izrada i redizajn sajtova, uz pažnju prema sadržaju, brzini i korišćenju na telefonu i računaru."},"apps":{"path":"/aplikacije/","title":"Aplikacije","content":"uranus","description":"Od ideje i tokova korišćenja do razvoja, testiranja i doterivanja tvoje aplikacije."},"support":{"path":"/podrska/","title":"Održavanje i podrška","content":"mercury","description":"Izmene, ispravke i dalji razvoj sajtova i aplikacija prema potrebama projekta."},"process":{"path":"/nacin-rada/","title":"Način rada","content":"saturn","description":"Razgovor, prvi prikaz, razvoj, testiranje i objava. Puna pažnja u svakoj fazi."},"milica":{"path":"/projekti/","title":"Projekti · Milica","content":"milica","description":"Upoznaj Miličinu aplikaciju i posvećenost iza projekta kroz njenu roze teretanu u svemiru."},"generator":{"path":"/3d-studio/","title":"3D studio","content":"generator","description":"Istraži Percules 3D studio i njegov prostor za ideje."},"contact":{"path":"/kontakt/","title":"Kontakt","content":"venus","description":"Ispričaj nam šta želiš da napraviš. Kontaktiraj Percules Digital Studio e-mailom ili telefonom."}});
const pathname=window.location.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');
const current=Object.keys(routes).find(world=>routes[world].path===pathname)||null;
const transferKey='percules-page-flight-v1';
function takeTransfer(){
  let saved;
  try{saved=JSON.parse(sessionStorage.getItem(transferKey)||'null');sessionStorage.removeItem(transferKey);}catch{return null;}
  if(!saved||saved.world!==current||Date.now()-saved.time>15000||Date.now()<saved.time)return null;
  const view=saved.view;
  if(!view||!['yaw','pitch','zoom','panX','panY'].every(key=>Number.isFinite(view[key])))return null;
  if(Math.abs(view.yaw)>100000||view.pitch<.12||view.pitch>1.35||view.zoom<.72||view.zoom>1.25||Math.abs(view.panX)>.32||Math.abs(view.panY)>.26)return null;
  return view;
}
function go(world,view=null){
  const destination=routes[world];if(!destination||world===current)return false;
  try{sessionStorage.removeItem(transferKey);if(view)sessionStorage.setItem(transferKey,JSON.stringify({world,view,time:Date.now()}));}catch{}
  window.location.assign(destination.path);return true;
}
function home(){if(!current)return false;window.location.assign('/');return true;}
globalThis.PerculesPages=Object.freeze({routes,current,go,home,takeTransfer});
})();
