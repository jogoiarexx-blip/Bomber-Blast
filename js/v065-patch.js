(()=>{
  'use strict';
  if(!window.BB)return;

  const markVersion=()=>{
    document.title='Bomber Blast v0.6.5';
    document.querySelectorAll('.eyebrow').forEach(el=>{if(/v0\.6\./i.test(el.textContent))el.textContent=el.textContent.replace(/v0\.6\.\d+/i,'v0.6.5')});
    const gameTitle=document.querySelector('#game header h2');
    if(gameTitle)gameTitle.textContent='BOMBER BLAST v0.6.5';
  };
  markVersion();

  if(BB.LEVELS?.[6])Object.assign(BB.LEVELS[6],{waveMode:'clear',waveMax:5,waveDelay:700});
  if(BB.LEVELS?.[13])Object.assign(BB.LEVELS[13],{waveMode:'timed',waveMax:5,waveDelay:2400});

  const originalMakeGame=BB.makeGame;
  if(originalMakeGame){
    BB.makeGame=function(level=1,carry={}){
      const g=originalMakeGame.call(this,level,carry);
      if(g?.def?.objective==='survive'){
        g.enemies=g.enemies.slice(0,g.def.waveMax||5);
        g.survivalWaveTimer=g.def.waveMode==='clear'?(g.def.waveDelay||700):(g.def.waveDelay||2400);
      }
      return g;
    };
  }

  BB.spawnSurvivalWave=function(){
    const g=BB.game;
    if(!g||g.def.objective!=='survive'||g.objectiveComplete)return;
    const cap=g.def.waveMax||5;
    const room=Math.max(0,cap-g.enemies.length);
    if(room<=0)return;
    const spots=[];
    for(let y=1;y<BB.ROWS-1;y++)for(let x=1;x<BB.COLS-1;x++){
      if(g.grid[y][x]===0&&!g.enemies.some(e=>e.x===x&&e.y===y)&&Math.abs(x-g.player.x)+Math.abs(y-g.player.y)>5)spots.push({x,y});
    }
    const count=Math.min(room,3,1+Math.floor(g.survivalWave/2));
    for(let i=0;i<count&&spots.length;i++){
      const pick=(i*7+g.survivalWave)%spots.length;
      const p=spots.splice(pick,1)[0];
      const kinds=BB.difficulty==='hard'?['hunter','bomber','ghost']:BB.difficulty==='normal'?['bug','slime','hunter']:['bug','slime'];
      const kind=kinds[(g.survivalWave+i)%kinds.length];
      g.enemies.push({...p,rx:p.x,ry:p.y,id:BB.serial++,kind,hp:1,maxHp:1,boss:false,mini:false,timer:500+i*90,special:kind==='bomber'?2600:0,hit:0,phase:1,frame:0,facing:'left',hitSources:{},deadTimer:0,attackTimer:0,attackDuration:0,attackStyle:'idle',aiState:'spawn'});
    }
    g.survivalWave++;
    BB.addText(g.player.x,g.player.y,`ONDA ${g.survivalWave}`,'#8cecff');
  };

  BB.updateObjective=function(dt){
    const g=BB.game;if(!g)return;
    if(g.objectiveIntroTimer>0)g.objectiveIntroTimer=Math.max(0,g.objectiveIntroTimer-dt);
    if(g.def.objective==='survive'&&!g.objectiveComplete){
      g.surviveElapsed+=dt;
      const mode=g.def.waveMode||'timed';
      if(mode==='clear'){
        if(g.enemies.length===0){
          g.survivalWaveTimer-=dt;
          if(g.survivalWaveTimer<=0){BB.spawnSurvivalWave();g.survivalWaveTimer=g.def.waveDelay||700;}
        }else g.survivalWaveTimer=g.def.waveDelay||700;
      }else{
        g.survivalWaveTimer-=dt;
        if(g.survivalWaveTimer<=0){BB.spawnSurvivalWave();g.survivalWaveTimer=g.def.waveDelay||2400;}
      }
    }
    if(!g.objectiveComplete&&BB.objectiveSatisfied()){
      g.objectiveComplete=true;g.score+=500;BB.addText(g.player.x,g.player.y,'OBJETIVO COMPLETO!','#ffe270');if(g.exit)g.exit.locked=false;BB.Audio.play('portal');
    }
  };

  BB.tryKick=function(nx,ny,dx,dy){
    const g=BB.game,b=g?.bombs.find(q=>q.x===nx&&q.y===ny);
    if(!b||!g.kick)return false;
    const bx=nx+dx,by=ny+dy;
    if(!BB.walkable(bx,by,'','player'))return false;
    b.x=bx;b.y=by;b.rx=bx;b.ry=by;b.slide={dx,dy,step:0};
    BB.Audio.play('kick');return true;
  };

  BB.updateBombMotion=function(dt){
    const g=BB.game;if(!g)return;
    for(const b of g.bombs){
      if(b.throw){
        b.throw.t+=dt;const q=Math.min(1,b.throw.t/b.throw.duration);b.rx=BB.lerp(b.throw.sx,b.throw.tx,q);b.ry=BB.lerp(b.throw.sy,b.throw.ty,q)-Math.sin(q*Math.PI)*.8;
        if(q>=1){b.rx=b.x;b.ry=b.y;b.throw=null}continue;
      }
      if(b.slide){
        b.slide.step+=dt;
        if(b.slide.step>=45){
          b.slide.step=0;const nx=b.x+b.slide.dx,ny=b.y+b.slide.dy;
          if(!BB.walkable(nx,ny,'','player'))b.slide=null;else{b.x=nx;b.y=ny;b.rx=nx;b.ry=ny;}
        }
      }else{b.rx=b.x;b.ry=b.y;}
    }
  };

  if(BB.Battle){
    BB.Battle.tryKick=function(p,nx,ny,dx,dy){
      if(!p.kick)return false;
      const b=this.state?.bombs.find(q=>q.x===nx&&q.y===ny);if(!b)return false;
      const tx=nx+dx,ty=ny+dy;if(!this.walkable(tx,ty))return false;
      b.x=tx;b.y=ty;b.slide={dx,dy,t:0};BB.Audio.play('kick');return true;
    };
    const oldBattleUpdate=BB.Battle.update;
    if(oldBattleUpdate)BB.Battle.update=function(dt){
      if(this.state)for(const b of this.state.bombs)if(b.slide)b.slide.t+=dt;
      return oldBattleUpdate.call(this,dt);
    };
  }
})();