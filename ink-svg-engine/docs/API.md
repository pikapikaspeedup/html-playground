# INK 0.1 — API 与素材约定

这是现有实现的接口说明，而不是全部功能的规划清单。当前运行时使用普通脚本加载顺序与 `globalThis.INK` 命名空间；纯核心也能被 Node.js 的 `require()` 加载。没有 ES-module 打包器要求。

## 1. 核心最小示例

下面的代码可在源码包根目录用 Node.js 运行，演示逐帧派发事件和命中定格：

```js
const INK = require('./src/ink/core.js');
const clip = new INK.Clip({
  version: 1,
  id: 'demo:punch',
  character: 'ryu',
  duration: 36,
  phases: { startup: [0, 10], active: [10, 16], recovery: [16, 36] },
  tracks: {
    lean: [[0, 0], [8, -9, 'load'], [10, 16, 'strike'], [16, 16, 'hold'], [36, 0]],
    fw: [[0, [90, -298]], [8, [24, -270]], [10, [165, -288], 'strike'], [36, [90, -298]]]
  },
  events: [{ frame: 10, type: 'contact', socket: 'frontArm' }]
});
const player = new INK.Player(clip);
for (let i = 0; i < 42; i++) {
  const events = player.step();
  for (const event of events) {
    console.log(event.type, event.frame, player.frame); // contact 10 10
    if (event.type === 'contact') player.freeze(3);
  }
  const pose = player.sample(0); // 返回新的数值姿势，不修改 clip
}
```

事件在进入对应整数帧时派发。第 0 帧的初始事件在第一次 `step()` 时派发；`seek(n)` 将游标设为该帧，不重播被跳过或该帧已经存在的事件。`duration` 是终点姿势的帧坐标，事件帧范围是 `0 ... duration-1`。

### 实际接口

| 接口 | 作用 |
|---|---|
| `new Clip(data)` | 深拷贝并验证版本、轨道、事件、阶段、挂点等数据。 |
| `clip.sample(frame, basePose?)` | 任意小数帧采样。边界夹紧到 `0 ... duration`，不派发事件。 |
| `clip.toJSON()` | 返回可序列化的独立副本。 |
| `new Player(clip, basePose?)` | 有状态播放实例。 |
| `player.play(clip, blendFrames=0)` | 切换动作；可从之前的姿势混合进入。 |
| `player.step()` | 一个整数模拟步，返回事件数组。 |
| `player.freeze(n)` | 冻结随后 n 个模拟步的播放进度。 |
| `player.sample(alpha=0)` | 渲染采样；冻结中不插值前进。 |
| `player.seek(frame)` | 暂定到整数帧，不派发事件。 |
| `player.snapshot()` / `restore(snapshot, registry)` | 保存/恢复动画播放状态；不是完整游戏状态。 |
| `new FixedClock(hz=60, maxSteps=8)` | 累积时间并限制一次回调的追赶步数。 |
| `clock.advance(nowMs, stepFn, speed=1)` | 执行所需模拟步，返回小数余量 `alpha`。 |
| `clock.reset()` | 清空时间差；用于失焦、暂停和速度切换。 |

浏览器的基本驱动方式：

```js
const clock = new INK.FixedClock(60, 8);
function frame(now) {
  const alpha = clock.advance(now, () => {
    for (const event of player.step()) handleVisualEvent(event);
  });
  renderer.render(player.sample(alpha), { frame: player.frame + alpha });
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => clock.reset());
requestAnimationFrame(frame);
```

`handleVisualEvent` 是应用层函数。不要在渲染回调或 `sample()` 中改血量。本库不是碰撞、输入或完整战斗状态机的替代品。

## 2. 骨骼、IK 与坐标

`Skeleton` 是通用 FK 图。骨骼按照父在前、子在后的顺序声明。每个节点可声明 `name, parent, x, y, rotation, sx, sy`，角度单位为度。

```js
const skeleton = new INK.Skeleton([
  { name: 'root', x: 150, y: 400 },
  { name: 'pelvis', parent: 'root', y: -190 },
  { name: 'chest', parent: 'pelvis', y: -104 },
  { name: 'hand', parent: 'chest', x: 110 }
]);
skeleton.update({ chest: { rotation: -12 } });
console.log(skeleton.point('hand')); // 世界坐标
```

`INK.twoBone(root, target, upperLength, lowerLength, poleSign=1, margin=0)` 返回 `[根点, 肘/膝, 末端]`。不可达目标被夹紧；`poleSign` 决定弯曲侧，退化目标有确定解；无效输入和不合理的 reach margin 会抛出错误。

`Rig` 是为当前八角色提供的兼容层，并非任意角色自动适配器。它仍包含基线肩宽/骨长的回退约定。通用骨架使用 `Skeleton`，已有角色使用 `Rig.solveAnimation(profile, pose)`；实际游戏适配器则直接读原游戏解算出的骨骼。

当前角色姿势的坐标约定：脚底地面附近为 y=0，脚踝基线约 -16，骨盆约 -191，胸部约 -295。y 轴向下。`rw/fw` 为后/前手腕的躯干局部目标；`ra/fa` 是角色局部脚踝目标。躯干先应用 `lean/bob`，胸廓和骨盆还有局部转动。所有世界镜像、根位移与整体翻转在角色外层节点完成。

主要轨道：

```text
lean, bob, head, chest, pelvis              身体倾斜、上下重心、头胸髋角度
rw, fw, ra, fa                            手腕/脚踝二维目标
spin, turn, depth                         整体旋转、前后视图选择、横向投影
rootX, rootY, rootShift, floor            动作研究的根位移/偏移
open, fan, fanAngle                       手型与扇面
ffoot, rfoot                              前/后脚末端角度
frontArmPole, rearArmPole,
frontLegPole, rearLegPole                 IK 弯曲方向
frontArmProjection, rearArmProjection,
frontLegProjection, rearLegProjection     作者指定的投影缩短，默认 1
```

`Projection` 仅用于动画研究的 `Rig.solveAnimation`，夹紧在 0.12～1，不修改角色的绑定骨长。它不是从三维模型自动计算的真实透视。

`Rig.sockets(pose, solvedRig)` 返回四肢链以及 `pelvis/chest/neck/head` 点。四肢字段是三点数组，其余字段是单点。当前工作台用胸部挂点表示鼯鼠之舞的身体先行轨迹，用脚端表示上踢轨迹。

## 3. 路径蒙皮与修形

`compilePath(d)` 将支持的命令转为绝对 `M/L/Q/C/Z`。支持 `H/V/S/T` 和相对命令、指数数字；拒绝椭圆弧及无法解析的字符。`pathString(compiled, values?)` 序列化到两位小数。

```js
const bind = [INK.mat.identity(), INK.mat.identity()];
const shape = new INK.WeightedPath(
  'M0 0C10 20 30 40 50 60Z',
  () => [0.4, 0.6],
  bind
);
const d = shape.deform([INK.mat.compose(5, 0), INK.mat.compose(20, 0)]);

const corrective = new INK.MorphPath('M0 0L10 10', {
  flex: 'M0 2L20 12'
});
console.log(corrective.sample({ flex: 0.5 })); // M0 1L15 11
```

`WeightedPath` 的每个控制点权重必须非负、总和为一；绑定矩阵必须可逆。`MorphPath` 要求所有目标和基础路径的规范化命令一致，权重总和不超过一。它们不是任意 SVG 文档导入器。

当前 `SkinGroup` 给已有胸腹 SVG 建立三个影响区域。肢体采用解析连续轮廓，而不是 `WeightedPath` 贴图网格。完整八角色肩肘修形库尚未制作。

## 4. 渲染器加载与接口

八角色素材的加载顺序：

```text
src/atelier-art.js
src/models/head.js
src/models/torso.js
src/ink/core.js
src/ink/assets.js
src/ink/renderer.js
```

在 SVG 的 `<defs>` 中先初始化素材定义：

```js
SF6Art.configure(INK.assets.profiles, document.querySelector('svg defs'));
const profile = INK.assets.byID.mai;
const renderer = new INK.Renderer(document.querySelector('#actor'), profile);
renderer.setMode('overlay');
renderer.setStyle({ volume: 1, head: 1.05 });
renderer.render(INK.motion.library['mai:hishou-ryuuenjin'].sample(22), {
  frame: 22,
  expression: 'power',
  secondary: true,
  impulses: [{ frame: 22, amplitude: 9 }]
});
```

这个例子额外需要加载 `src/ink/clips.js`。`#actor` 是 SVG 里的 `<g>`，需要由调用方放在合适的地面位置与比例下；渲染器本身不替调用方设置舞台镜头。

模式为 `skin/overlay/rig/silhouette`。剪影样式规则位于工作台 CSS 与对战构建器，单独接入渲染器时应一并复制对应选择器。`render()` 的可选 `rig` 参数可直接传入已解算的骨骼，例如读取原游戏状态；此时不会用编辑器骨架重算正常链。

`destroy()` 移除实例根节点。初始化及首次绘制后节点复用，但数值计算并非全程零分配。`stats.cpuMs` 是同步 JavaScript 更新时间，不含浏览器后续 paint。

## 5. 角色配置文件

工作台“角色设置”生成如下结构，和动作 JSON 分开：

```json
{
  "version": 1,
  "kind": "ink-character-profile",
  "character": "mai",
  "arm": [13.4, 7, 5.8],
  "leg": [24.7, 13.3, 8.4],
  "headScale": 0.84,
  "rigLengths": [64, 67, 96, 98],
  "rigRearShoulder": [-33, -292],
  "rigFrontShoulder": [34, -290],
  "style": { "volume": 1, "head": 1 }
}
```

`arm/leg` 分别是根部、关节、末端的轮廓宽度；`rigLengths` 为上臂、前臂、大腿、小腿的绑定长度。导入验证通过之后才修改角色，且不改当前动作 JSON。切换角色会保留本次页面会话里的设置，但刷新后需要重新导入文件。

配置只允许数值与已知字段，不接受 SVG 脚本或任意素材路径。没有通用可视化权重涂刷器，也没有逐点轮廓绘图工具；此类资产仍在 `src/ink/assets.js` 与 SVG 源码中修改。

## 6. 接入现有游戏

`tools/build_ink_game.py` 读取原 `game.js`，在 `dist/game-ink.js` 中保留原 `renderFighterLegacy`，再生成新绘制入口。原始文件不被写回。

新入口传入原姿势与原骨骼，保留阴影、蓄力与战斗特效使用的挂点。`INK.Game.setEnabled(false)` 立即切回旧画面，`setEnabled(true)` 切回新画面。检查范围包括血量、斗气、超必杀资源、位置和原姿势数据没有因为切换而变化。

这是基于已检查基线的适配，不是任意版本的自动补丁。构建器使用明确字符串锚点；上游改变渲染函数结构后需要重新检查，而不是静默拼接到未知位置。新的 Clip 时序和根位移没有自动注入游戏。

## 7. 建议的内容迁移验收

导入工作台动作后，先检查原有效帧在新姿势中的位置，再确定脚端、拳端或身体挂点的语义；明确角色根位置由游戏还是动画负责。完成正反朝向、命中停顿、取消、空中、墙角检查后，才更换对应招式的生产绑定。

未来扩展应增加世界脚底约束、成对投技绑定、可视化修形/权重编辑、事件与碰撞盒标定，以及真实设备 paint 测量。以上没有作为已完成功能交付。
