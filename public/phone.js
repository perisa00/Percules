// The scene's phone is also the player: one element flies out and returns home.
export function createFairyPhone(doc=document,win=window){
  const phone=doc.getElementById('milica-phone'),video=doc.getElementById('milica-promo');
  const openButton=doc.getElementById('phone-open'),closeButton=doc.getElementById('phone-close');
  const playButton=doc.getElementById('phone-play'),shade=doc.getElementById('phone-backdrop');
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  let mode='docked',flight=null,sequence=0,playRequest=0,background=[];
  const setMode=value=>{mode=value;phone.dataset.mode=value;doc.body.dataset.phone=value;};
  const dock=()=>({x:parseFloat(phone.style.left)||win.innerWidth*.83,y:parseFloat(phone.style.top)||win.innerHeight*.49,w:parseFloat(phone.style.getPropertyValue('--phone-width'))||128});
  const front=()=>({x:win.innerWidth/2,y:win.innerHeight/2+12,w:Math.max(70,Math.min(300,(win.innerHeight-145)/2.08,win.innerWidth-100))});
  function snapshot(){const s=win.getComputedStyle(phone);return {x:parseFloat(s.left),y:parseFloat(s.top),w:parseFloat(s.width)};}
  function fly(to,finish,duration=900){
    const from=snapshot(),ticket=++sequence;flight?.cancel();
    const frame=p=>({left:p.x+'px',top:p.y+'px',width:p.w+'px'});
    const middle={x:from.x+(to.x-from.x)*.6,y:from.y+(to.y-from.y)*.6-Math.min(65,win.innerHeight*.07),w:from.w+(to.w-from.w)*.6};
    if(!phone.animate){phone.style.setProperty('--front-x',to.x+'px');phone.style.setProperty('--front-y',to.y+'px');phone.style.setProperty('--front-width',to.w+'px');phone.classList.add('phone-static-flight');finish();return;}
    flight=phone.animate([frame(from),{...frame(middle),offset:.6},frame(to)],{duration:motion.matches?0:duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'});
    flight.finished.then(()=>{if(ticket===sequence)finish();}).catch(()=>{});
  }
  function restoreBackground(){for(const [element,inert] of background)element.inert=inert;background=[];}
  function finishClose(restoreFocus){
    ++sequence;flight?.cancel();flight=null;phone.classList.remove('phone-static-flight');
    video.hidden=true;openButton.hidden=false;closeButton.hidden=playButton.hidden=true;
    shade.hidden=true;setMode('docked');phone.removeAttribute('role');phone.removeAttribute('aria-modal');
    restoreBackground();if(restoreFocus&&!phone.hidden)openButton.focus({preventScroll:true});
  }
  function close(immediate=false,restoreFocus=true){
    if(mode==='docked')return;
    ++playRequest;video.pause();setMode('closing');
    if(immediate)finishClose(restoreFocus);else fly(dock(),()=>finishClose(restoreFocus),760);
  }
  function play(){
    const request=++playRequest;playButton.hidden=true;
    try{Promise.resolve(video.play()).then(()=>{
      if(request!==playRequest||mode==='docked'||mode==='closing'||doc.hidden)video.pause();
    }).catch(()=>{if(request===playRequest&&mode!=='docked'&&mode!=='closing')playButton.hidden=false;});}
    catch{playButton.hidden=false;}
  }
  function open(){
    if(mode!=='docked')return;
    doc.dispatchEvent(new win.CustomEvent('percules:close'));
    background=[...phone.parentElement.children].filter(e=>e!==phone&&e!==shade).map(e=>[e,e.inert]);
    for(const [element] of background)element.inert=true;
    phone.hidden=false;shade.hidden=false;video.hidden=false;openButton.hidden=true;closeButton.hidden=false;
    phone.setAttribute('role','dialog');phone.setAttribute('aria-modal','true');setMode('opening');
    closeButton.focus({preventScroll:true});play();
    fly(front(),()=>setMode('open'));
  }
  openButton.addEventListener('click',open);closeButton.addEventListener('click',()=>close());
  shade.addEventListener('click',()=>close());playButton.addEventListener('click',play);
  doc.addEventListener('keydown',event=>{
    if(mode==='docked')return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    else if(event.key==='Tab'){
      const last=playButton.hidden?video:playButton;
      if(event.shiftKey&&doc.activeElement===closeButton){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();closeButton.focus();}
    }
  },true);
  doc.addEventListener('focusin',event=>{if(mode!=='docked'&&!phone.contains(event.target))closeButton.focus({preventScroll:true});});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){++playRequest;video.pause();}});
  doc.addEventListener('percules:close',()=>close(true,false));
  doc.addEventListener('percules:scene',event=>{if(event.detail.world!=='milica'||event.detail.scene!=='system')close(true,false);});
  win.addEventListener('resize',()=>{if(mode==='open'||mode==='opening')fly(front(),()=>setMode('open'),250);else if(mode==='closing')fly(dock(),()=>finishClose(true),250);});
  motion.addEventListener('change',()=>{if(motion.matches&&mode!=='docked'){if(mode==='closing')close(true);else fly(front(),()=>setMode('open'),0);}});
  return {open,close,state:()=>mode};
}
if(document.getElementById('phone-open'))createFairyPhone();
