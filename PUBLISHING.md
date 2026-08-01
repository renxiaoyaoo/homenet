# Publishing HomeNet

This workspace is a mixed public-core repository and private deployment
workspace. The root git repository may be pushed to the public HomeNet remote,
but only git-tracked public-core files are publishable. Private deployment
instances, runtime directories, nested private projects, and secrets must stay
ignored and untracked.

## Current State

- Public core boundary is implemented and checked by `homenet release`.
- Public package export is implemented and checked by `homenet package-check`.
- Local public repo creation is implemented by `homenet release-candidate` and
  `homenet repo-init`.
- The public repository remote is configured in git. Keep account-specific
  remote URLs out of reusable documentation when exporting a package.
- The latest recorded public release evidence is in
  `docs/public-release.json`.
- Future public-core pushes from this root should run the local privacy/check
  gates first.
- Exported public-package releases can still use the guarded package flow;
  final package push is guarded by `homenet repo-publish` and requires
  `--confirm-push PUSH-HOMENET-PUBLIC`.
- Live network writes remain disabled in HomeNet; source tools still own
  real OpenWrt, Cloudflare, Kuma, Home Assistant, Docker, and service state.

## Build A Candidate

Run this from the private workspace root:

```sh
./homenet release-candidate \
  --instance instances/my-home \
  --output-dir /tmp/homenet-public \
  --repo-dir /tmp/homenet-public-repo \
  --force
```

This writes only `/tmp/homenet-public` and
`/tmp/homenet-public-repo`. It does not add a remote, push, or write live
network configuration.

## Final Checks

```sh
./homenet privacy --scope public
./homenet ci --instance instances/my-home
./homenet publish-check --dir /tmp/homenet-public --work-dir /tmp/homenet-publish-check --force
```

## Publish From This Root

Use this path when `/home/pi/network` is the public HomeNet repo checkout:

```sh
./homenet privacy --scope public
./homenet check --instance instances/my-home
./homenet deploy --instance instances/my-home --force --check-idempotent
git status --short
git push origin main
```

Before pushing, confirm that private paths such as `instances/my-home/`,
`.env`, runtime service data, `mihomo/config.yaml`, and `sub/` are not tracked.

## Publish An Exported Package

Use this path when handing off a sanitized package to another public repo:

```sh
./homenet repo-publish \
  --instance instances/my-home \
  --dir /tmp/homenet-public \
  --repo-dir /tmp/homenet-public-repo \
  --remote <public-repo-url> \
  --confirm-push PUSH-HOMENET-PUBLIC \
  --force
```

Do not add private remotes, credential-bearing remotes, or remotes for nested
private projects to the HomeNet root. The root remote should point only at the
public HomeNet core repository.

## Keep Private

Do not publish real deployment instances, runtime directories, databases,
tokens, passwords, certificates, proxy subscriptions, WireGuard keys, Cloudflare
credentials, service exports, backups, or private Worker projects.
