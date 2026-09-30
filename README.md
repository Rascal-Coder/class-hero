# 下课别跑

Cocos Creator **3.8.8** 竖屏 2D 游戏。把尺子、橡皮、回形针、圆规组合成文具武器，守住放学后的操场。全部角色和文具由 Cocos Graphics 绘制，不需要外部贴图或网络服务。

## 运行

用 Cocos Creator 3.8.8 打开此文件夹，双击 `assets/scenes/Classroom.scene`，点击预览。工程已带场景、脚本、音效及资源元数据。

Web 构建：在 PowerShell 中执行 `./build.ps1`。安装 Node.js 后执行 `npm run preview`，访问 <http://localhost:7459>。浏览器版本来自实际 Cocos 引擎构建。

## 操作

- 将小卖部商品拖到书包绿色格或课桌暂存格，成功放下才扣钱。
- 点击商品查看详情，也可购买并自动寻找接口安装。
- 发射器接在握把上方，更多发射器可向上叠加；枪托接左侧，瞄具接最上方，弹匣接发射器下方的侧面接口。
- 拖动橡皮握把移动整把武器；拖动配件可以拆下重装。纸团和牛奶独立放置。
- 暂存区的物品不参与战斗。无握把连接的发射器不提供火力。
- 点击「去操场」开始自动战斗。每两波选择一次奖励，共 15 波。
- 空格开战/暂停，Esc 返回/暂停，R 刷新，1/2/3 购买并自动安装，Tab 和 Enter 导航按钮。

每次整备操作自动保存；重新打开页面回到最近一次整备检查点。暂停菜单可以重开并重置当前局。

## 与参考视频的对应

采用 6×5 装备格、10 个暂存位、3 个商店位、武器接口拼装、红绿放置提示、自动横向战斗的结构。可观察到的属性变化和组合过程记录在 [reference/analysis.md](reference/analysis.md)。

原视频仅 66 秒，展示到第 3 波。后续敌人数值、未展示配件规则、掉落概率和广告奖励不能从这段视频完整确定。本项目把已观察到的部分实现并测试；15 波关卡平衡、奖励效果、牛奶回复、弹匣接口为可调整的补全规则。没有接入广告 SDK，视频中的广告免费领取位使用普通零花钱购买。

## 验证与代码

`npm test` 运行无渲染依赖的组合和战斗测试；`npm run typecheck` 使用 Creator 生成的引擎类型检查。先用 Creator 打开或构建工程，生成 `temp/tsconfig.cocos.json`。

| 文件 | 职责 |
| --- | --- |
| `assets/scripts/core/Inventory.ts` | 占格、接口图、属性、暂存、枪托替换、存档验证 |
| `assets/scripts/core/Battle.ts` | 自动射击、投掷、命中暴击、敌人、波次结算 |
| `assets/scripts/ClassroomGame.ts` | Cocos 输入、界面、拖拽交易、状态与存档 |
| `assets/scripts/Painter.ts` | 极简校园角色、文具和界面的原生图形绘制 |
| `tools/setup.mjs` | 可重复生成场景和资源 UUID |

构建方式参考 [Cocos 官方命令行构建文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)。
