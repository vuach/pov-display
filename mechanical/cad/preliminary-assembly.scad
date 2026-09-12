// Preliminary two-blade POV layout.
// Concept only: dimensions marked as placeholders must be measured before fabrication.

$fn = 96;

view_mode = "assembly"; // assembly, rotor, guard
show_led_markers = true;
show_guard_envelope = true;

// Confirmed project limits
blade_count = 2;
blade_active_length = 150;
led_count_per_blade = 21;

// Placeholder dimensions: replace only after physical measurement
blade_root_offset = 28;
blade_width = 22;
blade_thickness = 1.5;
beam_width = 16;
beam_thickness = 3;
hub_outer_diameter = 36;
hub_height = 10;
shaft_placeholder_diameter = 3.2;
motor_placeholder_diameter = 28;
motor_placeholder_height = 30;
slip_ring_placeholder_diameter = 22;
slip_ring_placeholder_height = 18;
electronics_envelope = [58, 32, 13];
guard_clearance = 25;
guard_height = 48;

rotor_radius = blade_root_offset + blade_active_length;
guard_radius = rotor_radius + guard_clearance;
beam_length = 2 * rotor_radius;

module motor_placeholder() {
    color([0.25, 0.25, 0.28])
        translate([0, 0, -motor_placeholder_height])
            cylinder(d=motor_placeholder_diameter, h=motor_placeholder_height);
}

module slip_ring_placeholder() {
    color([0.75, 0.55, 0.18])
        translate([0, 0, -8])
            difference() {
                cylinder(d=slip_ring_placeholder_diameter,
                         h=slip_ring_placeholder_height);
                translate([0, 0, -1])
                    cylinder(d=shaft_placeholder_diameter + 1,
                             h=slip_ring_placeholder_height + 2);
            }
}

module load_bearing_beam() {
    color([0.18, 0.20, 0.23])
        translate([0, 0, beam_thickness / 2])
            cube([beam_length, beam_width, beam_thickness], center=true);
}

module blade_plate(side = 1) {
    blade_center = side * (blade_root_offset + blade_active_length / 2);

    color([0.08, 0.35, 0.18])
        translate([blade_center, 0, beam_thickness + blade_thickness / 2])
            cube([blade_active_length, blade_width, blade_thickness], center=true);

    if (show_led_markers) {
        for (index = [0 : led_count_per_blade - 1]) {
            led_x = side * (
                blade_root_offset
                + 4
                + index * (blade_active_length - 8) / (led_count_per_blade - 1)
            );
            color([0.95, 0.82, 0.20])
                translate([led_x, 0, beam_thickness + blade_thickness])
                    cylinder(d=3.2, h=0.7);
        }
    }
}

module hub_placeholder() {
    color([0.45, 0.47, 0.50])
        difference() {
            cylinder(d=hub_outer_diameter, h=hub_height);
            translate([0, 0, -1])
                cylinder(d=shaft_placeholder_diameter, h=hub_height + 2);
        }
}

module electronics_placeholder() {
    color([0.05, 0.25, 0.55, 0.70])
        translate([
            -electronics_envelope[0] / 2,
            -electronics_envelope[1] / 2,
            hub_height + 2
        ])
            cube(electronics_envelope);
}

module rotor_concept() {
    load_bearing_beam();
    blade_plate(-1);
    blade_plate(1);
    hub_placeholder();
    slip_ring_placeholder();
    electronics_placeholder();
}

module guard_envelope() {
    color([0.35, 0.65, 0.90, 0.10])
        translate([0, 0, -motor_placeholder_height])
            cylinder(r=guard_radius,
                     h=guard_height + motor_placeholder_height);
}

if (view_mode == "rotor") {
    rotor_concept();
} else if (view_mode == "guard") {
    guard_envelope();
} else {
    motor_placeholder();
    rotor_concept();
    if (show_guard_envelope) {
        guard_envelope();
    }
}
