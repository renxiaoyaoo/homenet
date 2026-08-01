# Contributing

HomeNet is a review-first home network operations project. Keep changes
small, explain the operational reason, and preserve the public/private boundary.

## Before Opening A Change

Run the public gates from the repository root:

```sh
./homenet privacy --scope public
./homenet ci --instance instances/example-openwrt-pi
./homenet ci --instance instances/example-openwrt-only
```

For package or release changes, also run:

```sh
./homenet package --instance instances/example-openwrt-pi --output-dir /tmp/homenet-public
./homenet publish-check --dir /tmp/homenet-public --work-dir /tmp/homenet-publish-check --force
```

## Keep Private Data Out

Do not commit:

- real deployment instances outside `instances/example-*`
- Wi-Fi passwords, API tokens, private keys, cookies, sessions, or proxy subscriptions
- runtime data, service databases, certificates, backups, or generated caches
- private Cloudflare Workers, private subscription projects, or local operator overrides

Use placeholders such as `example.net`, `192.168.50.0/24`, `REPLACE_WITH_*`,
and `password1` in examples and tests.

## Live Network Changes

HomeNet public core is read-only by default. Live changes belong to source
tools such as OpenWrt, Mihomo, AdGuard, Kuma, Cloudflare, WireGuard, Docker, or
systemd until a module executor is explicitly write-enabled and guarded.

When adding a future write path, include:

- source-tool ownership
- dry-run behavior
- backup or rollback contract
- live verification command
- privacy/secret handling
