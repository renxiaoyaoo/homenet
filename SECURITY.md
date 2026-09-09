# Security

HomeNet public files contain no deployment secrets. Store real values in an ignored `.env`, service-native secret store, or a private instance repository.

Before every public push:

```sh
./homenet privacy --scope public
./homenet package --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public
```

Do not paste or report secret values. A security report should identify only the affected path, line, and risk type until a private remediation channel is available.
