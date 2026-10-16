# 相位 PHASE

`phase-demo` 定版保存，標籤 `demo-final-v10`。遊戲內容與公開第 10 版一致。

八關鍵盤解謎平台遊戲。跳躍換色，衝刺保色；同時安排下一個借力面與尖刺的安全相位。

[線上遊玩](https://phase-three-color.swear01.chatgpt.site/)，或直接用瀏覽器開啟 `index.html`，不需安裝。

- 成功跳躍／牆跳：紅 → 藍 → 綠 → 紅。攀爬、翻牆與衝刺維持顏色。
- 平台在所屬相位實體；尖刺在所屬相位致命。黃＝紅＋綠、紫＝紅＋藍、青＝藍＋綠，白色永久啟用；混色物件的小色點標示有效相位。
- 方向鍵／WASD 移動、瞄準、攀爬；Z／Space 跳，X 衝刺，C／Shift 抓牆；R 重玩，Esc 暫停。
- 落地恢復體力並延遲補回一次衝刺，抓牆不補衝刺。死亡快速回到本關出生點，可直接選關。

核心規則與移動參考見 [CORE.md](CORE.md)，八關的構思與難度安排見 [DESIGN.md](DESIGN.md)，人物與貼圖見 [ART.md](ART.md)。

## 編排地圖

`levels.json` 為來源：原生 320×180 像素、**8×8 地形格**，每房 40 欄 × 23 列；底列僅顯示上方 4 像素。CSS 只放大畫面。

`terrain` 每列 40 字元：`.` 空白，`R/B/G` 紅／藍／綠，`Y/M/C` 黃／紫／青，`W` 白，`#` 舊灰色永久地形。`spawn`、`goal` 是 `[欄,列]`，定位左側與腳底；`phase`、`goalPhase` 是 0 紅、1 藍、2 綠。

尖刺另用 `spikes: [{x: 8, y: 19, length: 6, dir: "up", color: "R"}]` 編排，座標與長度以格為單位。方向為 `up/down/left/right`，顏色可用七色；每格靠基座的 3 像素致命。

修改後嵌入離線單檔：

```sh
node scripts/embed-levels.cjs
node scripts/embed-levels.cjs --check
```

## 驗證

```sh
node tests/campaign.cjs
node tests/tile-grid.cjs
node tests/reference-movement.cjs
node tests/reference-actions.cjs
node tests/reference-climb.cjs
node tests/browser.cjs
BROWSER_HZ=120 node tests/browser.cjs
```

瀏覽器測試使用既有 Playwright；可用 `NODE_PATH`、`CHROMIUM_PATH` 指定安裝位置。`tests/route.json` 是當前八關的完整通關輸入，`tolerances.json` 與 `mistakes.json` 保存容錯與碰刺路線。舊地圖的繞法回歸明確載入 [歷史夾具](tests/legacy/README.md)。

[全圖檢查](tests/ROOM-AUDIT.md) 盤點每塊地形與尖刺，[反例工具](tests/MECHANISM-AUDIT.md) 搜尋略過指定互動的解法。有限搜尋不能證明唯一解；腳本容錯也不代表真人首次遊玩的難度。尚無地圖編輯器、手把或完整 Celeste 機關；此 repository 保存最終 demo，完成發布後封存；公開遊戲另由 Sites 與 itch.io 提供。
