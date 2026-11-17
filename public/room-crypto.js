// Group encryption. The server receives ciphertext, never this key.
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode = text => Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
const utf8 = new TextEncoder();
export function newRoomKey() { return encode(crypto.getRandomValues(new Uint8Array(32))); }
export async function createCipher(secret, roomId, userId) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw Error('The invitation is missing its encryption key.');
  const key = await crypto.subtle.importKey('raw', decode(secret), 'AES-GCM', false, ['encrypt','decrypt']);
  const seen = new Set();
  return {
    async seal(data) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plain = utf8.encode(JSON.stringify({...data, sentAt:Date.now()}));
      const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf8.encode(`${roomId}:${userId}`)},key,plain);
      return {type:'sealed',iv:encode(iv),cipher:encode(cipher)};
    },
    async open(packet) {
      const replayKey = `${packet.from}:${packet.iv}`;
      if (seen.has(replayKey)) throw Error('Duplicate packet');
      const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(packet.iv),additionalData:utf8.encode(`${roomId}:${packet.from}`)},key,decode(packet.cipher));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || typeof data !== 'object' || typeof data.type !== 'string' || !Number.isFinite(data.sentAt) || Math.abs(Date.now()-data.sentAt)>120000) throw Error('Invalid or expired packet');
      seen.add(replayKey); if (seen.size>8192) seen.delete(seen.values().next().value);
      return data;
    }
  };
}
