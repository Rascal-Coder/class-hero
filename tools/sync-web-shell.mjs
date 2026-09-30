// Refresh HTML/CSS-only template edits in an existing build without recompiling the engine.
import fs from 'node:fs';
const output=new URL('../build/web-desktop/',import.meta.url);
fs.copyFileSync(new URL('../build-templates/web-desktop/style.css',import.meta.url),new URL('style.css',output));
const html=new URL('index.html',output);
fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace('cc_exact_fit_screen="true"','cc_exact_fit_screen="false"'));
console.log('Synced portrait Web shell.');
