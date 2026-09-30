from pathlib import Path
import math, struct, wave
out = Path(__file__).resolve().parents[1] / 'assets/resources/audio'
out.mkdir(parents=True, exist_ok=True)
for name, notes, length in [('click', [520], .09), ('snap', [660, 880], .16), ('pop', [260, 150], .10), ('win', [523,659,784,1046], .48)]:
    rate=22050
    with wave.open(str(out/(name+'.wav')), 'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'))
        for i in range(int(rate*length)):
            t=i/rate
            note=notes[min(len(notes)-1,int(t/length*len(notes)))]
            envelope=min(1,t/.008)*max(0,1-t/length)**2
            value=math.sin(2*math.pi*note*t)*envelope*.25
            f.writeframesraw(struct.pack('<h',int(value*32767)))
