# 胶布物件、界面控件与拼接音效

当前版本使用内置 image_gen 编辑两张物件图集，并生成一张统一 UI 图集。PNG 原始透明通道完整保留；切片工具只记录矩形坐标，不修改图片。

## 资源

- `assets/resources/sprites/weapons.png`：25 个带胶布的文具部件（四类初级至 5 星，各 6 档；固定握把 1 个）。
- `assets/resources/sprites/items.png`：18 个道具；下挂粉笔罐顶部直接以胶布包边收口，不露出连接孔。
- `assets/resources/sprites/ui.png`：4 列 × 6 行，24 个界面控件。面板、按钮和格子支持九宫格缩放；图标保持原比例。
- `assets/resources/audio/assemble.wav`：0.38 秒，纸胶带轻撕、物件接触及压合声。
- `assets/resources/audio/merge.wav`：0.64 秒，压合声加两段升级提示音。

界面图集从左到右、从上到下：书包面板、弹窗面板、黑板面板、商品卡；空暂存格、有效暂存格、无效暂存格、选中暂存格；次按钮、主按钮、中性按钮、禁用按钮；暂停、刷新、硬币、星星；普通/绿色/红色装备格、完成勾；血条底/填充、提示条、奖励卡。

装配使用 PNG 内的胶布和略有重叠的安装边，取消程序绘制的独立长条胶带。背包、拖拽、帮助页和战斗预览共用同一装配方式；商店和暂存格仍以 45° 展示。碰撞与合法接口仍按原逻辑格判断。

声音在成功放置时触发一次；安装配件用 assemble、同级合成用 merge，暂存或独立道具放置沿用 snap。失败拖放不触发拼接声。暂停菜单的声音开关同时控制新增音效。音效为本地生成的确定性合成音，无外部录音依赖。

## 验证

`node tools/build-sprite-atlas.mjs --check` 与 `node tools/build-ui-atlas.mjs --check` 校验透明轮廓和切片。

`node tools/make-assembly-audio.mjs` 可重新生成两个 44.1 kHz、16 位单声道 WAV；峰值为 0.72，不削波，首尾淡入淡出。

构建后运行 `node tools/browser-smoke.mjs --sprites --skins --journey`，检查切片、实际 PNG 控件、音效分流和静音，以及拖拽、触控、存档和战斗流程。

## 接口收口修订（当前版本）

使用内置 image_gen 对现有两张 PNG 做局部编辑。弹匣与固定握把去掉顶部带孔凸耳，下挂粉笔罐去掉顶部连接环，枪托右端以胶布收口，不露出插头。保留回形针枪托本体的大开口、纸团回形针和物件装饰铆钉。各档共用同样的收口规则；商店、暂存格、背包、战斗均使用更新后的同一组素材。

编辑目标：`assets/resources/sprites/weapons.png`。最终提示词：

```text
Use case: precise-object-edit.
Input image is the EDIT TARGET: the existing transparent PNG school stationery weapon-parts sprite sheet. Make a surgical localized edit, preserving the existing illustration and exact layout.
REMOVE the exposed mounting lugs and connector holes; the parts should finish in tightly wrapped cream masking tape, as though tape binds the objects directly. No bare plug, dark tab, eyelet, socket, or connector protrudes beyond the tape.
ROW 3, ALL SIX blue staple magazines: completely remove the small dark-green/black rounded tab with a round hole that protrudes ABOVE the cream tape cuff. The top silhouette must now end in a softly flat CREAM PAPER TAPE edge. Do not just fill the hole; delete the exposed dark tab itself. Keep blue bodies, staple details, mint/gold upgrade decorations, dimensions of bodies, and tape creases.
ROW 4, ALL SIX horizontal paperclip stocks: at the far RIGHT attachment end, cover/remove the exposed dark/gold plug tip beyond the existing cream tape cuff. The right endpoint is cream tape wrapped flush around the object, with no protruding connector. Preserve the LARGE paperclip interior opening, which is intrinsic to the paperclip and is NOT a mounting hole.
ROW 5, single pink eraser grip: completely remove the dark rounded lug and round hole protruding above the TOP cream tape cuff. End its top in a clean cream tape cap with subtle folded edge; keep its pink eraser body and middle cream sleeve.
Keep ROW 1 ruler barrels and ROW 2 compass sights unchanged. Do not remove decorative screws elsewhere.
INVARIANTS: six columns by five rows, EXACTLY 25 separate sprites. Six each of barrels/sights/magazines/stocks, ONLY one grip in row5 col1, other five cells empty. All upgrade variants, sizes, positions, flat orthographic side view, forest-green outlines, mint/amber/salmon colors stay consistent. No perspective, text, stars, new objects or whole guns. One connected silhouette per sprite, transparent gaps between sprites. GENUINE transparent alpha background, not solid black and not a painted checkerboard. Preserve alpha in paperclip openings. Keep all changes restricted to these mounting interfaces.
```

编辑目标：`assets/resources/sprites/items.png`。最终提示词：

```text
Use case: precise-object-edit.
Input image is the EDIT TARGET: existing transparent PNG school stationery items sheet, six columns and three rows, EXACTLY 18 sprites.
Change ONLY the top attachment end of ALL SIX chalk capsules in ROW 2. Completely remove the dark-green/gold rectangular mounting loop that protrudes ABOVE the cream masking-tape cuff. There must be NO exposed black connector hole, no loop, no mounting tab, no bare plug at the top. The capsule's top silhouette ends at an opaque CREAM PAPER TAPE cap, tightly wrapped flush across the object's top, with subtle folds and creases. Delete the entire exposed loop, do not merely fill its hole. Preserve the existing capsule bodies, tier colors, inner chalk sticks, size, position, and tape below the removed loop.
Keep ROW 1 paper balls and their paperclips EXACTLY as they are (these are not mounting holes). Keep ROW 3 milk cartons and straws EXACTLY as they are.
Preserve exact grid and all six upgrade identities. Flat orthographic side view, no perspective, no text or stars. One connected silhouette per cell with ample transparent gutters. Genuine transparent alpha background, not black, not painted checkerboard. Keep original forest-green outlines and school palette. No new objects or connections between cells.
```

以下保留上一版生成提示词；接口结构以本节修订为准。

## 武器图编辑提示词

输入：上一版无透视文具武器图集，作为编辑目标；保持物件身份与星级布局。

```text
Use case: precise-object-edit. Edit target is the supplied school stationery sprite sheet. Preserve the EXACT grid: six columns and five rows, 25 sprites total; row 1 six ruler barrels, row 2 six compass sights, row 3 six staple magazines, row 4 six paperclip stocks, row 5 one pink eraser grip in first cell and five empty transparent cells. Keep all six upgrade identities/colors and the flat orthographic SIDE VIEW. NO perspective, NO text or stars.
Primary change: make every component look like an actual school craft object FIRMLY WRAPPED WITH CREAM MASKING TAPE, painted directly into the SAME PNG sprite. Tape is a soft opaque paper material with visible slightly angled winding, folded edges, subtle creases, and tiny torn ends pressed flat. It must visibly wind AROUND each object and disappear behind its edge, with a darker fold at its back edge, not floating strips, wooden braces, or stickers floating in space.
Ruler barrels: chunky 3:1 horizontal side silhouettes, muzzle points RIGHT. Paint two narrow cream masking-tape wraps winding completely around the ruler body near 18% and 80% of its width. The tape continues flush to the top and bottom edges. Keep rulers and upgrade markings recognizable.
Compass sights: paint a tightly wound cream masking-tape cuff around the BOTTOM mounting foot, with a SHORT flat horizontal amber mounting pad under the cuff. Tape and pad are fused to the foot and the pad fills the full foot width, not a separate hovering object.
Staple magazines: paint a short cream masking-tape cuff around the TOP connector and a short amber flat mounting pad behind that cuff, so it can overlap a ruler when assembled.
Paperclip stocks: wrap cream masking tape around the narrow RIGHT connector; extend this taped connector a little to the right as a broad flat pad that can overlap the ruler. Preserve the paperclip opening.
Single eraser grip: keep the cream middle sleeve, but additionally paint a tightly wrapped cream tape cuff and tiny amber mount across the TOP of the grip. This top mount must join the eraser with no gap.
One connected silhouette per cell. Large transparent gutters; tape stays inside each cell. Genuine alpha transparency throughout background and holes. Preserve flat green outlines, amber/mint/salmon school palette. No isolated tape assets and no whole guns. Do not add anything to the five empty grip cells.
```

## 道具图编辑提示词

输入：上一版无透视道具图集，作为编辑目标。

```text
Use case: precise-object-edit. Edit target is the supplied 6 columns by 3 rows school items sheet. Preserve exactly all 18 sprites, grid positions, flat orthographic no-perspective style, their tier identities, paper balls in row1 and milk cartons in row3.
Change ONLY the six chalk capsules in row2: integrate cream paper masking tape wrapped tightly around their TOP mounting connector. Paint a short flat amber mounting pad immediately behind the taped top collar so the capsule and its pad are ONE solid connected sprite, intended to overlap the underside of a ruler. Tape is soft paper with one angled winding, a folded dark edge around both sides, subtle paper creases and a tiny pressed-down torn end. The result looks physically BOUND to a small ruler mount, not a separate strip hovering above the capsule. All sprites remain isolated and inside their cells. NO perspective, no numbers/text/stars, no extra objects. Genuine transparent alpha background and holes. Keep the paper balls and milk cartons unchanged.
```

## UI 生成提示词

```text
Use case: stylized-concept. Production transparent PNG UI sprite sheet for the cozy school-stationery mobile game Class Hero. Match flat cartoon mint green/cream/amber school supplies, bold dark forest green #293b35 outline, small offset bottom shadow, warm cream paper, chalk green, sage mint, dusty cyan, salmon red, soft golden-orange. Consistent hand-crafted paper-and-stationery appearance, restrained tiny edge highlights and light paper grain. Clean readable contours. Front view only. NO perspective. Genuine transparent alpha in all gutters and outside each control. NO text, letters, numbers, labels, typography or star counts. This is actual reusable separate UI controls, NOT a full screen mockup.
Canvas portrait 1536 x 2304. EXACTLY FOUR columns and SIX equal rows, 24 isolated assets. Each occupies central 78% of its equal square cell, with generous empty gutters. Keep silhouettes isolated. All panels/buttons are FILLED opaque in the middle, never hollow borders except the explicitly specified selected frame.
Row1 left to right:
1 cream notebook panel: rounded square paper inset, dark green slim border, very small stitched/bound left edge, uncluttered blank cream center.
2 cream dialog panel: rounded square cream cardstock with mint double-edge, blank interior.
3 chalkboard panel: rounded square deep chalk-green interior with sage rim, blank center.
4 shop card: rounded square cream item card with sage border and tiny bottom shadow, blank center.
Row2:
1 empty storage slot: rounded square cream thick rim, inset dusty cyan blue center.
2 valid storage slot: same shape with fresh light green inset.
3 invalid storage slot: same shape with soft coral red inset.
4 selected slot: same cyan filled tile and four large yellow bracket corner accents attached to the rim.
Row3:
1 wide horizontal sage-green action button, rounded corners, subtle raised paper edge, blank.
2 identical wide horizontal warm orange primary action button, blank.
3 identical wide horizontal ivory neutral action button, blank.
4 identical wide horizontal desaturated grey-green disabled button, blank.
Row4:
1 sage square pause icon button with dark-green two bars.
2 cream circular refresh icon with two dark-green curved arrows.
3 single round golden coin with small embossed diamond shape.
4 single chunky golden FIVE-POINT STAR with dark green outline.
Row5:
1 neutral equipment grid cell: softly rounded square pale sage flat fill, barely darker rim.
2 valid equipment grid cell: same with bright mint green fill.
3 invalid equipment grid cell: same with soft coral pink fill.
4 round sage sold/check badge with one clear cream check mark.
Row6:
1 wide rounded dark sage empty health-bar track.
2 wide rounded bright mint health-bar fill.
3 wide rounded dark chalk-green toast/message panel, blank.
4 square cream reward card with mint rim and small cream masking-tape corner decorations, blank uncluttered center.
Consistent simple silhouettes suited for nine-slice stretching. No decorative objects in gutters. Perfectly orthographic reusable game UI kit.
```
