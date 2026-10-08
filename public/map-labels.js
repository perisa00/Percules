/* Compact callouts stay just beyond the projected galactic disk. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Convex screen silhouette includes both sides of the thin disk.
  function outline(samples){
    const sorted=samples.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.depth>0).sort((a,b)=>a.x-b.x||a.y-b.y);
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const lower=[],upper=[];
    for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
    for(let i=sorted.length-1;i>=0;i--){const p=sorted[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
    return lower.slice(0,-1).concat(upper.slice(0,-1));
  }
  function bandRange(boundary,y){
    const lo=y+10,hi=y+34;let left=Infinity,right=-Infinity;
    for(let i=0;i<boundary.length;i++){
      const a=boundary[i],b=boundary[(i+1)%boundary.length];
      if(a.y>=lo&&a.y<=hi){left=Math.min(left,a.x);right=Math.max(right,a.x);}
      if(a.y!==b.y)for(const edge of [lo,hi]){
        const t=(edge-a.y)/(b.y-a.y);
        if(t>=0&&t<=1){const x=a.x+(b.x-a.x)*t;left=Math.min(left,x);right=Math.max(right,x);}
      }
    }
    return {left,right};
  }
  function outside(x,y,width,boundary){
    if(!boundary.length)return true;
    const range=bandRange(boundary,y);
    return x+width<=range.left-12||x>=range.right+12;
  }
  function layout(points,width,height,boundary=[]){
    const compact=width<=800,margin=18,top=height<550?100:140,bottom=height-130;
    const finite=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.depth>0);
    const middleX=finite.length?finite.reduce((sum,p)=>sum+p.x,0)/finite.length:width/2;
    const middleY=finite.length?finite.reduce((sum,p)=>sum+p.y,0)/finite.length:height/2;
    const placed=[],result=new Map(),gap=compact?20:26,labelHeight=boundary.length?32:48;
    const rimTop=boundary.length?Math.min(...boundary.map(p=>p.y)):0;
    const rimBottom=boundary.length?Math.max(...boundary.map(p=>p.y)):0;
    const ordered=[...points].sort((a,b)=>Math.hypot(b.x-middleX,b.y-middleY)-Math.hypot(a.x-middleX,a.y-middleY)||a.id.localeCompare(b.id));
    for(const p of ordered){
      const name=p.name||p.id;
      const labelWidth=Math.min(compact?120:136,Math.max(72,Array.from(name).length*(compact?5.8:6.7)+(compact?24:29)),width-2*margin);
      const px=Number.isFinite(p.x)?p.x:width/2,py=Number.isFinite(p.y)?p.y:height/2;
      const preferred=px<middleX?'left':'right';
      let best=null,bestScore=Infinity;
      for(const side of [preferred,preferred==='left'?'right':'left']){
        for(const desiredY of [py-22,py-74,py+30,py-126,py+82,py-178,py+134,rimTop-66,rimBottom+14,top,bottom-48,...placed.flatMap(a=>[a.labelY-labelHeight-4,a.labelY+labelHeight+4])]){
          const y=clamp(desiredY,top,Math.max(top,bottom-48));
          const range=bandRange(boundary,y);
          for(const extra of [0,44,88,132,176]){
          const desiredX=side==='left'?Math.min(px-gap,range.left-12)-extra-labelWidth:Math.max(px+gap,range.right+12)+extra;
          const x=clamp(desiredX,margin,width-margin-labelWidth);
          const actualSide=x+labelWidth/2<px?'left':'right',edge=actualSide==='left'?x+labelWidth:x;
          let overlaps=0,covered=0;
          for(const a of placed)if(x<a.labelX+a.width+6&&x+labelWidth+6>a.labelX&&y<a.labelY+labelHeight&&y+labelHeight>a.labelY)overlaps++;
          for(const a of finite)if(a.id!==p.id&&a.x>x-5&&a.x<x+labelWidth+5&&a.y>y+10&&a.y<y+34)covered++;
          const score=Math.hypot(edge-px,y+22-py)+((x+labelWidth<=range.left-12||x>=range.right+12)?0:1000000)+overlaps*10000+covered*300+(side===preferred?0:8)+(p.previousSide&&actualSide!==p.previousSide?14:0);
          if(score<bestScore){bestScore=score;best={...p,width:labelWidth,labelX:x,labelY:y,side:actualSide};}
        }
      }
      }
      placed.push(best);result.set(p.id,best);
    }
    return points.map(p=>result.get(p.id));
  }
  globalThis.PerculesMapLabels=Object.freeze({layout,outline,outside});
})();
