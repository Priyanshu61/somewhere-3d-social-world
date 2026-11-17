import {client} from './rooms.js';
import {setPanel} from './hud.js';

// Audio travels over encrypted WebRTC; signaling uses the existing encrypted room.
const peers=new Map();
let stream=null,session='',epoch=0,muted=false,volume=1,busy=false;
const bar=document.createElement('div');bar.id='voiceControls';
bar.innerHTML='<button id="voiceJoin">Join voice</button><button id="voiceMute" hidden aria-pressed="false">Mute mic</button><button id="voiceLeave" hidden>Leave voice</button><label hidden>Voice volume <input id="voiceVolume" aria-label="Voice volume" type="range" min="0" max="1" step="0.05" value="1"></label><span id="voiceStatus" role="status">Voice off</span>';
document.querySelector('#chat').before(bar);
const shortcut=document.createElement('button');shortcut.id='voiceToggle';shortcut.textContent='Voice chat';shortcut.onclick=()=>setPanel('chat',true);document.querySelector('.gameactions').append(shortcut);
const join=bar.querySelector('#voiceJoin'),mute=bar.querySelector('#voiceMute'),leave=bar.querySelector('#voiceLeave'),status=bar.querySelector('#voiceStatus');
const notice=text=>window.dispatchEvent(new CustomEvent('notice',{detail:text}));
function send(data){return client.send({type:'voice',session,...data}).catch(()=>false)}
function render(){join.hidden=!!stream;join.disabled=busy;mute.hidden=leave.hidden=bar.querySelector('label').hidden=!stream;mute.textContent=muted?'Unmute mic':'Mute mic';mute.setAttribute('aria-pressed',String(muted));const connected=[...peers.values()].filter(p=>p.pc.connectionState==='connected').length;status.textContent=stream?(muted?'Mic muted':'Mic on')+' · '+connected+' connected':'Voice off';}
function drop(id){const p=peers.get(id);if(!p)return;peers.delete(id);clearTimeout(p.timer);p.pc.close();p.audio.srcObject=null;p.audio.remove();render()}
function stop(announce=true){epoch++;if(announce&&stream)send({action:'leave'});stream?.getTracks().forEach(t=>t.stop());stream=null;session='';for(const id of [...peers.keys()])drop(id);muted=false;busy=false;render()}
function peer(id,remoteSession){let p=peers.get(id);if(p?.remoteSession===remoteSession)return p;if(p)drop(id);
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
 const audio=document.createElement('audio');audio.autoplay=true;audio.volume=volume;audio.setAttribute('playsinline','');bar.append(audio);
 p={pc,audio,remoteSession,queue:Promise.resolve(),candidates:[],offered:false};peers.set(id,p);
 stream.getTracks().forEach(t=>pc.addTrack(t,stream));
 pc.onicecandidate=e=>{if(e.candidate)send({action:'ice',to:id,targetSession:remoteSession,candidate:e.candidate.toJSON()})};
 pc.ontrack=e=>{audio.srcObject=e.streams[0]||new MediaStream([e.track]);audio.play().catch(()=>{status.textContent='Tap Enable voices to hear your friends';enable.hidden=false})};
 pc.onconnectionstatechange=()=>{render();if(pc.connectionState==='failed')status.textContent='Voice connection failed. Leave and rejoin voice; this network may need a relay.'};
 p.timer=setTimeout(()=>{if(peers.get(id)===p&&pc.connectionState!=='connected')status.textContent='Still connecting. This network may need a voice relay.'},20000);
 return p;
}
async function handle(d,id){if(!stream||!d||d.type!=='voice'||typeof d.session!=='string'||d.session.length>80||id===client.user.id||d.to&&d.to!==client.user.id)return;
 if(!client.room?.members.some(m=>m.id===id&&m.state==='approved'))return;
 if(d.targetSession&&d.targetSession!==session)return;
 if(d.action==='leave'){if(peers.get(id)?.remoteSession===d.session)drop(id);return}
 if(d.action==='ready'){
  const p=peer(id,d.session);if(!d.to)await send({action:'ready',to:id,targetSession:d.session});
  if(client.user.id<id&&!p.offered){p.offered=true;p.queue=p.queue.then(async()=>{await p.pc.setLocalDescription(await p.pc.createOffer());await send({action:'description',to:id,targetSession:d.session,description:p.pc.localDescription.toJSON()})}).catch(()=>{status.textContent='Voice connection interrupted. Leave and rejoin voice.'})}return;
 }
 const p=peers.get(id);if(!p||p.remoteSession!==d.session)return;
 p.queue=p.queue.then(async()=>{
  if(d.action==='description'&&['offer','answer'].includes(d.description?.type)&&typeof d.description.sdp==='string'&&d.description.sdp.length<50000){
   if(d.description.type==='offer'&&id>client.user.id)return;
   await p.pc.setRemoteDescription(d.description);for(const c of p.candidates.splice(0))await p.pc.addIceCandidate(c);
   if(d.description.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());await send({action:'description',to:id,targetSession:d.session,description:p.pc.localDescription.toJSON()})}
  }else if(d.action==='ice'&&d.candidate&&typeof d.candidate.candidate==='string'&&d.candidate.candidate.length<4096){if(p.pc.remoteDescription)await p.pc.addIceCandidate(d.candidate);else if(p.candidates.length<64)p.candidates.push(d.candidate)}
 }).catch(()=>{if(peers.get(id)===p)status.textContent='Voice connection interrupted. Leave and rejoin voice.'});
}
join.onclick=async()=>{if(!client.connected){notice('Join a private room first.');return}if(busy)return;busy=true;render();const attempt=++epoch;try{
 if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');const captured=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
 if(attempt!==epoch||!client.connected){captured.getTracks().forEach(t=>t.stop());return}stream=captured;session=crypto.randomUUID();muted=false;stream.getAudioTracks().forEach(t=>t.onended=()=>stop());await send({action:'ready'});
 }catch(e){if(attempt===epoch)notice(e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in browser settings, then join voice again.':e.name==='NotFoundError'?'No microphone found. Connect one and try again.':'Could not start your microphone. Check your device and browser permissions.')}finally{if(attempt===epoch){busy=false;render()}}};
mute.onclick=()=>{muted=!muted;stream?.getAudioTracks().forEach(t=>t.enabled=!muted);render()};leave.onclick=()=>stop();
bar.querySelector('#voiceVolume').oninput=e=>{volume=Number(e.target.value);for(const p of peers.values())p.audio.volume=volume};
const enable=document.createElement('button');enable.textContent='Enable voices';enable.hidden=true;enable.onclick=async()=>{try{await Promise.all([...peers.values()].map(p=>p.audio.play()));enable.hidden=true;render()}catch{notice('Your browser blocked voice playback. Try again.')}};bar.append(enable);
window.addEventListener('room-data',e=>{handle(e.detail.data,e.detail.from).catch(()=>{})});
for(const event of ['room-left','room-disconnected','room-ready','pagehide'])window.addEventListener(event,()=>stop(false));
window.addEventListener('room-roster',e=>{for(const id of peers.keys())if(!e.detail.members.some(m=>m.id===id&&m.online&&m.state==='approved'))drop(id)});
window.somewhereVoice=()=>({active:!!stream,muted,tracks:stream?.getTracks().map(t=>({enabled:t.enabled,state:t.readyState}))||[],peers:[...peers.values()].map(p=>({state:p.pc.connectionState})),stats:()=>Promise.all([...peers.values()].map(async p=>[...(await p.pc.getStats()).values()].filter(s=>s.type==='inbound-rtp'&&s.kind==='audio').map(s=>({bytesReceived:s.bytesReceived,packetsReceived:s.packetsReceived}))))});
render();
