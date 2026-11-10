window.BB=window.BB||{};
BB.AI={
 _cache:null,
 neighbors(x,y,kind=''){
   return Object.entries(BB.DIRS).map(([name,[dx,dy]])=>({name,x:x+dx,y:y+dy}))
     .filter(n=>BB.walkable(n.x,n.y,kind,'enemy'));
 },
 stepTime(e){
   const cfg=BB.CONFIG[BB.difficulty],level=BB.game?.level||1;
   const factor=e?.kind==='tank'?1.35:e?.kind==='hunter'?.9:e?.kind==='ghost'?.95:e?.boss?.8:1;
   return Math.max(BB.difficulty==='hard'?155:210,(cfg.delay-level*5)*factor);
 },
 dangerWindows(horizon=3000){
   const g=BB.game;if(!g)return new Map();
   const stamp=[g.time,g.bombs.length,g.blasts.length,g.hazards.length].join(':');
   if(this._cache?.game===g&&this._cache.stamp===stamp&&this._cache.horizon>=horizon)return this._cache.windows;
   const result=new Map(),add=(x,y,a,b)=>{
     if(a>horizon||b<0)return;
     const key=`${x},${y}`;
     if(!result.has(key))result.set(key,[]);
     result.get(key).push([Math.max(0,a),Math.max(0,b)]);
   };
   for(const b of g.blasts)add(b.x,b.y,0,b.ttl||500);
   for(const h of g.hazards)add(h.x,h.y,h.ttl||0,(h.ttl||0)+520);
   const bombs=g.bombs,triggers=new Map(bombs.map(b=>[b.id,Math.max(0,b.timer)]));
   for(let pass=0;pass<bombs.length;pass++){
     let changed=false;
     for(const b of bombs){
       const when=triggers.get(b.id);
       if(when>horizon)continue;
       for(const t of BB.blastRay(b))for(const other of bombs){
         if(other.id!==b.id&&other.x===t.x&&other.y===t.y&&triggers.get(other.id)>when){
           triggers.set(other.id,when);changed=true;
         }
       }
     }
     if(!changed)break;
   }
   for(const b of bombs){const at=triggers.get(b.id);if(at<=horizon)
     for(const t of BB.blastRay(b))add(t.x,t.y,at,at+650)}
   this._cache={game:g,stamp,horizon,windows:result};return result;
 },
 unsafe(w,x,y,start,end=start){
   return (w.get(`${x},${y}`)||[]).some(([a,b])=>a<=end+40&&b>=start-40);
 },
 nextDanger(w,x,y){
   const spans=w.get(`${x},${y}`)||[];
   return spans.length?Math.min(...spans.map(p=>p[0])):Infinity;
 },
 bfs(start,target,kind='',danger=null,max=143){
   const queue=[{x:start.x,y:start.y}],seen=new Set([BB.key(start)]),parent=new Map();
   let found=null;
   for(let head=0;head<queue.length&&head<max;head++){
     const cur=queue[head];
     if(cur.x===target.x&&cur.y===target.y){found=cur;break}
     for(const n of this.neighbors(cur.x,cur.y,kind)){
       const k=BB.key(n);if(seen.has(k)||danger?.has(k))continue;
       seen.add(k);parent.set(k,{from:BB.key(cur),n});queue.push(n);
     }
   }
   if(!found)return null;
   let k=BB.key(found);const path=[];
   while(k!==BB.key(start)){
     const p=parent.get(k);if(!p)break;
     path.unshift(p.n);k=p.from;
   }
   return path;
 },
 escapeStep(e,horizon=1700,windows=null){
   const w=windows||this.dangerWindows(horizon+700),ms=this.stepTime(e);
   if(this.nextDanger(w,e.x,e.y)>horizon)return null;
   const queue=[{x:e.x,y:e.y,n:0,first:null}],seen=new Set([`${e.x},${e.y},0`]);
   for(let head=0;head<queue.length&&head<280;head++){
     const cur=queue[head],arrival=cur.n*ms;
     if(cur.first&&this.nextDanger(w,cur.x,cur.y)>horizon&&
       !this.unsafe(w,cur.x,cur.y,arrival,horizon+300))return {...cur.first,state:'flee'};
     if(cur.n>=Math.min(9,Math.max(2,Math.ceil((horizon+450)/ms))))continue;
     for(const next of this.neighbors(cur.x,cur.y,e.kind)){
       const t=(cur.n+1)*ms,k=`${next.x},${next.y},${cur.n+1}`;
       if(seen.has(k)||this.unsafe(w,next.x,next.y,t-90,t+100))continue;
       seen.add(k);queue.push({x:next.x,y:next.y,n:cur.n+1,first:cur.first||next});
     }
   }
   return null;
 },
 safeEscape(e,horizon){return this.escapeStep(e,horizon)},
 choose(e){
   const g=BB.game,cfg=BB.CONFIG[BB.difficulty],h=cfg.dangerHorizon,
         w=this.dangerWindows(Math.max(2900,h+700)),step=this.stepTime(e),
         dangerAt=this.nextDanger(w,e.x,e.y);
   if(dangerAt<=Math.max(1100,step*2.4)){
     const exit=this.escapeStep(e,Math.max(1150,dangerAt+200),w);
     if(exit)return exit;
   }
   const opts=this.neighbors(e.x,e.y,e.kind).filter(p=>!this.unsafe(w,p.x,p.y,step-80,step+130));
   if(!opts.length)return null;
   if(cfg.ai==='weak')return {...opts[Math.floor(Math.random()*opts.length)],state:'wander'};
   const target=cfg.ai==='smart'?BB.predictPlayer():g.player;
   if(cfg.ai==='normal'&&Math.random()>.78)
     return {...opts[Math.floor(Math.random()*opts.length)],state:'patrol'};
   const forbidden=new Set();
   for(const [key,spans] of w)
     if(spans.some(([a,b])=>a<=step+280&&b>=0))forbidden.add(key);
   const path=this.bfs(e,target,e.kind,forbidden);
   if(path?.length&&opts.some(p=>p.x===path[0].x&&p.y===path[0].y))
     return {...path[0],state:'chase'};
   opts.sort((a,b)=>{
     const score=p=>(Math.abs(p.x-target.x)+Math.abs(p.y-target.y))*10-this.neighbors(p.x,p.y,e.kind).length*2;
     return score(a)-score(b);
   });
   return {...opts[0],state:dangerAt<=h?'evade':'chase'};
 },
 canBombSafely(e){
   const g=BB.game;if(!g)return false;
   const fake={x:e.x,y:e.y,range:2,timer:1600,id:-999999,owner:'enemy'};
   g.bombs.push(fake);this._cache=null;
   try{return !!this.escapeStep(e,1950)}finally{g.bombs.pop();this._cache=null}
 }
};
