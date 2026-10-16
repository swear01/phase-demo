# Historical campaign

`campaign.json` freezes the eight-room campaign at `25c2530`, including maps, mechanism contracts and routes compressed into input segments. `witnesses/` preserves the complete bypass and accepted-alternative records.

`campaign.cjs` applies those maps to the **current engine**. The historical coordinate tests continue checking the repaired bypasses without reading the redesigned campaign's maps, routes or witnesses. Current campaign checks live separately.
