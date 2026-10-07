(() => {
'use strict';
const byId=id=>document.getElementById(id);
const menu=byId('studio-menu'),toggle=byId('menu-toggle'),panel=byId('detail-panel'),scroll=byId('detail-scroll');
const articles=[...scroll.querySelectorAll('[data-content]')];
const destinations=globalThis.PerculesDestinations;
const preview=byId('object-preview');
let current=null,requested=null,origin=null,previewBody=null,previewKey='';
articles.forEach(article=>{article.querySelector('h2').id=article.id+'-title';});
function dispatch(type,detail){document.dispatchEvent(new CustomEvent(type,{detail}));}
function hidePreview(){preview.hidden=true;previewBody=null;previewKey='';}
function menuOpen(open,restore=false){
  menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
  if(open){hidePreview();dispatch('percules:preview',{});byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');menu.querySelector('nav button').focus({preventScroll:true});}
  else if(restore)toggle.focus({preventScroll:true});
}
function close(restore=false){
  panel.hidden=true;document.body.dataset.detail='closed';current=null;
  if(restore){const target=origin?.isConnected&&!origin.closest('[hidden]')?origin:byId('galaxy');target.focus({preventScroll:true});}
}
function show(id,world,focus=true,body=null){
  const key=world==='milica'?'milica':id;
  const article=articles.find(a=>a.dataset.content===key);if(!article)return;
  const selection=world+':'+(body?.id||key);if(current===selection&&!panel.hidden)return;
  current=selection;hidePreview();
  const context=byId('object-context');context.hidden=!body||body.id==='sun'||body.id===key||world==='milica';
  if(!context.hidden){byId('object-context-title').textContent=body.headline;byId('object-context-description').textContent=body.text;}articles.forEach(a=>a.hidden=a!==article);panel.hidden=false;
  document.body.dataset.detail='open';panel.setAttribute('aria-labelledby',article.id+'-title');
  byId('detail-close').setAttribute('aria-label','Zatvori detalje i vrati ceo sistem');
  byId('detail-index').textContent=world==='milica'?'MILIČIN SVET':'PERCULES / '+String(articles.indexOf(article)+1).padStart(2,'0');
  scroll.scrollTop=0;
  if(focus){const heading=article.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
}
function travel(element){
  origin=element;hidePreview();menuOpen(false);close();
  const id=element.dataset.destination||null,world=element.dataset.world||Object.keys(destinations).find(key=>destinations[key].body===id)||'studio';
  requested={world,id};
  dispatch('percules:navigate',requested);
}
toggle.addEventListener('click',()=>menuOpen(menu.hidden));
document.querySelectorAll('[data-destination], [data-world]').forEach(button=>button.addEventListener('click',()=>travel(button)));
const emblem=byId('studio-emblem'),coarse=matchMedia('(pointer: coarse)').matches;
emblem.addEventListener('click',event=>{origin=emblem;dispatch('percules:object',{id:'sun',preview:coarse&&event.detail!==0});});
emblem.addEventListener('pointerenter',()=>{if(!coarse)dispatch('percules:preview',{id:'sun'});});
emblem.addEventListener('focus',()=>dispatch('percules:preview',{id:'sun'}));
byId('preview-open').addEventListener('pointerdown',event=>event.preventDefault());
byId('preview-open').addEventListener('click',()=>{if(previewBody)dispatch('percules:object',{id:previewBody.id});});
document.addEventListener('percules:hover',event=>{
  const detail=event.detail;
  if(!detail||!menu.hidden||document.body.dataset.scene!=='system'||document.body.dataset.detail==='open'||document.body.dataset.flight==='active'){hidePreview();return;}
  const {body,world,x,y,radius}=detail,key=world+':'+body.id;previewBody=body;
  if(previewKey!==key){
    previewKey=key;byId('preview-kind').textContent=body.kind;byId('preview-title').textContent=body.headline||body.name;
    byId('preview-description').textContent=body.text;byId('preview-open').textContent=body.destination?'Uđi u '+body.name+' ↗':'Otvori detalje ↗';
  }
  preview.hidden=false;
  if(!coarse&&innerWidth>800){
    const w=preview.offsetWidth||320,h=preview.offsetHeight||190;
    const left=x+radius+24+w<innerWidth-24?x+radius+24:x-radius-w-24;
    preview.style.left=Math.max(24,Math.min(innerWidth-w-24,left))+'px';
    preview.style.top=Math.max(130,Math.min(innerHeight-h-135,y-h*.35))+'px';
  }
});

byId('detail-close').addEventListener('click',()=>{close(true);dispatch('percules:unfocus');});
byId('about-close').addEventListener('click',()=>{byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});});
byId('about-toggle').addEventListener('click',()=>{menuOpen(false);close();});
document.addEventListener('percules:scene',event=>{
  const {scene,world,body}=event.detail;
  if(scene==='planet'&&body){show(body.content||body.id,world,true,body);requested=null;}
  else close();
  if(scene!=='system')hidePreview();
});
document.addEventListener('percules:close',()=>{hidePreview();close();menuOpen(false);});
document.addEventListener('percules:unavailable',()=>{if(requested)show(requested.id||'jupiter',requested.world);});
document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!event.target.closest('#studio-menu, #menu-toggle'))menuOpen(false);});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!menu.hidden){event.preventDefault();menuOpen(false,true);}
  else if(!byId('about-panel').hidden){event.preventDefault();byId('about-panel').hidden=true;byId('about-toggle').setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
  else if(!panel.hidden){event.preventDefault();close(true);dispatch('percules:unfocus');}
  else if(!preview.hidden){event.preventDefault();hidePreview();dispatch('percules:preview',{});}
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
