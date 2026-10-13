// Printable split of the fan-style POV enclosure for a 220 x 220 mm bed.
// Rotor plane X-Z, motor axis Y, base on Z=0. Units: mm.
// Printed pieces locate/support the real polycarbonate shields; they are not
// themselves an impact-rated guard.

$fn = 72;
part = "assembly";
export_part = 0;
show_hardware = true;

// Strength revision 2026-10-09.  All printable load-carrying skins and
// connector sections are at least 1.30x their previous thickness.  Hole
// diameters and hole centres remain unchanged so the existing hardware layout
// is preserved.
strength_scale = 1.30;

// Main envelope, matching fan-style-housing.scad.
rotor_r = 178;
guard_inner_r = 203;
guard_radial_wall = 14 * strength_scale;
guard_outer_r = guard_inner_r + guard_radial_wall;
guard_depth = 76;
axis_z = 273;
base_size = [390,260,38];
base_top = [348,222];
base_y = 18;
base_wall = 3.2 * strength_scale;
base_floor = 4 * strength_scale;
cover_t = 4 * strength_scale;

// Snap-in DC rocker switch opening. It is placed on the rear-right sidewall,
// away from the cable outlets and ballast pockets. Nominal panel cut-out 28 x 12 mm.
switch_cutout = [28,12];
switch_x = 82;
switch_y = base_y + base_size[1]/2 - 1;
switch_z = 20;

// Hardware clearances.
m3 = 3.4;
m4 = 4.5;
boss_d = m3 + 2 * ((11 - m3) / 2) * strength_scale;
pedestal_boss_d = m4 + 2 * ((13 - m4) / 2) * strength_scale;
fit_gap = 0.35;

pcb = [128.651,48.260,1.6];
pcb_center = [0,28,11];

// Measured wireless-power components. Dimensions are physical envelopes in mm.
// The fixed transmitter carrier is referenced from the motor mounting plane.
// The receiver carrier is fixed to the rotating blade hub using its two M3 ears.
tx_coil_od = 42.4;
tx_coil_id = 20.3;
tx_coil_t = 2.3;
tx_board = [18,10.2,3];
rx_coil_od = 43;
rx_coil_id = 20.2;
rx_coil_t = 1.2;
rx_board = [14,27.7,4.4];
coil_face_gap = 3;
// Pair of coil leads: 8 mm chord, 20 degree central separation. The absolute
// rotation is intentionally adjustable until the final motor reference is set.
coil_lead_chord = 8;
coil_lead_span = 20;
coil_lead_radius = coil_lead_chord/(2*sin(coil_lead_span/2));
// 0 deg is +X in the coil plane. Leads face -Z (toward the pedestal).
coil_lead_rotation = -90;
// Three motor phase wires leave together; reserve this cable-channel width.
motor_phase_bundle_w = 8;

// Measured A2212/13T motor interface.  Motor axis is Y; its mounting face is
// y=0 and the shaft begins at y=29.5.  The two available mounting holes are
// opposite on X and accept M2.5 hardware (M2.9 clearance in the printed part).
motor_od = 27.81;
motor_mount_hole_spacing = 32.8;
motor_mount_hole_d = 2.65;
motor_mount_clear_d = 2.9;
motor_shaft_start_y = 29.5;
motor_shaft_end_y = 40.6;

// Printable coil-carrier clearances and retention dimensions.
coil_fit = 0.35;
coil_holder_wall = 2.4 * strength_scale;
carrier_center_bore = 13.0; // clears the 12.06 mm prop adapter
carrier_m3_clear = 3.4;

pedestal_depth = 58;
pedestal_y = 25;
pedestal_split_z = 158;
motor_plate_d = 92;
motor_plate_t = 9 * strength_scale;
motor_plate_attach_r = 31;
motor_mount_r = 17.5; // VERIFY on the real metal X-mount
motor_slot_l = 8;

ring_depth = 10 * strength_scale;
ring_segments = 8;
segment_angle = 360/ring_segments;
shield_standoff = (guard_depth-ring_depth)/2;

lid_points = [
    [-150,base_y-62], [150,base_y-62],
    [-150,base_y+62], [150,base_y+62],
    [-72,base_y-94], [72,base_y-94],
    [-72,base_y+94], [72,base_y+94]
];

pedestal_bolts = [
    [-68,4],[-34,4],[34,4],[68,4],
    [-68,44],[-34,44],[34,44],[68,44]
];

seam_x_holes = [
    [-25,base_y-66],[25,base_y-66],
    [-25,base_y+66],[25,base_y+66]
];
seam_y_holes = [
    [-105,base_y-25],[-105,base_y+25],
    [105,base_y-25],[105,base_y+25]
];

module ellipse_disc(size,h) {
    scale([size[0],size[1],h]) cylinder(d=1,h=1);
}

module ellipse_frustum(bottom,top,h) {
    hull() {
        ellipse_disc(bottom,0.8);
        translate([0,0,h-0.8]) ellipse_disc(top,0.8);
    }
}

module base_outer() {
    translate([0,base_y,0]) ellipse_frustum([base_size[0],base_size[1]],base_top,base_size[2]);
}

module base_common_holes() {
    for (p=seam_x_holes) translate([p[0],p[1],-0.1]) cylinder(d=m4,h=base_floor+1);
    for (p=seam_y_holes) translate([p[0],p[1],-0.1]) cylinder(d=m4,h=base_floor+1);
    for (p=pedestal_bolts) translate([p[0],p[1],-0.1]) cylinder(d=m4,h=base_size[2]+2);
    // Two bolts retain each steel ballast plate.
    for (sx=[-1,1],dx=[-20,20])
        translate([sx*150+dx,base_y,-0.1]) cylinder(d=m4,h=base_floor+1);
    // Widely spaced rubber feet.
    for (x=[-166,166],y=[base_y-90,base_y+90])
        translate([x,y,-0.1]) cylinder(d=m4,h=base_floor+1);
}

module base_shell() {
    difference() {
        union() {
            difference() {
                base_outer();
                translate([0,base_y,base_floor])
                    ellipse_frustum([base_size[0]-2*base_wall,base_size[1]-2*base_wall],
                                     [base_top[0]-2*base_wall,base_top[1]-2*base_wall],
                                     base_size[2]);
            }
            // Lid screw columns.
            for (p=lid_points)
                translate([p[0],p[1],base_floor])
                    cylinder(d=boss_d,h=base_size[2]-base_floor);
            // Reinforcement under pedestal bolts.
            for (p=pedestal_bolts)
                translate([p[0],p[1],base_floor])
                    cylinder(d=pedestal_boss_d,h=base_size[2]-base_floor);
            // PCB rails.
            for (sy=[-1,1])
                translate([-pcb[0]/2-2.6,
                           pcb_center[1]+sy*(pcb[1]/2+1)-1.95,
                           base_floor])
                    cube([pcb[0]+5.2,3*strength_scale,5*strength_scale]);
        }
        for (p=lid_points)
            translate([p[0],p[1],base_size[2]-30]) cylinder(d=2.8,h=31);
        base_common_holes();
        // Fixed metal ballast plates, one per side.
        for (sx=[-1,1])
            translate([sx*150-36,base_y-25,base_floor]) cube([72,50,12]);
        // Power and service cable slots.
        translate([-10,base_y+base_size[1]/2-8,10]) cube([20,18,15]);
        translate([-22,base_y-base_size[1]/2-6,12]) cube([44,18,12]);
        // Rear-right opening for a snap-in DC-rated rocker switch.
        // X = 28 mm, Z = 12 mm, opening passes fully through the rear wall.
        translate([switch_x-switch_cutout[0]/2,switch_y-12,
                   switch_z-switch_cutout[1]/2])
            cube([switch_cutout[0],24,switch_cutout[1]]);
    }
}

module quadrant_clip(sx=1,sy=1) {
    translate([sx>0 ? fit_gap/2 : -500,
               sy>0 ? base_y+fit_gap/2 : -500,
               -5])
        cube([sx>0 ? 500 : 500-fit_gap/2,
              sy>0 ? 500 : base_y+500-fit_gap/2,
              500]);
}

module base_quadrant(sx=1,sy=1) {
    intersection() { base_shell(); quadrant_clip(sx,sy); }
}

module cover_full() {
    difference() {
        translate([0,base_y,base_size[2]]) ellipse_disc(base_top,cover_t);
        for (p=lid_points)
            translate([p[0],p[1],base_size[2]-0.1]) cylinder(d=m3,h=cover_t+0.2);
        for (p=pedestal_bolts)
            translate([p[0],p[1],base_size[2]-0.1]) cylinder(d=m4,h=cover_t+0.2);
        for (x=[-55:11:55],y=[10:11:54])
            translate([x,y,base_size[2]-0.1]) cylinder(d=5,h=cover_t+0.2);
    }
}

module cover_quadrant(sx=1,sy=1) {
    intersection() { cover_full(); quadrant_clip(sx,sy); }
}

module seam_plate() {
    plate_d = m4 + (20-m4)*strength_scale;
    plate_h = 4*strength_scale;
    difference() {
        hull() for (x=[-25,25]) translate([x,0,0]) cylinder(d=plate_d,h=plate_h);
        for (x=[-25,25]) translate([x,0,-0.1]) cylinder(d=m4,h=plate_h+0.2);
    }
}

module pedestal_profile() {
    polygon([[-100,base_size[2]],[100,base_size[2]],[41,axis_z-45],
             [46,axis_z],[-46,axis_z],[-41,axis_z-45]]);
}

module pedestal_raw() {
    difference() {
        translate([0,pedestal_y,0]) rotate([90,0,0])
            linear_extrude(height=pedestal_depth,center=true) pedestal_profile();
        // Lightening/cable window.
        translate([0,pedestal_y,0]) rotate([90,0,0])
            linear_extrude(height=pedestal_depth+2,center=true)
                polygon([[-33,base_size[2]+32],[33,base_size[2]+32],
                         [20,axis_z-89],[-20,axis_z-89]]);
        for (p=pedestal_bolts)
            translate([p[0],p[1],base_size[2]-1]) cylinder(d=m4,h=18);
        // Holes for two join plates across the horizontal split.
        for (x=[-31,31],z=[pedestal_split_z-18,pedestal_split_z+18])
            translate([x,pedestal_y,z]) rotate([90,0,0])
                cylinder(d=m4,h=pedestal_depth+2,center=true);
        // Four through-bolts clamp the motor plate to the pedestal head.
        for (a=[45,135,225,315])
            translate([motor_plate_attach_r*cos(a),pedestal_y,
                       axis_z+motor_plate_attach_r*sin(a)])
                rotate([90,0,0]) cylinder(d=m4,h=pedestal_depth+2,center=true);
    }
}

module pedestal_lower() {
    intersection() { pedestal_raw(); translate([-250,-100,0]) cube([500,250,pedestal_split_z-fit_gap/2]); }
}

module pedestal_upper() {
    intersection() { pedestal_raw(); translate([-250,-100,pedestal_split_z+fit_gap/2]) cube([500,250,300]); }
}

module pedestal_join_plate() {
    plate_d = m4 + (14-m4)*strength_scale;
    plate_h = 5*strength_scale;
    difference() {
        hull() for (x=[-31,31],z=[-18,18]) translate([x,z,0]) cylinder(d=plate_d,h=plate_h);
        for (x=[-31,31],z=[-18,18]) translate([x,z,-0.1]) cylinder(d=m4,h=plate_h+0.2);
    }
}

module motor_plate() {
    difference() {
        rotate([90,0,0]) cylinder(d=motor_plate_d,h=motor_plate_t,center=true);
        rotate([90,0,0]) cylinder(d=16,h=motor_plate_t+2,center=true);
        // Adjustable motor X-mount slots.
        for (a=[0:90:270])
            rotate([0,a,0]) translate([motor_mount_r,0,0])
                hull() for (dx=[-motor_slot_l/2,motor_slot_l/2])
                    translate([dx,0,0]) rotate([90,0,0])
                        cylinder(d=m3,h=motor_plate_t+2,center=true);
        // Four cardinal spoke joints.
        for (a=[0:90:270])
            translate([(motor_plate_d/2-9)*cos(a),0,(motor_plate_d/2-9)*sin(a)])
                rotate([90,0,0]) cylinder(d=m4,h=motor_plate_t+2,center=true);
        // Four diagonal pedestal attachment bolts.
        for (a=[45,135,225,315])
            translate([motor_plate_attach_r*cos(a),0,motor_plate_attach_r*sin(a)])
                rotate([90,0,0]) cylinder(d=m4,h=motor_plate_t+2,center=true);
    }
}

module sector_2d(r1,r2,a1,a2,steps=18) {
    polygon(concat(
        [for (i=[0:steps]) [r2*cos(a1+(a2-a1)*i/steps),r2*sin(a1+(a2-a1)*i/steps)]],
        [for (i=[steps:-1:0]) [r1*cos(a1+(a2-a1)*i/steps),r1*sin(a1+(a2-a1)*i/steps)]]));
}

module guard_segment(with_spoke=false) {
    difference() {
        linear_extrude(height=ring_depth)
            sector_2d(guard_inner_r,guard_outer_r,-segment_angle/2,segment_angle/2);
        // Joint holes near both ends.
        for (a=[-segment_angle/2+4,segment_angle/2-4])
            translate([(guard_inner_r+7)*cos(a),(guard_inner_r+7)*sin(a),-0.1])
                cylinder(d=m4,h=ring_depth+0.2);
        // Front/rear polycarbonate standoff hole.
        translate([(guard_inner_r+7)*cos(12),(guard_inner_r+7)*sin(12),-0.1])
            cylinder(d=m3,h=ring_depth+0.2);
        if (with_spoke)
            translate([guard_inner_r+3,0,-0.1]) cylinder(d=m4,h=ring_depth+0.2);
    }
}

module guard_joint_plate() {
    joint_h = 4*strength_scale;
    difference() {
        linear_extrude(height=joint_h)
            sector_2d(guard_inner_r+1,guard_outer_r-1,-6,6,10);
        for (a=[-4,4])
            translate([(guard_inner_r+7)*cos(a),(guard_inner_r+7)*sin(a),-0.1])
                cylinder(d=m4,h=joint_h+0.2);
    }
}

module spoke() {
    spoke_l = guard_inner_r-(motor_plate_d/2)+10;
    spoke_d = m4 + (14-m4)*strength_scale;
    spoke_h = 8*strength_scale;
    difference() {
        hull() for (x=[0,spoke_l]) translate([x,0,0]) cylinder(d=spoke_d,h=spoke_h);
        translate([5,0,-0.1]) cylinder(d=m4,h=spoke_h+0.2);
        translate([spoke_l-5,0,-0.1]) cylinder(d=m4,h=spoke_h+0.2);
    }
}

module shield_spacer() {
    spacer_d = m3 + (10-m3)*strength_scale;
    difference() {
        cylinder(d=spacer_d,h=shield_standoff);
        translate([0,0,-0.1]) cylinder(d=m3,h=shield_standoff+0.2);
    }
}

// Cylinder whose axis is the motor axis (Y), rather than the print/export Z.
module y_cylinder(d,h,center=true) {
    rotate([90,0,0]) cylinder(d=d,h=h,center=center);
}

module tx_board_pocket(center_y, center_z, body_t) {
    // The board is held in a shallow forward-facing recess.  Its cable exits
    // downward, matching coil_lead_rotation=-90.
    translate([0,center_y + body_t/2 - tx_board[2]/2,
               center_z])
        cube([tx_board[0]+2*coil_fit,tx_board[2]+2*coil_fit,
              tx_board[1]+2*coil_fit],center=true);
}

// Fixed part: two thin side arms keep clear of the motor body and attach to
// the two measured motor mounting holes.  The coil lies at the start of the
// shaft, faces +Y, and is retained by a 1 mm printed rim.
module stationary_tx_carrier() {
    body_t = tx_coil_t + coil_holder_wall;
    coil_center_y = motor_shaft_start_y + tx_coil_t/2;
    // Rear face of TX coil is at the shaft-start plane; a solid wall sits
    // behind it.  This fixes the physical air gap independently of wall size.
    body_center_y = coil_center_y - coil_holder_wall/2;
    outer_d = tx_coil_od + 2*coil_holder_wall;
    board_z = -(tx_coil_od/2 + tx_board[1]/2 + coil_holder_wall);
    arm_d = 5.2;
    mount_x = motor_mount_hole_spacing/2;
    ring_arm_x = outer_d/2 - coil_holder_wall/2;

    difference() {
        union() {
            // Main coil ring and board lobe.
            translate([0,body_center_y,0]) y_cylinder(outer_d,body_t);
            hull() {
                translate([0,body_center_y,0]) y_cylinder(outer_d,body_t);
                translate([0,body_center_y,board_z])
                    cube([tx_board[0]+2*coil_holder_wall,body_t,
                          tx_board[1]+2*coil_holder_wall],center=true);
            }
            // Two arms run outside the motor envelope from its mounting face.
            for (sx=[-1,1]) hull() {
                translate([sx*mount_x,body_t/2,0]) y_cylinder(arm_d,body_t);
                translate([sx*ring_arm_x,body_center_y,0]) y_cylinder(arm_d,body_t);
            }
        }
        // Coil recess opens forward (+Y), leaving a solid rear wall.
        translate([0,coil_center_y + 0.05,0])
            y_cylinder(tx_coil_od+2*coil_fit,tx_coil_t+0.1);
        translate([0,body_center_y,0]) y_cylinder(carrier_center_bore,body_t+1);
        tx_board_pocket(body_center_y,board_z,body_t);
        // M2.5 mounting holes, deliberately slightly oversized for printing.
        for (sx=[-1,1])
            translate([sx*mount_x,body_t/2,0])
                y_cylinder(motor_mount_clear_d,body_t+1);
        // Cable window from coil to the board pocket, 8 mm wide.
        translate([-motor_phase_bundle_w/2,body_center_y,-outer_d/2-0.2])
            cube([motor_phase_bundle_w,body_t+1,outer_d/2-board_z+1]);
    }
}

// Rotating part: receiver coil faces -Y.  The long board sits in the lower
// lobe; two M3 lugs fasten this carrier to a blade hub/backing plate.
module rotating_rx_carrier() {
    body_t = rx_coil_t + coil_holder_wall;
    outer_d = rx_coil_od + 2*coil_holder_wall;
    board_z = -(rx_coil_od/2 + rx_board[1]/2 + coil_holder_wall);
    lobe_w = rx_board[0] + 2*(coil_holder_wall+4);
    lug_x = lobe_w/2 - 3.5;
    // The receiver PCB is 4.4 mm thick, so its lobe must be thicker than
    // the coil ring.  It projects on the rotor side (+Y) and retains the PCB
    // against a 3.1 mm inner wall instead of cutting through the carrier.
    board_lobe_t = rx_board[2] + coil_holder_wall;
    board_lobe_center_y = body_t/2 + board_lobe_t/2;

    difference() {
        union() {
            y_cylinder(outer_d,body_t);
            hull() {
                y_cylinder(outer_d,body_t);
                translate([0,board_lobe_center_y,board_z])
                    cube([lobe_w,board_lobe_t,
                          rx_board[1]+2*coil_holder_wall],center=true);
            }
        }
        // Recess opens toward the fixed transmitter (-Y).
        translate([0,-body_t/2 + rx_coil_t/2 - 0.05,0])
            y_cylinder(rx_coil_od+2*coil_fit,rx_coil_t+0.1);
        y_cylinder(carrier_center_bore,body_t+1);
        translate([0,board_lobe_center_y + board_lobe_t/2 - rx_board[2]/2 + 0.05,
                   board_z])
            cube([rx_board[0]+2*coil_fit,rx_board[2]+2*coil_fit,
                  rx_board[1]+2*coil_fit],center=true);
        // Two through-holes for M3 bolts into the printed blade hub/back plate.
        for (sx=[-1,1])
            translate([sx*lug_x,board_lobe_center_y,board_z])
                y_cylinder(carrier_m3_clear,board_lobe_t+1);
        // Receiver cable exit toward the board pocket.
        translate([-motor_phase_bundle_w/2,-body_t/2-0.1,-outer_d/2-0.2])
            cube([motor_phase_bundle_w,body_t+0.2,outer_d/2-board_z+1]);
    }
}

module coil_reference(outer_d,inner_d,thickness) {
    rotate([90,0,0])
        difference() {
            cylinder(d=outer_d,h=thickness,center=true);
            cylinder(d=inner_d,h=thickness+0.2,center=true);
        }
}

module coil_lead_reference(y) {
    for (a=[-coil_lead_span/2,coil_lead_span/2])
        translate([coil_lead_radius*cos(coil_lead_rotation+a),y,
                   coil_lead_radius*sin(coil_lead_rotation+a)])
            color([0.85,0.08,0.06,0.9]) sphere(d=1.2);
}

module motor_bundle_reference() {
    // Keep-out marker, not a printable cable clamp.
    color([0.08,0.08,0.08,0.85])
        translate([-motor_phase_bundle_w/2,-3,-30])
            cube([motor_phase_bundle_w,6,30]);
}

// Exportable inspection model: fixed transmitter, 3 mm face gap, rotating
// receiver. Board solids are deliberately separate because their wire exits
// and final angular positions are not yet measured.
module coil_stack_reference() {
    translate([0,-(coil_face_gap+tx_coil_t)/2,0])
        color([0.85,0.45,0.12,0.75]) coil_reference(tx_coil_od,tx_coil_id,tx_coil_t);
    translate([0,(coil_face_gap+rx_coil_t)/2,0])
        color([0.12,0.45,0.85,0.75]) coil_reference(rx_coil_od,rx_coil_id,rx_coil_t);
    coil_lead_reference(-(coil_face_gap+tx_coil_t)/2);
    coil_lead_reference((coil_face_gap+rx_coil_t)/2);
    motor_bundle_reference();
    translate([tx_coil_od/2+tx_board[0]/2+2,-(coil_face_gap+tx_coil_t)/2,0])
        color([0.10,0.45,0.18,0.8]) cube([tx_board[0],tx_board[2],tx_board[1]],center=true);
    translate([rx_coil_od/2+rx_board[0]/2+2,(coil_face_gap+rx_coil_t)/2,0])
        color([0.10,0.45,0.18,0.8]) cube([rx_board[0],rx_board[2],rx_board[1]],center=true);
}

// Inspection assembly only.  It places the holders at their axial design
// positions relative to the motor mounting plane; the real motor and coils
// remain purchased components.
module coil_carrier_assembly() {
    color([0.18,0.18,0.20,0.75])
        translate([0,motor_od/2,0]) y_cylinder(motor_od,motor_shaft_start_y);
    color([0.14,0.35,0.78,0.9]) stationary_tx_carrier();
    // TX front face: y = 29.5 + 2.3.  RX rear face is exactly 3 mm ahead.
    rx_coil_center_y = motor_shaft_start_y + tx_coil_t + coil_face_gap + rx_coil_t/2;
    rx_body_center_y = rx_coil_center_y + coil_holder_wall/2;
    color([0.85,0.40,0.10,0.9])
        translate([0,rx_body_center_y,0]) rotating_rx_carrier();
}

module assembly() {
    color([0.10,0.12,0.15]) base_shell();
    color([0.18,0.20,0.23]) cover_full();
    color([0.12,0.14,0.17]) pedestal_raw();
    translate([0,-7,axis_z]) color([0.08,0.10,0.12]) motor_plate();

    // Eight ring segments and four spokes.
    for (i=[0:ring_segments-1])
        translate([0,-12,axis_z]) rotate([90,0,0]) rotate([0,0,i*segment_angle])
            color([0.06,0.08,0.10]) guard_segment(i%2==0);
    for (a=[0:90:270])
        translate([0,-17,axis_z]) rotate([0,-a,0])
            translate([motor_plate_d/2-5,0,-4]) color([0.08,0.10,0.12]) spoke();

    if (show_hardware) {
        // Transparent shield references.
        for (y=[-guard_depth/2,guard_depth/2])
            color([0.45,0.75,0.95,0.14])
                translate([0,y,axis_z]) rotate([90,0,0])
                    cylinder(r=guard_inner_r-2,h=3,center=true);
        color([0.05,0.45,0.18,0.8])
            translate([-pcb[0]/2,pcb_center[1]-pcb[1]/2,pcb_center[2]]) cube(pcb);
        color([0.85,0.25,0.12,0.8])
            translate([0,-30,axis_z]) cube([356,3,16],center=true);
    }
}

// Numeric selector is reliable for Windows command-line STL export.
if (part=="base_fl" || export_part==1) base_quadrant(-1,-1);
else if (part=="base_fr" || export_part==2) base_quadrant(1,-1);
else if (part=="base_rl" || export_part==3) base_quadrant(-1,1);
else if (part=="base_rr" || export_part==4) base_quadrant(1,1);
else if (part=="cover_fl" || export_part==5) cover_quadrant(-1,-1);
else if (part=="cover_fr" || export_part==6) cover_quadrant(1,-1);
else if (part=="cover_rl" || export_part==7) cover_quadrant(-1,1);
else if (part=="cover_rr" || export_part==8) cover_quadrant(1,1);
else if (part=="seam_plate" || export_part==9) seam_plate();
else if (part=="pedestal_lower" || export_part==10) pedestal_lower();
else if (part=="pedestal_upper" || export_part==11) pedestal_upper();
else if (part=="pedestal_join_plate" || export_part==12) pedestal_join_plate();
else if (part=="motor_plate" || export_part==13) motor_plate();
else if (part=="guard_plain" || export_part==14) guard_segment(false);
else if (part=="guard_spoke" || export_part==15) guard_segment(true);
else if (part=="guard_joint" || export_part==16) guard_joint_plate();
else if (part=="spoke" || export_part==17) spoke();
else if (part=="shield_spacer" || export_part==18) shield_spacer();
else if (part=="coil_stack_reference" || export_part==19) coil_stack_reference();
else if (part=="stationary_tx_carrier" || export_part==20) stationary_tx_carrier();
else if (part=="rotating_rx_carrier" || export_part==21) rotating_rx_carrier();
else if (part=="coil_carrier_assembly" || export_part==22) coil_carrier_assembly();
else assembly();
