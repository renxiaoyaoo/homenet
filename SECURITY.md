# Security Policy

HomeNet manages home network declarations and review artifacts. Treat
private deployment data as sensitive even when it looks like ordinary YAML,
Markdown, or shell configuration.

## Supported Scope

Security reports for the public core can cover:

- secret or private-data exposure in public examples, docs, templates, or CI
- unsafe defaults that could publish real network data
- commands that could write live network state without explicit confirmation
- package or repo-publish behavior that could include private runtime files

The public core does not include real deployment secrets, runtime databases,
certificates, proxy subscriptions, private Workers, or local service state.

## Do Not Share Private Values

Do not include real values in public issues, pull requests, discussions, logs,
or screenshots. This includes:

- Wi-Fi passwords and SSIDs tied to a real home
- API tokens, Cloudflare credentials, cookies, sessions, and private keys
- proxy subscription URLs, node provider URLs, and WireGuard keys
- real domains, public IPs, device serial numbers, MAC addresses, and hostnames
- Home Assistant, Kuma, OpenWrt, AdGuard, Mihomo, Docker, or database exports

Use placeholders such as `example.net`, `192.168.50.0/24`,
`REPLACE_WITH_TOKEN`, and `password1`.

## Before Publishing

Run these checks from the repository root:

```sh
./homenet privacy --scope public
./homenet ci --instance instances/example-openwrt-pi
./homenet package --instance instances/example-openwrt-pi --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public --work-dir /tmp/homenet-publish-check --force
```

Before pushing an exported public repo, use:

```sh
./homenet repo-publish --dir /tmp/homenet-public --repo-dir /tmp/homenet-public-repo --remote <public-repo-url> --force
```

That command audits the package and repo without pushing unless
`--confirm-push PUSH-HOMENET-PUBLIC` is provided. Plan mode is intentionally
lightweight; add `--run-publish-check` for a full dry-run audit. Confirmed push
runs the full publish check automatically before touching `origin`.

## Reporting

If a report contains private deployment details, do not open a public issue.
Remove or replace the private values first, then report the sanitized behavior
and the command output shape. If private values may already have been exposed,
rotate the affected secrets before continuing.
