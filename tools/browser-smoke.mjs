import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const base=process.env.CODEX_DEPENDENCIES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
const {chromium}=require(base+'/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'); fs.mkdirSync(root+'/test-results',{recursive:true});
const executablePath=process.env.CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:480,height:960},deviceScaleFactor:1});
const errors=[];
function track(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
async function attach(p){
  await p.waitForFunction(()=>!!globalThis.System);
  await p.evaluate(async()=>{globalThis.testCC=await System.import('cc');});
  await p.waitForFunction(()=>!!testCC.director.getScene()?.getChildByName('Canvas')?.getComponent('ClassroomGame'));
  await p.evaluate(()=>{globalThis.testGame=testCC.director.getScene().getChildByName('Canvas').getComponent('ClassroomGame');});
  await p.waitForFunction(()=>testGame.spritesReady,{},{timeout:20000});
}
const screenshot=name=>page.screenshot({path:root+'/test-results/'+name+'.png'});
const state=()=>page.evaluate(()=>({phase:testGame.phase,coins:testGame.coins,stats:testGame.inventory.stats(),items:testGame.inventory.items,modal:testGame.modal,wave:testGame.wave}));
async function drag(a,b,c,d,shot){
  await page.mouse.move(a,b);await page.mouse.down();await page.mouse.move(c,d,{steps:16});
  if(shot)await screenshot(shot);
  await page.mouse.up();await page.waitForTimeout(450);
}
try {
  track(page);await page.goto('http://localhost:7459');await attach(page);await page.waitForTimeout(500);
  await screenshot('prepare');
  if(process.argv.includes('--sprites')) {
    const initial=await page.evaluate(()=>testGame.back.node.children.filter(n=>n.active&&n.getComponent(testCC.Sprite)).map(n=>({name:n.getComponent(testCC.Sprite).spriteFrame.name,angle:n.angle})));
    assert.equal(initial.filter(s=>s.angle===32).length,3,'three diagonal shop icons');
    assert.ok(initial.some(s=>s.name==='barrel-1'&&s.angle===0),'backpack barrel is side-on');
    const names=new Set();
    for(const kind of ['barrel','stock','scope','magazine','grip','grenade','underbarrel','medkit']) {
      const rendered=await page.evaluate(kind=>{
        testGame.newRun();
        if(kind==='grip')testGame.inventory.get(1).level=5;
        else for(let level=1;level<=5;level++)testGame.inventory.add(kind,{area:'stash',slot:level-1},level);
        testGame.offers=[1,3,5].map(level=>({kind,level,price:15,sold:false}));testGame.render();
        return testGame.back.node.children.filter(n=>n.active&&n.getComponent(testCC.Sprite)).map(n=>({name:n.getComponent(testCC.Sprite).spriteFrame.name,angle:n.angle}));
      },kind);
      rendered.forEach(s=>names.add(s.name));
      if(kind!=='grip')for(let level=1;level<=5;level++)assert.ok(rendered.some(s=>s.name===`${kind}-${level}`&&s.angle===0));
      await screenshot('sprites-'+kind);
    }
    for(const level of [2,4]) {
      const name=await page.evaluate(level=>{testGame.inventory.get(1).level=level;testGame.render();return testGame.back.node.children.find(n=>n.active&&n.getComponent(testCC.Sprite)?.spriteFrame.name===`grip-${level}`)?.getComponent(testCC.Sprite).spriteFrame.name;},level);
      names.add(name);
    }
    assert.equal(names.size,40,'all 40 tier frames render');
    const count=await page.evaluate(()=>{const before=testGame.back.node.children.length;for(let i=0;i<200;i++)testGame.render();return [before,testGame.back.node.children.length];});
    assert.equal(count[0],count[1],'rendering reuses sprite nodes');
    await page.evaluate(()=>testGame.newRun());
    console.log('SPRITES PASSED: 40 frames, diagonal shop, side-on bag/stash, bounded node pool.');
  }
  if(process.argv.includes('--journey')) {
    await drag(110,827,385,594);assert.equal((await state()).coins,70,'invalid purchase is free');
    await drag(110,827,128,485,'drag-stock');assert.equal((await state()).coins,55);assert.equal((await state()).stats.accuracy,90);
    await drag(240,827,100,373);assert.equal((await state()).stats.damage,839);
    const locked=JSON.stringify((await state()).items);
    await page.mouse.move(211,538);await page.mouse.down();await page.mouse.move(267,482,{steps:16});await screenshot('grip-whole-preview');
    assert.equal(await page.evaluate(()=>testGame.inventory.movingIds(testGame.inventory.get(1)).length),3,'grip previews entire connected weapon');
    await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(180);
    await page.mouse.move(268,485);await page.mouse.down();await page.mouse.move(375,410,{steps:16});await screenshot('initial-barrel-local-preview');
    assert.deepEqual(await page.evaluate(()=>testGame.inventory.movingIds(testGame.inventory.get(2))),[2]);
    assert.equal(await page.evaluate(()=>testGame.inventory.stats([2]).barrels),0);
    await page.mouse.up();await page.waitForTimeout(450);assert.equal(JSON.stringify((await state()).items),locked,'initial barrel cannot shift the weapon');
    await drag(211,538,88,684,'locked-stash');assert.equal(JSON.stringify((await state()).items),locked,'grip stays fixed');
    await drag(268,485,88,684);assert.equal(JSON.stringify((await state()).items),locked,'starter barrel stays fixed');
    await page.mouse.click(128,485,{button:'right'});assert.equal(JSON.stringify((await state()).items),locked,'right click cannot detach');
    if((await state()).modal)await page.mouse.click(240,582);
    await page.waitForTimeout(180);await page.mouse.click(128,485);assert.equal((await state()).modal,'item');
    assert.ok(await page.evaluate(()=>testGame.buttons.every(b=>!b.label.includes('拆下'))));await page.mouse.click(240,582);
    await page.mouse.click(130,925);await page.waitForTimeout(150);
    await drag(240,827,268,429,'drag-second-barrel');assert.equal((await state()).coins,15);assert.equal((await state()).stats.barrels,2);
    const before=JSON.stringify((await state()).items);
    await page.mouse.move(110,827);await page.mouse.down();await page.mouse.move(88,684,{steps:16});await page.mouse.up();
    assert.ok(await page.evaluate(()=>!!testGame.returning),'unaffordable drag rebounds');
    assert.equal(await page.evaluate(()=>testGame.toast),'资金不足');assert.equal((await state()).modal,null);
    await page.waitForTimeout(80);await screenshot('insufficient');await page.waitForTimeout(400);assert.equal(JSON.stringify((await state()).items),before);assert.equal((await state()).coins,15);
    await page.mouse.move(268,429);await page.mouse.down();await page.mouse.move(88,684,{steps:16});
    const stashPreview=await page.evaluate(()=>{const v=testGame.dragVisual(),r=testGame.stashRect(0);return {cell:v.cell,center:v.x+v.cell*3/2,target:r.x+r.w/2,ok:v.result.ok};});
    assert.equal(stashPreview.ok,true);assert.equal(stashPreview.center,stashPreview.target);assert.ok(stashPreview.cell*3<62,'barrel preview fits inside one stash tile');
    await screenshot('stash-highlight');await page.mouse.up();await page.waitForTimeout(450);assert.equal((await state()).stats.barrels,1);
    await screenshot('stash-placed');
    await drag(88,684,268,485,'merge-barrel');assert.equal((await state()).stats.barrels,1);assert.equal((await state()).items.find(i=>i.id===2).level,2);
    assert.equal(await page.evaluate(()=>testGame.toast),'','merging uses visual feedback');
    assert.ok(await page.evaluate(()=>!testGame.back.used.has('drag-tip')&&!testGame.back.used.has('shop-tip')));
    await page.evaluate(()=>{testGame.offers=[{kind:'stock',level:1,price:15,sold:false},...testGame.offers.slice(1)];testGame.render();});
    await drag(110,827,128,485);assert.equal((await state()).stats.accuracy,94);assert.equal((await state()).coins,0);
    await page.reload();await attach(page);assert.equal((await state()).stats.damage,1490);assert.equal((await state()).coins,0);
    assert.ok((await state()).items.filter(i=>i.id<=2).every(i=>i.fixed));
    // Fixture shows all physical sockets without depending on random shop refreshes.
    await page.evaluate(()=>{const i=testGame.inventory;i.add('magazine',{area:'board',x:3,y:3});i.add('underbarrel',{area:'board',x:4,y:3});i.add('barrel',{area:'board',x:2,y:1});i.add('scope',{area:'board',x:2,y:0});testGame.render();});
    await screenshot('assembled');
    await page.mouse.click(321,925);assert.equal((await state()).phase,'battle');
    await page.keyboard.press('Space');assert.equal((await state()).modal,'pause');
    const elapsed=await page.evaluate(()=>testGame.battle.elapsed);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>testGame.battle.elapsed),elapsed);
    await screenshot('pause');await page.mouse.click(240,407);
    await page.waitForTimeout(500);await screenshot('battle');await page.waitForFunction(()=>testGame.phase==='prepare',null,{timeout:20000});
    assert.equal((await state()).coins,18,'two normal enemies plus wave reward');
    await page.mouse.click(320,925);await page.waitForFunction(()=>testGame.phase==='reward',null,{timeout:20000});
    await screenshot('rewards');await page.mouse.click(90,567);assert.equal((await state()).phase,'prepare');
    await page.mouse.click(433,44);await page.mouse.click(240,464);await screenshot('help');await page.mouse.click(240,766);
    for(const [width,height] of [[390,844],[768,1024],[1440,900]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(500);await screenshot(`viewport-${width}x${height}`);
      assert.ok(await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&Math.abs(c.width/c.height-r.width/r.height)<.01&&Math.abs(r.width/r.height-.5)<.01;}));
    }
    const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
    track(phone);await phone.goto('http://localhost:7459');await attach(phone);
    const rect=await phone.locator('canvas').boundingBox(),px=n=>rect.x+n*rect.width/480,py=n=>rect.y+n*rect.height/960;
    await phone.touchscreen.tap(px(111),py(827));await phone.waitForTimeout(180);await phone.touchscreen.tap(px(240),py(521));await phone.waitForTimeout(180);
    assert.equal(await phone.evaluate(()=>testGame.coins),55,'touch purchase occurs once');
    const cdp=await phone.context().newCDPSession(phone);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px(240),y:py(827)}]});
    for(let n=1;n<=15;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px(240-140*n/15),y:py(827-454*n/15)}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await phone.waitForTimeout(200);
    assert.equal(await phone.evaluate(()=>testGame.coins),30);assert.equal(await phone.evaluate(()=>testGame.inventory.stats().damage),839);
    await phone.screenshot({path:root+'/test-results/phone-touch.png'});await phone.close();
    await page.setViewportSize({width:480,height:960});await page.waitForTimeout(500);
    await page.evaluate(()=>{const i=testGame.inventory;i.items=i.items.filter(i=>i.kind!=='scope');i.add('barrel',{area:'board',x:2,y:0});testGame.wave=4;testGame.startBattle();testGame.battle.actionTimer=10;testGame.battle.enemies.forEach(e=>e.hp=e.max=100000);});
    await page.waitForTimeout(100);await screenshot('boss-fixture');
    const round=await page.evaluate(()=>{const b=testGame.battle;const initial=b.enemies.map(e=>e.x);b.actionTimer=0;let prematureMovement=false;for(let i=0;i<3000&&b.round===1;i++){b.step(1/60);if(b.round===1&&b.turn!=='enemies'&&b.enemies.some((e,n)=>e.x!==initial[n]))prematureMovement=true;}return {round:b.round,prematureMovement,actions:b.actionLog,total:b.total,enemies:b.enemies.map((e,n)=>({x:e.x,expected:Math.max(e.range,initial[n]-e.speed)}))};});
    assert.equal(round.round,2);assert.equal(round.prematureMovement,false);
    assert.deepEqual(round.actions.filter(a=>a.actor==='player').map(a=>a.kind),['grenade','underbarrel','barrel','barrel','barrel']);
    assert.equal(round.actions.filter(a=>a.actor==='enemy'&&a.kind==='前进一步').length,round.total);
    assert.ok(round.enemies.every(e=>e.x===e.expected),'every enemy advances exactly once');
    await page.evaluate(()=>{testGame.modal=null;testGame.wave=14;testGame.damageBonus=20;testGame.startBattle();for(let i=0;i<30000&&testGame.battle.state==='running';i++)testGame.battle.step(1/60);testGame.update(1/60);});
    assert.equal((await state()).phase,'victory');await screenshot('victory-fixture');
    await page.mouse.click(240,610);assert.equal((await state()).wave,0);assert.equal((await state()).coins,70);
    await page.mouse.click(320,925);await page.evaluate(()=>{const b=testGame.battle;b.hp=1;b.enemies.forEach(e=>{e.hp=e.max=100000;e.x=e.range;});for(let i=0;i<1000&&b.state==='running';i++)b.step(.05);testGame.update(.01);});
    assert.equal((await state()).phase,'defeat');await screenshot('defeat-fixture');
    console.log('JOURNEY PASSED: locking, merging, refunds, sockets, turn combat, rewards, touch, viewports, victory/defeat.');
  }
  assert.deepEqual(errors,[],'No browser runtime errors');console.log('BROWSER PASSED');
} finally {await browser.close();}
