# MaiData2Aqua
用于把从SDGB服务器导出的gamedata转化为AquaNet可读的格式

使用方法（五选一）：
1.在tg某麦当劳机器人使用/getplaydata json下载gamedata.json打开[maidatatrans.html](https://danieltoyama.github.io/MaiData2Aqua/maidatatrans.html),导入gamedata.json并且转换

2.使用[lxns.html](https://danieltoyama.github.io/MaiData2Aqua/lxns.html)从落雪maimai工具转换

3.使用[divingfish.html](https://danieltoyama.github.io/MaiData2Aqua/divingfish.html)从水鱼maimai工具转换

4.使用[dxrating.html](https://danieltoyama.github.io/MaiData2Aqua/dxrating.html)从dxrating工具转换

5.本地启动Nodejs环境使用[index.js](https://danieltoyama.github.io/MaiData2Aqua/index.js)转换麦当劳机器人获取的数据（非常不推荐）



注意：

此时Aqua服务器不会显示你上传的游戏成绩，需要上机一把才能将数据读取出来。

如果因为舞萌版本过旧无法使用我的存档的版本，请你定位到“lastRomVersion”等字符自行修改版本

Q：为什么Aqua服务器不将上传的成绩统计到游玩数据（Ap 数据 FC数据等等）

A：因为此数据仅包含游玩历史和成绩总结，没有详细的游玩记录，服务器不会将其计入统计中

## dxrating 谱面数据

`dxrating.html` 的谱面 ID 表已从页面中剥离，单独放在 `data/dxdata-index.js`。页面运行时通过
`<script src="data/dxdata-index.js">` 加载，因此部署或本地打开时必须保持 `data/` 目录与该 HTML 同级
（仍然完全离线、无需联网，不会上传任何数据）。

数据由 [gekichumai/dxrating](https://github.com/gekichumai/dxrating) 的
`packages/dxdata/dxdata.json` 投影生成：

```bash
# 从 GitHub 拉取最新上游数据（默认）
node scripts/update-dxdata.mjs

# 或用本地已更新的 dxrating 仓库生成
node scripts/update-dxdata.mjs \
  --dxdata ../dxrating/packages/dxdata/dxdata.json \
  --id-map ../dxrating/apps/web/src/assets/music-id-map.json
```

GitHub Actions（`.github/workflows/update-dxdata.yml`）每天自动执行上述脚本，上游
dxdata 有变化时提交更新后的 `data/dxdata-index.js`。

