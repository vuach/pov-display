const fs = require("fs");
const path = require("path");

let seq = 1;
const id = () => `gge_real_${seq++}`;

function txt(x, y, value, size = "9pt", color = "#000080", kind = "comment") {
  return `T~L~${x}~${y}~0~${color}~Arial~${size}~~~~${kind}~${value}~1~start~${id()}~0~pinpart`;
}

function rect(x, y, w, h, color = "#000000", width = 1, style = 0, fill = "none") {
  return `R~${x}~${y}~~~${w}~${h}~${color}~${width}~${style}~${fill}~${id()}~0~`;
}

function poly(points, color = "#A00000", width = 1, style = 0) {
  return `PL~${points.map(([x, y]) => `${x} ${y}`).join(" ")}~${color}~${width}~${style}~none~${id()}~0`;
}

function ellipse(cx, cy, rx, ry, color = "#A00000", width = 1, fill = "none") {
  return `E~${cx}~${cy}~${rx}~${ry}~${color}~${width}~0~${fill}~${id()}~0`;
}

function wire(points) {
  return `W~${points.map(([x, y]) => `${x} ${y}`).join(" ")}~#008800~1~0~none~${id()}~0`;
}

function junction(x, y) {
  return `J~${x}~${y}~2.5~#CC0000~${id()}~0`;
}

function net(x, y, name, rotation = 0, anchor = "start") {
  const tx = rotation === 180 ? x - 2 : x + 2;
  return `N~${x}~${y}~${rotation}~#0000FF~${name}~${id()}~${anchor}~${tx}~${y - 2}~Arial~8pt~0`;
}

function noConnect(x, y) {
  return `O~${x}~${y}~${id()}~M${x - 4},${y - 4} L${x + 4},${y + 4} M${x + 4},${y - 4} L${x - 4},${y + 4}~#FF0000`;
}

function pinShape(pin, bx, by, bw) {
  const py = by + pin.offset;
  const left = pin.side === "L";
  const px = left ? bx - 20 : bx + bw + 20;
  const edge = left ? bx : bx + bw;
  const path = left ? `M ${px} ${py} h 20` : `M ${px} ${py} h -20`;
  const nameX = left ? edge + 4 : edge - 4;
  const nameAnchor = left ? "start" : "end";
  const numX = left ? px + 7 : px - 7;
  const numAnchor = left ? "start" : "end";
  const electric = pin.electric ?? 0;
  const visible = pin.visible === false ? 0 : 1;
  const shape = [
    `P~show~${electric}~${pin.num}~${px}~${py}~~${id()}~0`,
    `${px}~${py}`,
    `${path}~#880000`,
    `${visible}~${nameX}~${py + 3}~0~${pin.name}~${nameAnchor}~Arial~7pt~#0000FF`,
    `1~${numX}~${py - 2}~0~${pin.num}~${numAnchor}~Arial~6pt~#0000FF`,
    `0~${edge}~${py}`,
    "0~",
  ].join("^^");
  return { shape, x: px, y: py };
}

function moduleSymbol(shapes, { x, y, w, h, ref, value, pins, color = "#A00000", note = "" }) {
  const children = [];
  children.push(txt(x + 5, y - 9, ref, "9pt", "#000080", "part_annotation"));
  children.push(txt(x + 5, y + 14, value, "8pt", "#000000", "part_name"));
  children.push(rect(x, y, w, h, color));
  if (note) children.push(txt(x + 5, y + h - 6, note, "6pt", "#666666"));
  const dots = {};
  for (const pin of pins) {
    const result = pinShape(pin, x, y, w);
    children.push(result.shape);
    dots[pin.key || pin.name] = { x: result.x, y: result.y };
  }
  const config = `LIB~${x}~${y}~package\`\`nameAlias\`Value\`Value\`${value}\`pre\`${ref.replace(/[0-9.]+$/, "")}?\`~~0~${id()}~0~~yes~yes`;
  shapes.push(`${config}#@$${children.join("#@$")}`);
  return dots;
}

function twoPin(shapes, { x, y, ref, value, kind = "R" }) {
  const left = { x, y };
  const right = { x: x + 80, y };
  const children = [
    txt(x + 24, y - 21, ref, "8pt", "#000080", "part_annotation"),
    txt(x + 24, y + 27, value, "7pt", "#000000", "part_name"),
    `P~show~0~1~${x}~${y}~~${id()}~0^^${x}~${y}^^M ${x} ${y} h 20~#880000^^0~${x + 4}~${y + 3}~0~1~start~Arial~6pt~#0000FF^^1~${x + 8}~${y - 2}~0~1~start~Arial~6pt~#0000FF^^0~${x + 20}~${y}^^0~`,
    `P~show~0~2~${x + 80}~${y}~~${id()}~0^^${x + 80}~${y}^^M ${x + 80} ${y} h -20~#880000^^0~${x + 76}~${y + 3}~0~2~end~Arial~6pt~#0000FF^^1~${x + 72}~${y - 2}~0~2~end~Arial~6pt~#0000FF^^0~${x + 60}~${y}^^0~`,
  ];
  if (kind === "C") {
    children.push(poly([[x + 20, y], [x + 34, y]]));
    children.push(poly([[x + 34, y - 12], [x + 34, y + 12]], "#A00000", 2));
    children.push(poly([[x + 46, y - 12], [x + 46, y + 12]], "#A00000", 1));
    children.push(poly([[x + 46, y], [x + 60, y]]));
    children.push(txt(x + 26, y - 5, "+", "8pt", "#A00000"));
  } else if (kind === "SW") {
    children.push(poly([[x + 20, y], [x + 35, y]]));
    children.push(poly([[x + 35, y], [x + 57, y - 13]], "#A00000", 2));
    children.push(poly([[x + 57, y], [x + 60, y]]));
    children.push(ellipse(x + 35, y, 2, 2, "#A00000", 1, "#A00000"));
    children.push(ellipse(x + 57, y, 2, 2, "#A00000", 1, "#A00000"));
  } else if (kind === "FUSE") {
    children.push(rect(x + 20, y - 8, 40, 16, "#A00000"));
    children.push(poly([[x + 20, y], [x + 60, y]], "#A00000", 1));
  } else {
    children.push(poly([[x + 20, y], [x + 25, y], [x + 30, y - 8], [x + 40, y + 8], [x + 50, y - 8], [x + 55, y], [x + 60, y]], "#A00000", 1));
  }
  const config = `LIB~${x + 40}~${y}~package\`\`nameAlias\`Value\`Value\`${value}\`pre\`${ref.replace(/[0-9.]+$/, "")}?\`~~0~${id()}~0~~yes~yes`;
  shapes.push(`${config}#@$${children.join("#@$")}`);
  return { left, right };
}

function npnSymbol(shapes, x, y, ref, value) {
  const children = [
    txt(x + 25, y - 18, ref, "8pt", "#000080", "part_annotation"),
    txt(x + 23, y + 84, value, "7pt", "#000000", "part_name"),
    ellipse(x + 45, y + 35, 27, 27, "#A00000"),
    poly([[x + 34, y + 17], [x + 34, y + 53]], "#A00000", 2),
    poly([[x + 34, y + 25], [x + 54, y + 5], [x + 70, y + 5]], "#A00000", 1),
    poly([[x + 34, y + 45], [x + 54, y + 65], [x + 70, y + 65]], "#A00000", 1),
    poly([[x + 48, y + 58], [x + 54, y + 65], [x + 46, y + 63]], "#A00000", 1),
    `P~show~1~1~${x}~${y + 35}~~${id()}~0^^${x}~${y + 35}^^M ${x} ${y + 35} h 34~#880000^^1~${x + 37}~${y + 38}~0~B~start~Arial~7pt~#0000FF^^1~${x + 8}~${y + 32}~0~1~start~Arial~6pt~#0000FF^^0~${x + 34}~${y + 35}^^0~`,
    `P~show~2~2~${x + 90}~${y + 5}~~${id()}~0^^${x + 90}~${y + 5}^^M ${x + 90} ${y + 5} h -20~#880000^^1~${x + 66}~${y + 8}~0~C~end~Arial~7pt~#0000FF^^1~${x + 82}~${y + 2}~0~2~end~Arial~6pt~#0000FF^^0~${x + 70}~${y + 5}^^0~`,
    `P~show~2~3~${x + 90}~${y + 65}~~${id()}~0^^${x + 90}~${y + 65}^^M ${x + 90} ${y + 65} h -20~#880000^^1~${x + 66}~${y + 68}~0~E~end~Arial~7pt~#0000FF^^1~${x + 82}~${y + 62}~0~3~end~Arial~6pt~#0000FF^^0~${x + 70}~${y + 65}^^0~`,
  ];
  shapes.push(`LIB~${x + 45}~${y + 35}~package\`TO-92\`nameAlias\`Value\`Value\`${value}\`pre\`Q?\`~~0~${id()}~0~~yes~yes#@$${children.join("#@$")}`);
  return { B: { x, y: y + 35 }, C: { x: x + 90, y: y + 5 }, E: { x: x + 90, y: y + 65 } };
}

function note(shapes, x, y, w, title, lines) {
  const h = 34 + lines.length * 15;
  shapes.push(rect(x, y, w, h, "#AA6600", 1, 2));
  shapes.push(txt(x + 8, y + 17, title, "8pt", "#AA4400"));
  lines.forEach((line, i) => shapes.push(txt(x + 8, y + 36 + i * 15, line, "7pt", "#664400")));
}

function sheet(title, uuid, shapes) {
  return {
    uuid,
    docType: "1",
    title,
    description: "Electrically connected engineering schematic. Verify physical modules and footprints before fabrication.",
    dataStr: {
      head: { docType: "1", editorVersion: "6.5.51", newgId: true, hasIdFlag: true, isSheet: true, c_para: { "Prefix Start": "1" }, c_spiceCmd: null },
      canvas: "CA~1800~1150~#FFFFFF~yes~#CCCCCC~10~1800~1150~line~5~pixel~5~0~0",
      shape: shapes,
      BBox: { x: 20, y: 20, width: 1740, height: 1080 },
      colors: {},
    },
  };
}

function stationary() {
  const s = [];
  s.push(txt(40, 45, "POV DISPLAY — STATIONARY POWER, MOTOR AND SLIP RING", "14pt"));
  s.push(txt(40, 68, "REV A — electrically connected schematic; ratings marked TBD require measurement", "8pt", "#CC0000"));

  const bat = moduleSymbol(s, { x: 60, y: 105, w: 100, h: 80, ref: "J1", value: "Li-Po 3S / XT60", pins: [
    { num: "1", name: "VBAT+", side: "R", offset: 25, electric: 4 },
    { num: "2", name: "GND", side: "R", offset: 55, electric: 4 },
  ] });
  const f1 = twoPin(s, { x: 220, y: 130, ref: "F1", value: "TBD", kind: "FUSE" });
  const sw = twoPin(s, { x: 340, y: 130, ref: "SW1", value: "DC / anti-spark", kind: "SW" });
  const esc = moduleSymbol(s, { x: 520, y: 90, w: 190, h: 220, ref: "ESC1", value: "ESC 30 A / 2–4S", pins: [
    { num: "1", name: "BAT+", key: "BAT+", side: "L", offset: 40, electric: 4 },
    { num: "2", name: "BAT-", key: "BAT-", side: "L", offset: 75, electric: 4 },
    { num: "3", name: "PWM", side: "L", offset: 120, electric: 1 },
    { num: "4", name: "SIG_GND", side: "L", offset: 150, electric: 4 },
    { num: "5", name: "BEC_5V", side: "L", offset: 185, electric: 4 },
    { num: "6", name: "U", side: "R", offset: 50, electric: 2 },
    { num: "7", name: "V", side: "R", offset: 95, electric: 2 },
    { num: "8", name: "W", side: "R", offset: 140, electric: 2 },
  ], note: "BEC red wire policy: TBD" });
  const motor = moduleSymbol(s, { x: 810, y: 105, w: 130, h: 170, ref: "M1", value: "A2212 1000KV", pins: [
    { num: "1", name: "U", side: "L", offset: 35, electric: 4 },
    { num: "2", name: "V", side: "L", offset: 80, electric: 4 },
    { num: "3", name: "W", side: "L", offset: 125, electric: 4 },
  ], note: "3-phase BLDC" });

  s.push(wire([[bat["VBAT+"].x, bat["VBAT+"].y], [f1.left.x, f1.left.y]]));
  s.push(wire([[f1.right.x, f1.right.y], [sw.left.x, sw.left.y]]));
  s.push(wire([[sw.right.x, sw.right.y], [esc["BAT+"].x, esc["BAT+"].y]]));
  s.push(net(sw.right.x, sw.right.y, "VBAT_SW"));
  s.push(net(bat.GND.x, bat.GND.y, "GND_STATOR"));
  s.push(net(esc["BAT-"].x, esc["BAT-"].y, "GND_STATOR"));
  s.push(net(esc.PWM.x, esc.PWM.y, "ESC_PWM_STATOR"));
  s.push(net(esc.SIG_GND.x, esc.SIG_GND.y, "GND_STATOR"));
  s.push(noConnect(esc.BEC_5V.x, esc.BEC_5V.y));
  s.push(wire([[esc.U.x, esc.U.y], [motor.U.x, motor.U.y]]));
  s.push(wire([[esc.V.x, esc.V.y], [motor.V.x, motor.V.y]]));
  s.push(wire([[esc.W.x, esc.W.y], [motor.W.x, motor.W.y]]));

  const f2 = twoPin(s, { x: 220, y: 400, ref: "F2", value: "3 A provisional", kind: "FUSE" });
  const buck = moduleSymbol(s, { x: 390, y: 335, w: 190, h: 150, ref: "U1", value: "MP1584 MODULE", pins: [
    { num: "1", name: "IN+", side: "L", offset: 65, electric: 4 },
    { num: "2", name: "IN-", side: "L", offset: 105, electric: 4 },
    { num: "3", name: "OUT+", side: "R", offset: 65, electric: 4 },
    { num: "4", name: "OUT-", side: "R", offset: 105, electric: 4 },
  ], note: "Adjust to 5.00 V before load" });
  s.push(net(f2.left.x, f2.left.y, "VBAT_SW"));
  s.push(wire([[f2.right.x, f2.right.y], [buck["IN+"].x, buck["IN+"].y]]));
  s.push(net(buck["IN-"].x, buck["IN-"].y, "GND_STATOR"));
  s.push(net(buck["OUT+"].x, buck["OUT+"].y, "+5V_STATOR"));
  s.push(net(buck["OUT-"].x, buck["OUT-"].y, "GND_STATOR"));

  const c1 = twoPin(s, { x: 650, y: 350, ref: "C1", value: "100u / 25V", kind: "C" });
  const c2 = twoPin(s, { x: 650, y: 445, ref: "C2", value: "220u / 10V", kind: "C" });
  s.push(net(c1.left.x, c1.left.y, "VBAT_SW")); s.push(net(c1.right.x, c1.right.y, "GND_STATOR"));
  s.push(net(c2.left.x, c2.left.y, "+5V_STATOR")); s.push(net(c2.right.x, c2.right.y, "GND_STATOR"));

  const ringPins = [];
  for (let n = 1; n <= 6; n++) {
    ringPins.push({ num: `S${n}`, name: `CH${n}_S`, key: `S${n}`, side: "L", offset: 40 + (n - 1) * 38, electric: 3 });
    ringPins.push({ num: `R${n}`, name: `CH${n}_R`, key: `R${n}`, side: "R", offset: 40 + (n - 1) * 38, electric: 3 });
  }
  const ring = moduleSymbol(s, { x: 910, y: 350, w: 250, h: 270, ref: "SR1", value: "SLIP RING 6CH", pins: ringPins, color: "#7A3E9D", note: "Channel current/rating: TBD" });
  for (const n of [1, 2]) { s.push(net(ring[`S${n}`].x, ring[`S${n}`].y, "+5V_STATOR", 180, "end")); s.push(net(ring[`R${n}`].x, ring[`R${n}`].y, "+5V_ROTOR")); }
  for (const n of [3, 4]) { s.push(net(ring[`S${n}`].x, ring[`S${n}`].y, "GND_STATOR", 180, "end")); s.push(net(ring[`R${n}`].x, ring[`R${n}`].y, "GND_ROTOR")); }
  s.push(net(ring.S5.x, ring.S5.y, "ESC_PWM_STATOR", 180, "end"));
  s.push(net(ring.R5.x, ring.R5.y, "ESC_PWM_ROTOR"));
  s.push(net(ring.S6.x, ring.S6.y, "BEEP_CTRL_STATOR", 180, "end"));
  s.push(net(ring.R6.x, ring.R6.y, "BEEP_CTRL_ROTOR"));

  const rb = twoPin(s, { x: 1230, y: 720, ref: "R6", value: "1k", kind: "R" });
  const q1 = npnSymbol(s, 1360, 685, "Q1", "2N3904 / S8050");
  const buz = moduleSymbol(s, { x: 1510, y: 650, w: 150, h: 100, ref: "BZ1", value: "ACTIVE BUZZER 5V", pins: [
    { num: "+", name: "+", side: "L", offset: 30, electric: 4 },
    { num: "-", name: "-", side: "L", offset: 70, electric: 4 },
  ] });
  s.push(net(rb.left.x, rb.left.y, "BEEP_CTRL_STATOR"));
  s.push(wire([[rb.right.x, rb.right.y], [q1.B.x, q1.B.y]]));
  s.push(net(q1.E.x, q1.E.y, "GND_STATOR"));
  s.push(net(buz["+"].x, buz["+"].y, "+5V_STATOR", 180, "end"));
  s.push(wire([[q1.C.x, q1.C.y], [1475, q1.C.y], [1475, buz["-"].y], [buz["-"].x, buz["-"].y]]));
  const r7 = twoPin(s, { x: 1320, y: 820, ref: "R7", value: "10k", kind: "R" });
  s.push(wire([[q1.B.x, q1.B.y], [1320, q1.B.y], [1320, r7.left.y]]));
  s.push(junction(q1.B.x, q1.B.y));
  s.push(net(r7.right.x, r7.right.y, "GND_STATOR"));

  note(s, 60, 640, 720, "SAFETY AND OPEN VALUES", [
    "F1/F2, wire gauge, switch rating and slip-ring current remain TBD until measurement.",
    "ESC BEC_5V is intentionally NC until the exact ESC wiring is confirmed.",
    "Motor and installed rotor must not be energized before enclosure and balance checks.",
    "Fit a flyback diode across BZ1 only if the selected buzzer is a magnetic load.",
  ]);
  note(s, 60, 850, 1060, "POWER RULES", [
    "CH1+CH2 and CH3+CH4 are parallel paths only after continuity and resistance tests.",
    "Battery-to-ESC and motor phase wiring must use high-current connectors, not JST-XH.",
    "C1/C2 are local to MP1584. Each blade receives its own bulk capacitor on the rotor sheet.",
  ]);
  return sheet("01_Stationary_Power_RevA", "52a1b2c3d4e5f60718293a4b5c6d7e81", s);
}

function rotor() {
  const s = [];
  s.push(txt(40, 45, "POV DISPLAY — ROTOR CONTROLLER, HALL SENSOR AND TWO APA102 BLADES", "14pt"));
  s.push(txt(40, 68, "REV A — ESP32 remains on the rotor; DATA/CLOCK do not pass through the slip ring", "8pt", "#CC0000"));

  const esp = moduleSymbol(s, { x: 80, y: 120, w: 270, h: 470, ref: "U3", value: "ESP32 DEVKIT V1 30P", color: "#006699", pins: [
    { num: "VIN", name: "VIN", side: "L", offset: 50, electric: 4 },
    { num: "3V3", name: "3V3", side: "L", offset: 95, electric: 4 },
    { num: "GND", name: "GND", side: "L", offset: 140, electric: 4 },
    { num: "18", name: "GPIO18 / DATA_A", key: "GPIO18", side: "R", offset: 55, electric: 2 },
    { num: "19", name: "GPIO19 / CLOCK_A", key: "GPIO19", side: "R", offset: 105, electric: 2 },
    { num: "23", name: "GPIO23 / DATA_B", key: "GPIO23", side: "R", offset: 155, electric: 2 },
    { num: "22", name: "GPIO22 / CLOCK_B", key: "GPIO22", side: "R", offset: 205, electric: 2 },
    { num: "27", name: "GPIO27 / HALL", key: "GPIO27", side: "R", offset: 270, electric: 1 },
    { num: "25", name: "GPIO25 / ESC", key: "GPIO25", side: "R", offset: 330, electric: 2 },
    { num: "26", name: "GPIO26 / BEEP", key: "GPIO26", side: "R", offset: 390, electric: 2 },
  ], note: "Physical 30-pin board; footprint TBD" });
  s.push(net(esp.VIN.x, esp.VIN.y, "+5V_ROTOR", 180, "end"));
  s.push(net(esp["3V3"].x, esp["3V3"].y, "+3V3_ROTOR", 180, "end"));
  s.push(net(esp.GND.x, esp.GND.y, "GND_ROTOR", 180, "end"));
  s.push(net(esp.GPIO18.x, esp.GPIO18.y, "GPIO18_DATA_A"));
  s.push(net(esp.GPIO19.x, esp.GPIO19.y, "GPIO19_CLOCK_A"));
  s.push(net(esp.GPIO23.x, esp.GPIO23.y, "GPIO23_DATA_B"));
  s.push(net(esp.GPIO22.x, esp.GPIO22.y, "GPIO22_CLOCK_B"));
  s.push(net(esp.GPIO27.x, esp.GPIO27.y, "HALL_OUT"));

  const ahct = moduleSymbol(s, { x: 560, y: 105, w: 250, h: 500, ref: "U4", value: "SN74AHCT125N", color: "#006600", pins: [
    { num: "1", name: "1OE", side: "L", offset: 45, electric: 1 },
    { num: "2", name: "1A", side: "L", offset: 90, electric: 1 },
    { num: "4", name: "2OE", side: "L", offset: 150, electric: 1 },
    { num: "5", name: "2A", side: "L", offset: 195, electric: 1 },
    { num: "10", name: "3OE", side: "L", offset: 255, electric: 1 },
    { num: "9", name: "3A", side: "L", offset: 300, electric: 1 },
    { num: "13", name: "4OE", side: "L", offset: 360, electric: 1 },
    { num: "12", name: "4A", side: "L", offset: 405, electric: 1 },
    { num: "14", name: "VCC", side: "L", offset: 455, electric: 4 },
    { num: "3", name: "1Y", side: "R", offset: 90, electric: 2 },
    { num: "6", name: "2Y", side: "R", offset: 195, electric: 2 },
    { num: "8", name: "3Y", side: "R", offset: 300, electric: 2 },
    { num: "11", name: "4Y", side: "R", offset: 405, electric: 2 },
    { num: "7", name: "GND", side: "R", offset: 455, electric: 4 },
  ], note: "DIP-14 shown; OE pins held low" });
  for (const key of ["1OE", "2OE", "3OE", "4OE"]) s.push(net(ahct[key].x, ahct[key].y, "GND_ROTOR", 180, "end"));
  s.push(net(ahct["1A"].x, ahct["1A"].y, "GPIO18_DATA_A", 180, "end"));
  s.push(net(ahct["2A"].x, ahct["2A"].y, "GPIO19_CLOCK_A", 180, "end"));
  s.push(net(ahct["3A"].x, ahct["3A"].y, "GPIO23_DATA_B", 180, "end"));
  s.push(net(ahct["4A"].x, ahct["4A"].y, "GPIO22_CLOCK_B", 180, "end"));
  s.push(net(ahct.VCC.x, ahct.VCC.y, "+5V_ROTOR", 180, "end"));
  s.push(net(ahct.GND.x, ahct.GND.y, "GND_ROTOR"));

  const rows = [
    { key: "1Y", y: ahct["1Y"].y, ref: "R1", net: "DATA_A" },
    { key: "2Y", y: ahct["2Y"].y, ref: "R2", net: "CLOCK_A" },
    { key: "3Y", y: ahct["3Y"].y, ref: "R3", net: "DATA_B" },
    { key: "4Y", y: ahct["4Y"].y, ref: "R4", net: "CLOCK_B" },
  ];
  for (const row of rows) {
    const r = twoPin(s, { x: 870, y: row.y, ref: row.ref, value: "330–470R", kind: "R" });
    s.push(wire([[ahct[row.key].x, ahct[row.key].y], [r.left.x, r.left.y]]));
    s.push(net(r.right.x, r.right.y, row.net));
  }

  const c3 = twoPin(s, { x: 860, y: 590, ref: "C3", value: "100n", kind: "C" });
  s.push(net(c3.left.x, c3.left.y, "+5V_ROTOR")); s.push(net(c3.right.x, c3.right.y, "GND_ROTOR"));

  const ja = moduleSymbol(s, { x: 1110, y: 120, w: 230, h: 190, ref: "JLA", value: "APA102 BLADE A", pins: [
    { num: "1", name: "+5V", side: "L", offset: 40, electric: 4 },
    { num: "2", name: "GND", side: "L", offset: 80, electric: 4 },
    { num: "3", name: "DI", side: "L", offset: 120, electric: 1 },
    { num: "4", name: "CI", side: "L", offset: 160, electric: 1 },
  ], note: "20 LEDs default; verify if 21 fit" });
  const jb = moduleSymbol(s, { x: 1110, y: 390, w: 230, h: 190, ref: "JLB", value: "APA102 BLADE B", pins: [
    { num: "1", name: "+5V", side: "L", offset: 40, electric: 4 },
    { num: "2", name: "GND", side: "L", offset: 80, electric: 4 },
    { num: "3", name: "DI", side: "L", offset: 120, electric: 1 },
    { num: "4", name: "CI", side: "L", offset: 160, electric: 1 },
  ], note: "20 LEDs default; verify if 21 fit" });
  for (const j of [ja, jb]) { s.push(net(j["+5V"].x, j["+5V"].y, "+5V_ROTOR", 180, "end")); s.push(net(j.GND.x, j.GND.y, "GND_ROTOR", 180, "end")); }
  s.push(net(ja.DI.x, ja.DI.y, "DATA_A", 180, "end")); s.push(net(ja.CI.x, ja.CI.y, "CLOCK_A", 180, "end"));
  s.push(net(jb.DI.x, jb.DI.y, "DATA_B", 180, "end")); s.push(net(jb.CI.x, jb.CI.y, "CLOCK_B", 180, "end"));
  const c4 = twoPin(s, { x: 1440, y: 190, ref: "C4", value: "1000u / 10V", kind: "C" });
  const c5 = twoPin(s, { x: 1440, y: 460, ref: "C5", value: "1000u / 10V", kind: "C" });
  for (const c of [c4, c5]) { s.push(net(c.left.x, c.left.y, "+5V_ROTOR")); s.push(net(c.right.x, c.right.y, "GND_ROTOR")); }

  const hall = moduleSymbol(s, { x: 80, y: 700, w: 220, h: 145, ref: "JH1", value: "KY-003 MODULE", color: "#7A3E9D", pins: [
    { num: "1", name: "- / GND", key: "GND", side: "R", offset: 35, electric: 4 },
    { num: "2", name: "+ / VCC", key: "VCC", side: "R", offset: 75, electric: 4 },
    { num: "3", name: "S / OUT", key: "OUT", side: "R", offset: 115, electric: 2 },
  ], note: "Power from 3.3 V only" });
  s.push(net(hall.GND.x, hall.GND.y, "GND_ROTOR"));
  s.push(net(hall.VCC.x, hall.VCC.y, "+3V3_ROTOR"));
  s.push(net(hall.OUT.x, hall.OUT.y, "HALL_OUT"));
  const c6 = twoPin(s, { x: 390, y: 775, ref: "C6", value: "100n", kind: "C" });
  s.push(net(c6.left.x, c6.left.y, "+3V3_ROTOR")); s.push(net(c6.right.x, c6.right.y, "GND_ROTOR"));

  const r5 = twoPin(s, { x: 560, y: 720, ref: "R5", value: "220R", kind: "R" });
  s.push(net(r5.left.x, r5.left.y, "GPIO25_ESC", 180, "end"));
  s.push(net(esp.GPIO25.x, esp.GPIO25.y, "GPIO25_ESC"));
  s.push(net(r5.right.x, r5.right.y, "ESC_PWM_ROTOR"));
  s.push(net(esp.GPIO26.x, esp.GPIO26.y, "BEEP_CTRL_ROTOR"));

  const ringEnd = moduleSymbol(s, { x: 800, y: 690, w: 280, h: 250, ref: "J2", value: "ROTOR HARNESS / SR1 WIRES", color: "#7A3E9D", pins: [
    { num: "R1", name: "CH1 +5V", key: "R1", side: "R", offset: 35, electric: 3 },
    { num: "R2", name: "CH2 +5V", key: "R2", side: "R", offset: 70, electric: 3 },
    { num: "R3", name: "CH3 GND", key: "R3", side: "R", offset: 105, electric: 3 },
    { num: "R4", name: "CH4 GND", key: "R4", side: "R", offset: 140, electric: 3 },
    { num: "R5", name: "CH5 ESC_PWM", key: "R5", side: "R", offset: 175, electric: 3 },
    { num: "R6", name: "CH6 BEEP", key: "R6", side: "R", offset: 210, electric: 3 },
  ], note: "Omit J2 if wires are soldered directly" });
  for (const k of ["R1", "R2"]) s.push(net(ringEnd[k].x, ringEnd[k].y, "+5V_ROTOR"));
  for (const k of ["R3", "R4"]) s.push(net(ringEnd[k].x, ringEnd[k].y, "GND_ROTOR"));
  s.push(net(ringEnd.R5.x, ringEnd.R5.y, "ESC_PWM_ROTOR"));
  s.push(net(ringEnd.R6.x, ringEnd.R6.y, "BEEP_CTRL_ROTOR"));

  note(s, 1160, 700, 520, "ROTOR REQUIREMENTS", [
    "U4 must be AHCT. OE pins 1, 4, 10 and 13 are tied to GND.",
    "C3 is placed at U4 pins 14/7; C4/C5 are at the blade inputs.",
    "APA102 power is star-routed; blade B is not fed through blade A.",
    "KY-003 OUT must be measured before connection and remain within 3.3 V logic limits.",
    "ESC active test remains locked in firmware; no rotor test is authorized.",
  ]);
  return sheet("02_Rotor_Logic_RevA", "62a1b2c3d4e5f60718293a4b5c6d7e81", s);
}

const project = {
  editorVersion: "6.5.51",
  docType: "5",
  title: "POV Display - Electrical Schematic Rev A",
  description: "Two-sheet electrically connected schematic with custom module symbols. Footprints and provisional ratings require physical verification.",
  colors: {},
  schematics: [stationary(), rotor()],
};

const output = path.join(__dirname, "pov-display-schematic-rev-a.json");
fs.writeFileSync(output, `${JSON.stringify(project)}\n`, "utf8");
console.log(output);
