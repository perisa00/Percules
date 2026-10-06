// Procedural soundscape: no audio downloads, no autoplay, one graph per visit.
export function createSoundEngine(ctx){
  const mix=ctx.createGain(),master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.18;
  master.gain.value=0;mix.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
  const ambient=ctx.createGain();ambient.gain.value=.65;ambient.connect(mix);
  const delay=ctx.createDelay(1),feedback=ctx.createGain(),echoFilter=ctx.createBiquadFilter(),wet=ctx.createGain();
  delay.delayTime.value=.19;feedback.gain.value=.24;echoFilter.type='lowpass';echoFilter.frequency.value=1800;wet.gain.value=.16;
  delay.connect(echoFilter);echoFilter.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(mix);
  let seed=18377;const noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),samples=noise.getChannelData(0);
  for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967296)*2-1;}
  // A short crossfade makes the looping bed continuous at its seam.
  const overlap=Math.min(2048,samples.length/4);
  for(let i=0;i<overlap;i++){const f=i/(overlap-1);samples[samples.length-overlap+i]=samples[samples.length-overlap+i]*(1-f)+samples[i]*f;}
  const voices=new Set();let enabled=false;
  function gainEnvelope(gain,start,peak,attack,end){
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(peak,start+attack);gain.gain.exponentialRampToValueAtTime(.0001,end-.015);gain.gain.linearRampToValueAtTime(0,end);
  }
  function voice(source,gain,pan,start,end,echo=true){
    const panner=ctx.createStereoPanner();panner.pan.value=pan;
    gain.connect(panner);panner.connect(mix);if(echo)panner.connect(delay);
    const entry={source,gain,panner};voices.add(entry);
    source.onended=()=>{voices.delete(entry);source.disconnect();gain.disconnect();panner.disconnect();};
    source.start(start);source.stop(end+.02);return entry;
  }
  function tone(frequency,start,length,peak,pan=0,endFrequency=frequency){
    const source=ctx.createOscillator(),gain=ctx.createGain();source.type='sine';source.frequency.setValueAtTime(frequency,start);source.frequency.exponentialRampToValueAtTime(endFrequency,start+length*.8);
    gainEnvelope(gain,start,peak,.025,start+length);source.connect(gain);voice(source,gain,pan,start,start+length);
  }
  function bed(frequency,level,pan,rate){
    const oscillator=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner(),lfo=ctx.createOscillator(),depth=ctx.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=level;panner.pan.value=pan;
    lfo.frequency.value=rate;depth.gain.value=level*.22;lfo.connect(depth);depth.connect(gain.gain);
    oscillator.connect(gain);gain.connect(panner);panner.connect(ambient);oscillator.start();lfo.start();
  }
  bed(55,.065,-.35,.071);bed(82.4069,.038,.35,.053);bed(110.12,.014,-.1,.039);
  const air=ctx.createBufferSource(),airFilter=ctx.createBiquadFilter(),airGain=ctx.createGain();
  air.buffer=noise;air.loop=true;air.loopStart=overlap/ctx.sampleRate;airFilter.type='lowpass';airFilter.frequency.value=270;airGain.gain.value=.035;
  air.connect(airFilter);airFilter.connect(airGain);airGain.connect(ambient);air.start();
  function cancel(){
    const now=ctx.currentTime;
    for(const {source,gain} of voices){gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.012);try{source.stop(now+.07);}catch{}}
  }
  function jump({delay:wait=0,duration=.5,shieldDuration=1.65,shield=true}={}){
    if(!enabled||(ctx.state==='suspended'&&typeof ctx.startRendering!=='function'))return;
    cancel();const start=ctx.currentTime+Math.max(0,wait),end=start+duration;
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;
    filter.type='bandpass';filter.Q.value=.7;filter.frequency.setValueAtTime(180,start);filter.frequency.exponentialRampToValueAtTime(2600,start+duration*.58);filter.frequency.exponentialRampToValueAtTime(180,end+.65);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.34,start+.07);gain.gain.linearRampToValueAtTime(.64,start+duration*.56);gain.gain.exponentialRampToValueAtTime(.07,end);gain.gain.exponentialRampToValueAtTime(.0001,end+.75);gain.gain.linearRampToValueAtTime(0,end+.8);
    source.connect(filter);filter.connect(gain);const sweep=voice(source,gain,-.1,start,end+.8);sweep.panner.pan.setValueAtTime(-.25,start);sweep.panner.pan.linearRampToValueAtTime(.25,end);
    tone(65,start,duration+.35,.11,0,180);
    if(shield){
      // The watery shimmer starts on the exact same clock as the visual jump.
      tone(1046.5,start,shieldDuration,.045,-.45,880);
      tone(1568,start,shieldDuration*.85,.022,.45,1396.9);
      tone(2093,start+.10,shieldDuration*.64,.009,.15,1760);
    }
    tone(58,end,.42,.16,0,43);
  }
  return {
    setEnabled(value){enabled=value;const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(value?.42:0,now,value?.35:.025);if(!value)cancel();},
    jump,cancel,
    select(){if(enabled&&ctx.state!=='suspended')tone(523.25,ctx.currentTime,.18,.035,.12,659.25);},
    scene(local){ambient.gain.setTargetAtTime(local?.48:.65,ctx.currentTime,1.1);},
    get enabled(){return enabled;}
  };
}

const button=document.getElementById('sound-toggle');
if(button){
  let ctx=null,engine=null,wanted=false,busy=false,suspendTimer=0;
  function label(){button.setAttribute('aria-pressed',String(wanted));button.setAttribute('aria-label',wanted?'Isključi zvuk':'Uključi zvuk');button.title=wanted?'Isključi ambijent i efekte':'Uključi ambijent i efekte';button.dataset.audio=ctx?.state||'off';}
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
