# HomeKit cellular control unavailable

## Symptom

Apple Home could control Home Assistant accessories on the home Wi-Fi, but the
same accessories were unavailable over cellular data.

## Diagnosis

The Apple TV home hub keeps an APNs connection to
`*.push.apple.com` over TCP 443 or 5223. The HomeKit bridge, local discovery,
and the Apple TV Wi-Fi link were healthy, while the remote home-hub channel was
the failing layer. Closing the old APNs connection caused the Apple TV to
establish a fresh `DIRECT` connection and cellular control recovered.

The available evidence does not distinguish a stale APNs session from an
earlier routing mismatch. Treat direct routing as a required invariant, not as
proof that proxy routing was the sole cause of this incident.

## Fix

- Pin `DOMAIN-SUFFIX,push.apple.com,DIRECT` before dynamic and generic proxy
  rules.
- Keep the iCloud and Apple rule providers before dynamic routing overlays.
- Preserve this ordering whenever HomeNet Ops or the Mihomo updater rewrites the
  runtime configuration.
- Expose the current Apple TV APNs route in HomeNet Ops network diagnostics.

## Verification

The Mihomo connection table must show the Apple TV connection to
`*.push.apple.com:443` or `*.push.apple.com:5223` with chain `DIRECT`. If it shows a proxy chain, cellular
Home control may fail even though local Wi-Fi control still works.
