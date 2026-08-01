# TProxy Ops

这里放树莓派侧透明代理接管脚本。

- `mihomo-gateway.sh`：配置本机 IPv4 TProxy 接管规则
- `mihomo-tproxy-route.sh`：配置本机 TProxy 路由表和 IPv6 接管规则

配套 service 在 `/home/pi/network/maintenance/systemd/`。

## 当前职责

树莓派本机只接管已经被 OpenWrt 策略路由送过来的流量：

- IPv4：`PREROUTING -> MIHOMO -> TPROXY 127.0.0.1:7892`
- IPv6：只接管 OpenWrt LAN MAC 来源的流量，避免树莓派本机 IPv6 流量被自己二次接管
- 本机 `lo`、私网、组播、链路本地地址直接 RETURN
- 目标是树莓派本机地址的入站流量直接 RETURN，包括 WireGuard、Caddy、Home Assistant 等本机服务
- IPv6 LAN 前缀变化不影响本机入站服务放行；脚本仍记录并排除当前 LAN `/64` 前缀作为局域网保护

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

## 固定名备份

不要带时间戳，便于出问题时直接知道该回滚哪个文件：

```bash
sudo cp /usr/local/bin/mihomo-gateway.sh /usr/local/bin/mihomo-gateway.sh.bak
sudo cp /usr/local/bin/mihomo-tproxy-route.sh /usr/local/bin/mihomo-tproxy-route.sh.bak
sudo cp /etc/systemd/system/mihomo-gateway.service /etc/systemd/system/mihomo-gateway.service.bak
sudo cp /etc/systemd/system/mihomo-tproxy-route.service /etc/systemd/system/mihomo-tproxy-route.service.bak
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
sudo ip6tables -t mangle -S MIHOMO6
ip rule show
ip route show table 100
ip -6 route show table 100
systemctl status mihomo-gateway.service
systemctl status mihomo-tproxy-route.service
```

正常状态下，IPv4 `MIHOMO` 链保留私网/保留地址/本机地址 RETURN 和 TCP/UDP TPROXY；IPv6 `MIHOMO6` 链保留本地/链路本地/ULA/组播/本机地址/LAN 前缀 RETURN，以及 OpenWrt MAC 来源的 TCP/UDP TPROXY。
