const fs = require('fs');
const path = require('path');
const { board, pads, holes, traces } = require('./generate-gerber.js');

const OUT = path.join(__dirname, 'easyeda-pro');
const FILE = path.join(OUT, 'rotor-controller-rev-a.kicad_pcb');
fs.mkdirSync(OUT, { recursive: true });

const q = value => `"${String(value).replaceAll('"', '\\"')}"`;
const f = value => Number(value.toFixed(4));
const nets = [...new Set(pads.map(p => p.net).filter(n => n && n !== 'NC'))].sort();
const netId = new Map(nets.map((name, index) => [name, index + 1]));
const groups = new Map();
for (const p of pads) {
  if (!groups.has(p.ref)) groups.set(p.ref, []);
  groups.get(p.ref).push(p);
}

const out = [];
out.push('(kicad_pcb (version 20231120) (generator pcbnew)');
out.push('  (general (thickness 1.6))');
out.push('  (paper "A4")');
out.push('  (layers');
out.push('    (0 "F.Cu" signal)');
out.push('    (31 "B.Cu" signal)');
out.push('    (36 "B.SilkS" user "b.silkscreen")');
out.push('    (37 "F.SilkS" user "f.silkscreen")');
out.push('    (44 "Edge.Cuts" user)');
out.push('  )');
out.push('  (setup (pad_to_mask_clearance 0))');
out.push('  (net 0 "")');
for (const name of nets) out.push(`  (net ${netId.get(name)} ${q(name)})`);

for (const [ref, componentPads] of groups) {
  const cx = componentPads.reduce((s, p) => s + p.x, 0) / componentPads.length;
  const cy = componentPads.reduce((s, p) => s + p.y, 0) / componentPads.length;
  out.push(`  (footprint ${q(`POV:${ref}`)} (layer "F.Cu") (at ${f(cx)} ${f(cy)})`);
  out.push(`    (property "Reference" ${q(ref)} (at 0 -2 0) (layer "F.SilkS"))`);
  out.push(`    (property "Value" ${q(ref)} (at 0 2 0) (layer "F.Fab") hide)`);
  for (const p of componentPads) {
    const shape = p.shape === 'square' ? 'rect' : 'circle';
    const pin = p.pin.replaceAll('"', '');
    const net = p.net === 'NC' ? '' : ` (net ${netId.get(p.net)} ${q(p.net)})`;
    out.push(`    (pad ${q(pin)} thru_hole ${shape} (at ${f(p.x-cx)} ${f(p.y-cy)}) (size ${p.diameter} ${p.diameter}) (drill ${p.drill}) (layers "*.Cu" "*.Mask")${net})`);
  }
  out.push('  )');
}

for (const h of holes) {
  out.push(`  (footprint ${q(`MountingHole:${h.ref}`)} (layer "F.Cu") (at ${h.x} ${h.y})`);
  out.push(`    (property "Reference" ${q(h.ref)} (at 0 -3 0) (layer "F.SilkS") hide)`);
  out.push(`    (property "Value" ${q(`NPTH ${h.drill}mm`)} (at 0 3 0) (layer "F.Fab") hide)`);
  out.push(`    (pad "" np_thru_hole circle (at 0 0) (size ${h.drill} ${h.drill}) (drill ${h.drill}) (layers "*.Cu" "*.Mask"))`);
  out.push('  )');
}

for (const t of traces) {
  const layer = t.layer === 'top' ? 'F.Cu' : 'B.Cu';
  for (let i = 1; i < t.points.length; i++) {
    const a = t.points[i - 1], b = t.points[i];
    out.push(`  (segment (start ${a[0]} ${a[1]}) (end ${b[0]} ${b[1]}) (width ${t.width}) (layer ${q(layer)}) (net ${netId.get(t.net)}))`);
  }
}

// Board outline.
const edge = [[0,0],[board.width,0],[board.width,board.height],[0,board.height],[0,0]];
for (let i = 1; i < edge.length; i++) out.push(`  (gr_line (start ${edge[i-1][0]} ${edge[i-1][1]}) (end ${edge[i][0]} ${edge[i][1]}) (stroke (width 0.15) (type default)) (layer "Edge.Cuts"))`);

// Minimal reference envelopes on top silkscreen.
const silk = [
  [[8.75,6.2],[37.25,6.2],[37.25,57.8],[8.75,57.8],[8.75,6.2]],
  [[47,20.7],[57,20.7],[57,38.6],[47,38.6],[47,20.7]],
  [[80.5,16],[87,16],[87,28],[80.5,28],[80.5,16]],
  [[80.5,36],[87,36],[87,48],[80.5,48],[80.5,36]],
];
for (const line of silk) for (let i = 1; i < line.length; i++) out.push(`  (gr_line (start ${line[i-1][0]} ${line[i-1][1]}) (end ${line[i][0]} ${line[i][1]}) (stroke (width 0.2) (type default)) (layer "F.SilkS"))`);
out.push('  (gr_text "BENCH PROTOTYPE - DO NOT SPIN" (at 62 61) (layer "F.SilkS") (effects (font (size 1.2 1.2) (thickness 0.2))))');

// Editable bottom GND zone. EasyEDA Pro should rebuild the fill after import.
const gnd = netId.get('GND');
out.push(`  (zone (net ${gnd}) (net_name "GND") (layer "B.Cu") (hatch edge 0.5)`);
out.push('    (connect_pads (clearance 0.3)) (min_thickness 0.25) (fill yes (thermal_gap 0.3) (thermal_bridge_width 0.3))');
out.push(`    (polygon (pts (xy 0.6 0.6) (xy ${board.width-0.6} 0.6) (xy ${board.width-0.6} ${board.height-0.6}) (xy 0.6 ${board.height-0.6})))`);
out.push('  )');
out.push(')');

fs.writeFileSync(FILE, out.join('\n') + '\n');
console.log(`Generated EasyEDA Pro import source: ${FILE}`);
console.log(`${groups.size} footprints, ${pads.length} pads, ${traces.length} routed polylines, ${holes.length} NPTH holes`);
