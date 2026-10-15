// Short, quiet navigation cues. No continuous drone and no download/autoplay.
export function createSoundEngine(ctx){
  const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  const voices=new Set();let enabled=false;
  function tone(frequency,start,length,level){
    const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    source.type='sine';source.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=1400;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,start+length-.02);gain.gain.linearRampToValueAtTime(0,start+length);
    source.connect(filter);filter.connect(gain);gain.connect(master);
    const voice={source,gain};voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(start);source.stop(start+length+.01);
  }
  function cancel(){
    const now=ctx.currentTime;
    for(const {source,gain} of voices){gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.012);try{source.stop(now+.06);}catch{}}
  }
  function available(){return enabled&&(ctx.state!=='suspended'||typeof ctx.startRendering==='function');}
  return {
    setEnabled(value){enabled=value;const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(value?.32:0,now,.025);if(!value)cancel();},
    jump({delay=0,duration=.5}={}){if(!available())return;cancel();const start=ctx.currentTime+Math.max(0,delay);tone(261.63,start,.24,.055);tone(392,start+Math.min(duration,.5)*.65,.33,.045);},
    select(){if(!available())return;cancel();tone(523.25,ctx.currentTime,.13,.045);},
    scene(){},cancel,get enabled(){return enabled;}
  };
}

const button=document.getElementById('sound-toggle');
if(button){
  let ctx=null,engine=null,wanted=false,busy=false,suspendTimer=0;
  function label(){button.setAttribute('aria-pressed',String(wanted));button.setAttribute('aria-label',wanted?'Isključi zvuk':'Uključi zvuk');button.title=wanted?'Isključi tihe zvukove prelaza':'Uključi tihe zvukove prelaza';button.dataset.audio=ctx?.state||'off';}
  button.addEventListener('click',async()=>{
    if(busy)return;busy=true;
    try{
      clearTimeout(suspendTimer);
      if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');ctx=new Audio({latencyHint:'interactive'});engine=createSoundEngine(ctx);ctx.onstatechange=label;}
      wanted=!wanted;
      if(wanted){await ctx.resume();engine.scene(document.body.dataset.scene!=='galaxy');engine.setEnabled(true);}
      else {engine.setEnabled(false);suspendTimer=setTimeout(()=>{if(!wanted)ctx.suspend().catch(()=>{});},180);}
      label();
    }catch(error){wanted=false;engine?.setEnabled(false);label();button.title='Zvuk nije dostupan — pokušaj ponovo';console.warn('Space audio unavailable:',error);}
    finally{busy=false;}
  });
  document.addEventListener('percules:audio',event=>{
    if(!engine||!wanted||document.hidden)return;
    const {type,...options}=event.detail;
    if(type==='jump')engine.jump(options);else if(type==='cancel')engine.cancel();else if(type==='select')engine.select();else if(type==='scene')engine.scene(options.local);
  });
  document.addEventListener('visibilitychange',async()=>{
    if(!ctx)return;clearTimeout(suspendTimer);engine.cancel();
    try{if(document.hidden){engine.setEnabled(false);await ctx.suspend();}else if(wanted){await ctx.resume();engine.setEnabled(true);}}catch{wanted=false;}
    label();
  });
  label();
}
