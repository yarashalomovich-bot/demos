/* 3D-имплант: винт с резьбой, абатмент, керамическая коронка, кость/десна.
   mountImplant(canvas,{onFail}) → {set(p)}; p 0..1 — прогресс сцены по скроллу. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), seg=(p,a,b)=>cl((p-a)/(b-a));
const eo=t=>1-Math.pow(1-t,3), eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,t)=>a+(b-a)*t;
const back=t=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};

export function mountImplant(canvas,opt={}){
  const LQ=opt.lq||innerWidth<700||(navigator.hardwareConcurrency||8)<=4;
  let R;
  try{R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'})}
  catch(e){opt.onFail&&opt.onFail();return null}
  const dpr=Math.min(devicePixelRatio||1,LQ?1.5:2);R.setPixelRatio(dpr);
  R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;R.outputColorSpace=THREE.SRGBColorSpace;
  const S=new THREE.Scene();
  const pm=new THREE.PMREMGenerator(R);S.environment=pm.fromScene(new RoomEnvironment(R),.035).texture;
  const cam=new THREE.PerspectiveCamera(28,1,.1,100);
  const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(3,5,4);S.add(key);
  const rim=new THREE.DirectionalLight(0x9fe0d2,1.1);rim.position.set(-4,2,-3);S.add(rim);
  S.add(new THREE.AmbientLight(0xffffff,.25));

  const root=new THREE.Group();S.add(root);
  const implant=new THREE.Group();root.add(implant);

  // ---- материалы
  const ti=new THREE.MeshPhysicalMaterial({color:0xc7cbd0,metalness:1,roughness:.2,clearcoat:.4,clearcoatRoughness:.2});
  const tiDark=new THREE.MeshPhysicalMaterial({color:0xaeb3b9,metalness:1,roughness:.32,side:THREE.DoubleSide});
  const gold=new THREE.MeshPhysicalMaterial({color:0xd9c39a,metalness:1,roughness:.25});
  const ceramic=new THREE.MeshPhysicalMaterial({color:0xf6f2e9,roughness:.22,clearcoat:1,clearcoatRoughness:.05,sheen:.4,sheenColor:new THREE.Color(0xffffff),transmission:.06,thickness:.6,ior:1.5});

  // ---- винт: точёная V-резьба на теле
  const core=y=>lerp(.30,.235,cl(-y/1.9));
  const screw=new THREE.Group();
  {const RS=LQ?96:160,HS=LQ?360:720,top=-.16,bot=-1.86,pitch=.165,depth=.07;
   const pos=[],uv=[],idx=[];
   for(let j=0;j<=HS;j++){const y=top+(bot-top)*j/HS;
     for(let i=0;i<=RS;i++){const th=i/RS*Math.PI*2;
       const f=((y/pitch+th/(Math.PI*2))%1+1)%1;const tri=1-Math.abs(2*f-1);
       const fade=cl((y-bot)/.25)*cl((top-y)/.05+.4);
       const r=core(y)+depth*Math.pow(tri,1.25)*fade;
       pos.push(Math.cos(th)*r,y,Math.sin(th)*r);uv.push(i/RS,j/HS)}}
   for(let j=0;j<HS;j++)for(let i=0;i<RS;i++){const a=j*(RS+1)+i,b=a+RS+1;idx.push(a,b,a+1,b,b+1,a+1)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
   screw.add(new THREE.Mesh(g,ti));}
  {const pr=[new THREE.Vector2(0,0),new THREE.Vector2(.335,0),new THREE.Vector2(.335,-.05),new THREE.Vector2(.31,-.16),new THREE.Vector2(core(-.16)+.01,-.17)];
   screw.add(new THREE.Mesh(new THREE.LatheGeometry(pr,128),ti));
   const ap=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI/2;ap.push(new THREE.Vector2(core(-1.86)*Math.cos(a)+.001,-1.86-Math.sin(a)*.2))}
   ap.reverse();screw.add(new THREE.Mesh(new THREE.LatheGeometry(ap,128),tiDark));}
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(.35,.335,.12,128),ti);collar.position.y=.06;screw.add(collar);
  implant.add(screw);

  // ---- абатмент
  const ap=[new THREE.Vector2(0,0),new THREE.Vector2(.31,0),new THREE.Vector2(.33,.06),new THREE.Vector2(.33,.16),new THREE.Vector2(.3,.2)];
  for(let i=1;i<=16;i++){const t=i/16;ap.push(new THREE.Vector2(lerp(.27,.19,t),.2+t*.5))}
  for(let i=1;i<=8;i++){const a=i/8*Math.PI/2;ap.push(new THREE.Vector2(.19*Math.cos(a),.7+Math.sin(a)*.07))}
  const abut=new THREE.Mesh(new THREE.LatheGeometry(ap,128),gold);implant.add(abut);

  // ---- коронка: моляр, 4 бугра, центральная фиссура
  const cg=new THREE.SphereGeometry(.62,LQ?110:180,LQ?84:140),P=cg.attributes.position,v=new THREE.Vector3();
  const cusps=[[.27,.25],[-.27,.25],[.27,-.25],[-.27,-.25]];
  for(let i=0;i<P.count;i++){
    v.fromBufferAttribute(P,i);let {x,y,z}=v;const n=v.clone().normalize();
    // суперэллипс в плане — коронка «квадратнее»
    const ph=Math.atan2(z,x),c=Math.cos(ph),s=Math.sin(ph);
    const se=Math.pow(Math.pow(Math.abs(c),4)+Math.pow(Math.abs(s),4),-.25)*.92;
    x*=se*1.04;z*=se*.94;
    if(y>0){
      y*=.7; let b=0;for(const [cx,cz] of cusps){b+=.1*Math.exp(-((x-cx)**2+(z-cz)**2)/.07)}
      const fis=.045*Math.exp(-(x*x)/.006)*cl(1-Math.abs(z)/.45)+.035*Math.exp(-(z*z)/.006)*cl(1-Math.abs(x)/.45);
      y+=b*cl(n.y*1.6)-fis*cl(n.y*1.4);
      y+=.18;
    }else{
      const k=1-.5*Math.pow(cl(-y/.62),1.8);x*=k;z*=k;y=y*.95+.18;
    }
    P.setXYZ(i,x,y,z);
  }
  cg.computeVertexNormals();
  const crown=new THREE.Mesh(cg,ceramic);implant.add(crown);

  // ---- кость и десна: разрез альвеолярного гребня
  const jaw=new THREE.Group();root.add(jaw);
  const ridge=(w,top,bot,peak)=>{const s=new THREE.Shape();
    s.moveTo(-w*.62,bot);s.quadraticCurveTo(-w*1.04,bot+.05,-w*1.0,bot+1.0);s.lineTo(-w,top-.35);
    s.bezierCurveTo(-w,top+peak*.2,-w*.45,top+peak,0,top+peak);s.bezierCurveTo(w*.45,top+peak,w,top+peak*.2,w,top-.35);
    s.lineTo(w,bot+1.0);s.quadraticCurveTo(w*1.04,bot+.05,w*.62,bot);s.lineTo(-w*.62,bot);return s};
  const band=(w,top,bot,peak)=>{const s=new THREE.Shape();s.moveTo(-w,bot);s.lineTo(-w,top-.35);
    s.bezierCurveTo(-w,top+peak*.2,-w*.45,top+peak,0,top+peak);s.bezierCurveTo(w*.45,top+peak,w,top+peak*.2,w,top-.35);s.lineTo(w,bot);s.lineTo(-w,bot);return s};
  const ex={depth:1.5,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:8,curveSegments:48};
  const bone=new THREE.Mesh(new THREE.ExtrudeGeometry(ridge(1.0,-.2,-2.5,.1),ex),new THREE.MeshPhysicalMaterial({color:0xfaf1e2,emissive:0x2a2418,roughness:.35,clearcoat:1,clearcoatRoughness:.2,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}));bone.renderOrder=2;
  bone.position.z=-.75;jaw.add(bone);
  const gs=band(1.06,.05,-.32,.16);
  const gum=new THREE.Mesh(new THREE.ExtrudeGeometry(gs,{...ex,depth:1.62}),new THREE.MeshPhysicalMaterial({color:0xe3858a,roughness:.3,clearcoat:.8,clearcoatRoughness:.12,sheen:.6,sheenColor:new THREE.Color(0xffc2c2),transparent:true,opacity:.72,depthWrite:false}));gum.renderOrder=3;
  gum.position.z=-.81;jaw.add(gum);
  jaw.traverse(o=>{if(o.material){o.material.transparent=true}});

  // ---- мягкая тень
  const sc=document.createElement('canvas');sc.width=sc.height=256;const sx=sc.getContext('2d');
  const gr=sx.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.fillRect(0,0,256,256);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;root.add(shadow);

  // ---- взаимодействие
  let mx=0,my=0,tx=0,ty=0,p=0,pp=0,t0=performance.now(),vis=true;
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  addEventListener('deviceorientation',e=>{if(e.gamma==null)return;mx=cl(e.gamma/40,-.5,.5);my=cl((e.beta-45)/60,-.5,.5)});
  new IntersectionObserver(e=>{vis=e[0].isIntersecting}).observe(canvas);
  let W=0,H=0,mobile=false;
  function size(){W=canvas.clientWidth;H=canvas.clientHeight;mobile=W<900;R.setSize(W,H,false);cam.aspect=W/H;
    if(!mobile)cam.setViewOffset(W,H,-W*.2,0,W,H)
    cam.updateProjectionMatrix()}
  size();addEventListener('resize',size);

  function setAlpha(g,a){g.traverse(o=>{if(o.material){if(o.userData.a0==null)o.userData.a0=o.material.opacity;o.material.opacity=a*o.userData.a0;o.visible=a>.01}})}

  function frame(now){
    requestAnimationFrame(frame);if(!vis)return;
    const T=(now-t0)/1000;pp+=(p-pp)*.12;const q=pp;
    tx+=(mx-tx)*.05;ty+=(my-ty)*.05;
    // фазы
    const ex=eio(seg(q,.16,.3));            // разбор
    const s1=eio(seg(q,.32,.52));           // вкручивание
    const s2=seg(q,.55,.72),s3=seg(q,.75,.92),fin=seg(q,.92,1);
    // позиции
    const crownA=.42,abutA=.16;
    screw.position.y=lerp(lerp(.3,1.6,ex),0,s1);
    screw.rotation.y=-s1*Math.PI*8;
    abut.position.y=lerp(lerp(abutA,3.2,ex),abutA,back(s2));
    crown.position.y=lerp(lerp(crownA,4.4,ex),crownA,back(s3));
    crown.rotation.y=(1-s3)*.8;
    setAlpha(jaw,ex);jaw.position.y=lerp(-2.2,0,eo(ex));
    shadow.material.opacity=1-ex;shadow.position.y=-2.25+.3*(1-ex);
    // общий вид
    const spin=q<.3?T*.35:lerp(.6,T*.25,fin);
    root.rotation.y=spin*(q<.3?1:fin)+(q>=.3?.55*(1-fin):0)+tx*.9;
    root.rotation.x=lerp(.05,.32,ex)+ty*.35-fin*.2;
    implant.position.y=q<.3?Math.sin(T*1.1)*.06*(1-ex):0;
    if(mobile){cam.setViewOffset(W,H,0,H*lerp(.26,.17,ex),W,H);cam.updateProjectionMatrix()}
    const sc=mobile?lerp(.5,.72,ex):1;root.scale.setScalar(lerp(.98,.95,ex)*sc);
    cam.position.set(0,lerp(.2,1.2,ex),lerp(9.2,11.2,ex));cam.lookAt(0,lerp(-.15,-.2,ex),0);
    R.render(S,cam);
  }
  requestAnimationFrame(frame);
  return {set:(v,now)=>{p=cl(v);if(now)pp=p}};
}
