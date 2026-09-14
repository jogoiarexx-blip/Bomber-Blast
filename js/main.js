window.BB=window.BB||{};
(()=>{'use strict';
const $=s=>document.querySelector(s);
const settings=BB.Save.data.settings;
BB.quality=settings.quality||'high';
BB.difficulty=settings.difficulty||'normal';
let storyPage=0,storyData=null,storyDone=null,last=performance.now(),lastDraw=0,bindListening=null,padBomb=false,padRemote=false,padThrow=false,pausedSettings=false,transitioning=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function setView(view){
  const ids=['menu','story','game','battle'];
  ids.forEach(id=>{const el=$('#'+id);if(el)el.hidden=id!==view});
}
async function sceneTransition(title='BOMBER BLAST',subtitle='Preparando...',work=null){
  if(transitioning){if(typeof work==='function')return await work();return}
  const overlay=$('#screenTransition');
  if(!overlay){if(typeof work==='function')return await work();return}
  transitioning=true;
  const titleEl=$('#transitionTitle'),subEl=$('#transitionSubtitle');
  if(titleEl)titleEl.textContent=title;
  if(subEl)subEl.textContent=subtitle||'';
  overlay.hidden=false;
  overlay.classList.remove('is-out');
  requestAnimationFrame(()=>overlay.classList.add('is-in'));
  await wait(260);
  if(typeof work==='function')await work();
  overlay.classList.remove('is-in');
  overlay.classList.add('is-out');
  await wait(420);
  overlay.hidden=true;
  overlay.classList.remove('is-out');
  transitioning=false;
}
async function animatedShowMenu(tab=null){
  await sceneTransition('MENU PRINCIPAL','Retornando ao centro de comando...',()=>BB.UI.showMenu(tab));
}

BB.beginLevel=function(g){
  BB.game=g;BB.Render.ensureWorld(BB.worldIndex(g.level));BB.Input.clear();BB.particles=[];BB.texts=[];BB.shake=0;BB.flash=0;
  setView('game');BB.UI.hideOverlay();BB.Audio.setUrgency(false);BB.Audio.musicFor(g.level,g.level%5===0);last=performance.now();BB.UI.sync()
};
function showStory(level,done){
  storyData=BOMBER_STORY[level]||BOMBER_STORY.default;storyPage=0;storyDone=done;setView('story');$('#storyChapter').textContent=`CAPÍTULO ${level}`;$('#storyTitle').textContent=storyData.title;renderStory()
}
function renderStory(){const p=storyData.pages[storyPage];$('#storySpeaker').textContent=p.speaker;$('#storyText').textContent=p.text;$('#storyPage').textContent=`${storyPage+1} / ${storyData.pages.length}`;$('#storyNext').textContent=storyPage===storyData.pages.length-1?'INICIAR FASE →':'CONTINUAR →'}
function nextStory(){if(storyPage<storyData.pages.length-1){storyPage++;renderStory()}else closeStory()}
async function closeStory(){const d=storyDone;storyDone=null;if(!d){$('#story').hidden=true;return}await sceneTransition('ENTRANDO NA ARENA','Prepare-se para explodir o labirinto...',async()=>{setView('game');d()})}
async function prepareLevel(level,carry=null){
  const loader=$('#assetLoader'),label=$('#assetLoaderText');
  if(loader)loader.hidden=false;
  BB.Render.ensureWorld(BB.worldIndex(level));
  const worldName=BB.THEMES[BB.worldIndex(level)];
  if(label)label.textContent=`Carregando ${worldName}...`;
  const stats=await BB.Assets.waitUntilSettled(2600,s=>{if(label){const done=s.loaded+s.failed,total=Math.max(1,s.total),pct=Math.min(100,Math.round(done/total*100));label.textContent=`${worldName} · ${pct}%${s.failed?` · ${s.failed} asset(s) em fallback`:''}`}});
  if(label&&stats.failed)label.textContent=`${worldName} pronto com ${stats.failed} fallback(s)`;
  if(loader)loader.hidden=true;
  await sceneTransition('MISSÃO PRONTA',`${worldName} · Fase ${level}`,()=>showStory(level,()=>BB.beginLevel(BB.makeGame(level,carry||{}))))
}
function start(){if(transitioning)return;const level=BB.clamp(Number($('#levelSelect').value)||1,1,BB.MAX_LEVEL);prepareLevel(level)}
BB.finish=function(status){const g=BB.game;if(!g)return;g.status=status;BB.Input.clear();BB.Audio.setUrgency(false);if(status==='won'||status==='completed'){const result=BB.resultData();g.score=result.total;BB.Save.recordResult(g.level,result);BB.UI.populateLevels();BB.UI.showResults(result);BB.Audio.play('win');BB.Audio.stopMusic();BB.UI.overlay(status==='completed'?'HISTÓRIA CONCLUÍDA':'PORTAL CONQUISTADO',status==='completed'?'O REI DO VAZIO CAIU!':`FASE ${g.level} COMPLETA!`,`${g.score} PONTOS · NOTA ${result.grade}`,status==='completed'?'JOGAR NOVAMENTE':'PRÓXIMA FASE');BB.UI.showResults(result);return}if(status==='gameover'){BB.Audio.play('gameover');BB.Audio.stopMusic();const canContinue=g.continues>0;BB.UI.overlay('FIM DE JOGO','GAME OVER',canContinue?`CONTINUES RESTANTES: ${g.continues}`:'SEM CONTINUES',canContinue?'CONTINUAR':'JOGAR DE NOVO');return}if(status==='paused')BB.UI.overlay('JOGO PAUSADO','PAUSA',`${g.score} PONTOS`,'CONTINUAR')};
function carryFrom(g){return{lives:g.lives,score:g.score,range:g.range,maxBombs:g.maxBombs,speedLevel:g.speedLevel,shield:g.shield,nova:g.nova,remote:g.remote,pierce:g.pierce,fast:g.fast,giant:g.giant,kick:g.kick,glove:g.glove,bombPass:g.bombPass,wallPass:g.wallPass,flamePass:g.flamePass,continues:g.continues}}
function primary(){const g=BB.game;if(!g)return start();if(g.status==='won'){const level=g.level+1,carry=carryFrom(g);prepareLevel(level,carry)}else if(g.status==='completed'){$('#levelSelect').value='1';start()}else if(g.status==='paused'){g.status='playing';last=performance.now();BB.UI.hideOverlay();BB.Audio.musicFor(g.level,g.level%5===0)}else if(g.status==='gameover'&&g.continues>0){const carry={...g.entry,lives:BB.CONFIG[BB.difficulty].lives,score:Math.floor(g.score*.75),continues:g.continues-1};BB.beginLevel(BB.makeGame(g.level,carry));BB.addText(1,1,'CONTINUE!','#ffe270')}else start()}
function pause(){const g=BB.game;if(!g||!['playing','paused'].includes(g.status))return;if(g.status==='playing'){g.status='paused';BB.Input.clear();BB.Audio.stopMusic();BB.finish('paused')}else primary()}
async function startBattle(){
  if(transitioning)return;
  await sceneTransition('MODO BATTLE','Preparando a arena local...',()=>{
    BB.game=null;BB.Input.clear();BB.Audio.stopMusic();setView('battle');$('#battleOverlay').hidden=true;BB.Battle.start(Number($('#battlePlayers').value)||2,Number($('#battleArena').value)||0);last=performance.now()
  })
}
let padPause=false;function pollCampaignGamepad(){if(BB.Battle.active||!BB.game||!navigator.getGamepads)return;const p=[...navigator.getGamepads()].find(Boolean);if(!p)return;const ax=p.axes?.[0]||0,ay=p.axes?.[1]||0;let dir=null;const up=!!p.buttons?.[12]?.pressed,down=!!p.buttons?.[13]?.pressed,left=!!p.buttons?.[14]?.pressed,right=!!p.buttons?.[15]?.pressed;if(up||down||left||right)dir=up?'up':down?'down':left?'left':'right';else if(Math.abs(ax)>.35||Math.abs(ay)>.35)dir=Math.abs(ax)>Math.abs(ay)?(ax<0?'left':'right'):(ay<0?'up':'down');if(BB.game.status==='playing')for(const d of ['up','down','left','right'])BB.Input.press(d,d===dir);const bomb=!!p.buttons?.[0]?.pressed,remote=!!p.buttons?.[1]?.pressed,throwB=!!p.buttons?.[2]?.pressed,pauseBtn=!!p.buttons?.[9]?.pressed;if(BB.game.status==='playing'){if(bomb&&!padBomb)BB.putBomb();if(remote&&!padRemote)BB.remoteDetonate();if(throwB&&!padThrow)BB.throwBomb()}if(pauseBtn&&!padPause)pause();padBomb=bomb;padRemote=remote;padThrow=throwB;padPause=pauseBtn}
function loop(now){const dt=Math.min(100,now-last||16);last=now;if(BB.Battle.active){BB.Battle.update(dt);BB.Battle.draw()}else{pollCampaignGamepad();BB.update(dt);const interval=BB.quality==='low'?33:BB.quality==='medium'?20:0;if(!interval||now-lastDraw>=interval){BB.Render.draw(now);lastDraw=now}}requestAnimationFrame(loop)}
function bindControl(action){bindListening=action;document.querySelectorAll('[data-bind]').forEach(b=>b.classList.toggle('listening',b.dataset.bind===action))}
function assignBinding(action,key){key=normalizeKey(key);const controls={...BB.Save.data.controls};const conflict=Object.entries(controls).find(([a,k])=>a!==action&&normalizeKey(k)===key);if(conflict){const old=controls[action];controls[conflict[0]]=old}controls[action]=key;BB.Save.data.controls=controls;BB.Save.flush();bindListening=null;BB.UI.refreshBindings();document.querySelectorAll('[data-bind]').forEach(b=>b.classList.remove('listening'))}
function normalizeKey(key){return key?.length===1?key.toLowerCase():key}
function campaignActionForKey(key){key=normalizeKey(key);const c=BB.Save.data.controls;return Object.keys(c).find(a=>normalizeKey(c[a])===key)||null}

BB.Audio.init();BB.Render.init();BB.UI.populateLevels();BB.UI.syncSettings();BB.UI.showMenuTab(localStorage.getItem('bb-menu-tab')||'campaign');BB.UI.syncSound();$('#record').textContent=BB.Save.get('progress.record',0);$('#bestLevel').textContent=BB.Save.get('progress.bestLevel',1);BB.SelfTest.run();
document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>BB.UI.setDifficulty(b.dataset.diff));
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>BB.UI.setQuality(b.dataset.quality));
document.querySelectorAll('[data-mobile]').forEach(b=>b.onclick=()=>BB.UI.setMobileSize(b.dataset.mobile));
document.querySelectorAll('[data-resolution]').forEach(b=>b.onclick=()=>BB.UI.setResolution(b.dataset.resolution));
document.querySelectorAll('[data-menu-tab]').forEach(b=>b.onclick=()=>BB.UI.showMenuTab(b.dataset.menuTab));
document.querySelectorAll('[data-bind]').forEach(b=>b.onclick=()=>bindControl(b.dataset.bind));
$('#battlePlayers').onchange=()=>BB.Save.set('settings.battlePlayers',Number($('#battlePlayers').value));
$('#battleArena').onchange=()=>BB.Save.set('settings.battleArena',Number($('#battleArena').value));
$('#levelSelect').onchange=()=>BB.UI.renderWorldMap();
for(const [id,kind] of [['masterVolume','master'],['musicVolume','music'],['sfxVolume','sfx']])$('#'+id).oninput=e=>BB.Audio.setVolume(kind,e.target.value/100);
document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();BB.Input.press(b.dataset.dir,true)});['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,()=>BB.Input.press(b.dataset.dir,false)))});
addEventListener('keydown',e=>{if(bindListening){e.preventDefault();assignBinding(bindListening,e.key);return}if(BB.Battle.active){BB.Battle.press(e.key,true);if(e.key==='Escape')animatedShowMenu();return}if($('#story').hidden===false){if(!e.repeat&&(e.key==='Enter'||e.key===' '))nextStory();if(!e.repeat&&e.key==='Escape')closeStory();return}const action=campaignActionForKey(e.key);if(['up','down','left','right'].includes(action)){e.preventDefault();BB.Input.press(action,true);return}if(e.repeat)return;if(action==='bomb'){e.preventDefault();BB.putBomb()}if(action==='remote')BB.remoteDetonate();if(action==='throw')BB.throwBomb();if(action==='restart')BB.restartLevel();if(action==='pause')pause()});
addEventListener('keyup',e=>{if(BB.Battle.active){BB.Battle.press(e.key,false);return}const action=campaignActionForKey(e.key);if(['up','down','left','right'].includes(action))BB.Input.press(action,false)});
addEventListener('blur',()=>{if(BB.game?.status==='playing'&&!BB.Battle.active)pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&BB.game?.status==='playing'&&!BB.Battle.active)pause()});
$('#play').onclick=start;const continueBtn=$('#continuePlay');if(continueBtn)continueBtn.onclick=()=>{const best=BB.clamp(BB.Save?.get('progress.bestLevel',1)||1,1,BB.MAX_LEVEL);const levelSel=$('#levelSelect');if(levelSel)levelSel.value=String(best);start()};$('#battlePlay').onclick=startBattle;$('#storyNext').onclick=nextStory;$('#storySkip').onclick=closeStory;$('#sound').onclick=()=>BB.Audio.toggle();$('#mute').onclick=()=>BB.Audio.toggle();$('#back').onclick=()=>animatedShowMenu();$('#pause').onclick=pause;$('#bombButton').onpointerdown=e=>{e.preventDefault();BB.putBomb()};$('#remoteButton').onclick=()=>BB.remoteDetonate();$('#throwButton').onclick=()=>BB.throwBomb();$('#primary').onclick=primary;$('#overlayMenu').onclick=()=>animatedShowMenu();$('#overlayRestart').onclick=()=>{BB.UI.hideOverlay();if(BB.game){BB.game.status='playing';BB.restartLevel()}};$('#overlaySettings').onclick=()=>{if(!BB.game||BB.game.status!=='paused')return;pausedSettings=true;setView('menu');BB.UI.showMenuTab('settings');$('#resumePaused').hidden=false;BB.Audio.stopMusic()};$('#resumePaused').onclick=()=>{if(!pausedSettings||!BB.game)return;pausedSettings=false;$('#resumePaused').hidden=true;setView('game');BB.game.status='playing';BB.UI.hideOverlay();BB.Audio.musicFor(BB.game.level,BB.game.level%5===0);last=performance.now()};$('#battleBack').onclick=()=>animatedShowMenu();$('#battleMenu').onclick=()=>animatedShowMenu();$('#battleAgain').onclick=()=>{document.querySelector('#battleOverlay').hidden=true;BB.Battle.start(Number($('#battlePlayers').value)||2,Number($('#battleArena').value)||0)};document.addEventListener('click',e=>{if(e.target.closest('button,select'))BB.Audio.play('ui_click',.12,1)});
requestAnimationFrame(loop)
})();
