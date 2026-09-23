const fs = require('fs');
const path = require('path');
const { board, pads, holes, traces, links } = require('./generate-rotor-home-etch.js');

const NAME='rotor-controller-rev-b-home-etch';
const OUT=path.join(__dirname,'easyeda-pro');
const FILE=path.join(OUT,`${NAME}.kicad_pcb`);
fs.mkdirSync(OUT,{recursive:true});

const q=v=>`"${String(v).replaceAll('"','\\"')}"`;
const f=v=>Number(v.toFixed(4));
const nets=[...new Set(pads.map(p=>p.net).filter(n=>n&&n!=='NC'))].sort();
const netId=new Map(nets.map((n,i)=>[n,i+1]));
const groups=new Map();
for(const p of pads){if(!groups.has(p.ref))groups.set(p.ref,[]);groups.get(p.ref).push(p);}

const out=['(kicad_pcb (version 20231120) (generator pcbnew)','  (general (thickness 1.6))','  (paper "A4")','  (layers','    (0 "F.Cu" signal)','    (31 "B.Cu" signal)','    (37 "F.SilkS" user "f.silkscreen")','    (44 "Edge.Cuts" user)','  )','  (setup (pad_to_mask_clearance 0))','  (net 0 "")'];
for(const n of nets)out.push(`  (net ${netId.get(n)} ${q(n)})`);

for(const [ref,ps] of groups){
  const cx=ps.reduce((s,p)=>s+p.x,0)/ps.length,cy=ps.reduce((s,p)=>s+p.y,0)/ps.length;
  out.push(`  (footprint ${q(`POV:${ref}`)} (layer "F.Cu") (at ${f(cx)} ${f(cy)})`);
  out.push(`    (property "Reference" ${q(ref)} (at 0 -2 0) (layer "F.SilkS"))`);
  out.push(`    (property "Value" ${q(ref)} (at 0 2 0) (layer "F.Fab") hide)`);
  for(const p of ps){
    const shape=p.shape==='square'?'rect':'circle',net=p.net==='NC'?'':` (net ${netId.get(p.net)} ${q(p.net)})`;
    out.push(`    (pad ${q(p.pin)} thru_hole ${shape} (at ${f(p.x-cx)} ${f(p.y-cy)}) (size ${p.diameter} ${p.diameter}) (drill ${p.drill}) (layers "*.Cu" "*.Mask")${net})`);
  }
  out.push('  )');
}
for(const h of holes){
  out.push(`  (footprint ${q(`MountingHole:${h.ref}`)} (layer "F.Cu") (at ${h.x} ${h.y})`);
  out.push(`    (property "Reference" ${q(h.ref)} (at 0 -3 0) (layer "F.SilkS") hide)`);
  out.push(`    (property "Value" ${q(`NPTH ${h.drill}mm`)} (at 0 3 0) (layer "F.Fab") hide)`);
  out.push(`    (pad "" np_thru_hole circle (at 0 0) (size ${h.drill} ${h.drill}) (drill ${h.drill}) (layers "*.Cu" "*.Mask"))`,'  )');
}
for(const t of traces)for(let i=1;i<t.points.length;i++)out.push(`  (segment (start ${t.points[i-1][0]} ${t.points[i-1][1]}) (end ${t.points[i][0]} ${t.points[i][1]}) (width ${t.width}) (layer "B.Cu") (net ${netId.get(t.net)}))`);

for(const w of links){
  out.push(`  (gr_line (start ${w.from[0]} ${w.from[1]}) (end ${w.to[0]} ${w.to[1]}) (stroke (width 0.35) (type dash)) (layer "F.SilkS"))`);
  out.push(`  (gr_text ${q(`${w.ref} ${w.net}`)} (at ${(w.from[0]+w.to[0])/2} ${(w.from[1]+w.to[1])/2}) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))`);
}
const edge=[[0,0],[board.width,0],[board.width,board.height],[0,board.height],[0,0]];
for(let i=1;i<edge.length;i++)out.push(`  (gr_line (start ${edge[i-1][0]} ${edge[i-1][1]}) (end ${edge[i][0]} ${edge[i][1]}) (stroke (width 0.2) (type default)) (layer "Edge.Cuts"))`);
out.push('  (gr_rect (start 29.75 7.1) (end 58.25 58.7) (stroke (width 0.2) (type default)) (fill none) (layer "F.SilkS"))');
out.push('  (gr_rect (start 71.8 16.7) (end 82.2 35.1) (stroke (width 0.2) (type default)) (fill none) (layer "F.SilkS"))');
out.push('  (gr_rect (start 4.5 40.5) (end 22.5 63.5) (stroke (width 0.2) (type default)) (fill none) (layer "F.SilkS"))');
out.push('  (gr_text "SINGLE-SIDED B.Cu / TOP WIRE LINKS" (at 80 4) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.18))))');
out.push('  (gr_text "USB" (at 44 61) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.18))))');

const gnd=netId.get('GND');
out.push(`  (zone (net ${gnd}) (net_name "GND") (layer "B.Cu") (hatch edge 0.5)`);
out.push('    (connect_pads (clearance 0.4)) (min_thickness 0.25) (fill yes (thermal_gap 0.4) (thermal_bridge_width 0.5))');
out.push(`    (polygon (pts (xy 0.8 0.8) (xy ${board.width-0.8} 0.8) (xy ${board.width-0.8} ${board.height-0.8}) (xy 0.8 ${board.height-0.8})))`,'  )',')');

fs.writeFileSync(FILE,out.join('\n')+'\n');
console.log(`Generated EasyEDA Pro/KiCad source: ${FILE}`);
