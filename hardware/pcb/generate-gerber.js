const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'gerber', 'rotor-controller-rev-a');
fs.mkdirSync(OUT, { recursive: true });

const board = { width: 88, height: 64, revision: 'A', date: '2026-09-23' };
const pads = [];
const holes = [];
const traces = [];

function pad(ref, pin, x, y, net, shape = 'round', drill = 1.1, diameter = 2.0) {
  pads.push({ ref, pin: String(pin), x, y, net, shape, drill, diameter });
}
function hole(ref, x, y, drill) { holes.push({ ref, x, y, drill }); }
function trace(net, layer, width, points) { traces.push({ net, layer, width, points }); }

// ESP32 DevKit V1 30-pin, confirmed asymmetric Rev B footprint.
const espX = [10.2375, 35.7625];
const espY0 = 16.185;
const espPitch = 2.52;
const leftNames = ['VIN','GND','D13','D12','D14','D27','D26','D25','D33','D32','D35','D34','VN','VP','EN'];
const rightNames = ['3V3','GND','D15','D2','D4','RX2','TX2','D5','D18','D19','D21','RX0','TX0','D22','D23'];
const espNets = {
  'L:VIN':'5V', 'L:GND':'GND', 'L:D27':'HALL', 'L:D25':'ESC_PWM_3V3',
  'R:3V3':'3V3', 'R:GND':'GND', 'R:D18':'DATA_A_3V3', 'R:D19':'CLOCK_A_3V3',
  'R:D22':'CLOCK_B_3V3', 'R:D23':'DATA_B_3V3'
};
for (let i = 0; i < 15; i++) {
  pad('U1', `L${i + 1}-${leftNames[i]}`, espX[0], espY0 + i * espPitch, espNets[`L:${leftNames[i]}`] || 'NC', i === 0 ? 'square' : 'round');
  pad('U1', `R${i + 1}-${rightNames[i]}`, espX[1], espY0 + i * espPitch, espNets[`R:${rightNames[i]}`] || 'NC', i === 0 ? 'square' : 'round');
}
for (const x of [11.35, 34.65]) for (const y of [8.6, 55.4]) hole('U1-MOUNT', x, y, 3.2);

// SN74AHCT125N, DIP-14, 7.62 mm row spacing.
const dipLeftX = 48.19, dipRightX = 55.81, dipY0 = 22, dipPitch = 2.54;
const u4 = {
  1:['GND',dipLeftX,dipY0], 2:['DATA_A_3V3',dipLeftX,dipY0+dipPitch],
  3:['DATA_A_BUF',dipLeftX,dipY0+2*dipPitch], 4:['GND',dipLeftX,dipY0+3*dipPitch],
  5:['CLOCK_A_3V3',dipLeftX,dipY0+4*dipPitch], 6:['CLOCK_A_BUF',dipLeftX,dipY0+5*dipPitch],
  7:['GND',dipLeftX,dipY0+6*dipPitch], 8:['DATA_B_BUF',dipRightX,dipY0+6*dipPitch],
  9:['DATA_B_3V3',dipRightX,dipY0+5*dipPitch], 10:['GND',dipRightX,dipY0+4*dipPitch],
  11:['CLOCK_B_BUF',dipRightX,dipY0+3*dipPitch], 12:['CLOCK_B_3V3',dipRightX,dipY0+2*dipPitch],
  13:['GND',dipRightX,dipY0+dipPitch], 14:['5V',dipRightX,dipY0]
};
for (let pin = 1; pin <= 14; pin++) pad('U4', pin, u4[pin][1], u4[pin][2], u4[pin][0], pin === 1 ? 'square' : 'round');

function header(ref, x, ys, entries) {
  entries.forEach((entry, i) => pad(ref, i + 1, x, ys[i], entry, i === 0 ? 'square' : 'round'));
}
header('J_A', 84, [18,20.54,23.08,25.62], ['5V','GND','DATA_A','CLOCK_A']);
header('J_B', 84, [38,40.54,43.08,45.62], ['5V','GND','DATA_B','CLOCK_B']);
[4,6.54,9.08,11.62,14.16,16.70].forEach((x, i) => pad('J_RING', i + 1, x, 60, ['5V','5V','GND','GND','ESC_PWM','NC'][i], i === 0 ? 'square' : 'round'));
[44,46.54,49.08].forEach((x, i) => pad('J_HALL', i + 1, x, 4.5, ['GND','3V3','HALL'][i], i === 0 ? 'square' : 'round'));

function resistor(ref, x1, y1, x2, y2, net1, net2) {
  pad(ref, 1, x1, y1, net1, 'round'); pad(ref, 2, x2, y2, net2, 'round');
}
resistor('R1',69,14,76.62,14,'DATA_A_BUF','DATA_A');
resistor('R2',69,18,76.62,18,'CLOCK_A_BUF','CLOCK_A');
resistor('R3',69,37,76.62,37,'DATA_B_BUF','DATA_B');
resistor('R4',69,30,76.62,30,'CLOCK_B_BUF','CLOCK_B');
resistor('R5',24,55,31.62,55,'ESC_PWM_3V3','ESC_PWM');
resistor('R6',36,10,43.62,10,'3V3','HALL');

pad('C3',1,58.5,24,'5V'); pad('C3',2,61.04,24,'GND');
pad('C4',1,82,8,'5V','round',1.0,2.2); pad('C4',2,82,13,'GND','round',1.0,2.2);
pad('C5',1,82,50,'5V','round',1.0,2.2); pad('C5',2,82,54,'GND','round',1.0,2.2);
for (const [x,y] of [[4,4],[84,4],[4,56],[84,56]]) hole('PCB-M3',x,y,3.2);

// Top-layer logic. Bottom is principally a ground plane; selected crossings use isolated bottom tracks.
trace('DATA_A_3V3','top',0.35,[[35.7625,36.345],[40,36.345],[40,24.54],[48.19,24.54]]);
trace('CLOCK_A_3V3','top',0.35,[[35.7625,38.865],[42,38.865],[42,32.16],[48.19,32.16]]);
trace('DATA_B_3V3','top',0.35,[[35.7625,51.465],[54,51.465],[54,34.70],[55.81,34.70]]);
pad('V1',1,38,48.945,'CLOCK_B_3V3','round',0.4,0.9);
pad('V2',1,38,18,'CLOCK_B_3V3','round',0.4,0.9);
trace('CLOCK_B_3V3','top',0.35,[[35.7625,48.945],[38,48.945]]);
trace('CLOCK_B_3V3','bottom',0.35,[[38,48.945],[38,18]]);
trace('CLOCK_B_3V3','top',0.35,[[38,18],[64,18],[64,27.08],[55.81,27.08]]);

trace('DATA_A_BUF','bottom',0.35,[[48.19,27.08],[51,27.08],[51,12.5],[69,12.5],[69,14]]);
trace('CLOCK_A_BUF','bottom',0.35,[[48.19,34.70],[45.5,34.70],[45.5,8],[71,8],[71,18],[69,18]]);
trace('DATA_B_BUF','top',0.35,[[55.81,37.24],[61,37.24],[61,37],[69,37]]);
trace('CLOCK_B_BUF','top',0.35,[[55.81,29.62],[63,29.62],[63,30],[69,30]]);

trace('DATA_A','top',0.35,[[76.62,14],[79,14],[79,23.08],[84,23.08]]);
trace('CLOCK_A','bottom',0.35,[[76.62,18],[81.5,18],[81.5,25.62],[84,25.62]]);
trace('DATA_B','top',0.35,[[76.62,37],[79,37],[79,43.08],[84,43.08]]);
trace('CLOCK_B','bottom',0.35,[[76.62,30],[81.5,30],[81.5,45.62],[84,45.62]]);

trace('3V3','top',0.45,[[35.7625,16.185],[40,16.185],[40,7],[46.54,7],[46.54,4.5]]);
trace('3V3','top',0.45,[[40,10],[36,10]]);
trace('HALL','bottom',0.35,[[10.2375,28.785],[32,28.785],[32,8],[43.62,8],[43.62,10],[40,10],[40,2],[52,2],[52,4.5],[49.08,4.5]]);
trace('ESC_PWM_3V3','top',0.35,[[10.2375,33.825],[20,33.825],[20,55],[24,55]]);
trace('ESC_PWM','top',0.35,[[31.62,55],[33,55],[33,60],[14.16,60]]);

// 5 V distribution on bottom, isolated from the ground plane.
trace('5V','bottom',1.20,[[4,60],[6.54,60],[6.54,57.5],[86,57.5],[86,18],[84,18]]);
trace('5V','bottom',1.20,[[86,38],[84,38]]);
trace('5V','bottom',1.20,[[7.5,57.5],[7.5,16.185],[10.2375,16.185]]);
trace('5V','bottom',1.20,[[66,57.5],[66,22],[55.81,22]]);
trace('5V','bottom',1.20,[[55.81,22],[58.5,24]]);
trace('5V','bottom',1.20,[[86,50],[82,50]]);
trace('5V','bottom',1.20,[[86,18],[86,8],[82,8]]);

// Conservative geometry checks. They do not replace a fabricator DRC, but catch shorts in this generated layout.
const CLEARANCE = 0.25;
function pointSegmentDistance(p,a,b){
  const vx=b[0]-a[0], vy=b[1]-a[1], wx=p[0]-a[0], wy=p[1]-a[1];
  const c1=vx*wx+vy*wy;
  if(c1<=0)return Math.hypot(p[0]-a[0],p[1]-a[1]);
  const c2=vx*vx+vy*vy;
  if(c2<=c1)return Math.hypot(p[0]-b[0],p[1]-b[1]);
  const t=c1/c2, q=[a[0]+t*vx,a[1]+t*vy];
  return Math.hypot(p[0]-q[0],p[1]-q[1]);
}
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function intersects(a,b,c,d){
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  return ((o1===0&&pointSegmentDistance(c,a,b)<1e-9)||(o2===0&&pointSegmentDistance(d,a,b)<1e-9)||(o3===0&&pointSegmentDistance(a,c,d)<1e-9)||(o4===0&&pointSegmentDistance(b,c,d)<1e-9)||(o1*o2<0&&o3*o4<0));
}
function segmentDistance(a,b,c,d){if(intersects(a,b,c,d))return 0;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));}
const violations=[];
for(let i=0;i<pads.length;i++)for(let j=i+1;j<pads.length;j++){
  const a=pads[i],b=pads[j]; if(a.net===b.net||a.net==='NC'||b.net==='NC')continue;
  const need=a.diameter/2+b.diameter/2+CLEARANCE;
  if(Math.hypot(a.x-b.x,a.y-b.y)<need-1e-6)violations.push(`pad ${a.ref}.${a.pin}/${a.net} too close to ${b.ref}.${b.pin}/${b.net}`);
}
for(const t of traces)for(let s=1;s<t.points.length;s++)for(const p of pads){
  if(p.net===t.net||p.net==='NC')continue;
  const need=t.width/2+p.diameter/2+CLEARANCE;
  if(pointSegmentDistance([p.x,p.y],t.points[s-1],t.points[s])<need-1e-6)violations.push(`${t.layer} ${t.net} too close to pad ${p.ref}.${p.pin}/${p.net}`);
}
for(let i=0;i<traces.length;i++)for(let j=i+1;j<traces.length;j++){
  const a=traces[i],b=traces[j]; if(a.layer!==b.layer||a.net===b.net)continue;
  const need=(a.width+b.width)/2+CLEARANCE;
  for(let ai=1;ai<a.points.length;ai++)for(let bi=1;bi<b.points.length;bi++)if(segmentDistance(a.points[ai-1],a.points[ai],b.points[bi-1],b.points[bi])<need-1e-6)violations.push(`${a.layer} ${a.net} too close to ${b.net}`);
}
if(violations.length){
  console.error([...new Set(violations)].join('\n'));
  throw new Error(`Geometry validation failed with ${new Set(violations).size} unique violations`);
}

// Connectivity check: every non-ground net with multiple pads must form one copper component.
const nodes=[...pads.map(p=>({kind:'pad',net:p.net,p})),...traces.map(t=>({kind:'trace',net:t.net,t}))];
const parent=nodes.map((_,i)=>i);
function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
function unite(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a;}
function traceTouchesTrace(a,b){for(let i=1;i<a.points.length;i++)for(let j=1;j<b.points.length;j++)if(segmentDistance(a.points[i-1],a.points[i],b.points[j-1],b.points[j])<=(a.width+b.width)/2+1e-6)return true;return false;}
function padTouchesTrace(p,t){for(let i=1;i<t.points.length;i++)if(pointSegmentDistance([p.x,p.y],t.points[i-1],t.points[i])<=p.diameter/2+t.width/2+1e-6)return true;return false;}
for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  if(nodes[i].net!==nodes[j].net||nodes[i].net==='NC'||nodes[i].net==='GND')continue;
  let touch=false;
  if(nodes[i].kind==='pad'&&nodes[j].kind==='pad')touch=Math.hypot(nodes[i].p.x-nodes[j].p.x,nodes[i].p.y-nodes[j].p.y)<=(nodes[i].p.diameter+nodes[j].p.diameter)/2+1e-6;
  else if(nodes[i].kind==='pad')touch=padTouchesTrace(nodes[i].p,nodes[j].t);
  else if(nodes[j].kind==='pad')touch=padTouchesTrace(nodes[j].p,nodes[i].t);
  else touch=traceTouchesTrace(nodes[i].t,nodes[j].t);
  if(touch)unite(i,j);
}
const disconnected=[];
for(const net of [...new Set(pads.map(p=>p.net))].filter(n=>n!=='NC'&&n!=='GND')){
  const ids=nodes.map((n,i)=>n.kind==='pad'&&n.net===net?i:-1).filter(i=>i>=0);
  if(ids.length>1&&new Set(ids.map(find)).size!==1){
    const groups={};for(const id of ids){const root=find(id);(groups[root]??=[]).push(`${nodes[id].p.ref}.${nodes[id].p.pin}`);}
    disconnected.push(`${net} [${Object.values(groups).map(g=>g.join('+')).join(' | ')}]`);
  }
}
if(disconnected.length)throw new Error(`Connectivity validation failed: ${disconnected.join(', ')}`);

function fmt(v) { return Math.round(v * 1e6).toString().padStart(10, '0'); }
function xy(x,y) { return `X${fmt(x)}Y${fmt(y)}`; }
function gerberHeader(name) {
  return [`G04 ${name}*`,`%FSLAX46Y46*%`,`%MOMM*%`,`%IPPOS*%`,`%LPD*%`,`G01*`];
}
function aperture(lines, code, spec) { lines.push(`%ADD${code}${spec}*%`); }
function flash(lines, code, x, y) { lines.push(`D${code}*`,`${xy(x,y)}D03*`); }
function drawTrace(lines, code, points) {
  lines.push(`D${code}*`,`${xy(points[0][0],points[0][1])}D02*`);
  for (let i=1;i<points.length;i++) lines.push(`${xy(points[i][0],points[i][1])}D01*`);
}
function write(name, lines) { fs.writeFileSync(path.join(OUT,name), lines.join('\n')+'\n'); }

function copper(layer) {
  const lines = gerberHeader(`${layer.toUpperCase()} COPPER - POV ROTOR CONTROLLER REV A`);
  aperture(lines,10,'C,2.000'); aperture(lines,11,'R,2.000X2.000');
  aperture(lines,12,'C,0.350'); aperture(lines,13,'C,0.450'); aperture(lines,14,'C,1.200');
  aperture(lines,15,'C,2.800'); aperture(lines,16,'C,0.950'); aperture(lines,17,'C,1.800'); aperture(lines,18,'C,4.400');
  if (layer === 'bottom') {
    lines.push('%LPD*%','G36*',`${xy(0.6,0.6)}D02*`,`${xy(87.4,0.6)}D01*`,`${xy(87.4,63.4)}D01*`,`${xy(0.6,63.4)}D01*`,`${xy(0.6,0.6)}D01*`,'G37*');
    lines.push('%LPC*%');
    for (const p of pads.filter(p=>p.net!=='GND')) flash(lines,15,p.x,p.y);
    for (const h of holes) flash(lines,18,h.x,h.y);
    for (const t of traces.filter(t=>t.layer==='bottom')) drawTrace(lines,t.width>=1?17:16,t.points);
    lines.push('%LPD*%');
  }
  for (const p of pads) flash(lines,p.shape==='square'?11:10,p.x,p.y);
  for (const t of traces.filter(t=>t.layer===layer)) drawTrace(lines,t.width>=1?14:(t.width>=0.4?13:12),t.points);
  lines.push('M02*');
  return lines;
}
write('rotor-controller-rev-a.GTL',copper('top'));
write('rotor-controller-rev-a.GBL',copper('bottom'));

function mask(side) {
  const lines=gerberHeader(`${side.toUpperCase()} SOLDER MASK`); aperture(lines,10,'C,2.500'); aperture(lines,11,'R,2.500X2.500'); aperture(lines,12,'C,4.600');
  for(const p of pads) flash(lines,p.shape==='square'?11:10,p.x,p.y);
  for(const h of holes) flash(lines,12,h.x,h.y);
  lines.push('M02*'); return lines;
}
write('rotor-controller-rev-a.GTS',mask('top'));
write('rotor-controller-rev-a.GBS',mask('bottom'));

function edge() {
  const lines=gerberHeader('BOARD OUTLINE'); aperture(lines,10,'C,0.150');
  drawTrace(lines,10,[[0,0],[88,0],[88,64],[0,64],[0,0]]); lines.push('M02*'); return lines;
}
write('rotor-controller-rev-a.GKO',edge());

function silk() {
  const lines=gerberHeader('TOP SILKSCREEN'); aperture(lines,10,'C,0.200'); aperture(lines,11,'C,0.450'); aperture(lines,12,'C,0.600');
  const boxes=[[[8.75,6.2],[37.25,6.2],[37.25,57.8],[8.75,57.8],[8.75,6.2]],[[47,20.7],[57,20.7],[57,38.6],[47,38.6],[47,20.7]]];
  boxes.forEach(b=>drawTrace(lines,10,b));
  [[84,18],[84,38],[4,60],[44,4.5]].forEach(([x,y])=>flash(lines,12,x,y));
  const font={
    'A':['01110','10001','10001','11111','10001','10001','10001'],
    'B':['11110','10001','10001','11110','10001','10001','11110'],
    'C':['01111','10000','10000','10000','10000','10000','01111'],
    'D':['11110','10001','10001','10001','10001','10001','11110'],
    'E':['11111','10000','10000','11110','10000','10000','11111'],
    'G':['01111','10000','10000','10111','10001','10001','01111'],
    'H':['10001','10001','10001','11111','10001','10001','10001'],
    'I':['11111','00100','00100','00100','00100','00100','11111'],
    'L':['10000','10000','10000','10000','10000','10000','11111'],
    'N':['10001','11001','11001','10101','10011','10011','10001'],
    'O':['01110','10001','10001','10001','10001','10001','01110'],
    'P':['11110','10001','10001','11110','10000','10000','10000'],
    'R':['11110','10001','10001','11110','10100','10010','10001'],
    'S':['01111','10000','10000','01110','00001','00001','11110'],
    'T':['11111','00100','00100','00100','00100','00100','00100'],
    'V':['10001','10001','10001','10001','10001','01010','00100'],
    '2':['01110','10001','00001','00010','00100','01000','11111'],
    '3':['11110','00001','00001','01110','00001','00001','11110'],
    '5':['11111','10000','10000','11110','00001','00001','11110'],
    ' ':['00000','00000','00000','00000','00000','00000','00000']
  };
  function dotText(value,x,y,s){for(let ci=0;ci<value.length;ci++){const glyph=font[value[ci]]||font[' '];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(glyph[r][c]==='1')flash(lines,11,x+(ci*6+c)*s,y-r*s);}}
  dotText('NO SPIN',40,62.5,0.38);
  dotText('ESP32',16,59.5,0.28);
  dotText('AHCT',47,40,0.28);
  dotText('A',80,17,0.28); dotText('B',80,37,0.28);
  dotText('RING',19,62.2,0.25); dotText('HALL',53,5.2,0.25);
  lines.push('M02*'); return lines;
}
write('rotor-controller-rev-a.GTO',silk());

function drillFile(items, label) {
  const groups=new Map();
  items.forEach(h=>{const k=h.drill.toFixed(2);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(h);});
  const sizes=[...groups.keys()].sort((a,b)=>Number(a)-Number(b));
  const lines=['M48',`; POV ROTOR CONTROLLER REV A - ${label}`,'METRIC,LZ'];
  sizes.forEach((s,i)=>lines.push(`T${String(i+1).padStart(2,'0')}C${s}`));
  lines.push('%','G90','M71');
  sizes.forEach((s,i)=>{lines.push(`T${String(i+1).padStart(2,'0')}`);for(const h of groups.get(s))lines.push(`X${h.x.toFixed(3)}Y${h.y.toFixed(3)}`);});
  lines.push('M30'); return lines;
}
write('rotor-controller-rev-a-PTH.drl',drillFile(pads.map(p=>({x:p.x,y:p.y,drill:p.drill})),'PLATED'));
write('rotor-controller-rev-a-NPTH.drl',drillFile(holes,'NON-PLATED'));

const rows=['ref,pin,x_mm,y_mm,net,drill_mm,pad_mm'];
for(const p of pads) rows.push([p.ref,p.pin,p.x.toFixed(4),p.y.toFixed(4),p.net,p.drill.toFixed(2),p.diameter.toFixed(2)].join(','));
fs.writeFileSync(path.join(OUT,'pad-map.csv'),rows.join('\n')+'\n');

const colors={top:'#d33',bottom:'#2865d8',pad:'#d8b400',hole:'#fff',silk:'#222'};
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="264mm" height="192mm" viewBox="-2 -2 92 68">\n<rect x="0" y="0" width="88" height="64" fill="#e8f0e8" stroke="#111" stroke-width="0.3"/>\n`;
for(const t of traces){svg+=`<polyline points="${t.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${t.layer==='top'?colors.top:colors.bottom}" stroke-width="${t.width}" stroke-linecap="round" stroke-linejoin="round" opacity="0.82"/>\n`;}
for(const p of pads){svg+=`<circle cx="${p.x}" cy="${p.y}" r="${p.diameter/2}" fill="${colors.pad}" stroke="#555" stroke-width="0.12"/><circle cx="${p.x}" cy="${p.y}" r="${p.drill/2}" fill="${colors.hole}"/><title>${p.ref}.${p.pin} ${p.net}</title>\n`;}
for(const h of holes)svg+=`<circle cx="${h.x}" cy="${h.y}" r="${h.drill/2}" fill="#fff" stroke="#333" stroke-width="0.2"/>\n`;
svg+=`<g font-family="Arial" font-size="1.8" fill="#111"><text x="9" y="6">ESP32 DEVKIT V1 REV B</text><text x="47" y="20">SN74AHCT125N</text><text x="65" y="12">R1</text><text x="65" y="20.5">R2</text><text x="65" y="35">R3</text><text x="65" y="45">R4</text><text x="76" y="17">BLADE A</text><text x="76" y="37">BLADE B</text><text x="2" y="63">RING</text><text x="42" y="3">HALL</text><text x="40" y="61.5" font-weight="bold">BENCH PROTOTYPE - DO NOT SPIN</text></g></svg>`;
fs.writeFileSync(path.join(OUT,'rotor-controller-rev-a-preview.svg'),svg);

// Dependency-free raster preview used for visual QA in environments without a Gerber renderer.
const scale=10, margin=20, bmpW=Math.round(board.width*scale)+2*margin, bmpH=Math.round(board.height*scale)+2*margin;
const rgb=Buffer.alloc(bmpW*bmpH*3,245);
function pixel(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=bmpW||y>=bmpH)return;const i=(y*bmpW+x)*3;rgb[i]=c[0];rgb[i+1]=c[1];rgb[i+2]=c[2];}
function mm(p){return [margin+p[0]*scale,margin+(board.height-p[1])*scale];}
function disc(x,y,r,c){for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r)pixel(xx,yy,c);}
function line(a,b,w,c){const [x0,y0]=mm(a),[x1,y1]=mm(b);const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=steps;i++){const t=i/steps;disc(x0+(x1-x0)*t,y0+(y1-y0)*t,w*scale/2,c);}}
for(let y=margin;y<margin+board.height*scale;y++)for(let x=margin;x<margin+board.width*scale;x++)pixel(x,y,[232,240,232]);
for(const t of traces)for(let i=1;i<t.points.length;i++)line(t.points[i-1],t.points[i],Math.max(t.width,0.3),t.layer==='top'?[210,50,45]:[35,95,210]);
for(const p of pads){const [x,y]=mm([p.x,p.y]);disc(x,y,p.diameter*scale/2,[216,180,0]);disc(x,y,p.drill*scale/2,[255,255,255]);}
for(const h of holes){const [x,y]=mm([h.x,h.y]);disc(x,y,h.drill*scale/2,[255,255,255]);}
for(let x=margin;x<margin+board.width*scale;x++){pixel(x,margin,[20,20,20]);pixel(x,margin+board.height*scale,[20,20,20]);}
for(let y=margin;y<margin+board.height*scale;y++){pixel(margin,y,[20,20,20]);pixel(margin+board.width*scale,y,[20,20,20]);}
const rowBytes=Math.ceil((bmpW*3)/4)*4, imageBytes=rowBytes*bmpH, bmp=Buffer.alloc(54+imageBytes);
bmp.write('BM',0);bmp.writeUInt32LE(54+imageBytes,2);bmp.writeUInt32LE(54,10);bmp.writeUInt32LE(40,14);bmp.writeInt32LE(bmpW,18);bmp.writeInt32LE(bmpH,22);bmp.writeUInt16LE(1,26);bmp.writeUInt16LE(24,28);bmp.writeUInt32LE(imageBytes,34);
for(let y=0;y<bmpH;y++)for(let x=0;x<bmpW;x++){const src=((bmpH-1-y)*bmpW+x)*3,dst=54+y*rowBytes+x*3;bmp[dst]=rgb[src+2];bmp[dst+1]=rgb[src+1];bmp[dst+2]=rgb[src];}
fs.writeFileSync(path.join(OUT,'rotor-controller-rev-a-preview.bmp'),bmp);

const manifest={board_mm:[board.width,board.height],layers:2,material:'FR-4',thickness_mm:1.6,copper_oz:1,finish:'HASL lead-free or ENIG',min_track_mm:0.35,min_clearance_mm:0.30,esp32_footprint:'Rev B confirmed 2026-09-23; 2.52 mm pitch',mechanical_status:'bench prototype; hub interface and dynamic balance not qualified'};
fs.writeFileSync(path.join(OUT,'manufacturing.json'),JSON.stringify(manifest,null,2)+'\n');

console.log(`Generated ${pads.length} plated pads, ${holes.length} NPTH holes and ${traces.length} routed segments in ${OUT}`);
