# Engineering budgets

Revision 0.1. Every Auren result below is calculated from estimates. Reproduce with `npm run report`; formulas live in `src/model.mjs`. Field qualification supersedes these screening models.

## Fixed access link

5.8 GHz; 30 MHz; 36 dBm EIRP at each end; hub gain 19 dBi, customer gain 23 dBi; 2 dB extra losses; 6 dB noise figure. US PtMP high-gain power reduction applies, not the fixed-PtP exception. Regulatory/certification compliance is a separate review.

`FSPL = 92.45 + 20 log10(f_GHz) + 20 log10(d_km)`

`Noise = -174 + 10 log10(B_Hz) + NF`

At 5 km: path loss 121.7 dB; downlink -64.7 dBm; uplink -68.7 dBm; noise -93.2 dBm; clear-path SNR 28.5/24.5 dB. Customer conducted power is approximately 13 dBm, hub approximately 17 dBm. Feed loss and certified antenna implementation still matter.

Use an estimated required SNR of 18 dB plus 6 dB reserve for a screening gate. This is not a vendor modulation guarantee or a measured fading distribution.

| Range | Downlink dBm | Uplink dBm | Uplink SNR dB |
| --- | ---: | ---: | ---: |
| 2 km | -56.7 | -60.7 | 32.5 |
| 5 km | -64.7 | -68.7 | 24.5 |
| 10 km | -70.7 | -74.7 | 18.5 |
| 20 km | -76.7 | -80.7 | 12.5 |

Begin at 2–5 km qualified paths. A detectable link at 20 km is not a 100 Mbps service claim.

## Terrain, obstruction and curvature

`r_F = sqrt(lambda*x*(D-x)/D)`; initial clearance fraction 0.6. At 5 km midpoint, Fresnel radius is ~8.0 m and required clearance ~4.8 m.

`bulge = x*(D-x)/(2*R_effective)` with `R_effective = 4/3*6,371,000 m`. Midpoint bulges: 0.37 m at 5 km, 1.47 m at 10 km, 5.89 m at 20 km. Effective refractivity varies; the 4/3 factor is not universal.

The example 30 m hub / 6 m CPE has ~33 km radio horizon, but RF margin and terrain restrict useful access. A midpoint 20 m tree line blocks the 5 km example. An obstruction close to a customer may defeat even a much higher distant tower.

`pathClearance` expects obstructions above the straight endpoint ground datum, not local-ground heights without elevation conversion. Empty survey input returns unknown. It is not Longley-Rice, a foliage/diffraction model, or an actual coverage map.

## Spectrum and antennas

Initial US access: three 30 MHz sectors in 5.725–5.850 GHz with guard space, permitted device/channel settings and professional installation where required. Backbone uses a separate permitted band, fiber, or separately licensed link. Spatial reuse estimate 0.7–0.9; reference 0.8. Co-channel sidelobes, nearby operators and access/backbone coupling must be measured.

A large fixed customer gain cannot be assumed for a moving phone or vehicle. A 12 dBi mobile antenna loses 11 dB receive gain versus the fixed 23 dBi example, reducing equal-SNR range by about 3.55x. Tracking, mobility-compatible radio software and handover need their own prototype. Maritime/aviation certification and spectrum are not included in the first deployment.

## Capacity and demand

Combined two-stream modulation/coding efficiency: estimated 9 bits/s/Hz; scheduling/protocol payload efficiency 0.65; DL/UL allocation 75/25.

`30 MHz * 9 * .65 = 175.5 Mbps aggregate/sector` -> 131.625 down / 43.875 up. Twelve sectors at 0.8 reuse -> 1,263.6 down / 421.2 up. 240 homes averaging 4/.8 Mbps -> 960/192 Mbps busy-hour demand.

20 homes/sector: peak oversubscription ~15:1. Four heavy 25 Mbps downloaders plus sixteen 1 Mbps users need 116 Mbps. All twenty bulk downloaders share ~6.6 Mbps each before other bottlenecks. This is 100/20 peak residential service, not guaranteed simultaneous 100/20 for everyone.

Capacity gate requires 20% reserve. The calculator's aggregate gate is necessary, not sufficient: actual user placement, individual sectors, carrier bottlenecks and N-1 fabric all need qualification. Doubling subscriber count without infrastructure is invalid.

Each community gateway targets 2 Gbps terrestrial service. A fallback RF path serving sixty homes must demonstrate >=300/75 Mbps net. Optical healthy-state capacity cannot justify an undersized fallback.

## Routing model

`src/topology.mjs` applies common-sink fractional max-flow to separate down/up budgets, with explicit failed edges, carrier failure domains, headroom and optical fog outages. Node failure does not erase stranded demand. This is not a multi-commodity packet scheduler, RF interference solver, latency model or availability proof. Edge down/up inputs must already represent feasible simultaneous bandwidth allocations.

## Latency

Estimated nearby-destination RTT: access 2–6 ms; <=2 backbone hops 1–4; routing/shaping 1–2; carrier/internet 5–20; controlled queuing 2–10 -> 11–42 ms. Internet destination and congestion dominate uncertainty. Measure p50/p95/p99 both idle and loaded; no global latency superiority is claimed.

## Power and storage

Hub estimate 75 W (range 50–120): 1.8 kWh/day. Storage at .8 usable fraction and .9 conversion: 1.25 kWh for 12 hours, 7.5 kWh for 72. A 1 kW PV array at 3 peak-sun-hours and .75 delivered efficiency gives 2.25 kWh/day, not a multi-day darkness guarantee. Grid plus battery is the initial deployment assumption; off-grid kits must be repriced.

Home estimate 14 W normal; two fully powered radios may use more. Measure backup-radio duty cycling and detection delay. CPE battery performance and cold-weather charging need separate checks.

## Optical hypothesis

Illustrative 5 km link: TX 10 dBm, full-angle divergence 100 microradians, Gaussian beam radius ~.25 m, receive aperture .10 m diameter, 6 dB coupling/optics, 2.5 dB atmosphere, 3 dB pointing. Captured fraction `1-exp(-2*.05²/.25²)` -> ~11.1 dB geometric loss -> -12.6 dBm receiver power.

This is a hypothesis for a 1 Gbps-class experiment, not a priced certified receiver. Single-mode coupling, turbulence, sunlight, window contamination, eye safety and steering dynamics can invalidate the margin. Assumed dense fog at 30 dB/km gives 150 dB over 5 km; RF or fiber must carry traffic. Do not infer annual availability from clear-weather operation.

## Rain and availability

ITU-R P.838-3 computed coefficients at 5.8 GHz: horizontal k=.00055999, alpha=1.61415; vertical k=.00040056, alpha=1.58511. `gamma=k*R^alpha`. Uniform 5 km path loss: 50 mm/h ~1.55/0.99 dB; 100 mm/h ~4.74/2.96 dB. Rain cells are not necessarily uniform; wet foliage, ice, multipath and alignment require site-specific work using P.530.

99.9% is a target (8.76 h/year outage), not measured Auren availability. A provisional budget allocates ~8 h to CPE, site power, links, carriers, maintenance and common-mode storms. A 99.0–99.9% pre-measurement range is more honest. Independent-path math cannot remove shared ducts, flooding or the household's own outage.
