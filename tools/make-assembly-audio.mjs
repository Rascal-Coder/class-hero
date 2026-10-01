import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve(import.meta.dirname,'../assets/resources/audio');
const rate=44100;
// Deterministic paper tear, soft contact and adhesive press; no external recordings.
for(const [name,length] of [['assemble',.38],['merge',.64]]) {
  const data=new Float64Array(Math.ceil(rate*length));let seed=18327,low=0;
  for(let n=0;n<data.length;n++) {
    const t=n/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/2147483648-1;low=low*.84+white*.16;
    const tear=t<.11?Math.sin(Math.PI*t/.11)*(.45+.55*Math.sin(t*380)**2):0;
    const press=t>.105&&t<.29?Math.sin(Math.PI*(t-.105)/.185)**2:0;
    let sample=(white-low)*(.22*tear+.095*press);
    for(const impact of name==='merge'?[.115,.21]:[.115]) {
      const u=t-impact;
      if(u>=0)sample+=.24*Math.exp(-u*65)*Math.sin(2*Math.PI*(320*u-360*u*u))+.1*(white-low)*Math.exp(-u*100);
    }
    if(name==='merge')for(const [time,freq] of [[.23,740],[.32,1110]]) {
      const u=t-time;if(u>=0)sample+=.11*Math.min(1,u/.008)*Math.exp(-u*12)*Math.sin(2*Math.PI*freq*u);
    }
    data[n]=sample*Math.min(1,t/.004,(length-t)/.035);
  }
  const peak=Math.max(...data.map(Math.abs)),gain=.72/peak;
  const wav=Buffer.alloc(44+data.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length*2,40);
  let energy=0;for(let n=0;n<data.length;n++){const sample=data[n]*gain;energy+=sample*sample;wav.writeInt16LE(Math.round(sample*32767),44+n*2);}
  fs.writeFileSync(path.join(folder,name+'.wav'),wav);
  console.log(`${name}.wav: ${length}s, peak 0.72, RMS ${Math.sqrt(energy/data.length).toFixed(3)}`);
}
