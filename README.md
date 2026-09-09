# HomeNet

HomeNet 是一套轻量、可复用的家庭网络方案：OpenWrt 负责 Gateway、DHCP、Firewall 和 Wi-Fi；可选的 Pi、mini PC 或 NAS 承载 DNS、Proxy、Remote Access、Monitoring 与家庭服务。

公开仓库保存通用 core。每个家庭用一个私有 instance 描述自己的网络，真实密码、token、订阅、数据库和运行数据不进入 Git。

## 能力

- `openwrt-only`：只使用 OpenWrt。
- `openwrt-pi`：OpenWrt 加常在线 Linux 主机。
- DNS split 与透明 Proxy 可插拔。
- WireGuard、Cloudflare Tunnel/Access 等远程入口可插拔。
- Maintenance Wi-Fi 为网络故障保留低依赖检修通道。
- HomeNet Ops 提供日常状态、设备、服务、拓扑和临时分流。

## 最短路径

```sh
git clone <repository-url>
cd homenet
./homenet init
./homenet deploy --instance instances/my-home --output-dir runtime --force
./homenet check --instance instances/my-home
./homenet doctor --instance instances/my-home
```

`init` 是交互式的，相同答案重复执行不会改动文件。`deploy` 生成私有 runtime 草案并验证幂等性，不会静默修改路由器或云服务。

## 日常命令

```sh
./homenet status --instance instances/my-home
./homenet status --instance instances/my-home --live
./homenet doctor --instance instances/my-home
./homenet routing status
```

- `check`：检查 instance 结构与引用。
- `status`：显示网络、Wi-Fi、设备、服务和可选在线状态。
- `doctor`：只显示当前在线故障；无故障时保持简短。
- `routing`：查看临时分流，并将确认后的规则写入永久规则源。
- `metadata`：供 HomeNet Ops 使用的内部 JSON 接口。

## 目录

```text
apps/ops/       HomeNet Ops
instances/      示例与私有家庭实例
maintenance/    少量明确归属的维护脚本
schemas/        instance schema
templates/      server runtime 模板
tools/          轻量 CLI 实现
runtime/        本机生成状态，不进入 Git
```

私有部署通常还会在工作目录产生 `docker-compose.yml`、`.env`、`adguard/`、`mihomo/`、`wg-easy/` 等运行文件；它们不属于公开 core。

## 部署边界

HomeNet 不用一个巨大执行器接管所有系统：

- OpenWrt 配置在 OpenWrt/LuCI/UCI 中生效。
- Server runtime 使用 Docker Compose 和 systemd。
- Mihomo、AdGuard、Kuma、Cloudflare、Home Assistant 各自仍是配置事实源。
- HomeNet 负责初始化、生成、幂等验证、状态汇总和排障。

这种边界避免一次部署错误同时破坏 WAN、Wi-Fi、DNS 和远程入口。

## 发布

```sh
./homenet privacy --scope public
./homenet package --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public
```

发布检查会验证公开包边界、隐私、Python 编译和两个示例 instance。

详细说明：

- [架构](docs/architecture.md)
- [部署](docs/deployment.md)
- [维护](docs/maintenance.md)
- [安全](SECURITY.md)
- [贡献](CONTRIBUTING.md)
