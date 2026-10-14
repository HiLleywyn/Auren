# Auren comparison and coverage limits

Research reference: 2026-10-14, advertised US Starlink starting prices. Auren has working planning software, not a field-qualified broadband service. The table distinguishes a plausible first-market target from global equivalence; none of Auren's throughput or availability targets are demonstrated.

## Service categories

| Category | Starlink reference | Auren target or limitation |
| --- | --- | --- |
| Fixed residential | 100/200/Max tiers from $55/$85/$130 per month; lower tiers area-dependent; Max advertised 400+ Mbps | First target is peak 100/20 household access with useful busy-hour performance. Estimated local RTT 11–42 ms; no demonstrated equivalence. Cannot currently match Max peak or address independence. |
| Portability | Roam 100GB/300GB/Unlimited from $55/$80/$175 per month, plan/region travel restrictions | Reusable relay/CPE kits can be transported, but usable service needs surveyed local paths, permits, power and reachable terrestrial gateways. Not plug-in connectivity at arbitrary destinations. |
| Ground in-motion | Eligible terminals/plans support up to 100 mph with jurisdiction restrictions | Requires a separate antenna, tracking and handover prototype. High-gain fixed-home link budgets do not apply to a moving phone or car. Could pursue covered road corridors, not current national equivalence. |
| Maritime | Global Priority 50GB/500GB/1TB/2TB from $250/$650/$1,150/$2,150 per month | Shoreline or inland-water fixed/corridor links may be possible. Open-ocean service is not economical with the ground layer. Separate atmospheric transport would be required and is unresolved. |
| Aviation | General aviation local/global 50GB from $200/$1,000; terminal, aircraft and speed limits. Business regional 25GB/unlimited/global unlimited from $4,000/$12,500/$20,000 | No aircraft-qualified equipment, spectrum plan, air-to-ground design or certification. Not a first-market capability. A HAPS/air-to-ground extension needs its own economics and approvals. |
| Geographic reach | Advertised 160+ countries, territories and markets; licenses and restrictions still apply | Initial community coverage only. Ground land coverage at ideal 5 km radius needs about 1.9 million sites before terrain/capacity. Global atmospheric coverage at ideal 100 km service radius needs at least about 16,234 platforms before overlap/spares. Neither is a funded deployment plan. |
| Disaster response | Satellite upstream can remain useful when local terrestrial transport is lost | Auren may restore access where at least one terrestrial handoff survives or can be reached by permitted relays. Both gateways gone means no wider internet. This cannot be hidden by a healthy local mesh. |

Prices are not address quotes and allowances are not unlimited high-speed capacity. Use [official plans](https://starlink.com/service-plans), [maritime](https://starlink.com/business/maritime), [aviation](https://starlink.com/business/aviation), and the [source register](SOURCES.md) for restrictions and dated evidence. Do not map older general Starlink performance specifications directly onto new tier names.

## What could improve and what must be proved

Auren's strongest possible advantage is in clustered rural terrain with inexpensive terrestrial upstream: replaceable ground-serviceable equipment, reusable elevation, locally repairable modules, and routing that checks spare capacity before maintenance. A nearby terrestrial destination might have lower latency than a space relay, but carrier routing and congestion can erase that advantage. Test p50/p95/p99 idle and loaded latency against purchased comparable service.

The community baseline is about 33% of the favorable $55/month five-year reference, not the requested 25%. The $805/home mature-production scenario is invention-dependent and unquoted. No cost headline establishes equivalent capacity, congestion, coverage, availability, customer installation, or replacement burden.

## Closest alternatives

| Alternative | Prefer it when | Auren must beat |
| --- | --- | --- |
| Conventional fixed wireless ISP | Existing rooftops/towers have inexpensive clear paths and workable maintenance access | Include installation, sites, travel, climbing, spares, carrier access, and equivalent throughput/availability. Radio prices alone are not a useful comparison. |
| Fiber extension / PON | Dense adoption, usable ducts/poles, or affordable construction bids | Five-year all-in cost and expansion capacity. Fiber may eliminate radio/weather risks and provide much more sustained bandwidth. |
| Community mesh | Volunteers/community ownership and existing roofs support an affordable local network | Same staffing and support boundary. Free labor is not a provider-cost advantage if Auren charges for operations. |
| Commercial deployable mast | Temporary/permitted site access is needed and a certified rental/purchase is practical | Proven structure, setup time, repair burden, inspection, lifetime and insurance. The novel mechanism is unnecessary if it saves nothing. |
| Optical backhaul | Clear, stable paths allow high capacity with RF/fiber fallback | Include acquisition, pointing, eye safety, fog outages, dirty windows, and complete fallback capacity. A clear-weather speed test does not establish reliable service. |
| HAPS or balloons | Ground geometry cannot economically reach the population | Persistent station-keeping, winter energy, capacity per watt, replenishment, regulation and fleet cost; regional trials are not global equivalence |

Obtain ordinary WISP and fiber bids before fabricating the mast. The invention earns its role only if measured height or maintenance gains exceed the added mechanism, certification, anchors, weather exposure and operating costs.
