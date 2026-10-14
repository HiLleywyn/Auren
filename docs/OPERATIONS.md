# Build and operations

## Local

Node >=22, zero external runtime dependencies. `npm test`, `npm run check`, `npm run build`, `npm run serve`. Default preview binds 127.0.0.1:5190. No external scripts, fonts, tracking, database or API keys are required. Local calculations and synthetic planner never contact equipment.

Version 0.2 adds `/workbench.html`, `/partners.html`, and `/docs/index.html`. Build-time rendering publishes all thirteen design documents and only an explicit set of downloadable Markdown/CAD/CSV assets. The static server does not serve the repository itself. `/release.json` and `/healthz` identify the software version and simulation-only boundary.

## Container

Build from repository root after static build:

```sh
docker build -f ops/Dockerfile -t auren-web:0.2.0 .
docker run -d --name auren-web --restart unless-stopped --init --read-only --tmpfs /tmp:size=16m,noexec,nosuid --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 128m --cpus 0.5 -p 127.0.0.1:5191:8080 auren-web:0.2.0
```

Only a new task-owned container is used. No other applications are stopped or renamed. Check `/healthz`, source modules, Content-Security-Policy and visible interactions. The container serves only `dist`, not repository secrets or runtime files.

## Public hosting

Static `dist` can be served from owner-controlled hosting. GitHub Pages is not selected as a commercial business host; see [GitHub Pages limits](https://docs.github.com/en/enterprise-cloud%40latest/pages/getting-started-with-github-pages/github-pages-limits). No ChatGPT Sites registration or hosting dependency is used.

Owner requested auren.so. Inspect existing DNS and origin before writing. Use a distinct application/tunnel/Worker deployment where practical and preserve unrelated routes. Public exposure is the read-only site, never a hardware controller or administration endpoint. Do not weaken Cloudflare login/security or reuse tunnel credentials as an account API key.

Cloudflare OAuth/API credentials must be read in process memory, never command arguments, logs, source, issue bodies, or browser code. `.runtime/`, `.env*`, key files and build output are ignored. Expired authentication requires reconnecting; publication is not complete merely because configuration code exists.

## Mail

auren.so currently has Proton MX records. Cloudflare Email Routing would generally require its own MX records and can disrupt existing Proton delivery. Adding sales@auren.so should use the existing Proton mail administration or an explicitly reviewed mail migration. Do not change domain-wide MX to add a single alias. Until the alias is verified, public contact remains support@dyadic.app.

## Verification and recovery

Record the released commit and test results. Keep task-only screenshots under ignored `outputs/`. Replace task-owned containers recoverably when upgrading; preserve user workloads. Any public temporary preview is explicitly non-production and not the requested permanent domain. Do not call a sales page a sale, or a simulated controller a fabricated mast.

GitHub-hosted checks currently cannot start because the owner's account has a billing lock. Local test success does not mean hosted CI is green. Resolving that account issue is an owner action; no billing settings or payments are changed by deployment.
