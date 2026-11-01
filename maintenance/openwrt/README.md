# OpenWrt Ops

主路由运行位置是 `/root/`。仓库里的脚本是可恢复副本。

## 常用脚本

- `mihomo-policy-on.sh`：把需要代理的 LAN 流量策略路由到 Pi。
- `mihomo-policy-off.sh`：移除 LAN 到 Pi 的策略路由。
- `mihomo-watchdog.sh`：维持 Pi 代理/DNS 故障回退；另在 WAN 已连接但路由器本机对两个公网地址连续约 5 分钟不可达时，仅重拨 WAN 一次，重拨间隔至少 30 分钟。不会重启路由器或无线。检查记录：`logread | grep mihomo-watchdog`。
- `wifi-radio1-guard.sh`：主路由 5G radio1 启动失败后的重试。开机 45 秒后才检查；仅在 radio1 未起来时执行 `wifi up radio1`，两次尝试至少间隔 3 分钟，不重启已在线的无线。线上安装位置是 `/root/wifi-radio1-guard.sh`，cron 每分钟运行一次。
- `presence-report.sh`：OpenWrt / WRT Room presence 上报脚本。线上 `presence-watch` 每 5 秒检查一次，变化稳定约 8 秒后立即上报；cron 每分钟仅作心跳兜底。

## NSS / ECM

旧 QSDK 构建不能对所有设备套用同一 ECM 设置，应按设备角色验证：

- 带 PPPoE、策略路由和透明代理的网关保持 ECM 未加载，避免复杂流量进入
  旧版连接加速路径。代价是高吞吐 NAT 时 CPU 占用上升。
- 使用 QSDK 无线 STA 回程的中继设备保留 ECM 和 NSS redirect。关闭后若日志
  持续出现 `wlan1: NSS TX failed`，应立即恢复 `qca-nss-ecm`。

检查：

```sh
test -d /sys/module/ecm && echo loaded || echo disabled
cat /proc/sys/dev/nss/general/redirect 2>/dev/null
logread | grep 'NSS TX failed' | tail
```

## 主路由 5G 自愈

线上 cron：

```text
* * * * * . /etc/presence-watch.conf; export AP_NAME PRESENCE_MAC_MAP RECEIVER INACTIVE_LIMIT_MS; /root/presence-report.sh >/tmp/presence-report.log 2>&1
* * * * * /root/wifi-radio1-guard.sh >/tmp/wifi-radio1-guard.log 2>&1
```

实时 presence 服务：

```sh
cp presence-watch.conf.example /etc/presence-watch.conf
cp presence-watch.sh /root/presence-watch.sh
cp presence-watch.init /etc/init.d/presence-watch
chmod 755 /root/presence-watch.sh /etc/init.d/presence-watch
/etc/init.d/presence-watch enable
/etc/init.d/presence-watch start
```

检查：

```sh
cat /tmp/wifi-radio1-guard.last
wifi status radio1
iw dev wlan1 info
iw dev
```

回滚：

```sh
crontab -l | grep -v wifi-radio1-guard.sh | crontab -
rm -f /root/wifi-radio1-guard.sh /tmp/wifi-radio1-guard.log /tmp/wifi-radio1-guard.last /tmp/wifi-radio1-guard.attempt
/etc/init.d/cron restart
```

## 变更边界

不要把现有 main / IoT / guest SSID 改造成检修网；这些 SSID 已经有明确职责。

检修通道应使用独立 Ops SSID 和独立 maintenance subnet，不要复用 Guest / IoT / 主 LAN。

完整架构、Wi-Fi 用途、Ops 检修网、验证和回滚边界维护在公开 runbook：

```text
/home/pi/network/docs/maintenance.md
```
