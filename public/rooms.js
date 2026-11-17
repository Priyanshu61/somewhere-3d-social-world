import {newRoomKey,createCipher} from './room-crypto.js';
const $=s=>document.querySelector(s),emit=(t,d)=>window.dispatchEvent(new CustomEvent(t,{detail:d}));
export const client={user:null,room:null,connected:false,send:async()=>false};
let socket,cipher,invitation='',poll,retry,offset=0,generation=0,initialInvite=location.hash.startsWith('#invite=')?location.hash.slice(8):'',authMode='login';
// Remove key material from the address bar/history before loading external resources.
if(initialInvite)history.replaceState(null,'',location.pathname+location.search);
const auth=$('#accountDialog'),lobby=$('#roomDialog');
export async function api(path,body,method=body===undefined?'GET':'POST') {
 const response=await fetch('/api'+path,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Request failed'),{status:response.status});return data;
}
function error(e){$('#roomError').textContent=e.message||String(e)}
function notice(text){emit('notice',text)}
function mode(){$('#authError').textContent=''}
$('#authForm').onsubmit=async e=>{e.preventDefault();$('#authSubmit').disabled=true;try{const data=await api('/auth/guest',{name:$('#guestName').value});client.user=data.user;auth.close();applyUser();await home()}catch(e){$('#authError').textContent=e.message}finally{$('#authSubmit').disabled=false}};
auth.addEventListener('cancel',e=>e.preventDefault());
function applyUser(){ $('#accountName').textContent=client.user.name;emit('account-ready',client.user); }
async function home(){
 $('#roomError').textContent='';$('#roomHome').hidden=false;$('#roomActive').hidden=true;$('#roomClose').hidden=true;if(!lobby.open)lobby.showModal();
 if(initialInvite){$('#joinCode').value=initialInvite;initialInvite='';}
 const data=await api('/me');client.user=data.user;applyUser();const list=$('#recentRooms');list.replaceChildren();
 for(const room of data.rooms){const b=document.createElement('button');b.className='recent-room';b.textContent=room.name+' · rejoin';b.onclick=async()=>{try{const secret=sessionStorage.getItem('room-key-'+room.id);if(!secret){throw Error('Paste your full saved invitation to restore this room’s encryption key.')}await enter((await api('/rooms/'+room.id)).room,secret,sessionStorage.getItem('room-invite-'+room.id)||'')}catch(e){error(e)}};list.append(b)}
}
function saveKey(id,key){sessionStorage.setItem('room-key-'+id,key)}
function parseInvite(value){let code=value.trim();if(code.includes('#invite='))code=code.split('#invite=')[1];const parts=code.split('.');if(parts.length!==3||!/^[a-z0-9-]{36}$/.test(parts[0])||!parts.slice(1).every(v=>/^[A-Za-z0-9_-]{43}$/.test(v)))throw Error('Paste the complete invitation link or code.');return{id:parts[0],token:parts[1],key:parts[2],code}}
$('#createRoom').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const secret=newRoomKey(),data=await api('/rooms',{name:$('#newRoomName').value});invitation=`${data.room.id}.${data.invite}.${secret}`;await enter(data.room,secret,invitation)}catch(e){error(e)}finally{button.disabled=false}};
$('#joinRoom').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{
 const invite=parseInvite($('#joinCode').value),data=await api('/rooms/'+invite.id+'/join',{invite:invite.token});saveKey(invite.id,invite.key);invitation=invite.code;client.room=data.room;renderRoom();
 if(data.state==='approved')await enter(data.room,invite.key,invite.code);else{notice('Request sent. Your host needs to approve you.');clearInterval(poll);poll=setInterval(async()=>{try{const data=await api('/rooms/'+invite.id);client.room=data.room;renderRoom();if(data.state==='approved'){clearInterval(poll);await enter(data.room,invite.key,invite.code)}else if(data.state==='rejected'||data.room.inviteExpiresAt<=data.room.serverTime){clearInterval(poll);error(Error('Joining is closed or your request was declined.'));$('#waitingRoom').textContent='Request ended. Use Back to rooms to try another invitation.'}}catch(e){clearInterval(poll);error(e)}},2000)}
 }catch(e){error(e)}finally{button.disabled=false}};
async function enter(room,secret,code){
 clearInterval(poll);clearTimeout(retry);generation++;const current=generation;socket?.close();client.connected=false;client.room=room;invitation=code;if(code)sessionStorage.setItem('room-invite-'+room.id,code);saveKey(room.id,secret);cipher=await createCipher(secret,room.id,client.user.id);renderRoom();emit('room-ready',room);connect(current);
}
function connect(current){
 if(current!==generation)return;const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/socket?room=${client.room.id}`);socket=ws;let chain=Promise.resolve();
 ws.onopen=()=>{if(current!==generation)return;client.connected=true;emit('room-connected',client.room);renderRoom()};
 ws.onmessage=e=>{chain=chain.then(async()=>{if(current!==generation)return;const p=JSON.parse(e.data);if(p.type==='roster'){client.room=p.room;renderRoom();emit('room-roster',p.room)}else if(p.type==='sealed'){if(!client.room.members.some(m=>m.id===p.from&&m.state==='approved'))return;try{const d=await cipher.open(p);emit('room-data',{from:p.from,data:d})}catch{notice('An encrypted update could not be verified. Check that everyone has the same room invitation.')}}}).catch(()=>{})};
 ws.onclose=e=>{if(current!==generation)return;client.connected=false;emit('room-disconnected');renderRoom();if([4001,4004,4008].includes(e.code)){error(Error(e.reason||'Connection closed.'));lobby.showModal();return}retry=setTimeout(async()=>{try{await api('/rooms/'+client.room.id);connect(current)}catch(err){error(err);if(!lobby.open)lobby.showModal()}},3000)};
 ws.onerror=()=>{};
}
client.send=async data=>{if(!client.connected||!cipher||socket?.readyState!==1)return false;const current=generation,packet=await cipher.seal(data);if(current!==generation||socket?.readyState!==1)return false;socket.send(JSON.stringify(packet));return true};
function renderRoom(){
 const room=client.room;if(!room)return;offset=room.serverTime-Date.now();$('#roomHome').hidden=true;$('#roomActive').hidden=false;$('#roomClose').hidden=!client.connected;$('#roomName').textContent=room.name;$('#roomId').textContent=room.id;$('#memberCount').textContent=room.members.filter(m=>m.state==='approved').length+' / 10 members';
 const host=room.hostId===client.user.id;$('#hostRoomControls').hidden=!host;$('#lockRoom').disabled=room.locked;$('#lockRoom').textContent=room.locked?'Room is locked':'Build & lock room';$('#copyInvite').disabled=!host||room.locked||room.inviteExpiresAt<=Date.now()+offset||!invitation;
 $('#waitingRoom').hidden=client.connected;$('#waitingRoom').textContent='Waiting for approval / connecting…';$('#enterWorld').hidden=!client.connected;
 const list=$('#roomMembers');list.replaceChildren();for(const m of room.members.filter(m=>m.state!=='rejected')){const li=document.createElement('li'),label=document.createElement('span');label.textContent=`${m.name} (@${m.username})`;const small=document.createElement('small');small.textContent=m.id===room.hostId?'Host':m.state==='pending'?'Asking to join':m.online?'Here now':'Offline';li.append(label,small);if(host&&m.state==='pending')for(const action of ['approve','reject']){const b=document.createElement('button');b.textContent=action==='approve'?'Approve':'Decline';b.onclick=async()=>{b.disabled=true;try{const d=await api('/rooms/'+room.id+'/'+action,{userId:m.id});client.room=d.room;renderRoom()}catch(e){error(e);b.disabled=false}};li.append(b)}list.append(li)}countdown();
}
function countdown(){const r=client.room;if(!r)return;const remaining=Math.max(0,Math.ceil((r.inviteExpiresAt-Date.now()-offset)/1000));$('#inviteCountdown').textContent=r.locked?'Locked · only approved members can reconnect':remaining?`Invitations close in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:'Invitations expired · approved members can reconnect';if(!remaining)$('#copyInvite').disabled=true}
setInterval(countdown,1000);
$('#copyInvite').onclick=async()=>{const url=location.origin+location.pathname+'#invite='+invitation;$('#invitationText').value=url;$('#invitationDetails').hidden=false;try{await navigator.clipboard.writeText(url);notice('Private invitation copied. Approve each person before locking.')}catch{notice('Copy the invitation shown below.')}};
$('#lockRoom').onclick=async()=>{try{client.room=(await api('/rooms/'+client.room.id+'/lock',{})).room;$('#invitationText').value='';$('#invitationDetails').hidden=true;renderRoom();notice('Room locked. No new people can join.')}catch(e){error(e)}};
$('#closeRoom').onclick=async()=>{try{await api('/rooms/'+client.room.id+'/close',{});await leave();notice('Room closed for everyone.')}catch(e){error(e)}};
async function leave(){clearInterval(poll);clearTimeout(retry);generation++;socket?.close();client.connected=false;client.room=null;invitation='';$('#invitationText').value='';$('#invitationDetails').hidden=true;emit('room-left');await home()}
$('#leaveRoom').onclick=()=>leave().catch(error);$('#enterWorld').onclick=$('#roomClose').onclick=()=>lobby.close();lobby.addEventListener('cancel',e=>{if(!client.connected)e.preventDefault()});
$('#roomsButton').onclick=$('#invite').onclick=()=>{if(!client.user)auth.showModal();else if(client.room){renderRoom();lobby.showModal()}else home().catch(error)};
$('#signOut').onclick=async()=>{if(!confirm('End this guest session? You will lose this guest identity and access to locked rooms. Joining again creates a new guest who needs host approval.'))return;try{await api('/auth/logout',{});generation++;clearInterval(poll);clearTimeout(retry);socket?.close();client.connected=false;client.room=null;client.user=null;for(const k of Object.keys(sessionStorage))if(k.startsWith('room-key-')||k.startsWith('room-invite-'))sessionStorage.removeItem(k);emit('room-left');lobby.close();mode('login');auth.showModal()}catch(e){error(e)}};
window.addEventListener('avatar-change',e=>{if(client.user)api('/me',{avatar:e.detail},'PUT').catch(e=>notice('Could not save your look: '+e.message))});
export async function startRooms(){try{const data=await api('/me');client.user=data.user;applyUser();await home()}catch(e){if(e.status===401){mode('login');auth.showModal()}else{$('#authError').textContent=e.message;auth.showModal()}}}
