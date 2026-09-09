# Publishing

只发布由 `homenet package` 导出的目录：

```sh
./homenet privacy --scope public
./homenet package --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public
```

检查通过后再提交公开仓库。禁止发布真实 instance、`.env`、token、订阅、私钥、数据库、证书、运行状态、备份和嵌套私有项目。
