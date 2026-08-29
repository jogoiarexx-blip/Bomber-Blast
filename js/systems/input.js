window.BB=window.BB||{};
BB.Input={held:[],press(d,on){const i=this.held.indexOf(d);if(on){if(i>=0)this.held.splice(i,1);this.held.push(d);}else if(i>=0)this.held.splice(i,1);},dir(){return this.held[this.held.length-1]},clear(){this.held=[];}};
