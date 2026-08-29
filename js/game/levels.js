window.BB=window.BB||{};
BB.makeGrid=function(level){const g=Array.from({length:BB.ROWS},()=>Array(BB.COLS).fill(0)),boss=level%5===0;for(let y=0;y<BB.ROWS;y++)for(let x=0;x<BB.COLS;x++){if(x===0||y===0||x===BB.COLS-1||y===BB.ROWS-1||(x%2===0&&y%2===0))g[y][x]=1;}
const safe=new Set(['1,1','2,1','1,2']);let seed=level*9973;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};for(let y=1;y<BB.ROWS-1;y++)for(let x=1;x<BB.COLS-1;x++){if(g[y][x]||safe.has(`${x},${y}`))continue;let p=.36+Math.min(.12,level*.004);if(boss)p=.18;if(rnd()<p)g[y][x]=2;}
// carve guaranteed route and reward pockets
for(let x=1;x<BB.COLS-1;x++)if(x%2)g[1][x]=0;for(let y=1;y<BB.ROWS-1;y++)if(y%2)g[y][BB.COLS-2]=0;[[2,1],[1,2],[3,1],[1,3],[BB.COLS-2,BB.ROWS-2],[BB.COLS-3,BB.ROWS-2],[BB.COLS-2,BB.ROWS-3]].forEach(([x,y])=>g[y][x]=0);
if(boss){for(let y=3;y<=7;y++)for(let x=3;x<=9;x++)if(!(x%2===0&&y%2===0))g[y][x]=0;const w=BB.worldIndex(level);if(w===0)[[3,3],[9,3],[3,7],[9,7]].forEach(([x,y])=>g[y][x]=2);if(w===1)[[5,3],[7,3],[5,7],[7,7]].forEach(([x,y])=>g[y][x]=1);if(w===2)[[3,5],[5,5],[7,5],[9,5]].forEach(([x,y])=>g[y][x]=2);if(w===3)[[4,3],[8,3],[4,7],[8,7]].forEach(([x,y])=>g[y][x]=1);}
return g;};
