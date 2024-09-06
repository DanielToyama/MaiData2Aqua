const fs = require('fs');

// 读取原始 JSON 文件
fs.readFile('./origindata.json', 'utf8', (err, data) => {
    if (err) {
        console.error('读取原始文件时出错:', err);
        return;
    }

    try {
        const originalData = JSON.parse(data);

        // 转换数据格式
        const transformedData = {
            userMusicDetailList: originalData.flatMap(entry =>
                entry.userMusicDetailList.map(musicDetail => {
                    return {
                        musicId: musicDetail.musicId,
                        level: musicDetail.level,
                        playCount: musicDetail.playCount,
                        achievement: musicDetail.achievement,
                        comboStatus: musicDetail.comboStatus,
                        syncStatus: musicDetail.syncStatus,
                        deluxscoreMax: musicDetail.deluxscoreMax,
                        scoreRank: musicDetail.scoreRank,
                        extNum1: musicDetail.extNum1
                        // extNum2 被移除
                    };
                })
            )
        };

        // 读取 emptydata.json 文件
        fs.readFile('./emptyData.json', 'utf8', (err, emptyData) => {
            if (err) {
                console.error('读取空数据文件时出错:', err);
                return;
            }

            try {
                let emptyDataObj = JSON.parse(emptyData);

                // 将转换后的 userMusicDetailList 赋值给 emptyDataObj
                emptyDataObj.userMusicDetailList = transformedData.userMusicDetailList;

                // 保存修改后的数据到新的 JSON 文件
                fs.writeFile('./finalData.json', JSON.stringify(emptyDataObj, null, 4), 'utf8', (err) => {
                    if (err) {
                        console.error('写入最终文件时出错:', err);
                        return;
                    }
                    console.log('转换后的数据已成功保存到 finalData.json');
                });

            } catch (error) {
                console.error('解析空数据文件时出错:', error);
            }
        });

    } catch (error) {
        console.error('解析原始 JSON 数据时出错:', error);
    }
});
