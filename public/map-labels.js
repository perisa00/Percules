/* Labels stay outside the disk; endpoints follow the projected 3D destinations. */
(() => {
  'use strict';
  function layout(points,width,height){
    const compact=width<=800,labelWidth=Math.min(compact?150:190,(width-52)/2);
    if(compact&&height>550)return points.map((p,i)=>{
      const row=i<4?Math.floor(i/2):2+Math.floor((i-4)/2);
      const y=[Math.max(142,height*.20),Math.max(198,height*.28),height*.68,Math.max(height*.76,height*.68+56)][row];
      const x=i===6?(width-labelWidth)/2:i%2===0?18:width-labelWidth-18;
      return {...p,width:labelWidth,labelX:x,labelY:y,side:x+labelWidth/2<width/2?'left':'right'};
    });
    const sorted=[...points].sort((a,b)=>a.x-b.x),split=Math.ceil(sorted.length/2),result=[];
    for(const [side,list] of [['left',sorted.slice(0,split)],['right',sorted.slice(split)]]){
      list.sort((a,b)=>a.y-b.y);
      list.forEach((p,i)=>{const top=height<550?100:Math.max(compact?135:142,height*.23),bottom=height<550?height-110:height*.65;
        result.push({...p,width:labelWidth,labelX:side==='left'?compact?18:28:width-labelWidth-(compact?18:28),labelY:list.length===1?(top+bottom)/2:top+(bottom-top)*i/(list.length-1),side});
      });
    }
    return result;
  }
  globalThis.PerculesMapLabels=Object.freeze({layout});
})();
