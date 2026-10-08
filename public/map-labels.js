/* Compact callouts follow their own projected galactic destinations. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function layout(points,width,height){
    const compact=width<=800,margin=18,top=height<550?100:140,bottom=height-130;
    const finite=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.depth>0);
    const middleX=finite.length?finite.reduce((sum,p)=>sum+p.x,0)/finite.length:width/2;
    const middleY=finite.length?finite.reduce((sum,p)=>sum+p.y,0)/finite.length:height/2;
    const placed=[],result=new Map(),gap=compact?20:26;
    const ordered=[...points].sort((a,b)=>Math.hypot(b.x-middleX,b.y-middleY)-Math.hypot(a.x-middleX,a.y-middleY)||a.id.localeCompare(b.id));
    for(const p of ordered){
      const name=p.name||p.id;
      const labelWidth=Math.min(compact?120:136,Math.max(72,Array.from(name).length*(compact?5.8:6.7)+(compact?24:29)),width-2*margin);
      const px=Number.isFinite(p.x)?p.x:width/2,py=Number.isFinite(p.y)?p.y:height/2;
      const preferred=px<middleX?'left':'right';
      let best=null,bestScore=Infinity;
      for(const side of [preferred,preferred==='left'?'right':'left']){
        for(const extra of [0,44,88,132,176])for(const dy of [0,-52,52,-104,104,-156,156]){
          const x=clamp(side==='left'?px-gap-extra-labelWidth:px+gap+extra,margin,width-margin-labelWidth);
          const y=clamp(py-22+dy,top,Math.max(top,bottom-48));
          const actualSide=x+labelWidth/2<px?'left':'right',edge=actualSide==='left'?x+labelWidth:x;
          let overlaps=0,covered=0;
          for(const a of placed)if(x<a.labelX+a.width+6&&x+labelWidth+6>a.labelX&&y<a.labelY+48&&y+48>a.labelY)overlaps++;
          for(const a of finite)if(a.id!==p.id&&a.x>x-5&&a.x<x+labelWidth+5&&a.y>y+10&&a.y<y+34)covered++;
          const score=Math.hypot(edge-px,y+22-py)+overlaps*10000+covered*300+(side===preferred?0:8)+(p.previousSide&&actualSide!==p.previousSide?14:0);
          if(score<bestScore){bestScore=score;best={...p,width:labelWidth,labelX:x,labelY:y,side:actualSide};}
        }
      }
      placed.push(best);result.set(p.id,best);
    }
    return points.map(p=>result.get(p.id));
  }
  globalThis.PerculesMapLabels=Object.freeze({layout});
})();
