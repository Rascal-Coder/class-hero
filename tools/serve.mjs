import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../build/web-desktop');
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm','.css':'text/css','.wav':'audio/wav','.ttf':'font/ttf'};
http.createServer((req,res)=>{ let p; try { p=path.resolve(root,'.'+decodeURIComponent((req.url||'/').split('?')[0])); } catch { res.writeHead(400).end(); return; } if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403).end();return;} if(p===root)p=path.join(root,'index.html'); fs.readFile(p,(err,data)=>{if(err){res.writeHead(404).end();return;} res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);}); }).listen(7459,'0.0.0.0',()=>console.log('下课别跑 http://localhost:7459'));
