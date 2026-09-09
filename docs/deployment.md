# Deployment

## 新家庭

1. 运行 `./homenet init`，选择 `openwrt-only` 或 `openwrt-pi`。
2. 检查生成的 `site.yaml`、`devices.yaml`、`services.yaml`。
3. 运行 `./homenet deploy --instance instances/my-home --output-dir runtime --force`。
4. 在 OpenWrt 中按 instance 配置 LAN、DHCP、Firewall 和 Wi-Fi。
5. 有 server runtime 时，填写私有 `.env`，按生成的 Compose 启动选中的服务。
6. 每完成一层运行 `./homenet doctor --instance instances/my-home`。

## 已有家庭

先把现状写入 instance，不要先重置设备。静态 `check` 通过后，按 OpenWrt、DNS/Proxy、server runtime、remote access 的顺序逐层核对；每层只在自己的 source tool 中修改。

## 幂等

- 相同参数重复 `init` 返回 `unchanged`。
- 相同 instance 重复 `deploy` 生成相同内容。
- 输出目录有人工修改时，除非明确 `--force`，否则拒绝覆盖。
- 私密值只进入本机 `.env` 或服务原生 secret store。

`deploy` 不跨系统自动写 OpenWrt、Cloudflare 或 Home Assistant。这样能保持实现轻量，并避免一个错误切断整个家庭网络。
