# TProxy Ops

这里放树莓派侧透明代理接管脚本。

- `mihomo-gateway.sh`：配置本机 IPv4 TProxy 接管规则
- `mihomo-tproxy-route.sh`：配置本机 IPv4 TProxy 路由表并清理旧 IPv6 接管规则

配套 service 在 `/home/pi/network/maintenance/systemd/`。

## 当前职责

树莓派本机只接管已经被 OpenWrt 策略路由送过来的流量：

- IPv4：`PREROUTING -> MIHOMO -> TPROXY 127.0.0.1:7892`
- 真实 IPv6 原生直连，不经过旁路 Pi；国外域名由 Mihomo fake-ip 返回 IPv4 后进入现有透明代理
- 本机 `lo`、私网、组播、链路本地地址直接 RETURN
- 目标是树莓派本机地址的入站流量直接 RETURN，包括 WireGuard、Caddy、Home Assistant 等本机服务
- 脚本会删除旧的 IPv6 fwmark、table 100 和 `MIHOMO6`，避免同一 LAN 旁路网关产生不对称 DIRECT 回程

UDP/443 不在 TProxy 脚本侧按域名或 IP 段额外放行。fake-ip 场景下，域名识别和分流统一交给 Mihomo 处理。

## 安装位置

仓库备份：

```text
/home/pi/network/maintenance/tproxy/mihomo-gateway.sh
/home/pi/network/maintenance/tproxy/mihomo-tproxy-route.sh
/home/pi/network/maintenance/systemd/mihomo-gateway.service
/home/pi/network/maintenance/systemd/mihomo-tproxy-route.service
```

系统运行位置：

```text
/usr/local/bin/mihomo-gateway.sh
/usr/local/bin/mihomo-tproxy-route.sh
/etc/systemd/system/mihomo-gateway.service
/etc/systemd/system/mihomo-tproxy-route.service
```

## 从仓库恢复到系统

```bash
sudo install -m 755 /home/pi/network/maintenance/tproxy/mihomo-gateway.sh /usr/local/bin/mihomo-gateway.sh
sudo install -m 755 /home/pi/network/maintenance/tproxy/mihomo-tproxy-route.sh /usr/local/bin/mihomo-tproxy-route.sh
sudo install -m 644 /home/pi/network/maintenance/systemd/mihomo-gateway.service /etc/systemd/system/mihomo-gateway.service
sudo install -m 644 /home/pi/network/maintenance/systemd/mihomo-tproxy-route.service /etc/systemd/system/mihomo-tproxy-route.service
sudo systemctl daemon-reload
sudo systemctl enable mihomo-gateway.service mihomo-tproxy-route.service
sudo systemctl restart mihomo-gateway.service mihomo-tproxy-route.service
```

## 验证

```bash
sudo iptables -t mangle -S MIHOMO
ip rule show
ip route show table 100
ip -6 rule show
systemctl status mihomo-gateway.service
systemctl status mihomo-tproxy-route.service
```

正常状态下，IPv4 `MIHOMO` 链保留私网/保留地址/本机地址 RETURN 和 TCP/UDP TPROXY；IPv6 不存在 fwmark table 100 规则，也不存在 `MIHOMO6` 链。
