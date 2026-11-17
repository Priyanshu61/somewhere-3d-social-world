// All vehicles use this shared road graph. Stops are on the eastbound lane.
export const stops={cafe:{x:-16,z:1.5},restaurant:{x:16,z:1.5},park:{x:-16,z:28.5},cinema:{x:16,z:28.5},music:{x:0,z:-25.5}};
export const rows=[-25.5,1.5,28.5];
export const columns=[-31.5,-1.5,28.5];
export function roadDistance(p){return Math.min(...rows.map(z=>Math.abs(p.z-z)),...columns.map(x=>Math.abs(p.x-x)))}
export function nearestStop(p){return Object.entries(stops).sort((a,b)=>Math.hypot(p.x-a[1].x,p.z-a[1].z)-Math.hypot(p.x-b[1].x,p.z-b[1].z))[0]}
export function route(from,to){
 const points=[from,to,...rows.flatMap(z=>columns.map(x=>({x,z})))];
 const dist=points.map(()=>Infinity),prev=points.map(()=>-1),done=new Set();dist[0]=0;
 for(let k=0;k<points.length;k++){let u=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u]))break;if(u===1)break;done.add(u);for(let v=0;v<points.length;v++){const a=points[u],b=points[v];if((a.x===b.x&&columns.includes(a.x))||(a.z===b.z&&rows.includes(a.z))){const d=dist[u]+Math.hypot(a.x-b.x,a.z-b.z);if(d<dist[v]){dist[v]=d;prev[v]=u}}}}
 if(!Number.isFinite(dist[1]))throw Error('No road route available');const path=[];for(let i=1;i>=0;i=prev[i]){path.unshift({...points[i]});if(i===0)break}
 // Round each intersection turn inside its paved bounds instead of pivoting.
 const smooth=[path[0]];for(let i=1;i<path.length-1;i++){const a=path[i-1],b=path[i],c=path[i+1],ab=Math.hypot(b.x-a.x,b.z-a.z),bc=Math.hypot(c.x-b.x,c.z-b.z),r=Math.min(1.2,ab/3,bc/3);if(!r)continue;const p={x:b.x+(a.x-b.x)*r/ab,z:b.z+(a.z-b.z)*r/ab},q={x:b.x+(c.x-b.x)*r/bc,z:b.z+(c.z-b.z)*r/bc};smooth.push(p);for(let j=1;j<=8;j++){const t=j/8;smooth.push({x:(1-t)**2*p.x+2*(1-t)*t*b.x+t*t*q.x,z:(1-t)**2*p.z+2*(1-t)*t*b.z+t*t*q.z})}}smooth.push(path.at(-1));return smooth;
}
export function sampleRoute(path,distance){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(distance<=length){const t=length?distance/length:0;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,r:Math.atan2(b.x-a.x,b.z-a.z),done:false}}distance-=length}return{...path.at(-1),r:0,done:true}}
