window.BB=window.BB||{};
BB.spawnEnemies=function(grid,level,difficulty){
  const spots=[];
  for(let y=1;y<BB.ROWS-1;y++)for(let x=1;x<BB.COLS-1;x++)if(!grid[y][x]&&x+y>9)spots.push({x,y});
  spots.sort((a,b)=>b.x+b.y-a.x-a.y);
  const bossLevel=level%5===0,mini=[4,9,14,19].includes(level),cfg=BB.CONFIG[difficulty];
  const count=Math.min(10,cfg.enemies+Math.floor(level*.45)+(mini?1:0));
  const kinds=['bug','slime','hunter','tank','ghost','bomber'];
  return spots.slice(0,count).map((p,i)=>{
    const boss=(bossLevel||mini)&&i===0;
    const kind=boss?'boss':kinds[(i+Math.floor(level/2))%kinds.length];
    const hp=boss?(mini?2:3+BB.worldIndex(level)):kind==='tank'?2:1;
    return {...p,rx:p.x,ry:p.y,id:BB.serial++,kind,hp,maxHp:hp,boss,mini,timer:360+i*100,special:boss?2200:kind==='bomber'?3000:0,hit:0,phase:1,frame:0,facing:'left',hitSources:{},deadTimer:0};
  });
};
