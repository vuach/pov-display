// Printable split of the fan-style POV enclosure for a 220 x 220 mm bed.
// Rotor plane X-Z, motor axis Y, base on Z=0. Units: mm.
// Printed pieces locate/support the real polycarbonate shields; they are not
// themselves an impact-rated guard.

$fn = 72;
part = "assembly";
export_part = 0;
show_hardware = true;

// Main envelope, matching fan-style-housing.scad.
rotor_r = 178;
guard_inner_r = 203;
guard_outer_r = 217;
guard_depth = 76;
axis_z = 273;
base_size = [390,260,38];
base_top = [348,222];
base_y = 18;
base_wall = 3.2;
base_floor = 4;
cover_t = 4;

// Hardware clearances.
m3 = 3.4;
m4 = 4.5;
boss_d = 11;
fit_gap = 0.35;

pcb = [128.651,48.260,1.6];
pcb_center = [0,28,11];

pedestal_depth = 58;
pedestal_y = 25;
pedestal_split_z = 158;
motor_plate_d = 92;
motor_plate_t = 9;
motor_plate_attach_r = 31;
motor_mount_r = 17.5; // VERIFY on the real metal X-mount
motor_slot_l = 8;

ring_depth = 10;
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
                    cylinder(d=13,h=base_size[2]-base_floor);
            // PCB rails.
            for (sy=[-1,1])
                translate([-pcb[0]/2-2,pcb_center[1]+sy*(pcb[1]/2+1)-1.5,base_floor])
                    cube([pcb[0]+4,3,5]);
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
    difference() {
        hull() for (x=[-25,25]) translate([x,0,0]) cylinder(d=20,h=4);
        for (x=[-25,25]) translate([x,0,-0.1]) cylinder(d=m4,h=4.2);
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
                polygon([[-47,base_size[2]+24],[47,base_size[2]+24],
                         [27,axis_z-68],[-27,axis_z-68]]);
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
    difference() {
        hull() for (x=[-31,31],z=[-18,18]) translate([x,z,0]) cylinder(d=14,h=5);
        for (x=[-31,31],z=[-18,18]) translate([x,z,-0.1]) cylinder(d=m4,h=5.2);
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
    difference() {
        linear_extrude(height=4)
            sector_2d(guard_inner_r+1,guard_outer_r-1,-6,6,10);
        for (a=[-4,4])
            translate([(guard_inner_r+7)*cos(a),(guard_inner_r+7)*sin(a),-0.1])
                cylinder(d=m4,h=4.2);
    }
}

module spoke() {
    spoke_l = guard_inner_r-(motor_plate_d/2)+10;
    difference() {
        hull() for (x=[0,spoke_l]) translate([x,0,0]) cylinder(d=14,h=8);
        translate([5,0,-0.1]) cylinder(d=m4,h=8.2);
        translate([spoke_l-5,0,-0.1]) cylinder(d=m4,h=8.2);
    }
}

module shield_spacer() {
    difference() {
        cylinder(d=10,h=shield_standoff);
        translate([0,0,-0.1]) cylinder(d=m3,h=shield_standoff+0.2);
    }
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
else assembly();
