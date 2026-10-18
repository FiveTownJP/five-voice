'use strict';
const root=document.getElementById('voice-root'), panel=document.getElementById('voice-panel'), muteIcon=document.getElementById('full-mute');
let uiEnabled=false, engineLive=false, closed=false, hudVisible=false, fullMuted=false, modes=[], mode=0, toneContext;
const I18N={
 en:{Whisper:'Whisper',Normal:'Normal',Shouting:'Shout','Super Shout':'Super shout',Mute:'Mute',radio:'Radio',call:'On call',fullMute:'Full mute',fullMuteSub:'Mic transmit OFF'},
 ja:{Whisper:'小声',Normal:'普通',Shouting:'大声','Super Shout':'咆哮',Mute:'ミュート',radio:'無線',call:labels.call,fullMute:'完全ミュート',fullMuteSub:'マイク送信OFF'}
};
let labels=I18N.en;
function applyLocale(l){labels=I18N[l]||I18N.en;document.documentElement.lang=I18N[l]?l:'en';document.querySelector('#full-mute span').firstChild.nodeValue=labels.fullMute;document.querySelector('#full-mute small').textContent=labels.fullMuteSub;document.querySelector('#full-mute img').alt=labels.fullMute;}
const tones=new Set();
const clicks={audio_on:new Audio('mic_click_on.ogg'),audio_off:new Audio('mic_click_off.ogg')};
function close(){root.hidden=true;for(const audio of Object.values(clicks)){audio.pause();audio.currentTime=0;}for(const node of tones){try{node.stop();}catch{}}tones.clear();if(toneContext)toneContext.suspend().catch(()=>{});}
let feedbackVolume=.02;
function feedback(kind){
 const frequencies={mute:[440,260],unmute:[420,700],mode:[620] }[kind];if(!frequencies)return;
 try{
  toneContext??=new (window.AudioContext||window.webkitAudioContext)();toneContext.resume().catch(()=>{});
  const now=toneContext.currentTime;
  frequencies.forEach((freq,i)=>{const node=toneContext.createOscillator(),gain=toneContext.createGain(),start=now+i*.09;node.frequency.value=freq;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(Math.max(.0001,feedbackVolume),start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.075);node.connect(gain);gain.connect(toneContext.destination);node.onended=()=>{tones.delete(node);node.disconnect();gain.disconnect();};tones.add(node);node.start(start);node.stop(start+.08);});
 }catch{}
}
window.addEventListener('message',({data:m})=>{
 if(!m||typeof m!=='object')return;
 if(m.fiveVoiceClosed){closed=true;engineLive=false;uiEnabled=false;close();return;}
 if(closed)return;
 if(typeof m.locale==='string')applyLocale(m.locale);
 if('uiEnabled'in m)uiEnabled=m.uiEnabled===true;
 if('fullMuted'in m)fullMuted=m.fullMuted===true;
 if(m.voiceModes){engineLive=true;try{modes=typeof m.voiceModes==='string'?JSON.parse(m.voiceModes):m.voiceModes;}catch{modes=[];}}
 if(Number.isInteger(m.voiceMode))mode=m.voiceMode;
 const name=modes[mode]?.[1]??'';
 document.getElementById('mode').textContent=labels[name]??name;
 if('radioChannel'in m)document.getElementById('radio').textContent=m.radioEnabled&&Number(m.radioChannel)>0?`${labels.radio} ${m.radioChannel}`:'';
 if('callInfo'in m)document.getElementById('call').textContent=Number(m.callInfo)>0?'通話中':'';
 if('talking'in m)root.classList.toggle('talking',!fullMuted&&Boolean(m.talking));
 if('usingRadio'in m)root.classList.toggle('radio-talking',!fullMuted&&Boolean(m.usingRadio));
 if(fullMuted)root.classList.remove('talking','radio-talking');
 if('fiveHudVisible'in m)hudVisible=m.fiveHudVisible===true;
 panel.hidden=!uiEnabled;muteIcon.hidden=!fullMuted;root.hidden=!hudVisible||(!uiEnabled&&!fullMuted);
 if(engineLive&&clicks[m.sound]){const audio=clicks[m.sound];audio.volume=Math.max(0,Math.min(1,Number(m.volume)||0));audio.currentTime=0;audio.play().catch(()=>{});}
 if('feedbackVolume'in m){const v=Number(m.feedbackVolume);if(Number.isFinite(v))feedbackVolume=Math.max(0,Math.min(1,v));}
 if(engineLive&&m.voiceFeedback&&feedbackVolume>0)feedback(m.voiceFeedback);
});
if(typeof GetParentResourceName==='function')for(const endpoint of ['uiReady','muteUiReady','hudVisibilityReady'])fetch(`https://${GetParentResourceName()}/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
window.addEventListener('pagehide',()=>{closed=true;close();});