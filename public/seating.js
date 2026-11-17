// Choose an unobstructed exit, preferring behind the chair (away from its table).
export function chooseSeatExit(seat,isBlocked,isOccupied=()=>false){
 const f={x:Math.sin(seat.r),z:Math.cos(seat.r)},r={x:Math.cos(seat.r),z:-Math.sin(seat.r)};
 const directions=[{x:-f.x,z:-f.z},r,{x:-r.x,z:-r.z},f];
 for(const distance of [1.05,1.4,1.8,2.2])for(const dir of directions){const p={x:seat.x+dir.x*distance,z:seat.z+dir.z*distance};if(isBlocked(p.x,p.z)||isOccupied(p.x,p.z))continue;let clear=true;for(let i=1;i<=8;i++){const t=i/8;if(isBlocked(seat.x+(p.x-seat.x)*t,seat.z+(p.z-seat.z)*t)){clear=false;break}}if(clear)return p}
 return null;
}
