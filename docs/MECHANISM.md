# Adaptive relay mechanism: concept review

**Not a construction drawing or structural approval.** `hardware/concept.scad` is a parameterized visual model only. No mast has been fabricated, load tested or certified.

## Functional hypothesis

1. Short triangular truss bays travel stacked with replaceable joints and positive mechanical locks.
2. Two alternating collars support and jack the assembled mast at the base while another bay is inserted at ground level.
3. Three or more guy systems with force sensing pay out under a reviewed deployment sequence. Required intermediate guy levels and anchor footprint are unresolved.
4. Positive locks carry static load. Loss of control power must not cause descent; locking has independent confirmation, not just a software flag.
5. A separate guided equipment carriage descends for cartridge replacement without dismantling the structure.
6. Retraction follows an approved sequence after traffic relocation and structural clearance, not an arbitrary remote height command.

Initial low-height mechanism test precedes two 12 m experimental relays. The 12–30 m operational objective is not a certified design. Existing roofs or towers should be used whenever cheaper and safer; the mechanism must earn its advantage.

## Interfaces requiring actual design

| Interface | Requirement | Unresolved work |
| --- | --- | --- |
| Bay joint | Repeatable alignment, positive load transfer, inspectable lock | Fatigue, tolerance stack, corrosion, manufacturability |
| Lifting collar | Cannot release the last supporting lock | Interlocked load paths, jam recovery, overload protection |
| Guy reel | Controlled tension during movement, static fail-safe | Brake design, force calibration, redundancy, intermediate guys |
| Ground anchor | Verified site-specific holding load | Soil, saturation, frost, installation test, footprint and permits |
| Equipment carriage | Captured guide and independent fall restraint | Cable management, jam detection, retrieval, connector lifetime |
| Radio/optical head | Low wind area, repeatable aiming, replaceable | Tracking, pointing jitter, seal/ice resistance, power/fiber routing |
| Safety control | Independent stop/lock path, locally supervised | Hardware architecture and third-party qualification |

## Screening loads

Assume effective projected area 2.2 m², drag coefficient 1.2, wind 40 m/s, air density 1.225 kg/m³. `F=.5*rho*Cd*A*v²` -> ~2.6 kN. A 27 m guy attachment with 15 m horizontal anchor distance can imply ~5.3 kN guy tension before dynamic, pretension, ice and safety factors. Screening anchor proof requirement could exceed 15 kN. Effective area must include all antennas, mast members, cables and ice.

For a 30 mm OD / 2 mm wall aluminum chord with E=69 GPa and 1 m effective buckling length, ideal Euler load is ~11.8 kN. At 2 m it drops to ~3 kN. Real joints, bracing, eccentric loads, imperfections, deployment stages and global buckling require structural analysis; the ideal calculation is not an allowable load.

## Kill criteria

- Deployment needs a crane or routinely requires climbing: core operational hypothesis weakened.
- Lock failure can produce uncontrolled movement: stop mechanism development until redesigned.
- Wind/anchor footprint prevents cheap sites: reject that market, do not reduce safety factors.
- Paid maintenance or five-year cost exceeds a conventional qualified structure: use the conventional structure.
- Raising height does not materially increase qualified paying demand: no geometry advantage.

## Qualification sequence

Independent structural engineer reviews load cases, materials, joints, anchors, deployment stages, fatigue, environmental degradation, recovery procedures, applicable structural codes and permits. Start low, in an exclusion zone, with redundant restraints and no public load exposure. Test repeated lock cycles and power loss before taller work. Public-site deployment is prohibited until a real design and approvals exist.
