# 无透视文具图集（当前版本）

> 图集的无透视与星级规则继续生效。物件胶布和界面已更新，最新提示词及音效说明见 [ui-and-assembly-assets.md](ui-and-assembly-assets.md)。

使用内置 image_gen 重新生成；原始透明 PNG 直接接入，没有重绘或程序去背景处理。

- weapons.png：6 列、5 行；前四行依次为尺子、圆规、订书钉、回形针，每行从左到右为初级、1–5 星；第五行只有一个固定橡皮握把。25 个切片。
- items.png：6 列、3 行；依次为纸团、下挂粉笔罐、牛奶。每行初级、1–5 星，18 个切片。
- 背包与拼装使用纯侧面，商店和暂存格统一朝右上方倾斜 45°。不绘制握把星级，背包内无星级；商店、暂存格和详情的星级位于物品下方。
- 内部 level 1 为初级，合成后 level 2 对应 1 星，最高 level 6 对应 5 星。旧存档不改变物品的合成次数和属性；握把回归固定初级。
- 胶布按接口绘制前后层与折边；局部烟雾和回弹持续 0.6 秒，不改变碰撞与合成判定。
- atlas.json 保存实际透明轮廓切片范围。运行 node tools/build-sprite-atlas.mjs --check 校验，原图不会被修改。

## 武器提示词

```text
Use case: stylized-concept. Create a production PNG sprite sheet for a charming classroom stationery game. GENUINE transparent alpha background. Clean flat cartoon CUT-PAPER style, bold uniform dark forest-green outline #293b35, flat warm cream, mint, amber, dusty blue, salmon. Only flat color shapes and one tiny highlight, NO depth, NO 3D rendering, NO bevels, NO visible top or side thickness planes, NO perspective, NO isometric projection, NO vanishing points. All geometry is an orthographic SIDE ELEVATION, like flat stickers drawn in a technical side view. Rounded friendly silhouettes, crisp simple edges, readable at 48px. NO realistic weapons, NO tactical parts. No shadows outside sprites, no glow, no backdrop, no background texture, no star symbols, no numbers or text, no UI tiles. Each sprite completely isolated with large transparent gutters. Exactly SIX equal-width columns: base unstarred, 1 star, 2 star, 3 star, 4 star, 5 star, left to right. These are SIX distinct upgrade appearances of each family, but no badges painted into artwork. Never rotate any sprite diagonally; SHOP display rotation is done later by game code. Keep every sprite within central 78% of its cell width and height.
Canvas 1800 x 1500, SIX columns and FIVE equal-height rows. 25 sprites total, because final row has only ONE fixed eraser grip.
Row1: SIX horizontal amber ruler paper-ball launchers pointing right, each a perfectly flat long rectangle with ruler tick marks, tiny dark-green short nozzle on right, flat mounting edges, 4:1 silhouette. Progress from a plain wooden ruler, mint retaining clip, dual ruler layers shown as flat parallel lines, drafting ruler with blue rubberband, ruler with brass circle, to mint-and-gold master drafting ruler. NO perspective and no top face at all.
Row2: SIX compact upright school compass sights; flat circular pale-blue lens near upper left with one short angled mint drawing-compass leg leading to a flat horizontal foot. The foot must span the bottom center, no long tall leg. At each tier add a small brass pivot, another mint ring, compact blue bracket, extra small lens, gold ring. Same basic 1:1 compact silhouette. NOT microscopes with 3D bases, NO oval lenses, only perfect circles.
Row3: SIX upright dusty-blue staple refill holders, flat rectangular face, one dark-green top mounting tab. Three to five large horizontal cream staple strips visible on FRONT only. Gradually mint clips and simple gold brass corners. 3:4 silhouette. Straight vertical edges, NO side panel and NO top panel, no 3D cartridge depiction.
Row4: SIX horizontal mint giant paperclip stocks. Entire wire loop lies in same flat plane. Broad cream padded left end and tiny narrow right connector. 2.5:1 silhouette. Progress simple open paperclip loop, double loop, mint wrapped loop, blue reinforced loop, amber pencil reinforced loop, elegant brass-and-mint loop. No perspective thickness.
Row5: ONLY ONE basic upright salmon-pink eraser grip in FIRST column. A simple flat eraser with cream sleeve and flat dark-green top connector, gentle backwards lean built into silhouette. Remaining FIVE cells in row5 MUST BE COMPLETELY EMPTY transparent. Grip has no upgrades. Do not add extra objects to empty cells.
All sprites have absolutely flat side-view shapes, not diagonal shop poses. Large transparent gaps, each individual silhouette remains one connected shape. Horizontal parts have exact horizontal upper and lower edges.
```

## 道具提示词

```text
Use case: stylized-concept. Create a production PNG sprite sheet for a charming classroom stationery game. GENUINE transparent alpha background. Clean flat cartoon CUT-PAPER style, bold uniform dark forest-green outline #293b35, flat warm cream, mint, amber, dusty blue, salmon. Only flat color shapes and one tiny highlight, NO depth, NO 3D rendering, NO bevels, NO visible top or side thickness planes, NO perspective, NO isometric projection, NO vanishing points. All geometry is an orthographic SIDE ELEVATION, like flat stickers drawn in a technical side view. Rounded friendly silhouettes, crisp simple edges, readable at 48px. NO realistic weapons, NO tactical parts. No shadows outside sprites, no glow, no backdrop, no background texture, no star symbols, no numbers or text, no UI tiles. Each sprite completely isolated with large transparent gutters. Exactly SIX equal-width columns: base unstarred, 1 star, 2 star, 3 star, 4 star, 5 star, left to right. These are SIX distinct upgrade appearances of each family, but no badges painted into artwork. Never rotate any sprite diagonally; SHOP display rotation is done later by game code. Keep every sprite within central 78% of its cell width and height.
Canvas 1800 x 900, SIX columns and THREE equal-height rows, exactly 18 sprites.
Row1: SIX cream crumpled school notebook paper balls, compact round/angular outlines with a small bent paperclip at top. Flat polygonal paper folds, sparse pale-blue ruled lines. Base plain cream ball; then mint rubberband; salmon tape; blue binderclip; green crisscross band; master gold-and-mint band. DO NOT shade into realistic 3D paper. Simple flat 2D icon shapes only.
Row2: SIX upright compact school chalk capsules for mounting below ruler. Straight flat-sided mint/cream capsule body with a dark-green flat connector on top and two parallel cream chalk sticks visible on the front. Base simple mint chalk tin, cream band, blue casing, amber band, green brass corners, master mint/gold capsule. Flat frontal side elevation, top connector horizontal rectangle, NO visible top surface, NO ellipses suggesting cylinder perspective, no 3D canister rendering. 3:4 silhouette.
Row3: SIX upright cream-and-green school milk cartons with a blue straw leaning slightly to the right. Show ONLY one flat rectangular front face and a flat trapezoid folded top in silhouette, NO visible side panel, NO perspective lines, no 3D top surface. Base plain green cross carton, green sleeve, mint heart, blue straw reinforcement, gold ribbon edge, master green-and-gold heart carton. SIX distinct tiers. No text/logos.
Clear bold simple flat sticker art, no scenes and no extra objects.
```
