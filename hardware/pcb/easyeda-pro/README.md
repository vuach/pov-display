# EasyEDA Pro editable PCB

`rotor-controller-rev-a.kicad_pcb` is the editable interchange source for EasyEDA Pro. It contains the Rev A board outline, through-hole pads, named nets, routed top/bottom copper, mounting holes, top silkscreen envelopes and a bottom GND zone.

Import in EasyEDA Pro using `File -> Import -> KiCad`. EasyEDA Pro expects a ZIP archive, so select `rotor-controller-rev-a-kicad.zip`. The import was verified in EasyEDA Pro V3.2.149 on 2026-09-23: the PCB opened with editable pads, named nets, top/bottom tracks, outline, holes and silkscreen objects.

The standalone `.kicad_pcb` file is kept next to the ZIP as the editable interchange source.

This is a bench prototype. The board is `88 x 64 mm`; it is not mechanically approved for rotation.

## Rev B single-sided rotor carrier

`rotor-controller-rev-b-home-etch-kicad.zip` imports the editable single-sided home-etch revision. All routed copper and the GND zone are on `B.Cu`. Dashed `W1...W10`/`W4A` lines on `F.SilkS` are insulated component-side wire links, not copper tracks. Board size is `110 x 70 mm`.

This revision is an electrical prototype of the rotating-board circuit. It is not the final rotor layout: the revised component and hole requirements are listed in `../board-architecture.md`, while placement waits for the slip-ring and hub dimensions. It also requires a separate structural hub/beam and dynamic balancing before any powered rotation.

Regenerate from the same geometry as the Gerbers:

```powershell
& "C:\Users\vuach\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "hardware/pcb/generate-kicad-pcb.js"
```
