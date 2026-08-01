# Mihomo Ops

这里放的是树莓派本机 Mihomo 的运维脚本。

- `update-mihomo-config.sh`：拉取线上配置，变化时校验并热更新

这些脚本只负责本机 Mihomo 服务，不参与 Cloudflare Worker 构建，也不读取其他服务目录里的内部文件。

`update-mihomo-config.sh` 在成功应用新配置后，还会主动清理 `fakeip` 和 `dns` 缓存，避免旧解析状态继续影响家里本机流量。

本机私有更新参数默认放在 `/home/pi/.config/secrets/mihomo-update.env`：

- `MIHOMO_CONFIG_URL`：完整线上配置 URL，包含 `CONFIG_TOKEN`
- `MIHOMO_SECRET`：本机 Mihomo controller secret

可以从模板开始创建：

```sh
install -m 600 /home/pi/network/maintenance/mihomo/mihomo-update.env.example /home/pi/.config/secrets/mihomo-update.env
```

`MIHOMO_UPDATE_ENV=/path/to/file` 可以覆盖默认路径。仓库内的 `maintenance/mihomo/mihomo-update.env` 只保留公开占位值，作为旧部署兼容 fallback，不应放真实 token 或 controller secret。

状态文件在 `/home/pi/network/maintenance/state/mihomo-config-update/`：

- `config.etag`：最近下载到本地文件的远端 ETag
- `headers`：最近一次下载响应头
- `lock/`：更新进程锁目录

systemd timer 每 60 秒执行一次检查。脚本按 `config.etag` 发 `If-None-Match`，服务端返回 `304` 或相同 ETag 时直接跳过。

如果本地文件已经是新内容，但运行中的 Mihomo 还没应用，可以手动执行一次：

```sh
bash /home/pi/network/maintenance/mihomo/update-mihomo-config.sh --force
```

这只 reload 当前本地配置并清理缓存，不重新下载配置。

## systemd 安装

仓库备份：

```text
/home/pi/network/maintenance/mihomo/update-mihomo-config.sh
/home/pi/network/maintenance/mihomo/mihomo-update.env.example
/home/pi/network/maintenance/systemd/mihomo-config-update.service
/home/pi/network/maintenance/systemd/mihomo-config-update.timer
```

系统运行位置：

```text
/etc/systemd/system/mihomo-config-update.service
/etc/systemd/system/mihomo-config-update.timer
```

固定名备份：

```sh
sudo cp /etc/systemd/system/mihomo-config-update.service /etc/systemd/system/mihomo-config-update.service.bak
sudo cp /etc/systemd/system/mihomo-config-update.timer /etc/systemd/system/mihomo-config-update.timer.bak
```

从仓库恢复到系统：

```sh
sudo install -m 644 /home/pi/network/maintenance/systemd/mihomo-config-update.service /etc/systemd/system/mihomo-config-update.service
sudo install -m 644 /home/pi/network/maintenance/systemd/mihomo-config-update.timer /etc/systemd/system/mihomo-config-update.timer
sudo systemctl daemon-reload
sudo systemctl enable --now mihomo-config-update.timer
```

验证：

```sh
systemctl status mihomo-config-update.timer
journalctl -u mihomo-config-update.service -n 100 --no-pager
```
