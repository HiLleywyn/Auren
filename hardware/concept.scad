// AUREN: CONCEPT VISUALIZATION ONLY. NOT A QUALIFIED MANUFACTURING DRAWING.
// No material strength, joints, anchors, lock geometry or load certification implied.
// Units: mm. Render with OpenSCAD. Low-height test article requires engineering review.
height_mm = 12000;
bay_mm = 1000;
width_mm = 450;
chord_mm = 30;

module member(a,b,diameter=20) {
  hull() { translate(a) sphere(d=diameter,$fn=12); translate(b) sphere(d=diameter,$fn=12); }
}
module tower() {
  vertices = [[-width_mm/2,-width_mm/3],[width_mm/2,-width_mm/3],[0,width_mm*2/3]];
  for (i=[0:2]) {
    member([vertices[i][0],vertices[i][1],0],[vertices[i][0],vertices[i][1],height_mm],chord_mm);
    for (z=[0:bay_mm:height_mm-bay_mm]) {
      j=(i+1)%3;
      member([vertices[i][0],vertices[i][1],z],[vertices[j][0],vertices[j][1],z+bay_mm],12);
      member([vertices[i][0],vertices[i][1],z],[vertices[j][0],vertices[j][1],z],12);
    }
  }
}
color([0.3,0.45,0.6]) tower();
for (angle=[0,120,240]) rotate([0,0,angle]) {
  color([0.75,0.35,0.15]) member([0,0,height_mm*.85],[height_mm*.5,0,0],10);
  translate([height_mm*.5,0,-80]) cube([300,300,160],center=true);
}
// Two lifting collars represented as blocks; their load-bearing mechanism is unresolved.
for (z=[600,1400]) color([0.75,0.35,0.15]) translate([0,0,z]) difference() {
  cube([700,700,180],center=true); cube([500,500,220],center=true);
}
color([0.2,0.25,0.3]) translate([0,0,height_mm-200]) cube([700,400,300],center=true);
