import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const dependencies=process.env.CODEX_DEPENDENCIES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
const {PNG}=require(dependencies+'/node/node_modules/pngjs');
const folder=path.resolve(import.meta.dirname,'../assets/resources/sprites');
const {width,height,data}=PNG.sync.read(fs.readFileSync(path.join(folder,'ui.png')));
const rows=[['panel-notebook','panel-dialog','panel-chalk','card-shop'],['slot-empty','slot-valid','slot-invalid','slot-selected'],['button-secondary','button-primary','button-neutral','button-disabled'],['pause','refresh','coin','star'],['grid-neutral','grid-valid','grid-invalid','check'],['health-track','health-fill','toast','card-reward']];
const frames={},seen=new Uint8Array(width*height);let transparent=0;
for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
if(transparent/(width*height)<.25)throw Error('UI sheet must have transparent gutters');
for(let index=0;index<seen.length;index++) {
  if(seen[index]||data[index*4+3]<32)continue;
  const stack=[index];seen[index]=1;let x0=width,y0=height,x1=0,y1=0,count=0;
  while(stack.length) {
    const pixel=stack.pop(),x=pixel%width,y=Math.floor(pixel/width);count++;
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    for(const next of [x>0?pixel-1:-1,x<width-1?pixel+1:-1,y>0?pixel-width:-1,y<height-1?pixel+width:-1])
      if(next>=0&&!seen[next]&&data[next*4+3]>=32){seen[next]=1;stack.push(next);}
  }
  if(count<100)continue;
  const row=Math.floor((y0+y1)/2/height*6),col=Math.floor((x0+x1)/2/width*4),key=rows[row]?.[col];
  if(!key||frames[key])throw Error(`Ambiguous UI sprite ${row},${col}`);
  x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(width-1,x1+3);y1=Math.min(height-1,y1+3);
  frames[key]={rect:[x0,y0,x1-x0+1,y1-y0+1]};
}
if(Object.keys(frames).length!==24)throw Error(`Expected 24 UI controls, found ${Object.keys(frames).length}`);
const output=JSON.stringify({version:1,width,height,frames},null,2)+'\n',target=path.join(folder,'ui-atlas.json');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('UI atlas is stale');}
else fs.writeFileSync(target,output);
console.log(`UI: ${width}x${height}, 24 controls, ${(100*transparent/(width*height)).toFixed(1)}% transparent`);
