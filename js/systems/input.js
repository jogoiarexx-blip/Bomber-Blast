window.BB=window.BB||{};
BB.Input={
 held:[],sources:{keyboard:[],touch:[],gamepad:[]},
 press(dir,on,source='keyboard'){
   if(!BB.DIRS[dir])return;
   const a=this.sources[source]||(this.sources[source]=[]),i=a.indexOf(dir);
   if(i>=0)a.splice(i,1);
   if(on)a.push(dir);
   this.held=[...this.sources.gamepad,...this.sources.keyboard,...this.sources.touch];
 },
 dir(){return this.sources.touch.at(-1)||this.sources.keyboard.at(-1)||this.sources.gamepad.at(-1)||null},
 clear(source=null){
   if(source){if(this.sources[source])this.sources[source].length=0}
   else for(const a of Object.values(this.sources))a.length=0;
   this.held=[...this.sources.gamepad,...this.sources.keyboard,...this.sources.touch];
 }
};
