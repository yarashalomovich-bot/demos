/* live FX: дым, пар, искры, жар, наклон за курсором. Без библиотек. */
(function(){
const R=Math.random, rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
window.liveFX=function(stage,o){
  o=Object.assign({smoke:0,embers:0,smokeColor:'255,255,255',emberColor:'255,150,60',glow:null,tilt:8,shine:false,srcX:.5,srcY:.62,srcW:.5,float:0},o||{});
  const img=stage.querySelector('.fx-img'), cv=document.createElement('canvas'), cx=cv.getContext('2d');
  cv.className='fx-cv'; stage.appendChild(cv);
  let W=0,H=0,dpr=Math.min(devicePixelRatio||1,2),P=[],E=[],vis=true,t=0,mx=0,my=0,tx=0,ty=0;
  function size(){const r=stage.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0)}
  size(); addEventListener('resize',size);
  new IntersectionObserver(e=>{vis=e[0].isIntersecting}).observe(stage);
  // спрайт клуба дыма
  const sp=document.createElement('canvas');sp.width=sp.height=128;const s=sp.getContext('2d');
  const g=s.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,`rgba(${o.smokeColor},.55)`);g.addColorStop(.45,`rgba(${o.smokeColor},.18)`);g.addColorStop(1,`rgba(${o.smokeColor},0)`);
  s.fillStyle=g;s.fillRect(0,0,128,128);
  function puff(){const x=W*(o.srcX+(R()-.5)*o.srcW);return{x,y:H*o.srcY+(R()-.5)*20,vx:(R()-.5)*.25,vy:-(.35+R()*.55),r:18+R()*26,gr:.18+R()*.22,a:0,life:0,max:260+R()*200,ph:R()*6.28}}
  function ember(){return{x:W*(o.srcX+(R()-.5)*o.srcW*.9),y:H*o.srcY+R()*30,vx:(R()-.5)*.7,vy:-(1+R()*2.2),life:0,max:70+R()*90,s:.8+R()*1.8,ph:R()*6.28}}
  for(let i=0;i<o.smoke;i++){const p=puff();p.life=R()*p.max;P.push(p)}
  // наклон за курсором / гироскоп
  if(o.tilt&&!rm){
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5});
    stage.addEventListener('pointerleave',()=>{mx=my=0});
    addEventListener('deviceorientation',e=>{if(e.gamma==null)return;mx=Math.max(-.5,Math.min(.5,e.gamma/40));my=Math.max(-.5,Math.min(.5,(e.beta-45)/50))});
  }
  const glow=o.glow&&stage.querySelector(o.glow), shine=o.shine&&stage.querySelector('.fx-shine');
  function frame(){
    requestAnimationFrame(frame); if(!vis)return; t++;
    tx+=(mx-tx)*.06; ty+=(my-ty)*.06;
    if(img){img.style.transform=`perspective(900px) rotateY(${tx*o.tilt}deg) rotateX(${-ty*o.tilt}deg) scale(1.04) translate3d(${tx*-14}px,${ty*-14 + Math.sin(t/90)*(o.float||0)}px,0)`}
    if(shine){shine.style.setProperty('--sx',(50+tx*80)+'%');shine.style.setProperty('--sy',(40+ty*80)+'%')}
    if(glow){const f=.82+Math.sin(t*.13)*.06+Math.sin(t*.37)*.05+R()*.07;glow.style.opacity=f;glow.style.transform=`scale(${.96+f*.06})`}
    cx.clearRect(0,0,W,H); if(rm)return;
    cx.globalCompositeOperation='screen';
    for(const p of P){
      p.life++; if(p.life>p.max)Object.assign(p,puff());
      const k=p.life/p.max; p.a=k<.15?k/.15:1-(k-.15)/.85;
      p.x+=p.vx+Math.sin(p.life/40+p.ph)*.35 + tx*.4; p.y+=p.vy; p.r+=p.gr;
      cx.globalAlpha=p.a*.5; const d=p.r*2; cx.drawImage(sp,p.x-p.r,p.y-p.r,d,d);
    }
    if(o.embers){ if(E.length<o.embers&&R()<.5)E.push(ember());
      for(let i=E.length-1;i>=0;i--){const e=E[i];e.life++;e.vx+=Math.sin(e.life/9+e.ph)*.06;e.x+=e.vx;e.y+=e.vy;e.vy*=.995;
        const a=(1-e.life/e.max)*(.6+.4*Math.sin(e.life*.6+e.ph));
        cx.globalAlpha=Math.max(0,a);cx.fillStyle=`rgb(${o.emberColor})`;cx.shadowColor=`rgba(${o.emberColor},.9)`;cx.shadowBlur=8;
        cx.beginPath();cx.arc(e.x,e.y,e.s,0,6.283);cx.fill();cx.shadowBlur=0;
        if(e.life>e.max)E.splice(i,1)}
    }
    cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
  }
  frame();
};
})();
