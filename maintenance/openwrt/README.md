# OpenWrt Ops

主路由运行位置是 `/root/`。仓库里的脚本是可恢复副本。

## 常用脚本

- `mihomo-policy-on.sh`：把需要代理的 LAN 流量策略路由到 Pi。
- `mihomo-policy-off.sh`：移除 LAN 到 Pi 的策略路由。
- `wifi-radio1-guard.sh`：主路由 5G radio1 自愈脚本。用于处理停电后来电时 `radio1` 偶发 `retry_setup_failed`、`wlan1` 未以 AP 方式起来、或 `Room backhaul` 未起来的问题。线上安装位置是 `/root/wifi-radio1-guard.sh`，cron 每 2 分钟运行一次。
- `presence-report.sh`：OpenWrt / WRT Room presence 上报脚本。线上 cron 每 2 分钟运行一次，减少日志噪声，同时保留“谁在家、连在哪个 AP”的日常判断。

## 主路由 5G 自愈

线上 cron：

```text
*/2 * * * * AP_NAME=main /root/presence-report.sh >/tmp/presence-report.log 2>&1
*/2 * * * * /root/wifi-radio1-guard.sh >/tmp/wifi-radio1-guard.log 2>&1
```

检查：

```sh
cat /tmp/wifi-radio1-guard.last
wifi status radio1
iw dev wlan1 info
iw dev wlan1-2 info
```

回滚：

```sh
crontab -l | grep -v wifi-radio1-guard.sh | crontab -
rm -f /root/wifi-radio1-guard.sh /tmp/wifi-radio1-guard.log /tmp/wifi-radio1-guard.last
/etc/init.d/cron restart
```

## 变更边界

不要把现有 main / IoT / guest SSID 改造成检修网；这些 SSID 已经有明确职责。

检修通道应使用独立 Ops SSID 和独立 maintenance subnet，不要复用 Guest / IoT / 主 LAN。

完整架构、Wi-Fi 用途、Ops 检修网、验证和回滚边界维护在公开 runbook：

```text
/home/pi/network/docs/source-tool-runbook.md
```
