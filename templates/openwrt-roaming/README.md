# OpenWrt Roaming

This optional template adds conservative client steering to an ESS made from multiple OpenWrt APs.

## Requirements

- The APs broadcast the same SSID and security settings.
- `ieee80211k=1` and `bss_transition=1` are enabled on each participating AP interface.
- The installed `wpad` binary includes WNM/802.11v support. `wpad-basic` may not include it.
- `usteer` instances can exchange updates over a shared management network.

## Roles

- Gateway: apply `usteer-gateway.uci` and replace `HOME_SSID`.
- Routed or relay AP: apply `usteer-room.uci`, replace `HOME_SSID`, and verify that `wwan` is its upstream management interface.

The templates do not reject associations, steer by load, or impose a global minimum signal. They request a neighbor scan below -67 dBm and attempt a transition below -72 dBm only when another AP is at least 12 dB better.

Apply the templates through UCI, commit, and restart only `usteer`. A Wi-Fi reload is required only when first enabling `bss_transition`.

## Validation

```sh
ubus call usteer local_info
ubus call usteer remote_hosts
ubus call usteer remote_info
ubus call usteer connected_clients
```

Each AP must list the other under `remote_hosts`. Validate roaming while moving a real client; a client appearing on two APs at once can be a stale driver association and must not be counted as a successful roam.
