(() => {
'use strict';
const byId=id=>document.getElementById(id);
const menu=byId('studio-menu'),toggle=byId('menu-toggle'),panel=byId('detail-panel'),scroll=byId('detail-scroll');
const articles=[...scroll.querySelectorAll('[data-content]')];
const destinations=globalThis.PerculesDestinations;
let current=null,requested=null,origin=null;
articles.forEach(article=>{article.querySelector('h2').id=article.id+'-title';});
function dispatch(type,detail){document.dispatchEvent(new CustomEvent(type,{detail}));}
function menuOpen(open,restore=false){
  menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
  if(open){byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');menu.querySelector('nav button').focus({preventScroll:true});}
  else if(restore)toggle.focus({preventScroll:true});
}
function close(restore=false){
  panel.hidden=true;document.body.dataset.detail='closed';current=null;
  if(restore){const target=origin?.isConnected&&!origin.closest('[hidden]')?origin:byId('galaxy');target.focus({preventScroll:true});}
}
function show(id,world,focus=true){
  const key=world==='milica'?'milica':id;
  const article=articles.find(a=>a.dataset.content===key);if(!article)return;
  if(current===key&&!panel.hidden)return;
  current=key;articles.forEach(a=>a.hidden=a!==article);panel.hidden=false;
  document.body.dataset.detail='open';panel.setAttribute('aria-labelledby',article.id+'-title');
  byId('detail-close').setAttribute('aria-label',world==='milica'?'Zatvori detalje i vrati Miličin svet':'Zatvori detalje i vrati galaksiju');
  byId('detail-index').textContent=world==='milica'?'MILIČIN SVET':'PERCULES / '+String(articles.indexOf(article)+1).padStart(2,'0');
  scroll.scrollTop=0;
  if(focus){const heading=article.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
function travel(element){
  origin=element;menuOpen(false);close();
  const id=element.dataset.destination||null,world=element.dataset.world||Object.keys(destinations).find(key=>destinations[key].body===id)||'studio';
  requested={world,id};
  dispatch('percules:navigate',requested);
}
toggle.addEventListener('click',()=>menuOpen(menu.hidden));
document.querySelectorAll('[data-destination], [data-world]').forEach(button=>button.addEventListener('click',()=>travel(button)));
byId('studio-emblem').addEventListener('click',()=>{origin=byId('studio-emblem');dispatch('percules:navigate',{world:'studio',id:'sun'});});
byId('detail-close').addEventListener('click',()=>{close(true);dispatch('percules:unfocus');});
byId('about-close').addEventListener('click',()=>{byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});});
byId('about-toggle').addEventListener('click',()=>{menuOpen(false);close();});
document.addEventListener('percules:scene',event=>{
  const {scene,world,body}=event.detail;
  if(scene==='planet'&&body){show(body.id,world);requested=null;}
  else close();
});
document.addEventListener('percules:close',()=>{close();menuOpen(false);});
document.addEventListener('percules:unavailable',()=>{if(requested)show(requested.id||'jupiter',requested.world);});
document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!event.target.closest('#studio-menu, #menu-toggle'))menuOpen(false);});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!menu.hidden){event.preventDefault();menuOpen(false,true);}
  else if(!byId('about-panel').hidden){event.preventDefault();byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
  else if(!panel.hidden){event.preventDefault();close(true);dispatch('percules:unfocus');}
});
byId('inquiry-form').addEventListener('submit',event=>{
  event.preventDefault();
  const text=byId('inquiry-message').value.trim();if(!text){byId('inquiry-message').focus();return;}
  const type=byId('inquiry-type').value,ready=byId('inquiry-ready');
  ready.href='mailto:aleksa.perisic2000@gmail.com?subject='+encodeURIComponent('Percules — '+type)+'&body='+encodeURIComponent('Zdravo Percules,\n\n'+text+'\n\nTema: '+type);
  ready.hidden=false;byId('inquiry-status').textContent='Poruka je pripremljena. Otvori e-mail, proveri ga i pošalji kada želiš.';
  ready.focus({preventScroll:true});
});
})();
