window.BB=window.BB||{};
BB.Audio={
  sound:localStorage.getItem('bb-sound')!=='off',music:null,sfx:{},urgent:false,
  localBase:'assets/audio/sfx/',
  // SFX CC0 selecionados para combinar com a estética arcade/pixel. Quando a internet
  // não estiver disponível ou a origem rejeitar a mídia, o jogo cai automaticamente
  // nos arquivos locais do ZIP.
  remote:{
    explosion:'https://opengameart.org/sites/default/files/8bit_bomb_explosion.wav',
    portal:'https://opengameart.org/sites/default/files/172206__fins__teleport.wav',
    powerup:'https://opengameart.org/sites/default/files/power_up_sound_v1.ogg',
    hurt:'https://opengameart.org/sites/default/files/playerhurt.wav',
    enemy_die:'https://opengameart.org/sites/default/files/dead.wav',
    throw:'https://opengameart.org/sites/default/files/throw.wav',
    gameover:'https://opengameart.org/sites/default/files/GameOver.wav',
    ui_click:'https://github.com/Calinou/kenney-ui-audio/raw/refs/heads/master/addons/kenney_ui_audio/click1.wav'
  },
  init(){
    const names=['bomb_place','explosion','powerup','hurt','portal','boss_hit','win','step','brick_break','enemy_die','kick','throw','countdown','life','gameover','boss_intro','portal_hit','ui_click'];
    names.forEach(n=>{
      const local=`${this.localBase}${n==='ui_click'?'bomb_place':n}.wav`;
      const a=new Audio();a.preload='auto';a.dataset.local=local;
      const remote=navigator.onLine?this.remote[n]:null;
      a.src=remote||local;
      if(remote)a.onerror=()=>{a.onerror=null;a.src=local;a.load()};
      this.sfx[n]=a;
    });
  },
  play(name,vol=.55,rate=1){if(!this.sound)return;const a=this.sfx[name];if(!a)return;try{const c=a.cloneNode(true);c.volume=vol;c.playbackRate=rate;c.play().catch(()=>{const local=a.dataset.local;if(local&&c.src!==local){c.src=local;c.play().catch(()=>{})}})}catch{}},
  musicFor(level,boss=false){if(!this.sound)return;const src=boss?'assets/audio/music/boss.wav':`assets/audio/music/world${BB.worldIndex(level)+1}.wav`;if(this.music?.dataset.src===src)return;this.stopMusic();const a=new Audio(src);a.dataset.src=src;a.loop=true;a.volume=.22;a.playbackRate=this.urgent?1.12:1;this.music=a;a.play().catch(()=>{})},
  setUrgency(on){if(this.urgent===on)return;this.urgent=on;if(this.music)this.music.playbackRate=on?1.12:1},
  stopMusic(){if(this.music){this.music.pause();this.music=null}},
  toggle(){this.sound=!this.sound;localStorage.setItem('bb-sound',this.sound?'on':'off');if(!this.sound)this.stopMusic();else if(BB.game)this.musicFor(BB.game.level,BB.game.level%5===0);BB.UI?.syncSound();return this.sound}
};
