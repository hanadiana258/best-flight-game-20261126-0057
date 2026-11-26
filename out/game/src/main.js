import { FlightModel } from './flight-model.js';
import { drawWorld, drawCockpit } from './world-render.js';
import { drawHud, drawDebrief } from './interface.js';

const canvas=document.querySelector('#flight'), ctx=canvas.getContext('2d');
const title=document.querySelector('#title'); const model=new FlightModel();
let last=performance.now(),frames=0,fps=60,mouseX=.5,mouseY=.5,runSeconds=0;
function resize(){const d=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize); resize();
addEventListener('keydown',e=>{model.keys[e.code]=true;if(e.code==='Enter'||e.code==='NumpadEnter'){model.active=true;title.classList.add('hide')}if(e.code==='KeyV')model.cockpit=!model.cockpit;if(e.code==='KeyR')model.reset();if(e.code==='Space')model.flare=true});
addEventListener('keyup',e=>{model.keys[e.code]=false;if(e.code==='Space')model.flare=false});
addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouseX=(e.clientX-r.left)/r.width;mouseY=(e.clientY-r.top)/r.height});
addEventListener('click',()=>{model.active=true;title.classList.add('hide')});
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;frames++;if(frames%20===0)fps=Math.round(1/dt);model.update(dt,mouseX,mouseY);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);drawWorld(ctx,w,h,model);if(model.cockpit)drawCockpit(ctx,w,h,model);drawHud(ctx,w,h,model,fps);if(model.state==='debrief')drawDebrief(ctx,w,h,model);requestAnimationFrame(frame)}requestAnimationFrame(frame);
