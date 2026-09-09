# HomeNet Public Package

这是 HomeNet 的公开 core，不包含任何真实家庭配置或密钥。

## 使用

```sh
./homenet init
./homenet deploy --instance instances/my-home --output-dir runtime --force
./homenet check --instance instances/my-home
./homenet doctor --instance instances/my-home
```

公开包包含 CLI、schema、示例 instance、Ops、runtime 模板和少量维护脚本。真实 `.env`、Wi-Fi 密码、代理订阅、token、私钥、数据库、证书、运行状态及真实家庭 instance 不包含在内。

## 验证

```sh
./homenet package-check --dir .
./homenet privacy --scope public
./homenet check --instance instances/example-openwrt-pi
./homenet check --instance instances/example-openwrt-only
```

部署职责与操作步骤见 `docs/deployment.md`，网络结构见 `docs/architecture.md`。
