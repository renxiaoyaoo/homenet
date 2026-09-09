# OpenWrt + Server Example

Use this profile when a Pi, mini PC or NAS can run DNS, Proxy, monitoring and remote-access services.

```sh
./homenet init --yes --name my-home --profile openwrt-pi
./homenet deploy --instance instances/my-home --output-dir runtime --force
./homenet doctor --instance instances/my-home
```

Edit the generated private instance before applying settings in OpenWrt or starting the server runtime.
