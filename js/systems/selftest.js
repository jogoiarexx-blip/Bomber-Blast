window.BB=window.BB||{};
(function(){
  const themes=['JARDIM NEON','GELO CÓSMICO','DUNAS SOLARES','ABISMO VIOLETA','SELVA ANCESTRAL','RUÍNAS DO DESERTO','FORJA VULCÂNICA'];
  const bosses=['TITÃ ESPINHOSO','COLOSSO DE GELO','SERPENTE DAS DUNAS','REI DO VAZIO','GUARDIÃO DA FLORESTA','SENTINELA DO DESERTO','SENHOR MAGMÁTICO'];
  BB.MAX_LEVEL=35; BB.THEMES=themes; BB.BOSS_NAMES=bosses; BB.worldIndex=l=>Math.min(6,Math.floor((l-1)/5));
  BB.PALETTES=BB.PALETTES||[];
  BB.PALETTES[4]={floor:['#244021','#152917'],wall:['#85aa6d','#465f40'],brick:['#8c6a45','#5b3f26'],glow:'#9ff26a'};
  BB.PALETTES[5]={floor:['#6c5329','#4b3414'],wall:['#e7c57e','#a97935'],brick:['#cc8748','#844821'],glow:'#ffe07a'};
  BB.PALETTES[6]={floor:['#40211b','#24100d'],wall:['#6f7278','#3a3d43'],brick:['#a65e35','#632a16'],glow:'#ff8c47'};
  const L=BB.LEVELS;
  const maps=[
    ['clear',0,'ELIMINE TODOS OS INIMIGOS'],['bricks',14,'DESTRUA 14 BLOCOS'],['keys',4,'ENCONTRE 4 TOTENS'],['miniboss',1,'DERROTE O MINI-CHEFE'],['boss',1,'DERROTE O GUARDIÃO DA FLORESTA'],
    ['survive',38,'SOBREVIVA 38 SEGUNDOS'],['clear',0,'ELIMINE TODOS OS INIMIGOS'],['bricks',20,'DESTRUA 20 BLOCOS'],['miniboss',1,'DERROTE O MINI-CHEFE'],['boss',1,'DERROTE O SENTINELA DO DESERTO'],
    ['keys',4,'ENCONTRE 4 NÚCLEOS MAGMÁTICOS'],['clear',0,'ELIMINE TODOS OS INIMIGOS'],['survive',45,'SOBREVIVA 45 SEGUNDOS'],['miniboss',1,'DERROTE O MINI-CHEFE'],['boss',1,'DERROTE O SENHOR MAGMÁTICO']
  ];
  const fallback=BB.LEVELS[16]?.rows||BB.LEVELS[1].rows;
  for(let i=0;i<15;i++){
    const n=21+i,[objective,target,label]=maps[i];
    const src=BB.LEVELS[((i%5)+1)+(i<5?15:i<10?10:5)]?.rows||fallback;
    L[n]={objective,target,label,rows:src.map(r=>r),...(objective==='survive'?{waveMode:i===5?'clear':'timed',waveMax:5,waveDelay:i===5?680:2100}:{})};
  }
  const oldEnsure=BB.Render.ensureWorld.bind(BB.Render);
  BB.Render.ensureWorld=function(w){
    if(w<4)return oldEnsure(w); const n=w+1;if(this.loadedWorlds.has(n))return;this.loadedWorlds.add(n);
    for(let i=0;i<3;i++)this.load(`floor_${n}_${i}`,`assets/sprites/world/floor_${n}_${i}.webp`);
    this.load(`floor_boss_${n}`,`assets/sprites/world/floor_boss_${n}.webp`);this.load(`wall_${n}`,`assets/sprites/world/wall_${n}.webp`);this.load(`brick_${n}`,`assets/sprites/world/brick_${n}.webp`);
    const src=n===5?1:n===6?3:4,key=`boss${n}`;this.bossFrames[key]=[];this.bossAttackFrames[key]=[];this.bossDeathFrames[key]=[];this.miniFrames[`mini${n}`]=[];
    for(let i=0;i<4;i++){this.bossFrames[key].push(BB.Assets.image(`assets/sprites/boss_anim/boss${src}_${i}.webp`));this.miniFrames[`mini${n}`].push(BB.Assets.image(`assets/sprites/mini_anim/mini${src}_${i}.webp`))}
    for(let i=0;i<3;i++)this.bossAttackFrames[key].push(BB.Assets.image(`assets/sprites/boss_anim/boss${src}_attack_${i}.webp`));for(let i=0;i<6;i++)this.bossDeathFrames[key].push(BB.Assets.image(`assets/sprites/boss_anim/boss${src}_death_${i}.webp`));
  };
  if(BB.Battle?.ARENAS&&!BB.Battle.ARENAS.some(a=>a.world===4))BB.Battle.ARENAS.push(
    {name:'Selva Ancestral',world:4,seed:37,density:.47},{name:'Ruínas do Deserto',world:5,seed:41,density:.50},{name:'Forja Vulcânica',world:6,seed:47,density:.53});
  if(BB.Audio){const oldMusic=BB.Audio.musicFor.bind(BB.Audio);BB.Audio.musicFor=function(level,boss=false){if(boss)return oldMusic(level,true);const w=BB.worldIndex(level),mapped=w===4?1:w===5?3:w===6?4:w+1;if(!this.sound)return;const src=`assets/audio/music_ogg/world${mapped}.ogg`;if(this.music?.dataset.src===src)return;this.stopMusic();const a=new Audio(src);a.dataset.src=src;a.loop=true;a.volume=BB.clamp(this.musicVolume*this.masterVolume,0,1);this.music=a;a.play().catch(()=>{})}};
  const oldBoss=BB.bossAttack;BB.bossAttack=function(e){const w=BB.worldIndex(BB.game.level);if(w<4)return oldBoss(e);const tiles=[];e.attackTimer=780;e.attackDuration=780;[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dx,dy])=>BB.rayAttack(e,dx,dy,1+e.phase,tiles));BB.game.hazards.push(...tiles.map(t=>({...t,ttl:850,max:850})));BB.shake=Math.max(BB.shake,10);BB.flash=120;BB.addText(e.x,e.y,`ATAQUE FASE ${e.phase}!`,'#ffca4a')};
  const applyUi=()=>{const s=document.querySelector('#battleArena');if(s&&!s.querySelector('option[value="6"]'))[['6','Selva Ancestral'],['7','Ruínas do Deserto'],['8','Forja Vulcânica']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o)});document.title='Bomber Blast v0.7.0';document.querySelectorAll('.eyebrow,.menu-footer-strip span,header h2').forEach(el=>{if(el.textContent.includes('v0.6.9'))el.textContent=el.textContent.replace('v0.6.9','v0.7.0')})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyUi);else applyUi();
})();
BB.SelfTest={run(){const out=[];const ok=(name,cond)=>out.push({name,ok:!!cond});ok('grid-size',BB.COLS===13&&BB.ROWS===11);ok('levels',BB.MAX_LEVEL===35);ok('worlds',BB.THEMES.length===7);ok('renderer',!!BB.Render?.draw);ok('battle',!!BB.Battle?.start);const bad=out.filter(x=>!x.ok);console.info(`[Bomber Blast self-test] ${out.length-bad.length}/${out.length} OK`,bad);return bad.length===0}};
