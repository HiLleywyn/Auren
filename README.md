# Auren

**Broadband, closer to earth.**

Auren is an experimental, satellite-free broadband architecture: modular elevated relays whose geometry and routes can change, with equipment that comes down to ground level for repair. All internet backhaul is terrestrial. A stratospheric extension is a separate, unresolved research programme.

**What exists:** reproducible engineering calculations, a synthetic failure-routing simulator, a simulation-only maintenance planner, a self-contained interactive website, conceptual CAD, and design/test/commercial documents.

**What does not exist:** a fabricated or certified Auren mast, a deployed Auren ISP, measured annual availability, proven 25%-of-Starlink costs, global coverage, a patentability opinion, or a physical actuator interface. No hardware deposits or broadband subscriptions are being accepted.

## Run it

Node.js 22 or later. No npm dependencies or installation required.

```sh
npm test
npm run check
npm run report
npm run build
npm run serve
```

Open http://127.0.0.1:5190. The static build is in `dist/`. Every website calculation uses the same modules as the CLI and tests.

## Design documents

| Document | Purpose |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Complete network, prior work, physical contribution and global limits |
| [Engineering budgets](docs/ENGINEERING.md) | Radio, terrain, spectrum, capacity, latency, weather and power |
| [Mast mechanism](docs/MECHANISM.md) | Concept, interfaces, unresolved loads and qualification gates |
| [Controller and safety](docs/SAFETY.md) | Fail-closed planning model; no physical actuation |
| [Economics](docs/ECONOMICS.md) | Transparent five-year cost assumptions and sensitivities |
| [Field experiments](docs/FIELD-TESTS.md) | Measurable pass/fail criteria and cheap falsifier |
| [Prototype BOM](docs/BOM.md) | Catalog prices versus fabrication allowances |
| [Development plan](docs/ROADMAP.md) | 30-day, 90-day and one-year gates |
| [Commercial programme](docs/COMMERCIAL.md) | Feasibility and pilot inquiries, not unbuilt hardware orders |
| [Sources](docs/SOURCES.md) | Primary-source register, dates and uncertainty |
| [Operations](docs/OPERATIONS.md) | Build, local preview, deployment and credential boundaries |

## Reference results

`npm run report` reproduces these from estimated inputs:

- 5 km, 5.8 GHz access: -64.7 dBm downlink, -68.7 dBm uplink; 13 dBm customer conducted transmit power.
- Twelve 30 MHz sectors: approximately 1.26 Gbps aggregate downlink after an assumed 0.8 spatial-reuse factor.
- 240-home five-year model: $1,179/home including household electricity, excluding concentrated R&D and tax.
- Favorable Starlink 100 Mbps reference: $3,579/home. Baseline ratio: approximately 33%, **not** the 25% target.
- Mature-production $805/home stretch case: a hypothesis, not a result or quote.

Estimated capacity does not establish availability, per-home throughput, a usable coverage map, or equivalent service. Source values and assumptions are in the design documents.

## Partner with Auren

Contact **support@dyadic.app** for feasibility or pilot discussions. Intended branded address: **sales@auren.so**, pending confirmation by the existing mail administrator. Scope, price, availability, and obligations require a separate written agreement; a message is not an order.

## Rights

Source-visible; commercial rights retained. See [RIGHTS.md](RIGHTS.md). Public disclosure is not a patent filing. The conceptual CAD is not an approved construction drawing.
