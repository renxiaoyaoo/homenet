# Maintenance

## 网络异常

```sh
./homenet doctor --instance instances/my-home
./homenet status --instance instances/my-home --live
```

从低层到高层检查：

1. 供电、光猫、OpenWrt WAN。
2. 主 Wi-Fi radio 与 Room AP 回程。
3. DHCP 和 DNS。
4. Proxy 与分流。
5. Server runtime。
6. Cloudflare/WireGuard 等外部入口。
7. 单台设备。

不要先批量重启或重置。Maintenance Wi-Fi 应绕开家庭 DNS/Proxy，并保留到 OpenWrt 和维护主机的访问。

## 事实源

- OpenWrt：WAN、DHCP、Firewall、Wi-Fi。
- AdGuard：DNS 查询和上游。
- Mihomo：代理节点、连接和规则。
- Docker/systemd：本机服务。
- Kuma：告警与历史。
- HomeNet Ops：当前状态、入口、设备、服务和拓扑。

## 维护脚本

`maintenance/` 只保留不能由 source tool 直接表达的少量任务。每个脚本必须有单一职责、明确调度方式、有限状态文件和失败后可恢复行为。
