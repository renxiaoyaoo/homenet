# OpenWrt-only Example

Use this profile when all required networking runs on OpenWrt and there is no always-on server.

```sh
./homenet init --yes --name my-home --profile openwrt-only
./homenet deploy --instance instances/my-home --output-dir runtime --force
./homenet check --instance instances/my-home
```

The generated instance keeps server-only capabilities disabled.
