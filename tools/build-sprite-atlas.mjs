// Records alpha bounds as SpriteFrame rectangles; the generated PNG files stay unmodified.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const dependencies=process.env.CODEX_DEPENDENCIES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
const {PNG}=require(dependencies+'/node/node_modules/pngjs');
const folder=path.resolve(import.meta.dirname,'../assets/resources/sprites');
const frames={},sheets={};
for(const [sheet,rows] of Object.entries({weapons:['barrel','scope','magazine','stock','grip'],items:['grenade','underbarrel','medkit']})) {
  const png=PNG.sync.read(fs.readFileSync(path.join(folder,sheet+'.png')));
  const {width,height,data}=png;
  let transparent=0;
  for(let n=3;n<data.length;n+=4)if(data[n]===0)transparent++;
  if(transparent/(width*height)<.3)throw Error(`${sheet}: expected transparent sprite gutters`);
  sheets[sheet]={width,height,columns:6,rows:rows.length};
  // Generated sprites have small layout offsets. Find each connected silhouette rather
  // than cutting through a ruler at an assumed equal-width cell boundary.
  const seen=new Uint8Array(width*height),components=[];
  for(let index=0;index<seen.length;index++) {
    if(seen[index]||data[index*4+3]<32)continue;
    const stack=[index];seen[index]=1;
    let x0=width,y0=height,x1=0,y1=0,count=0;
    while(stack.length) {
      const pixel=stack.pop(),x=pixel%width,y=Math.floor(pixel/width);
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;
      for(const next of [x>0?pixel-1:-1,x<width-1?pixel+1:-1,y>0?pixel-width:-1,y<height-1?pixel+width:-1])
        if(next>=0&&!seen[next]&&data[next*4+3]>=32){seen[next]=1;stack.push(next);}
    }
    if(count>100)components.push({x0,y0,x1,y1});
  }
  const expected=rows.reduce((n,kind)=>n+(kind==='grip'?1:6),0);
  if(components.length!==expected)throw Error(`${sheet}: expected ${expected} separate silhouettes, found ${components.length}`);
  rows.forEach((kind,row)=>{
    for(let col=0;col<(kind==='grip'?1:6);col++) {
      const found=components.filter(c=>Math.floor((c.x0+c.x1)/2/width*6)===col&&Math.floor((c.y0+c.y1)/2/height*rows.length)===row);
      if(found.length!==1)throw Error(`${kind}-${col+1}: ambiguous sprite position`);
      let {x0,y0,x1,y1}=found[0];
      x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(width-1,x1+3);y1=Math.min(height-1,y1+3);
      frames[`${kind}-${col+1}`]={sheet,rect:[x0,y0,x1-x0+1,y1-y0+1]};
    }
  });
  console.log(`${sheet}: ${width}x${height}, ${expected} sprites, ${(100*transparent/(width*height)).toFixed(1)}% transparent`);
}
const manifest={version:2,columns:'Base, then 1–5 stars, left to right; grip has one fixed appearance',sheets,frames};
const output=JSON.stringify(manifest,null,2)+'\n';
const target=path.join(folder,'atlas.json');
if(process.argv.includes('--check')) {
  if(fs.readFileSync(target,'utf8')!==output)throw Error('Atlas metadata does not match PNG bounds');
  console.log('43 sprite rectangles verified.');
} else { fs.writeFileSync(target,output);console.log('Wrote atlas.json with 43 sprite rectangles.'); }
