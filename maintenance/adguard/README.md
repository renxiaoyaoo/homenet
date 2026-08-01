# AdGuard 运维

AdGuard Home 监听服务器 LAN 地址的 `53` 端口。Main Wi-Fi 实例当前是 `192.168.50.5:53`；其他部署以自己的 `site.yaml` server host 为准。

DNS 分工：

- 国内域名：`upstream-domestic.conf` 指向 `119.29.29.29` 和 `223.5.5.5`，返回真实 IP。
- 其他域名：默认上游 `127.0.0.1:1053`，交给 Mihomo DNS / fake-ip。

AdGuard `dns.upstream_mode` 使用 `parallel`，国内域名同时请求两个国内上游，取先返回的结果。这样单个上游抖动时不会拖慢微信支付、理财通等 App 内页面。

DNS 缓存使用 `cache_ttl_min: 60` 和 `cache_optimistic: true`，减少 App 频繁重复解析时的等待；源站 TTL 更长时仍按源站 TTL 缓存。

更新国内域名分流文件：

```sh
bash /home/pi/network/maintenance/adguard/update-domestic-upstreams.sh --reload
```

安装每天自动更新：

```sh
sudo install -m 644 /home/pi/network/maintenance/systemd/adguard-domestic-upstreams.service /etc/systemd/system/adguard-domestic-upstreams.service
sudo install -m 644 /home/pi/network/maintenance/systemd/adguard-domestic-upstreams.timer /etc/systemd/system/adguard-domestic-upstreams.timer
sudo systemctl daemon-reload
sudo systemctl enable --now adguard-domestic-upstreams.timer
```

验证：

```sh
ssh -F none root@192.168.50.1 'killall -HUP dnsmasq'
ssh -F none root@192.168.50.1 'nslookup aweme.snssdk.com 127.0.0.1'
ssh -F none root@192.168.50.1 'nslookup github.com 127.0.0.1'
```

预期国内域名返回真实 IP，国外域名仍可返回 Mihomo fake-ip `198.18.0.0/15`。
