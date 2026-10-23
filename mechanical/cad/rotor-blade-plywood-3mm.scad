// Symmetric one-piece plywood rotor template, units: mm.
// This is a low-speed fitting/balancing prototype only. It is not approved for
// high-RPM operation with the A2212 motor.

part = "2d"; // "2d" for DXF/SVG export, "3d" for an STL preview.

blade_radius = 178;       // 356 mm tip-to-tip
root_half_len = 35;       // 28 mm constant-width central zone
root_width = 28;
taper_end_r = 160;
tip_width = 16;
tip_round_r = 8;
adapter_stud_hole_d = 5.2; // clears the measured approximately M5 prop-adapter stud
plywood_thickness = 3;

// Positive half-profile, from the centre outwards.  The mirrored points make
// the two arms geometrically identical, which is essential for balancing.
module blade_outline_2d() {
    polygon(points=[
        [-blade_radius,0],
        [-blade_radius+tip_round_r, tip_width/2],
        [-taper_end_r, tip_width/2+1],
        [-root_half_len, root_width/2],
        [ root_half_len, root_width/2],
        [ taper_end_r, tip_width/2+1],
        [ blade_radius-tip_round_r, tip_width/2],
        [ blade_radius,0],
        [ blade_radius-tip_round_r,-tip_width/2],
        [ taper_end_r,-tip_width/2-1],
        [ root_half_len,-root_width/2],
        [-root_half_len,-root_width/2],
        [-taper_end_r,-tip_width/2-1],
        [-blade_radius+tip_round_r,-tip_width/2]
    ]);
}

module blade_2d() {
    difference() {
        blade_outline_2d();
        circle(d=adapter_stud_hole_d,$fn=48);
    }
}

if (part == "3d")
    linear_extrude(height=plywood_thickness) blade_2d();
else
    blade_2d();
