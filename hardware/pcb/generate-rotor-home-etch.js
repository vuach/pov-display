const fs = require('fs');
const path = require('path');

const NAME = 'rotor-controller-rev-b-home-etch';
const OUT = path.join(__dirname, 'gerber', NAME);
fs.mkdirSync(OUT, { recursive: true });

// Electrical carrier for a mechanically separate rotor/hub.
// All etched copper is on B.Cu. Components and insulated wire links are on top.
const board = { width: 110, height: 70, revision: 'B-ETCH', date: '2026-09-23' };
const pads = [];
const holes = [];
const traces = [];
const links = [];

function pad(ref, pin, x, y, net, opts = {}) {
  pads.push({
    ref, pin: String(pin), x, y, net,
    shape: opts.shape || 'round',
    drill: opts.drill ?? 1.0,
    diameter: opts.diameter ?? 2.0,
  });
}
function hole(ref, x, y, drill) { holes.push({ ref, x, y, drill }); }
function trace(net, width, points) { traces.push({ net, width, points }); }
function link(ref, net, from, to) { links.push({ ref, net, from, to }); }

// ESP32 DevKit V1 30-pin, physically confirmed Rev B geometry.
// USB is at the lower edge of the board.
const espX = [31.2375, 56.7625];
const espY0 = 17.36;
const espPitch = 2.52;
const leftNames = ['VIN','GND','D13','D12','D14','D27','D26','D25','D33','D32','D35','D34','VN','VP','EN'];
const rightNames = ['3V3','GND','D15','D2','D4','RX2','TX2','D5','D18','D19','D21','RX0','TX0','D22','D23'];
const espNets = {
  'L:VIN':'5V', 'L:GND':'GND', 'L:D27':'HALL', 'L:D25':'ESC_PWM_3V3',
  'R:3V3':'3V3', 'R:GND':'GND', 'R:D18':'DATA_A_3V3', 'R:D19':'CLOCK_A_3V3',
  'R:D22':'CLOCK_B_3V3', 'R:D23':'DATA_B_3V3',
};
for (let i = 0; i < 15; i++) {
  pad('U1', `L${i + 1}-${leftNames[i]}`, espX[0], espY0 + i * espPitch,
    espNets[`L:${leftNames[i]}`] || 'NC', { shape: i === 0 ? 'square' : 'round' });
  pad('U1', `R${i + 1}-${rightNames[i]}`, espX[1], espY0 + i * espPitch,
    espNets[`R:${rightNames[i]}`] || 'NC', { shape: i === 0 ? 'square' : 'round' });
}
for (const x of [32.35, 55.65]) for (const y of [9.76, 56.56]) hole('U1-MOUNT', x, y, 3.2);

// SN74AHCT125N, DIP-14. Pin 1 is the square pad.
const dipLeftX = 73.19, dipRightX = 80.81, dipY0 = 18.0, dipPitch = 2.54;
const u4 = {
  1:['GND',dipLeftX,dipY0], 2:['DATA_A_3V3',dipLeftX,dipY0+dipPitch],
  3:['DATA_A_BUF',dipLeftX,dipY0+2*dipPitch], 4:['GND',dipLeftX,dipY0+3*dipPitch],
  5:['CLOCK_A_3V3',dipLeftX,dipY0+4*dipPitch], 6:['CLOCK_A_BUF',dipLeftX,dipY0+5*dipPitch],
  7:['GND',dipLeftX,dipY0+6*dipPitch], 8:['DATA_B_BUF',dipRightX,dipY0+6*dipPitch],
  9:['DATA_B_3V3',dipRightX,dipY0+5*dipPitch], 10:['GND',dipRightX,dipY0+4*dipPitch],
  11:['CLOCK_B_BUF',dipRightX,dipY0+3*dipPitch], 12:['CLOCK_B_3V3',dipRightX,dipY0+2*dipPitch],
  13:['GND',dipRightX,dipY0+dipPitch], 14:['5V',dipRightX,dipY0],
};
for (let pin = 1; pin <= 14; pin++) {
  pad('U4', pin, u4[pin][1], u4[pin][2], u4[pin][0], { shape: pin === 1 ? 'square' : 'round' });
}

// MP1584 is wired to four large pads. This avoids assuming the hole spacing of
// a particular module clone; the module must be strapped to the carrier.
pad('U2-MP1584', 'IN-', 7, 60, 'GND', { shape:'square', drill:1.3, diameter:3.4 });
pad('U2-MP1584', 'IN+', 20, 60, 'VBAT', { drill:1.3, diameter:3.4 });
pad('U2-MP1584', 'OUT-', 7, 44, 'GND', { drill:1.3, diameter:3.4 });
pad('U2-MP1584', 'OUT+', 20, 44, '5V', { drill:1.3, diameter:3.4 });

function header(ref, x, ys, nets) {
  nets.forEach((net, i) => pad(ref, i + 1, x, ys[i], net, { shape: i === 0 ? 'square' : 'round' }));
}
header('J_A', 105, [10,12.54,15.08,17.62], ['5V','GND','DATA_A','CLOCK_A']);
header('J_B', 105, [51.5,54.04,56.58,59.12], ['5V','GND','DATA_B','CLOCK_B']);
header('J_HALL', 67, [62,64.54,67.08], ['GND','3V3','HALL']);

// Six-channel slip ring: two raw supply conductors, two returns, ESC PWM, spare.
[7,9.54,12.08,14.62,17.16,19.70].forEach((x, i) =>
  pad('J_RING', i + 1, x, 67, ['VBAT','VBAT','GND','GND','ESC_PWM','SPARE'][i],
    { shape: i === 0 ? 'square' : 'round' }));

function resistor(ref, x1, y1, x2, y2, net1, net2) {
  pad(ref, 1, x1, y1, net1); pad(ref, 2, x2, y2, net2);
}
resistor('R1',61.38,23.08,69,23.08,'DATA_A','DATA_A_BUF');
resistor('R2',61.38,30.70,69,30.70,'CLOCK_A','CLOCK_A_BUF');
resistor('R3',87,38.32,94.62,38.32,'DATA_B_BUF','DATA_B');
resistor('R4',87,45.94,94.62,45.94,'CLOCK_B_BUF','CLOCK_B');
resistor('R5',24,61.5,31.62,61.5,'ESC_PWM_3V3','ESC_PWM');
resistor('R6',59.5,59,67.12,59,'3V3','HALL');

// Decoupling: C3 must be mounted directly beside U4 pins 14/7.
pad('C3',1,84,18,'5V'); pad('C3',2,84,21,'GND');
pad('C4',1,100,8,'5V',{drill:1.0,diameter:2.8}); pad('C4',2,100,12,'GND',{drill:1.0,diameter:2.8});
pad('C5',1,100,50,'5V',{drill:1.0,diameter:2.8}); pad('C5',2,100,54,'GND',{drill:1.0,diameter:2.8});

// Carrier attachment holes. These do NOT define the motor/hub interface.
for (const [x,y] of [[3.5,3.5],[106.5,3.5],[3.5,66.5],[106.5,66.5]]) hole('CARRIER-M3',x,y,3.2);

// Bottom copper. Logic tracks are 0.8 mm for reliable home etching.
trace('VBAT', 2.5, [[7,67],[7,62],[20,62],[20,60]]);
trace('VBAT', 2.5, [[9.54,67],[9.54,62]]);
trace('5V', 3.0, [[20,44],[20,7],[31.2375,7],[31.2375,17.36]]);
trace('5V', 3.0, [[31.2375,7],[98.5,7],[98.5,10],[105,10]]);
trace('5V', 3.0, [[80.81,18],[84,18],[84,7]]);
trace('5V', 3.0, [[98.5,7],[100,8]]);
trace('5V', 3.0, [[98.5,7],[98.5,48],[100,50],[105,51.5]]);

trace('DATA_A_BUF',0.8,[[73.19,23.08],[69,23.08]]);
trace('CLOCK_A_BUF',0.8,[[73.19,30.70],[69,30.70]]);
trace('DATA_B_BUF',0.8,[[80.81,33.24],[82.5,33.24],[82.5,38.32],[87,38.32]]);

// Four insulated component-side links complete the LED outputs without a second copper layer.
link('W1','DATA_A',[61.38,23.08],[105,15.08]);
link('W2','CLOCK_A',[61.38,30.70],[105,17.62]);
link('W3','DATA_B',[94.62,38.32],[105,56.58]);
link('W4','CLOCK_B',[94.62,45.94],[105,59.12]);
link('W4A','CLOCK_B_BUF',[80.81,25.62],[87,45.94]);
link('W5','DATA_A_3V3',[56.7625,37.52],[73.19,20.54]);
link('W6','CLOCK_A_3V3',[56.7625,40.04],[73.19,28.16]);
link('W7','DATA_B_3V3',[56.7625,52.64],[80.81,30.70]);
link('W8','CLOCK_B_3V3',[56.7625,50.12],[80.81,23.08]);
link('W9','3V3',[56.7625,17.36],[59.5,59]);
link('W10','HALL',[31.2375,29.96],[67.12,59]);

trace('3V3',0.8,[[59.5,59],[59.5,64.54],[67,64.54]]);
trace('HALL',0.8,[[67.12,59],[70,59],[70,67.08],[67,67.08]]);
trace('ESC_PWM_3V3',0.8,[[31.2375,35.00],[24,35],[24,61.5]]);
trace('ESC_PWM',0.8,[[31.62,61.5],[33.5,61.5],[33.5,65],[17.16,65],[17.16,67]]);

// U4 decoupling feed; all GND pads connect to the ground plane.
trace('5V',1.2,[[80.81,18],[84,18]]);

const CLEARANCE = 0.40;
function pointSegmentDistance(p,a,b){
  const vx=b[0]-a[0],vy=b[1]-a[1],wx=p[0]-a[0],wy=p[1]-a[1];
  const c1=vx*wx+vy*wy;if(c1<=0)return Math.hypot(p[0]-a[0],p[1]-a[1]);
  const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(p[0]-b[0],p[1]-b[1]);
  const t=c1/c2,q=[a[0]+t*vx,a[1]+t*vy];return Math.hypot(p[0]-q[0],p[1]-q[1]);
}
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function intersects(a,b,c,d){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return o1*o2<0&&o3*o4<0;}
function segmentDistance(a,b,c,d){if(intersects(a,b,c,d))return 0;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));}

const violations=[];
for(let i=0;i<pads.length;i++)for(let j=i+1;j<pads.length;j++){
  const a=pads[i],b=pads[j];if(a.net===b.net||a.net==='NC'||b.net==='NC')continue;
  const need=a.diameter/2+b.diameter/2+CLEARANCE;
  if(Math.hypot(a.x-b.x,a.y-b.y)<need-1e-6)violations.push(`pad ${a.ref}.${a.pin}/${a.net} too close to ${b.ref}.${b.pin}/${b.net}`);
}
for(const t of traces)for(let s=1;s<t.points.length;s++)for(const p of pads){
  if(p.net===t.net||p.net==='NC'||p.net==='GND')continue;
  const need=t.width/2+p.diameter/2+CLEARANCE;
  if(pointSegmentDistance([p.x,p.y],t.points[s-1],t.points[s])<need-1e-6)violations.push(`${t.net} too close to ${p.ref}.${p.pin}/${p.net}`);
}
for(let i=0;i<traces.length;i++)for(let j=i+1;j<traces.length;j++){
  const a=traces[i],b=traces[j];if(a.net===b.net)continue;
  const need=(a.width+b.width)/2+CLEARANCE;
  for(let ai=1;ai<a.points.length;ai++)for(let bi=1;bi<b.points.length;bi++)
    if(segmentDistance(a.points[ai-1],a.points[ai],b.points[bi-1],b.points[bi])<need-1e-6)violations.push(`${a.net} too close to ${b.net}`);
}
if(violations.length)throw new Error(`Geometry validation failed:\n${[...new Set(violations)].join('\n')}`);

// Electrical connectivity, including the explicitly documented insulated links.
const conductors=[...traces.map(t=>({...t,kind:'trace'})),...links.map(w=>({net:w.net,points:[w.from,w.to],width:0.4,kind:'link'}))];
const nodes=[...pads.map(p=>({kind:'pad',net:p.net,p})),...conductors.map(t=>({kind:t.kind,net:t.net,t}))];
const parent=nodes.map((_,i)=>i);
function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
function unite(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a;}
function conductorTouches(a,b){for(let i=1;i<a.points.length;i++)for(let j=1;j<b.points.length;j++)if(segmentDistance(a.points[i-1],a.points[i],b.points[j-1],b.points[j])<=(a.width+b.width)/2+1e-6)return true;return false;}
function padTouches(p,t){for(let i=1;i<t.points.length;i++)if(pointSegmentDistance([p.x,p.y],t.points[i-1],t.points[i])<=p.diameter/2+t.width/2+1e-6)return true;return false;}
for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  if(nodes[i].net!==nodes[j].net||nodes[i].net==='NC')continue;
  if(nodes[i].net==='GND'){unite(i,j);continue;}
  let touch=false;
  if(nodes[i].kind==='pad'&&nodes[j].kind==='pad')touch=Math.hypot(nodes[i].p.x-nodes[j].p.x,nodes[i].p.y-nodes[j].p.y)<=(nodes[i].p.diameter+nodes[j].p.diameter)/2+1e-6;
  else if(nodes[i].kind==='pad')touch=padTouches(nodes[i].p,nodes[j].t);
  else if(nodes[j].kind==='pad')touch=padTouches(nodes[j].p,nodes[i].t);
  else touch=conductorTouches(nodes[i].t,nodes[j].t);
  if(touch)unite(i,j);
}
const disconnected=[];
for(const net of [...new Set(pads.map(p=>p.net))].filter(n=>n!=='NC'&&n!=='GND')){
  const ids=nodes.map((n,i)=>n.kind==='pad'&&n.net===net?i:-1).filter(i=>i>=0);
  if(ids.length>1&&new Set(ids.map(find)).size!==1)disconnected.push(net);
}
if(disconnected.length)throw new Error(`Connectivity validation failed: ${disconnected.join(', ')}`);

function fmt(v){return Math.round(v*1e6).toString().padStart(10,'0');}
function xy(x,y){return `X${fmt(x)}Y${fmt(y)}`;}
function headerGerber(title){return [`G04 ${title}*`,`%FSLAX46Y46*%`,`%MOMM*%`,`%IPPOS*%`,`%LPD*%`,`G01*`];}
function aperture(lines,code,spec){lines.push(`%ADD${code}${spec}*%`);}
function flash(lines,code,x,y){lines.push(`D${code}*`,`${xy(x,y)}D03*`);}
function draw(lines,code,points){lines.push(`D${code}*`,`${xy(points[0][0],points[0][1])}D02*`);for(let i=1;i<points.length;i++)lines.push(`${xy(points[i][0],points[i][1])}D01*`);}
function write(file,lines){fs.writeFileSync(path.join(OUT,file),lines.join('\n')+'\n');}

function bottomCopper(){
  const lines=headerGerber('BOTTOM COPPER - SINGLE SIDED HOME ETCH');
  aperture(lines,10,'C,2.000');aperture(lines,11,'R,2.000X2.000');aperture(lines,12,'C,3.400');
  aperture(lines,13,'C,0.800');aperture(lines,14,'C,1.200');aperture(lines,15,'C,2.500');aperture(lines,16,'C,3.000');
  aperture(lines,17,'C,3.800');aperture(lines,18,'C,4.200');
  // Ground plane first, then clear every non-ground feature, then redraw copper.
  lines.push('%LPD*%','G36*',`${xy(0.8,0.8)}D02*`,`${xy(109.2,0.8)}D01*`,`${xy(109.2,69.2)}D01*`,`${xy(0.8,69.2)}D01*`,`${xy(0.8,0.8)}D01*`,'G37*','%LPC*%');
  for(const p of pads.filter(p=>p.net!=='GND'))flash(lines,p.diameter>=3?17:18,p.x,p.y);
  for(const h of holes)flash(lines,18,h.x,h.y);
  for(const t of traces)draw(lines,t.width>=2.5?18:17,t.points);
  lines.push('%LPD*%');
  for(const p of pads)flash(lines,p.diameter>=3?12:(p.shape==='square'?11:10),p.x,p.y);
  for(const t of traces)draw(lines,t.width>=2.5?16:(t.width>=1?14:13),t.points);
  lines.push('M02*');return lines;
}
write(`${NAME}.GBL`,bottomCopper());

function edge(){const l=headerGerber('BOARD OUTLINE');aperture(l,10,'C,0.2');draw(l,10,[[0,0],[110,0],[110,70],[0,70],[0,0]]);l.push('M02*');return l;}
write(`${NAME}.GKO`,edge());

function drillFile(){
  const items=[...pads.map(p=>({x:p.x,y:p.y,drill:p.drill})),...holes];const groups=new Map();
  for(const h of items){const k=h.drill.toFixed(2);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(h);}
  const sizes=[...groups.keys()].sort((a,b)=>+a-+b),lines=['M48','; ALL HOLES ARE NON-PLATED FOR HOME ETCH','METRIC,LZ'];
  sizes.forEach((s,i)=>lines.push(`T${String(i+1).padStart(2,'0')}C${s}`));lines.push('%','G90','M71');
  sizes.forEach((s,i)=>{lines.push(`T${String(i+1).padStart(2,'0')}`);for(const h of groups.get(s))lines.push(`X${h.x.toFixed(3)}Y${h.y.toFixed(3)}`);});
  lines.push('M30');return lines;
}
write(`${NAME}-NPTH.drl`,drillFile());

// 1:1 printable SVG: black = copper to retain. Already mirrored for transfer to B.Cu.
function svgPrint(mirrored){
  const sx=x=>mirrored?board.width-x:x;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${board.width}mm" height="${board.height}mm" viewBox="0 0 ${board.width} ${board.height}">\n`;
  s+=`<rect width="${board.width}" height="${board.height}" fill="white"/>\n`;
  s+=`<rect x="0.8" y="0.8" width="${board.width-1.6}" height="${board.height-1.6}" fill="black"/>\n`;
  // Clearances are painted white over the plane, then the wanted copper is redrawn in black.
  s+=`<g fill="white" stroke="white" stroke-linecap="round" stroke-linejoin="round">\n`;
  for(const t of traces)s+=`<polyline points="${t.points.map(([x,y])=>`${sx(x)},${y}`).join(' ')}" fill="none" stroke-width="${t.width+2*CLEARANCE}"/>\n`;
  for(const p of pads.filter(p=>p.net!=='GND'))s+=`<circle cx="${sx(p.x)}" cy="${p.y}" r="${p.diameter/2+CLEARANCE}"/>\n`;
  for(const h of holes)s+=`<circle cx="${sx(h.x)}" cy="${h.y}" r="${h.drill/2+CLEARANCE}"/>\n`;
  s+=`</g><g fill="black" stroke="black" stroke-linecap="round" stroke-linejoin="round">\n`;
  for(const t of traces)s+=`<polyline points="${t.points.map(([x,y])=>`${sx(x)},${y}`).join(' ')}" fill="none" stroke-width="${t.width}"/>\n`;
  for(const p of pads){const x=sx(p.x);s+=p.shape==='square'?`<rect x="${x-p.diameter/2}" y="${p.y-p.diameter/2}" width="${p.diameter}" height="${p.diameter}"/>\n`:`<circle cx="${x}" cy="${p.y}" r="${p.diameter/2}"/>\n`;}
  s+=`</g><g fill="white">\n`;
  for(const p of pads)s+=`<circle cx="${sx(p.x)}" cy="${p.y}" r="${p.drill/2}"/>\n`;
  for(const h of holes)s+=`<circle cx="${sx(h.x)}" cy="${h.y}" r="${h.drill/2}"/>\n`;
  s+=`</g><rect x="0.15" y="0.15" width="${board.width-0.3}" height="${board.height-0.3}" fill="none" stroke="black" stroke-width="0.3"/></svg>\n`;
  return s;
}
fs.writeFileSync(path.join(OUT,`${NAME}-bottom-mirrored-1to1.svg`),svgPrint(true));

function preview(){
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="330mm" height="210mm" viewBox="-2 -2 114 74"><rect width="110" height="70" fill="#edf4ed" stroke="#111" stroke-width="0.3"/>\n`;
  for(const t of traces)s+=`<polyline points="${t.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#2366cf" stroke-width="${t.width}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  for(const p of pads)s+=`<circle cx="${p.x}" cy="${p.y}" r="${p.diameter/2}" fill="${p.net==='GND'?'#5b7':'#d4af00'}"/><circle cx="${p.x}" cy="${p.y}" r="${p.drill/2}" fill="white"><title>${p.ref}.${p.pin} ${p.net}</title></circle>\n`;
  for(const h of holes)s+=`<circle cx="${h.x}" cy="${h.y}" r="${h.drill/2}" fill="white" stroke="#222" stroke-width="0.3"/>\n`;
  for(const w of links)s+=`<line x1="${w.from[0]}" y1="${w.from[1]}" x2="${w.to[0]}" y2="${w.to[1]}" stroke="#c33" stroke-width="0.5" stroke-dasharray="2 1"><title>${w.ref} ${w.net} insulated top wire</title></line>\n`;
  s+=`<g font-family="Arial" font-size="2" fill="#111"><text x="29" y="6">ESP32 REV B</text><text x="70" y="15">SN74AHCT125</text><text x="5" y="42">MP1584 WIRED</text><text x="86" y="67">B.Cu ONLY + W1...W4</text><text x="42" y="68">USB</text></g></svg>\n`;return s;
}
fs.writeFileSync(path.join(OUT,`${NAME}-preview.svg`),preview());

// Dependency-free BMP preview for visual inspection in the desktop app.
const scale=10,margin=20,bmpW=board.width*scale+2*margin,bmpH=board.height*scale+2*margin;
const rgb=Buffer.alloc(bmpW*bmpH*3,245);
function pixel(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=bmpW||y>=bmpH)return;const i=(y*bmpW+x)*3;rgb[i]=c[0];rgb[i+1]=c[1];rgb[i+2]=c[2];}
function mm([x,y]){return [margin+x*scale,margin+(board.height-y)*scale];}
function disc(x,y,r,c){for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r)pixel(xx,yy,c);}
function rasterLine(a,b,w,c){const [x0,y0]=mm(a),[x1,y1]=mm(b),steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=steps;i++){const q=i/steps;disc(x0+(x1-x0)*q,y0+(y1-y0)*q,w*scale/2,c);}}
for(let y=margin;y<margin+board.height*scale;y++)for(let x=margin;x<margin+board.width*scale;x++)pixel(x,y,[232,240,232]);
for(const t of traces)for(let i=1;i<t.points.length;i++)rasterLine(t.points[i-1],t.points[i],t.width,[35,95,210]);
for(const w of links){for(let i=0;i<20;i+=2){const a=i/20,b=Math.min(1,(i+1)/20);rasterLine([w.from[0]+(w.to[0]-w.from[0])*a,w.from[1]+(w.to[1]-w.from[1])*a],[w.from[0]+(w.to[0]-w.from[0])*b,w.from[1]+(w.to[1]-w.from[1])*b],0.35,[210,50,45]);}}
for(const p of pads){const [x,y]=mm([p.x,p.y]);disc(x,y,p.diameter*scale/2,p.net==='GND'?[75,160,100]:[216,180,0]);disc(x,y,p.drill*scale/2,[255,255,255]);}
for(const h of holes){const [x,y]=mm([h.x,h.y]);disc(x,y,h.drill*scale/2,[255,255,255]);}
const rowBytes=Math.ceil((bmpW*3)/4)*4,imageBytes=rowBytes*bmpH,bmp=Buffer.alloc(54+imageBytes);
bmp.write('BM',0);bmp.writeUInt32LE(54+imageBytes,2);bmp.writeUInt32LE(54,10);bmp.writeUInt32LE(40,14);bmp.writeInt32LE(bmpW,18);bmp.writeInt32LE(bmpH,22);bmp.writeUInt16LE(1,26);bmp.writeUInt16LE(24,28);bmp.writeUInt32LE(imageBytes,34);
for(let y=0;y<bmpH;y++)for(let x=0;x<bmpW;x++){const src=((bmpH-1-y)*bmpW+x)*3,dst=54+y*rowBytes+x*3;bmp[dst]=rgb[src+2];bmp[dst+1]=rgb[src+1];bmp[dst+2]=rgb[src];}
fs.writeFileSync(path.join(OUT,`${NAME}-preview.bmp`),bmp);

const etchRgb=Buffer.alloc(bmpW*bmpH*3,255);
function epixel(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=bmpW||y>=bmpH)return;const i=(y*bmpW+x)*3;etchRgb[i]=c[0];etchRgb[i+1]=c[1];etchRgb[i+2]=c[2];}
function emm([x,y]){return [margin+(board.width-x)*scale,margin+(board.height-y)*scale];}
function edisc(x,y,r,c){for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r)epixel(xx,yy,c);}
function eline(a,b,w,c){const [x0,y0]=emm(a),[x1,y1]=emm(b),steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=steps;i++){const q=i/steps;edisc(x0+(x1-x0)*q,y0+(y1-y0)*q,w*scale/2,c);}}
for(let y=margin+8;y<margin+(board.height-0.8)*scale;y++)for(let x=margin+8;x<margin+(board.width-0.8)*scale;x++)epixel(x,y,[0,0,0]);
for(const t of traces)for(let i=1;i<t.points.length;i++)eline(t.points[i-1],t.points[i],t.width+2*CLEARANCE,[255,255,255]);
for(const p of pads.filter(p=>p.net!=='GND')){const [x,y]=emm([p.x,p.y]);edisc(x,y,(p.diameter/2+CLEARANCE)*scale,[255,255,255]);}
for(const h of holes){const [x,y]=emm([h.x,h.y]);edisc(x,y,(h.drill/2+CLEARANCE)*scale,[255,255,255]);}
for(const t of traces)for(let i=1;i<t.points.length;i++)eline(t.points[i-1],t.points[i],t.width,[0,0,0]);
for(const p of pads){const [x,y]=emm([p.x,p.y]);edisc(x,y,p.diameter*scale/2,[0,0,0]);edisc(x,y,p.drill*scale/2,[255,255,255]);}
for(const h of holes){const [x,y]=emm([h.x,h.y]);edisc(x,y,h.drill*scale/2,[255,255,255]);}
const etchBmp=Buffer.from(bmp);
for(let y=0;y<bmpH;y++)for(let x=0;x<bmpW;x++){const src=((bmpH-1-y)*bmpW+x)*3,dst=54+y*rowBytes+x*3;etchBmp[dst]=etchRgb[src+2];etchBmp[dst+1]=etchRgb[src+1];etchBmp[dst+2]=etchRgb[src];}
fs.writeFileSync(path.join(OUT,`${NAME}-bottom-mirrored-preview.bmp`),etchBmp);

const rows=['ref,pin,x_mm,y_mm,net,drill_mm,pad_mm'];
for(const p of pads)rows.push([p.ref,p.pin,p.x.toFixed(4),p.y.toFixed(4),p.net,p.drill.toFixed(2),p.diameter.toFixed(2)].join(','));
fs.writeFileSync(path.join(OUT,'pad-map.csv'),rows.join('\n')+'\n');

const manifest={
  board_mm:[board.width,board.height],copper_layers:1,copper_side:'bottom',home_etch:true,
  min_track_mm:0.8,min_clearance_mm:CLEARANCE,power_track_mm:3.0,
  plated_holes:false,component_side:'top',wire_links:links,
  esp32_footprint:'Rev B physically confirmed; 2.52 mm header pitch',
  mechanical_status:'electrical rotor carrier only; hub interface, retention and dynamic balance not qualified',
};
fs.writeFileSync(path.join(OUT,'manufacturing.json'),JSON.stringify(manifest,null,2)+'\n');

console.log(`Generated ${NAME}: ${pads.length} pads, ${traces.length} bottom traces, ${links.length} insulated top links.`);
console.log(`Output: ${OUT}`);

module.exports={board,pads,holes,traces,links};
