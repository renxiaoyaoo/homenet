# Contributing

Keep HomeNet small. A change must support initialization, deployment generation, validation, diagnosis, routing, privacy, packaging, or HomeNet Ops. Do not add speculative planners, compatibility aliases, duplicate status models, or commands that only describe future work.

Before submitting:

```sh
python3 -m compileall -q tools
./homenet check --instance instances/example-openwrt-pi
./homenet check --instance instances/example-openwrt-only
./homenet privacy --scope public
./homenet package --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public
```

Use placeholders in examples. Never commit a real instance, `.env`, token, subscription, private key, database, certificate, session, runtime state, backup, MAC address, account identifier, or private hostname.
