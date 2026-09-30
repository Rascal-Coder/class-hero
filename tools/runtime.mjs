import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export const creator=process.env.COCOS_ROOT||'C:/ProgramData/cocos/editors/Creator/3.8.8';
export function typescript(){for(const p of ['typescript',creator+'/resources/app.asar.unpacked/node_modules/typescript']){try{return require(p);}catch{}}throw new Error('Install TypeScript or set COCOS_ROOT to Creator 3.8.8.');}
export function loadCore(file){const ts=typescript(); const source=fs.readFileSync(new URL('../assets/scripts/core/'+file+'.ts',import.meta.url),'utf8'); const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const module={exports:{}}; new Function('module','exports','require',js)(module,module.exports,(p)=>loadCore(p.replace('./','')));return module.exports;}
