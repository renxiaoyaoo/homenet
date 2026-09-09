# Architecture

```text
Internet
   |
OpenWrt Gateway
   |-- Main LAN / daily Wi-Fi
   |-- IoT / Guest / Maintenance networks (optional)
   |-- Room AP or relay (optional)
   `-- Server runtime (optional)
         |-- DNS / Proxy
         |-- WireGuard / Cloudflare / Caddy
         |-- Home Assistant / MQTT / Zigbee
         `-- Kuma / HomeNet Ops / other services
```

OpenWrt 永远是网络边界和 DHCP 唯一事实源。常在线主机是可选扩展，不应成为基础局域网可用性的前提。Room AP 只扩展覆盖，不应创建第二套 DHCP。

一个 instance 由三个文件组成：

- `site.yaml`：网络、Wi-Fi、runtime、模块与远程入口。
- `devices.yaml`：固定 IP、MAC、主机名和在线预期。
- `services.yaml`：服务、端口、入口、运行位置和检查方式。

HomeNet Ops 使用同一 instance 生成设备、服务和拓扑，不维护第二份网络事实。
