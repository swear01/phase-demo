# 機關反例檢查

工具從真實出生點搜尋「零死亡通關、但缺少指定互動」的路線，實際執行 `Game.step`，不搬動角色或補資源。`found` 必須以完整輸入重新通關；有限搜尋未找到不能證明機關必要、唯一解或最少跳數。

```sh
node tests/campaign.cjs
node tests/mechanism-audit.cjs
node scripts/audit-mechanisms.cjs --seconds 15 --states 120000 --frames 1200
node scripts/audit-rooms.cjs --seconds 0
node scripts/audit-rooms.cjs --seconds 8 --states 180000 --width 48
```

`campaign.cjs` 驗證**目前八關**；`mechanism-audit.cjs`、`room-audit.cjs` 的工具自檢與舊繞法回歸明確使用 [歷史夾具](legacy/README.md)，不能拿它們的通過代替新版驗證。新版結果見 [ROOM-AUDIT.md](ROOM-AUDIT.md)。

## 宣告互動

`tests/mechanisms.json` 使用 8 像素地形格。每個項目有唯一 `id`、`kind`、`rect: [x,y,w,h]` 與 `phaseMask`；1 紅、2 藍、4 綠，可相加。

| kind | 觀測條件 |
| --- | --- |
| visit | 進入區域 |
| land | 在區域頂面落地 |
| climb | 實際抓牆 |
| wall | 抓牆或牆跳接觸 |
| contact | 牆接觸或站在頂面 |
| change | 在區域內成功換色 |
| cross | 角色中心跨過區域中線 |

`cross` 的 `axis` 預設 x，`direction` 可用 -1／1；牆接觸的 `side` 可限定左 -1／右 1。牆跳觀測記錄變色前的實際借力，包含 5 像素牆彈跳。若核心是借力，同台側蹬與落地應同樣算使用；空中碰門本來就能通關，不強迫先落出口台。

## 搜尋與輸出

先重播種子、嘗試刪段或替換，再以 beam 搜尋延伸。除出生點外，種子路線的跳躍、衝刺、落地、抓牆、機關事件前後與每 60 幀，可成為分支起點；每個起點保留完整出生點輸入前綴、資源、按鍵、顏色、計時器與已用機關。完成狀態也納入 visited。

`--level` 從 1 起算，`--avoid` 指定互動 id，`--seed` 接受完整反例檔或 `segments: [{frames,input}]`。`--game`、`--contracts` 可指定另一版。步長 `--step` 預設 6，`--width` 預設 180；每條路線至多 3600 幀，步長至多 120。輸出預設 `scratch/mechanism-audit/summary.json`，找到時保存完整 witness。

結果為 `found`、`no witness within budget` 或 `incomplete`。報告保存時間、候選數、`depthFrames`（含前綴）、`branchDepthFrames`（分支實際探索深度）與 `prefixStarts`。量化、步長、時間上限與剪枝都可能漏解。

`audit-rooms.cjs` 逐塊盤點全部地形與尖刺，以目前通關、容錯、失誤及額外 witness 路線記錄接觸、停用穿越與延後實體化；逐一移除區段重播，再對各宣告互動獨立搜尋。移除出生落點會讓場景無效，明確不執行該消融。預設輸出 `scratch/full-room-audit/summary.json`；各 found 以機關名稱分檔。

未碰到守門牆、或刪除後預定解仍可通，均不能證明它無用。反例應區分「整段核心被略過」與「同一借力面換了使用方式」，保留原始發現與實際重播結果。
