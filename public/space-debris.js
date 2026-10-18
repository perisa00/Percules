import {rockVertices,rockIndices} from './generated-rock.js?v=1';

// One baked draw call, reusing the actual TRELLIS.2 Lunar_Crag geometry.
export function createDebrisGeometry(coarse=false){
  const count=coarse?5:9,data=new Float32Array(count*rockIndices.length*9);
  let cursor=0;
  for(let instance=0;instance<count;instance++){
    const angle=instance/count*Math.PI*2+.37,radius=14.8+(instance%3)*1.45,size=.24+(instance%4)*.13;
    const center=[Math.cos(angle)*radius,(instance%3-1)*.35,Math.sin(angle)*radius];
    const spin=instance*2.17,tilt=instance*.73,c=Math.cos(spin),s=Math.sin(spin),ct=Math.cos(tilt),st=Math.sin(tilt);
    const rotate=(x,y,z)=>{const a=x*c-z*s,b=x*s+z*c;return [a,y*ct-b*st,y*st+b*ct];};
    for(const index of rockIndices){
      const offset=index*9,p=rotate(...rockVertices.subarray(offset,offset+3)),n=rotate(...rockVertices.subarray(offset+3,offset+6));
      for(let axis=0;axis<3;axis++)data[cursor++]=center[axis]+p[axis]*size;
      for(const value of n)data[cursor++]=value;
      for(const value of rockVertices.subarray(offset+6,offset+9))data[cursor++]=value;
    }
  }
  return {data,count:data.length/9,instances:count};
}
