import test from 'node:test';import assert from 'node:assert/strict';import {createCipher,newRoomKey} from '../public/room-crypto.js';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8787';
async function api(path,body,cookie,origin=base){const r=await fetch(base+'/api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
test('guest admission, identity, room capacity and privacy controls',async()=>{
 const host=await api('/auth/guest',{name:'Test host'});assert.equal(host.status,201);assert(host.cookie);const h=host.cookie;
 assert.equal((await api('/me',undefined,h)).body.user.name,'Test host');assert.equal((await api('/auth/guest',{name:'Bad'},undefined,'https://attacker.example')).status,403);
 const room=(await api('/rooms',{name:'Guest tests'},h)).body;assert(room.invite);assert.equal(room.room.capacity,10);assert(!('invite' in room.room));assert(room.room.inviteExpiresAt-Date.now()<=600000);
 const guests=[];for(let i=0;i<10;i++)guests.push(await api('/auth/guest',{name:'Guest '+i}));
 assert.equal((await api('/rooms/'+room.room.id+'/join',{invite:'bad'},guests[0].cookie)).status,403);
 for(const g of guests.slice(0,9)){const joined=await api('/rooms/'+room.room.id+'/join',{invite:room.invite},g.cookie);assert.equal(joined.body.state,'pending');assert.equal((await api('/rooms/'+room.room.id+'/approve',{userId:g.body.user.id},g.cookie)).status,403);assert.equal((await api('/rooms/'+room.room.id+'/approve',{userId:g.body.user.id},h)).status,200)}
 assert.equal((await api('/rooms/'+room.room.id+'/join',{invite:room.invite},guests[9].cookie)).status,409);
 assert.equal((await api('/rooms/'+room.room.id+'/lock',{},h)).status,200);
 assert.equal((await api('/rooms/'+room.room.id+'/join',{invite:room.invite},guests[9].cookie)).status,410);
 assert.equal((await api('/rooms/'+room.room.id+'/join',{invite:room.invite},guests[0].cookie)).body.state,'approved');
 await api('/auth/logout',{},guests[0].cookie);assert.equal((await api('/me',undefined,guests[0].cookie)).status,401);
 await api('/rooms/'+room.room.id+'/close',{},h);assert.equal((await api('/rooms/'+room.room.id,undefined,h)).status,404);
});
test('encrypted packets reject tampering, wrong keys and replay',async()=>{const key=newRoomKey(),a=await createCipher(key,'room','a'),b=await createCipher(key,'room','b'),wrong=await createCipher(newRoomKey(),'room','b'),p={...await a.seal({type:'chat',text:'private'}),from:'a'};assert(!JSON.stringify(p).includes('private'));assert.equal((await b.open(p)).text,'private');await assert.rejects(()=>b.open(p));await assert.rejects(()=>wrong.open(p));await assert.rejects(()=>a.open({...p,from:'forged'}))});
