# 校园文具图集

> 本文保留第一版生成记录。当前资源已重新生成为纯侧面、初级及 1–5 星；以 [sprite-prompts-flat.md](sprite-prompts-flat.md) 为准。

使用内置 image_gen 生成，透明 PNG 原图完整保留，没有二次重绘或去背景处理。

- weapons.png：5 行 × 5 列，依次为尺子发射器、圆规瞄具、订书钉弹匣、回形针枪托、橡皮握把。
- items.png：3 行 × 5 列，依次为纸团炸弹、下挂粉笔罐、牛奶补给。
- 每行从左到右为 1–5 星。原图存在少量排列偏移，实际切片使用 atlas.json 的像素范围，不按等宽格硬切。
- 图集保存侧面姿态，游戏商店将同一切片旋转 32°；进入背包、暂存格与拖拽时保持侧面。星级由游戏绘制。
- tools/build-sprite-atlas.mjs 只读取透明轮廓生成切片坐标，不修改 PNG；加 --check 校验已有坐标。

## 武器图集提示词

```text
Use case: stylized-concept. Asset type: production transparent PNG sprite sheet for an existing cozy school-themed 2D mobile game called Class Hero.
Art style: charming hand-drawn cartoon school stationery, simple bold dark forest-green outlines (#293b35), restrained warm cream, amber, muted salmon, mint, dusty blue. Crisp readable silhouettes, gentle cel shading, very few broad highlights; NO photorealism. Existing game uses cream paper and chalkboard green. These are imaginative student-made stationery contraptions, NOT realistic firearms or military equipment.
Background: genuine transparent alpha. No opaque backdrop, no checkerboard painted into image, no ground shadows, no UI panels, no text, no numbers, no star badges, no labels, no captions. Keep each sprite completely isolated with ample transparent gutter, no overlaps.
Layout: a rigid regular grid, five equal-width columns. Each column is the next tier, from 1 at left to 5 at right; each successive tier adds visible crafted details and improves silhouette while staying the SAME stationery family. Every cell has exactly one sprite, centered, wholly inside its cell with at least 12% blank padding. Never combine cells or skip tiers.
Camera: pure orthographic side profile, completely flat, NOT isometric and NOT diagonal. This is crucial because code will rotate shop icons; bag pieces must be horizontal and connect cleanly.
Canvas square 1536 x 1536, exactly FIVE rows by FIVE columns, 25 isolated sprites. Row order top to bottom:
1. RULER BARRELS: five long horizontal amber wooden/plastic school rulers transformed into toy paper-ball launchers, 3:1 aspect ratio, pointing RIGHT. Clear short ruler tick marks but no numeric writing. Flat bottom, eraser pad at left and a small short dark-green pencil-cap muzzle on right. Tiers: simple wooden ruler; reinforced mint clip; double-layer ruler; mechanical drafting ruler with a blue rubber band and circular pivot; elaborate gold-edged drafting ruler with compact green clip details. Every tier still unmistakably a ruler.
2. COMPASS SIGHTS: five small upright mint and dusty-blue school drawing compasses / small magnifying-lens contraptions, each has a large round lens/pivot near upper left, short angled compass leg leading down onto a horizontal flat mounting foot. Roughly square silhouette, no military scopes. Tiers progress from a simple compass with one lens to elegant scientific school compass with extra mint rings and tiny gold brass knobs.
3. STAPLE MAGAZINES: five upright chunky dusty-blue cartridge-shaped packs made from visibly stacked silver STAPLES, broad top connector, 3:4 aspect ratio. Tier1 three oversized staple strips in a blue holder, increasing to five-tier polished stapler refill cassette. Stay plainly school staples, not bullets.
4. PAPERCLIP STOCKS: five horizontal mint-metal paperclip assemblies, 2.3:1 aspect ratio, broad padded left end, narrow connector at RIGHT. Tier1 a bent giant paperclip open wire loop; tier2 double paperclip; tier3 thick wire loop reinforced with amber pencil offcut; tier4 geometric paperclip frame with mint tape; tier5 double drafting-clip frame with small brass studs. All are horizontal, no grip attached, no full gun.
5. ERASER GRIPS: five upright muted salmon pink rectangular erasers shaped as slanted handles with flat top connectors, slight backwards lean, tall 3:4 silhouette. Tier1 basic pink eraser with cream paper sleeve, higher tiers progressively mint bands, layered rubber, a small side finger loop and elegant gold brass corner details. Must look like ERASERS, no tactical handgun.
Maintain consistent visual size within each row; each row is distinct. All 25 modules only, no complete assembled weapons.
```

## 道具图集提示词

```text
Use case: stylized-concept. Asset type: production transparent PNG sprite sheet for an existing cozy school-themed 2D mobile game called Class Hero.
Art style: charming hand-drawn cartoon school stationery, simple bold dark forest-green outlines (#293b35), restrained warm cream, amber, muted salmon, mint, dusty blue. Crisp readable silhouettes, gentle cel shading, very few broad highlights; NO photorealism. Existing game uses cream paper and chalkboard green. These are imaginative student-made stationery contraptions, NOT realistic firearms or military equipment.
Background: genuine transparent alpha. No opaque backdrop, no checkerboard painted into image, no ground shadows, no UI panels, no text, no numbers, no star badges, no labels, no captions. Keep each sprite completely isolated with ample transparent gutter, no overlaps.
Layout: a rigid regular grid, five equal-width columns. Each column is the next tier, from 1 at left to 5 at right; each successive tier adds visible crafted details and improves silhouette while staying the SAME stationery family. Every cell has exactly one sprite, centered, wholly inside its cell with at least 12% blank padding. Never combine cells or skip tiers.
Camera: pure orthographic side profile, completely flat, NOT isometric and NOT diagonal. This is crucial because code will rotate shop icons; bag pieces must be horizontal and connect cleanly.
Canvas landscape 1536 x 1024, exactly THREE rows by FIVE columns, 15 isolated sprites. Row order top to bottom:
1. PAPER-BALL BOMBS: five crumpled cream notebook paper balls, visibly folded angular paper creases, a tiny dark-green bent paperclip fuse at top. Tier1 one simple crumpled ball; tier2 mint rubberband wrap; tier3 folded paper layers with salmon tape; tier4 thicker paperball with blue binder clip; tier5 intricate faceted paperball wrapped with green-and-gold school rubberband. Roughly square silhouettes, playful harmless school-game prop.
2. UNDERBARREL SCHOOL CANISTERS: five upright compact DIY chalk-and-eraser capsule dispensers with flat dark-green mounting clip on top. Cream/mint body made of a chunky school chalk tin with horizontal rubberband ribs. Tier1 simple green chalk capsule; tier2 mint with cream bands; tier3 blue/cream chalk capsule with a tiny binderclip; tier4 amber reinforced school-glue-stick capsule; tier5 decorated mint and gold brass chalk canister. Friendly school supplies, no military grenade shape or pin. All have a clear flat top connector for attaching below a ruler.
3. MILK SUPPLIES: five upright cream school milk cartons with sage-green panels, simple folded gable tops and tiny blue straw pointing upward. No letters or logos. Tier1 plain carton with a green cross pictogram; tier2 green sleeve and straw; tier3 larger carton with mint heart pictogram; tier4 reinforced cream-green lunch milk carton with blue straw; tier5 elegant school lunch milk carton with green heart and small golden ribbon detail. Still a SINGLE identifiable milk carton in every cell.
All fifteen have bold friendly outlines with minimal detail readable at tiny scale, consistent visual size, blank alpha gutters.
```
