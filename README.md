# MaiData2Aqua
用于将麦当劳机器人导出的gamedata转化为AquaNet可读的格式

使用说明：
1.下载此项目

2.在某麦当劳机器人使用/getplaydata json下载gamedata.json

3.将gamedata.json改名为origindata.json放置到同一文件夹下

4.使用start.bat开始转换json文件（需要nodejs环境,如果你愿意的话可以使用web js重构此项目）。

5.将导出的finalData导入到任意Aqua服务器

注意：此时Aqua服务器不会显示你上传的游戏成绩，需要上机一把才能将数据读取出来。

Q：为什么Aqua服务器不将上传的成绩统计到游玩数据（Ap 数据 FC数据等等）

A：因为此数据仅包含游玩历史和成绩总结，没有详细的游玩记录，服务器不会将其计入统计中