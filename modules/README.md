# HomeNet Modules

`modules/catalog.yaml` is the public, versioned module definition layer for HomeNet.
`modules/artifacts.yaml` is the public, versioned artifact contract layer for those modules.
`modules/renderers.yaml` is the public, versioned renderer contract layer for those artifacts.
`modules/implementations.yaml` is the public, versioned implementation index for those
renderer contracts.

The catalogs describe product capabilities, supported runtimes, fallback behavior,
operator-owned surfaces, source-tool boundaries, artifact names, target paths, owners,
review renderer names, target classes, readiness status, implementation surfaces,
privacy classes, and risk classes. They must stay generic: no private domains, IP addresses, MAC addresses,
tokens, passwords, proxy subscriptions, cookies, rendered config values, or
deployment-specific runtime state.

Instance directories choose which modules are enabled and where they run. The module
catalog defines what those choices mean; the artifact catalog defines what review and
future apply surfaces each module owns; the renderer catalog defines which review
renderers cover those surfaces and whether they are deployable; the implementation
index records which current source surface backs each renderer and whether it still
lives behind centralized CLI code.

The CLI normal path reads these catalogs and normalizes them into reports,
profiles, module placement, registry, render preview, bundle, and CI surfaces.
Module metadata belongs here; code should stay thin and consume these catalogs.

`modules/renderers/` contains module-owned review renderer adapters as implementations
move out of the centralized CLI. These adapters must remain read-only and must not
read live infrastructure, resolve secrets, or write files.

`modules/renderers/common.py` is shared renderer library code for module-owned
adapters. It is not a runtime service and must stay free of deployment-instance
state, network probes, live writes, and secret lookup.

For human deployment and adoption steps, pair these module definitions with
`docs/source-tool-runbook.md`. The catalog says what each module owns; the
runbook says how an operator should back up, configure, verify, and roll back
the owning source tool without making HomeNet the live source of truth.
