# MaiData2Aqua
用于把从SDGB服务器导出的gamedata转化为AquaNet可读的格式

使用方法（四选一）：
1.在tg某麦当劳机器人使用/getplaydata json下载gamedata.json打开[maidatatrans.html](https://danieltoyama.github.io/MaiData2Aqua/maidatatrans.html),导入gamedata.json并且转换

2.使用[lxns.html](https://danieltoyama.github.io/MaiData2Aqua/lxns.html)从落雪maimai工具转换

3.使用[divingfish.html](https://danieltoyama.github.io/MaiData2Aqua/divingfish.html)从水鱼maimai工具转换

4.本地启动Nodejs环境使用[index.js](https://danieltoyama.github.io/MaiData2Aqua/index.js)转换麦当劳机器人获取的数据（非常不推荐）



注意：

此时Aqua服务器不会显示你上传的游戏成绩，需要上机一把才能将数据读取出来。

如果因为舞萌版本过旧无法使用我的存档的版本，请你定位到“lastRomVersion”等字符自行修改版本

Q：为什么Aqua服务器不将上传的成绩统计到游玩数据（Ap 数据 FC数据等等）

A：因为此数据仅包含游玩历史和成绩总结，没有详细的游玩记录，服务器不会将其计入统计中

