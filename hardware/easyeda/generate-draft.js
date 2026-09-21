const fs = require("fs");
const path = require("path");

let sequence = 1;
let activeShapes = null;

function gid() {
  return `gge_pov_${sequence++}`;
}

function text(x, y, value, size = "9pt", color = "#000080") {
  return `T~L~${x}~${y}~0~${color}~~${size}~~~~comment~${value}~1~start~${gid()}~0~pinpart`;
}

function rect(x, y, width, height, color = "#000000", fill = "none", style = 0) {
  return `R~${x}~${y}~~~${width}~${height}~${color}~1~${style}~${fill}~${gid()}~0~`;
}

function wire(points, color = "#006600", width = 2, style = 0) {
  const shape = `PL~${points.map(([x, y]) => `${x} ${y}`).join(" ")}~${color}~${width}~${style}~none~${gid()}~0`;
  activeShapes.push(shape);
  return shape;
}

function line(points, color = "#000000", width = 1, style = 0) {
  return `PL~${points.map(([x, y]) => `${x} ${y}`).join(" ")}~${color}~${width}~${style}~none~${gid()}~0`;
}

function dot(x, y, color = "#CC0000") {
  const shape = `J~${x}~${y}~2.5~${color}~${gid()}~0`;
  activeShapes.push(shape);
  return shape;
}

function block(shapes, x, y, width, height, ref, name, lines = [], options = {}) {
  shapes.push(rect(x, y, width, height, options.color || "#000000", options.fill || "none", options.style || 0));
  shapes.push(text(x + 8, y + 16, ref, "10pt", options.titleColor || "#0000AA"));
  shapes.push(text(x + 8, y + 32, name, "9pt", "#000000"));
  lines.forEach((entry, index) => shapes.push(text(x + 8, y + 49 + index * 14, entry, "7pt", "#444444")));
}

function note(shapes, x, y, width, height, title, lines) {
  shapes.push(rect(x, y, width, height, "#AA6600", "none", 2));
  shapes.push(text(x + 8, y + 16, title, "9pt", "#AA4400"));
  lines.forEach((entry, index) => shapes.push(text(x + 8, y + 34 + index * 14, entry, "7pt", "#664400")));
}

function makeSheet(title, uuid, shapes, bbox = { x: 20, y: 20, width: 1540, height: 1040 }) {
  return {
    uuid,
    docType: "1",
    title,
    description: "Conceptual engineering schematic. Verify markings, ratings and footprints before fabrication.",
    dataStr: {
      head: {
        docType: "1",
        editorVersion: "6.5.51",
        newgId: true,
        c_para: { "Prefix Start": "1" },
        c_spiceCmd: null,
        hasIdFlag: true,
      },
      canvas: "CA~1600~1100~#FFFFFF~yes~#CCCCCC~5~1600~1100~line~5~pixel~5~0~0",
      shape: shapes,
      BBox: bbox,
      colors: {},
    },
  };
}

function stationarySheet() {
  const s = [];
  activeShapes = s;
  s.push(text(40, 45, "POV DISPLAY — STATIONARY POWER, MOTOR AND SLIP RING", "14pt", "#000080"));
  s.push(text(40, 70, "DRAFT: fuse values, ESC/BEC wiring and slip-ring current rating require physical verification", "8pt", "#CC0000"));

  block(s, 60, 130, 130, 90, "J1", "Li-Po 3S", ["XT60", "11.1 V nominal"]);
  block(s, 240, 140, 90, 70, "F1", "MAIN FUSE", ["TBD after motor test"]);
  block(s, 380, 140, 100, 70, "SW1", "DC SWITCH", ["DC-rated / anti-spark"]);
  block(s, 540, 115, 150, 110, "ESC1", "ESC 30 A", ["2–4S", "BEC wire isolate/TBD", "PWM = safe 1000 us"]);
  block(s, 750, 130, 140, 80, "M1", "A2212 1000KV", ["3 phase", "no rotor test yet"]);

  wire([[190, 165], [240, 165]]);
  wire([[330, 165], [380, 165]]);
  wire([[480, 165], [540, 165]]);
  wire([[690, 145], [750, 145]]);
  wire([[690, 165], [750, 165]]);
  wire([[690, 185], [750, 185]]);
  text(197, 155, "VBAT_FUSED", "7pt", "#008800");
  text(697, 135, "U/V/W", "7pt", "#008800");

  block(s, 240, 310, 100, 70, "F2", "LOGIC FUSE", ["3 A provisional"]);
  block(s, 400, 285, 170, 120, "U1", "MP1584 DC-DC", ["IN: Li-Po 3S", "OUT: adjust to 5.00 V", "load/thermal test required"]);
  block(s, 650, 285, 100, 80, "C1", "100 uF / 25 V", ["at MP1584 input"]);
  block(s, 650, 395, 110, 80, "C2", "220 uF / 10 V", ["at MP1584 output"]);

  wire([[430, 210], [430, 345], [400, 345]]);
  dot(430, 210);
  wire([[340, 345], [400, 345]]);
  wire([[570, 320], [650, 320]]);
  wire([[570, 370], [610, 370], [610, 435], [650, 435]]);
  text(575, 310, "VBAT_SW", "7pt", "#008800");
  text(575, 360, "+5V_STATOR", "7pt", "#008800");

  block(s, 850, 275, 210, 280, "SR1", "6-CHANNEL SLIP RING", [
    "CH1 +5V_STATOR -> +5V_ROTOR",
    "CH2 +5V_STATOR -> +5V_ROTOR",
    "CH3 GND_STATOR -> GND_ROTOR",
    "CH4 GND_STATOR -> GND_ROTOR",
    "CH5 ESC_PWM rotor -> stator",
    "CH6 BEEP_CTRL optional",
    "parallel only after validation",
  ], { color: "#7A3E9D" });

  wire([[610, 370], [800, 370], [800, 315], [850, 315]]);
  wire([[800, 315], [800, 335], [850, 335]]);
  dot(800, 315);
  text(765, 305, "+5V x2", "7pt", "#008800");

  wire([[120, 220], [120, 520], [850, 520]]);
  wire([[120, 520], [120, 540], [850, 540]]);
  wire([[570, 390], [610, 390], [610, 520]]);
  dot(610, 520);
  text(615, 512, "GND x2", "7pt", "#008800");

  wire([[850, 455], [780, 455], [780, 245], [615, 245], [615, 225]]);
  text(650, 238, "ESC_PWM (CH5)", "7pt", "#008800");

  block(s, 1120, 285, 190, 100, "JROTOR", "ROTOR POWER", ["VIN ESP32", "VCC AHCT", "APA102 A/B star"]);
  wire([[1060, 315], [1120, 315]]);
  wire([[1060, 335], [1090, 335], [1090, 355], [1120, 355]]);
  text(1068, 305, "+5V_ROTOR", "7pt", "#008800");

  block(s, 1120, 445, 180, 100, "J5", "ESC PWM RETURN", ["to ESP32 GPIO25", "through R5 220 ohm"]);
  wire([[1060, 455], [1120, 455]]);

  block(s, 1120, 640, 120, 80, "R6", "1 kOhm", ["buzzer base"]);
  block(s, 1280, 620, 120, 110, "Q1", "2N3904 / S8050", ["low-side driver"]);
  block(s, 1440, 610, 110, 120, "BZ1", "ACTIVE BUZZER", ["5 V", "stationary base"]);
  wire([[1060, 475], [1080, 475]]);
  text(1070, 468, "CH6 optional", "7pt", "#008800");
  wire([[1080, 475], [1080, 680], [1120, 680]]);
  wire([[1240, 680], [1280, 680]]);
  wire([[1400, 680], [1440, 680]]);
  wire([[1495, 610], [1495, 575], [610, 575], [610, 370]]);
  wire([[1340, 730], [1340, 780], [120, 780], [120, 520]]);
  text(1160, 775, "GND_STATOR", "7pt", "#008800");
  note(s, 850, 610, 220, 140, "OPTIONAL AUDIO", [
    "GPIO26 -> CH6 -> R6 -> Q1",
    "D1 flyback only for magnetic load",
    "do not drive buzzer from GPIO",
    "omit entire branch if CH6 stays spare",
  ]);

  note(s, 60, 850, 700, 140, "SAFETY / OPEN ITEMS", [
    "Motor and installed rotor must not be energized before enclosure, balance and strength checks.",
    "F1, F2, switch, wire gauge and ring current are provisional until measured.",
    "ESC active control remains disabled in firmware; 1000 us safe output only.",
    "All grounds are common; verify BEC red wire policy for the actual ESC before connection.",
  ]);
  note(s, 810, 850, 710, 140, "CONNECTION RULES", [
    "CH1+CH2 and CH3+CH4 may be paralleled only after continuity/resistance/current tests.",
    "Battery-to-ESC and motor phases must not use XH-compatible connectors.",
    "Place C1/C2 close to MP1584. Add local bulk capacitors at each APA102 blade input.",
    "Protect all rotating wiring against pull-out, abrasion and centrifugal movement.",
  ]);

  return makeSheet("01_Stationary_Power", "31a1b2c3d4e5f60718293a4b5c6d7e81", s);
}

function rotorSheet() {
  const s = [];
  activeShapes = s;
  s.push(text(40, 45, "POV DISPLAY — ROTOR LOGIC, HALL AND TWO APA102 BLADES", "14pt", "#000080"));
  s.push(text(40, 70, "DRAFT: ESP32 near axis; all LED DATA/CLOCK lines remain on rotor", "8pt", "#CC0000"));

  block(s, 70, 155, 270, 390, "U3", "ESP32 DEVKIT V1", [
    "VIN <- +5V_ROTOR",
    "3V3 -> KY-003 only",
    "GPIO18 DATA_A",
    "GPIO19 CLOCK_A",
    "GPIO23 DATA_B",
    "GPIO22 CLOCK_B",
    "GPIO27 HALL_OUT",
    "GPIO25 ESC_PWM",
    "GPIO26 BEEP_CTRL optional",
    "GND -> GND_ROTOR",
  ], { color: "#006699" });

  wire([[40, 120], [1520, 120]], "#CC0000", 2);
  text(40, 110, "+5V_ROTOR", "8pt", "#CC0000");
  wire([[40, 790], [1520, 790]], "#000000", 2);
  text(40, 815, "GND_ROTOR", "8pt", "#000000");
  wire([[140, 120], [140, 155]]);
  wire([[140, 545], [140, 790]]);

  block(s, 450, 150, 330, 390, "U4", "SN74AHCT125N (5 V)", [
    "pin 14 VCC = +5V_ROTOR",
    "pin 7 GND = GND_ROTOR",
    "pins 1,4,10,13 OE -> GND",
    "pin 2 1A <- GPIO18",
    "pin 3 1Y -> DATA_A",
    "pin 5 2A <- GPIO19",
    "pin 6 2Y -> CLOCK_A",
    "pin 9 3A <- GPIO23",
    "pin 8 3Y -> DATA_B",
    "pin 12 4A <- GPIO22",
    "pin 11 4Y -> CLOCK_B",
  ], { color: "#006600" });
  wire([[600, 120], [600, 150]]);
  wire([[600, 540], [600, 790]]);
  block(s, 805, 160, 110, 75, "C3", "100 nF", ["pins 14–7", "place at U4"]);
  wire([[860, 120], [860, 160]]);
  wire([[860, 235], [860, 790]]);

  const signalRows = [
    { y: 260, gpio: "GPIO18", pinIn: "U4 pin2", pinOut: "pin3", ref: "R1", value: "330–470R", net: "DATA_A" },
    { y: 320, gpio: "GPIO19", pinIn: "U4 pin5", pinOut: "pin6", ref: "R2", value: "330–470R", net: "CLOCK_A" },
    { y: 400, gpio: "GPIO23", pinIn: "U4 pin9", pinOut: "pin8", ref: "R3", value: "330–470R", net: "DATA_B" },
    { y: 460, gpio: "GPIO22", pinIn: "U4 pin12", pinOut: "pin11", ref: "R4", value: "330–470R", net: "CLOCK_B" },
  ];

  signalRows.forEach((row) => {
    wire([[340, row.y], [450, row.y]]);
    text(350, row.y - 8, `${row.gpio} -> ${row.pinIn}`, "7pt", "#008800");
    block(s, 825, row.y - 25, 120, 50, row.ref, row.value, []);
    wire([[780, row.y], [825, row.y]]);
    wire([[945, row.y], [1080, row.y]]);
    text(950, row.y - 8, `${row.pinOut} / ${row.net}`, "7pt", "#008800");
  });

  block(s, 1080, 180, 250, 190, "JLA", "APA102 BLADE A", [
    "pin 1 +5V_ROTOR",
    "pin 2 GND_ROTOR",
    "pin 3 DATA_A -> DI",
    "pin 4 CLOCK_A -> CI",
    "20 LEDs default / verify if 21 fit",
  ], { color: "#AA0000" });
  block(s, 1080, 390, 250, 190, "JLB", "APA102 BLADE B", [
    "pin 1 +5V_ROTOR",
    "pin 2 GND_ROTOR",
    "pin 3 DATA_B -> DI",
    "pin 4 CLOCK_B -> CI",
    "20 LEDs default / verify if 21 fit",
  ], { color: "#AA0000" });
  wire([[1200, 120], [1200, 180]]);
  wire([[1230, 120], [1230, 390]]);
  wire([[1200, 370], [1200, 790]]);
  wire([[1230, 580], [1230, 790]]);

  block(s, 1370, 185, 120, 80, "C4", "1000 uF", [">=10 V", "blade A input"]);
  block(s, 1370, 400, 120, 80, "C5", "1000 uF", [">=10 V", "blade B input"]);
  wire([[1430, 120], [1430, 185]]);
  wire([[1430, 265], [1430, 790]]);
  wire([[1470, 120], [1470, 400]]);
  wire([[1470, 480], [1470, 790]]);

  block(s, 70, 620, 240, 120, "JH1 / H1", "KY-003 HALL", [
    "pin 1 - -> GND_ROTOR",
    "pin 2 + -> ESP32 3V3",
    "pin 3 S -> GPIO27",
    "OUT must remain <=3.3 V",
  ], { color: "#7A3E9D" });
  wire([[190, 545], [190, 620]]);
  text(198, 585, "ESP32 3V3", "7pt", "#008800");
  wire([[310, 680], [365, 680], [365, 500], [340, 500]]);
  text(370, 670, "HALL_OUT", "7pt", "#008800");
  wire([[150, 740], [150, 790]]);

  block(s, 450, 620, 125, 65, "R5", "220 ohm", ["ESC PWM series"]);
  wire([[340, 520], [390, 520], [390, 652], [450, 652]]);
  wire([[575, 652], [720, 652]]);
  text(585, 642, "to slip ring CH5", "7pt", "#008800");
  block(s, 720, 620, 180, 90, "SR1-5", "ESC_PWM", ["rotor -> stator", "active test locked"]);

  block(s, 970, 640, 180, 90, "SR1-6", "BEEP_CTRL", ["GPIO26 optional", "otherwise NC"]);
  wire([[340, 540], [420, 540], [420, 735], [970, 735], [970, 685]]);

  note(s, 70, 865, 700, 130, "LOGIC REQUIREMENTS", [
    "U4 must be AHCT, not HC/HCT substitution without threshold review.",
    "OE pins are permanently low. Four series resistors are placed near U4 outputs.",
    "APA102 power is star-routed; blade B must not be powered through blade A.",
    "KY-003 is powered from 3.3 V. Verify pin labels on the physical module.",
  ]);
  note(s, 810, 865, 710, 130, "NOT READY FOR FABRICATION", [
    "This sheet documents electrical intent, not verified footprints or a PCB layout.",
    "Confirm exact LED strip pin order, ESP32 board dimensions and all connector orientations.",
    "Check current, voltage drop and temperature before full-white operation.",
    "No motor or rotor test is authorized by this schematic.",
  ]);

  return makeSheet("02_Rotor_Logic", "41a1b2c3d4e5f60718293a4b5c6d7e81", s);
}

const project = {
  editorVersion: "6.5.51",
  docType: "5",
  title: "POV Display - Electrical Draft 2026-09-15",
  description: "Preliminary two-sheet schematic for review. Not production-ready.",
  colors: {},
  schematics: [stationarySheet(), rotorSheet()],
};

const outputPath = path.join(__dirname, "pov-display-electrical-draft.json");
fs.writeFileSync(outputPath, `${JSON.stringify(project)}\n`, "utf8");
console.log(outputPath);
