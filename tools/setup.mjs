import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const creator = process.env.COCOS_ROOT || 'C:/ProgramData/cocos/editors/Creator/3.8.8';
const write = (p, data) => { fs.mkdirSync(path.dirname(path.join(root,p)), {recursive:true}); fs.writeFileSync(path.join(root,p), JSON.stringify(data,null,2)); };
const uuid = name => { const h=createHash('md5').update('after-school:'+name).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function compress(id) { const h=id.replaceAll('-',''); let r=h.slice(0,5); for(let i=5;i<32;i+=3) { const n=parseInt(h.slice(i,i+3),16); r+=alphabet[n>>6]+alphabet[n&63]; } return r; }
function walk(dir) { for(const ent of fs.readdirSync(path.join(root,dir),{withFileTypes:true})) { const p=dir+'/'+ent.name; if(ent.isDirectory()) walk(p); else if(p.endsWith('.ts') && !fs.existsSync(path.join(root,p+'.meta'))) write(p+'.meta',{ver:'4.0.24',importer:'typescript',imported:true,uuid:uuid(p),files:[],subMetas:{},userData:{}}); } }
walk('assets');
const scene=JSON.parse(fs.readFileSync(creator+'/resources/resources/3d/engine/editor/assets/default_file_content/scene/scene-2d.scene','utf8'));
scene[0]._name=scene[1]._name='Classroom'; scene[1]._id=uuid('scene');
scene[2]._lpos={__type__:'cc.Vec3',x:240,y:480,z:0};
scene[3]._lpos.z=1000; scene[4]._orthoHeight=480; scene[4]._visibility=33554432;
scene[4]._color={__type__:'cc.Color',r:36,g:58,b:49,a:255};
scene[5]._contentSize={__type__:'cc.Size',width:480,height:960};
const cid=scene.length; scene[2]._components.push({__id__:cid});
scene.push({__type__:compress(uuid('assets/scripts/ClassroomGame.ts')),_name:'',_objFlags:0,node:{__id__:2},_enabled:true,__prefab:null,_id:uuid('component')});
write('assets/scenes/Classroom.scene',scene);
write('assets/scenes/Classroom.scene.meta',{ver:'1.1.50',importer:'scene',imported:true,uuid:uuid('scene'),files:['.json'],subMetas:{},userData:{}});
write('settings/v2/packages/project.json',{__version__:'1.0.6',general:{designResolution:{width:480,height:960,fitWidth:true,fitHeight:true}}});
write('settings/v2/packages/builder.json',{__version__:'1.3.8',common:{startScene:uuid('scene'),scenes:[{url:'db://assets/scenes/Classroom.scene',uuid:uuid('scene')}],outputName:'web-desktop',name:'下课别跑'}});
write('build-config.json',{name:'下课别跑',platform:'web-desktop',buildPath:'project://build',outputName:'web-desktop',startScene:uuid('scene'),scenes:[{url:'db://assets/scenes/Classroom.scene',uuid:uuid('scene')}],debug:false,sourceMaps:false,md5Cache:false,polyfills:{asyncFunctions:true},splashScreen:{totalTime:0},packages:{'web-desktop':{embedWebDebugger:false}}});
console.log('Generated Cocos 3.8.8 scene:',uuid('scene'));
