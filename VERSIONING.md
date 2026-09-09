# Versioning

HomeNet follows semantic versioning.

- Major: instance schema or CLI behavior changes incompatibly.
- Minor: a new optional capability or supported deployment shape.
- Patch: fixes that preserve instance and command behavior.

The public Git repository versions reusable code, schema, examples, docs, Ops, templates, and maintenance helpers. Private instances, runtime configuration, data, secrets and nested private projects are not versioned by the public repository.

Release verification:

```sh
./homenet version
./homenet privacy --scope public
./homenet package --output-dir /tmp/homenet-public --force
./homenet publish-check --dir /tmp/homenet-public
```
