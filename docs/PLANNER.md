# Auren workbench methods

Version 0.2 adds itemized cost reports, a monthly adoption model, sampled terrain profiles, and validated JSON import/export. All inputs are estimates. The workbench can reject a proposed deployment; it cannot qualify a real network, structure, spectrum allocation, or service guarantee.

## Cost boundaries

The full-adoption table reproduces `src/model.mjs`: capital, permits, upstream, sites, power, paid staff, maintenance, insurance, monitoring, financing, customer equipment, installation, support, replacements, and allocated development. Household electricity is included in total cost but excluded from provider cash flow. Starlink's internal provider costs are not known; the reference is the spend to buy comparable service.

Default comparison: advertised US Starlink 100 tier at $55/month, zero upfront cost, estimated 42.5 W terminal power at the same electricity price. Price checked 2026-10-14. Address eligibility, tax, subsequent price changes, actual throughput and availability need separate confirmation. An imported `comparatorMonthly` changes that reference; it must not be used to select a more expensive tier without an equivalent service requirement.

Initial equipment tax is optional. Replacement tax, income tax, customer acquisition, bad debt, inflation, carrier construction, and full-time standalone staffing are not modeled automatically. Add allowances or use supplier/accounting bids before investment. A $6,000 financing line is an estimate, not a loan schedule.

## Monthly adoption model

For month index `m` beginning at zero, target `N`, opening fraction `s`, and ramp `R`:

`active(m) = N * [s + (1-s) * min(1, m/R)]`

Full adoption with `s=1` does not require a ramp. Partial opening requires a nonzero ramp. Joining occurs at the start of each month. Fractional cohorts represent expected adoption, not partly connected households. Shared capital, permits, initial equipment tax, and financing are booked at opening. Shared operating costs run throughout the horizon. Customer kits, installation and allocated development are booked as cohorts join. Support, failure reserves and household power follow active subscriber-months.

Each cohort's kit is replaced after its specified lifetime while it remains inside the horizon. A replacement exactly at the end is excluded. Failure reserves remain separate; this budgeting convention may overestimate replacements that overlap with scheduled turnover. Replacements use the initial kit price without escalation or replacement tax.

Revenue is the illustrative monthly retail charge times active homes. No household equipment prepayment is assumed in this cash-flow model. If equipment is prepaid, change the commercial model before sizing financing. Peak funding assumes monthly costs precede that month's revenue. Sustained recovery is the first modeled month with nonnegative cash balance that stays nonnegative through the remaining horizon; it is not profitability, discounted return, or a financing guarantee.

At full adoption the forecast's provider costs plus household power exactly reproduce the constant-adoption total. With delayed adoption, use cost per active subscriber-month and compare the same number of purchased Starlink months. Do not divide by eventual target customers and imply everyone received five years of service.

Slower adoption can reduce initial kit outlay as well as reduce revenue. Its effect on peak funding is not necessarily monotonic. Failed capacity or terrain gates still invalidate the economic deployment premise.

## Capacity and carrier checks

Reference payload efficiency 0.65, DL/UL split 75/25, spatial reuse 0.8, and 20% reserve remain explicit estimates. Channel bandwidth and combined modulation efficiency are configurable. Aggregate demand must fit both access capacity and one surviving terrestrial carrier, with reserve. The calculation does not establish per-sector placement, legal channel access, simultaneous RF link scheduling, physical carrier diversity, or a qualified real topology.

The failure-routing model on the overview page is a separate synthetic two-hub network. It must not be treated as the workbench scenario's deployment design. A real pilot needs measured access assignments, link capacities and failure domains before any maintenance planning.

## Terrain profile

CSV columns are `distance_m,obstruction_m`. Distances strictly increase and stay within the entered link length. Obstruction heights are measured above the straight line connecting endpoint ground elevations, not tree height above local ground. The initial parser accepts nonnegative heights; below-datum samples can conservatively be represented as zero, not as a claim that the real ground is flat.

The default nine zero-height points are synthetic flat-ground examples. They are not a survey. Clearance is evaluated only at supplied points using k=4/3 Earth and 60% of the first Fresnel zone. The drawn lines interpolate for readability; they do not prove clearance between samples. An empty profile is unknown. A proper survey needs sufficiently spaced terrain, vegetation, building and seasonal observations with traceable coordinates and datum conversion.

The selected channel bandwidth affects both access capacity and receiver thermal noise. Radio power, gains, frequency, required SNR and reserve remain the documented reference assumptions. Rain uses ITU-R P.838-3 for a uniform horizontal path, not an annual outage model. Mast heights are analytical inputs, not approved construction dimensions.

## Report format and trust

JSON uses schema `auren-plan-v1`, model version, parameters, itemized estimates, forecast, radio/terrain results, gates and limitations. Import accepts only known parameter fields within bounds; any saved outputs or claimed approvals are ignored and recalculated. The engine never promotes imported evidence to measured results. Numerical quarter-cost, field service equivalence, and physical authorization are distinct fields. Proven quarter-cost and physical movement remain false in this software.

CSV contains numerical monthly forecasts. Scenario titles never enter spreadsheet cells, avoiding title-based formula injection. Markdown design files, conceptual OpenSCAD geometry, and empty field/terrain templates are available in the local document library. The site uses no external scripts, analytics, persistent browser storage, upload endpoint, or equipment interface. Downloaded reports may still contain private assumptions: do not put precise home locations or confidential bids in public issues.

## Reproduction and limits

Run `npm test`, `npm run check`, `npm run build`, and `npm run report`. `src/planner.mjs` is the browser and test implementation. Local tests check baseline reconciliation, cohort/lifetime boundaries, bad input rejection, no invented field proof, CSV safety, and import round trips. Passing software tests is not a physical validation or independent audit.
