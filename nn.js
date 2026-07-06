/* ============================================================
   FPS 2026 — nn.js : a small neural network, trained in the browser
   at load, that powers believable RETIREMENT and HALL-OF-FAME
   decisions. Two MLPs learn a domain curriculum (a "teacher"),
   then generalize to every player each offseason. The Claude API
   (ai.js) adds the natural-language judgment on top.
   ============================================================ */
const NN = (() => {
  'use strict';
  let _s = 2246822519;                              // seeded RNG so the trained net is reproducible
  const rnd = () => { _s = (_s*1103515245+12345) & 0x7fffffff; return _s/0x7fffffff; };
  const w0  = () => (rnd()*2-1)*0.6;
  const sig = x => 1/(1+Math.exp(-x));

  function Net(ni,nh,no){
    this.ni=ni; this.nh=nh; this.no=no;
    this.W1=Array.from({length:nh},()=>Array.from({length:ni},w0)); this.b1=Array.from({length:nh},w0);
    this.W2=Array.from({length:no},()=>Array.from({length:nh},w0)); this.b2=Array.from({length:no},w0);
  }
  Net.prototype.fwd=function(x){ this.x=x;
    this.h=this.W1.map((r,i)=>{ let s=this.b1[i]; for(let j=0;j<this.ni;j++)s+=r[j]*x[j]; return s>0?s:0; });   // ReLU
    this.o=this.W2.map((r,i)=>{ let s=this.b2[i]; for(let j=0;j<this.nh;j++)s+=r[j]*this.h[j]; return sig(s); }); // sigmoid out
    return this.o;
  };
  Net.prototype.bp=function(y,lr){
    const dO=this.o.map((oi,i)=>oi-y[i]);                                  // dL/dz (sigmoid + cross-entropy)
    const dH=this.h.map((hi,j)=>{ if(hi<=0)return 0; let s=0; for(let i=0;i<this.no;i++)s+=dO[i]*this.W2[i][j]; return s; });
    for(let i=0;i<this.no;i++){ for(let j=0;j<this.nh;j++)this.W2[i][j]-=lr*dO[i]*this.h[j]; this.b2[i]-=lr*dO[i]; }
    for(let i=0;i<this.nh;i++){ for(let j=0;j<this.ni;j++)this.W1[i][j]-=lr*dH[i]*this.x[j]; this.b1[i]-=lr*dH[i]; }
  };
  Net.prototype.train=function(X,Y,epochs,lr){ for(let e=0;e<epochs;e++) for(let k=0;k<X.length;k++){ this.fwd(X[k]); this.bp(Y[k],lr); } };
  Net.prototype.predict=function(x){ return this.fwd(x)[0]; };

  // ---- teachers (domain curriculum the nets learn to generalize) ----
  // retire features: [age, ovrLow(=1-ovr), decline, concussions, benched, seasons]  (all 0..1)
  function retireTeacher(f){ const z=-3.4 + f[0]*4.6 + f[1]*1.6 + f[2]*2.4 + f[3]*1.9 + f[4]*1.1 + f[5]*1.2; return sig(z); }
  // hof features: [careerPts, mvps, allPros, rings, peak, seasons]  (all 0..1)
  function hofTeacher(f){ const z=-3.0 + f[0]*3.4 + f[1]*2.6 + f[2]*2.2 + f[3]*1.3 + f[4]*1.1 + f[5]*0.9; return sig(z); }
  // trade-value features: [ovr, youth, positionValue, contractYears]  (0..1) -> value 0..1 (x100 = trade points)
  // steep power curve so OVR dominates: a 56-OVR backup is worth far less than a 90-OVR star
  function valueTeacher(f){ const b=Math.pow(f[0],2.4); const v=b*(0.80 + f[1]*0.18 + f[2]*0.16 + f[3]*0.06); return v>1?1:(v<0?0:v); }
  // development features: [age, ovr, potGap, workEthic, durability, iq, coaching, role, pressure]  (all 0..1)
  // output 0..1 where 0.5 = no change; >0.5 = growth, <0.5 = decline. The heart of boom/bust/crack.
  function devTeacher(f){ const age=f[0],gap=f[2],work=f[3],dur=f[4],iq=f[5],coach=f[6],role=f[7],press=f[8];
    let g = 0.5
      + (1-age)*0.40*(0.30+0.70*gap)   // youth WITH room to grow is the growth engine
      - age*0.55                        // age is a strong, steady decay (old players decline)
      + (work-0.5)*0.22 + (coach-0.5)*0.12 + (iq-0.5)*0.06 + (role-0.5)*0.05 + (dur-0.5)*0.05
      - press*0.30;                     // big-market/spotlight pressure (low temperament → the "crack")
    return g>1?1:(g<0?0:g); }

  function dataset(teacher,ni,n){ const X=[],Y=[]; for(let i=0;i<n;i++){ const f=Array.from({length:ni},()=>rnd()); X.push(f); Y.push([teacher(f)]); } return {X,Y}; }

  const retireNet=new Net(6,12,1), hofNet=new Net(6,12,1), valueNet=new Net(4,10,1), devNet=new Net(9,14,1);
  (function trainAll(){
    const r=dataset(retireTeacher,6,1600); retireNet.train(r.X,r.Y,45,0.18);
    const h=dataset(hofTeacher,6,1600); hofNet.train(h.X,h.Y,45,0.18);
    const v=dataset(valueTeacher,4,1600); valueNet.train(v.X,v.Y,45,0.18);
    const d=dataset(devTeacher,9,2400); devNet.train(d.X,d.Y,55,0.16);
  })();

  return {
    Net, rnd, trained:true,
    retire: f => retireNet.predict(f),
    hof:    f => hofNet.predict(f),
    value:  f => valueNet.predict(f),
    dev:    f => devNet.predict(f)
  };
})();
if (typeof module!=='undefined') module.exports = NN;
