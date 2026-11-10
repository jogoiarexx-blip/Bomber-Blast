window.BB=window.BB||{};
BB.SelfTest={
  run(){
    const results=[],ok=(name,cond)=>results.push({name,ok:!!cond});
    ok('board-13x11',BB.COLS===13&&BB.ROWS===11);
    ok('35-fases',BB.MAX_LEVEL===35);
    ok('7-mundos',BB.THEMES.length===7&&BB.PALETTES.length>=7);
    ok('7-chefes',BB.BOSS_NAMES.length===7);
    ok('renderer',typeof BB.Render?.draw==='function');
    ok('battle',typeof BB.Battle?.start==='function');
    ok('battle-pause',typeof BB.Battle?.suspend==='function'&&typeof BB.Battle?.resume==='function');
    ok('save-versionado',BB.Save?.VERSION===1);
    ok('fases-definidas',Array.from({length:35},(_,i)=>!!BB.LEVELS[i+1]).every(Boolean));
    ok('mapas-13x11',Array.from({length:35},(_,i)=>BB.LEVELS[i+1]?.rows).every(rows=>Array.isArray(rows)&&rows.length===11&&rows.every(r=>r.length===13)));
    ok('objetivos-conhecidos',Object.values(BB.LEVELS).every(l=>['clear','bricks','keys','survive','miniboss','boss'].includes(l.objective)));
    ok('saida-escondida',Object.values(BB.LEVELS).every(l=>l.rows.join('').includes('+')));
    ok('chaves-possiveis',Object.values(BB.LEVELS).every(l=>l.objective!=='keys'||l.rows.join('').split('+').length-1>=l.target+1));
    ok('blocos-possiveis',Object.values(BB.LEVELS).every(l=>l.objective!=='bricks'||l.rows.join('').split('+').length-1>=l.target));
    ok('minichefes-expansao',[24,29,34].every(n=>BB.LEVELS[n]?.objective==='miniboss'));
    ok('chefes-expansao',[25,30,35].every(n=>BB.LEVELS[n]?.objective==='boss'));
    ok('ondas-com-limite',[6,13,26,33].every(n=>BB.LEVELS[n]?.objective==='survive'&&BB.LEVELS[n]?.waveMax>=1));
    ok('assets',typeof BB.Assets?.waitUntilSettled==='function');
    const failed=results.filter(r=>!r.ok);
    console.info(`[Bomber Blast v0.7.1 self-test] ${results.length-failed.length}/${results.length} OK`,failed);
    return failed.length===0;
  }
};
