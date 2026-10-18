// Offline asset preparation only. Uses existing local tools, never a browser dependency.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [source,toolRoot,outRoot]=process.argv.slice(2);
if(!source||!toolRoot||!outRoot)throw Error('Usage: node prepare_rock.mjs source.glb existing_node_modules output_directory');
const {MeshoptSimplifier:simplifier}=await import(pathToFileURL(path.join(toolRoot,'meshoptimizer/index.js')));
const sharpPackage=JSON.parse(fs.readFileSync(path.join(toolRoot,'sharp/package.json')));
const {default:sharp}=await import(pathToFileURL(path.join(toolRoot,'sharp',sharpPackage.main)));
await simplifier.ready;
const data=fs.readFileSync(source),jsonSize=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+jsonSize)),binStart=28+jsonSize;
if(data.toString('ascii',0,4)!=='glTF'||doc.extensionsRequired?.length)throw Error('Expected an uncompressed GLB');
const primitive=doc.meshes[0].primitives[0];
function accessor(index){
 const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes=4,stride=v.byteStride||size*bytes,start=binStart+(v.byteOffset||0)+(a.byteOffset||0);
 if(![5125,5126].includes(a.componentType))throw Error('Unexpected component type');
 const result=a.componentType===5125?new Uint32Array(a.count*size):new Float32Array(a.count*size);
 for(let i=0;i<a.count;i++)for(let j=0;j<size;j++)result[i*size+j]=a.componentType===5125?data.readUInt32LE(start+i*stride+j*bytes):data.readFloatLE(start+i*stride+j*bytes);
 return result;
}
const positions=accessor(primitive.attributes.POSITION),normals=accessor(primitive.attributes.NORMAL),uv=accessor(primitive.attributes.TEXCOORD_0),original=accessor(primitive.indices);
const remap=simplifier.generatePositionRemap(positions,3),welded=original.map(i=>remap[i]);
const [indices,error]=simplifier.simplify(welded,positions,3,512*3,.025,['Permissive','Prune']);
const material=doc.materials[primitive.material],image=doc.images[doc.textures[material.pbrMetallicRoughness.baseColorTexture.index].source],imageView=doc.bufferViews[image.bufferView];
const {data:pixels,info}=await sharp(data.subarray(binStart+imageView.byteOffset,binStart+imageView.byteOffset+imageView.byteLength)).removeAlpha().raw().toBuffer({resolveWithObject:true});
const unique=[...new Set(indices)],compact=new Map(unique.map((id,index)=>[id,index])),scale=1/Math.max(...unique.map(i=>Math.hypot(...positions.subarray(i*3,i*3+3))));
const vertices=[];
for(const i of unique){
 const x=Math.min(info.width-1,Math.max(0,Math.round(uv[i*2]*(info.width-1)))),y=Math.min(info.height-1,Math.max(0,Math.round(uv[i*2+1]*(info.height-1)))),o=(y*info.width+x)*info.channels;
 const c=[pixels[o]/255,pixels[o+1]/255,pixels[o+2]/255],l=c[0]*.2126+c[1]*.7152+c[2]*.0722,n=[...normals.subarray(i*3,i*3+3)],length=Math.hypot(...n)||1;
 vertices.push(...[...positions.subarray(i*3,i*3+3)].map(v=>v*scale),...n.map(v=>v/length),...c.map(v=>l*.7+v*.3));
}
const rounded=vertices.map(v=>Number(v.toFixed(5))),compactIndices=[...indices].map(i=>compact.get(i));
fs.mkdirSync(outRoot,{recursive:true});
fs.writeFileSync(path.join(outRoot,'generated-rock.js'),'// Lunar_Crag, generated with TRELLIS.2 for Percules. Optimized offline; original preserved.\nexport const rockVertices=new Float32Array('+JSON.stringify(rounded)+');\nexport const rockIndices=new Uint16Array('+JSON.stringify(compactIndices)+');\n');
const report={source:'Lunar_Crag.glb',generator:'TRELLIS.2',collection:'Percules unity-objects-batch-2',sha256:createHash('sha256').update(data).digest('hex'),sourceBytes:data.length,sourceTriangles:original.length/3,triangles:indices.length/3,vertices:unique.length,normalizedError:error,tool:'meshoptimizer 1.1.1',changes:'Welded duplicate positions, simplified geometry, normalized size, baked original base color to vertices and reduced color saturation. No runtime decoder or new generation job.'};
fs.mkdirSync(path.join(outRoot,'assets/debris'),{recursive:true});
fs.writeFileSync(path.join(outRoot,'assets/debris/provenance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,moduleBytes:fs.statSync(path.join(outRoot,'generated-rock.js')).size}));
