# Firmware Policy

HomeNet firmware follows OpenWrt instead of becoming a separate distribution.
Device builds must satisfy these rules:

1. Use the current supported OpenWrt stable release as the source baseline.
   Pin an exact release commit so every published image is reproducible.
2. Keep the device adaptation minimal. Carry only hardware support that is not
   yet available upstream, and prefer submitting that support to OpenWrt.
3. Preserve the functions required by the deployed network: gateway or room AP
   operation, wireless backhaul where selected, both Wi-Fi bands, client
   roaming assistance, and a low-dependency maintenance path.
4. Keep firmware and site configuration separate. Images must not contain real
   SSIDs, passwords, addresses, domains, identifiers, tokens, subscriptions, or
   topology data. A private HomeNet instance applies site configuration later.
5. Maintain stable and candidate tracks. New OpenWrt releases and hardware
   patches are validated on a non-critical candidate device before promotion.
6. Produce a RAM-test image before an install image. Installation requires
   verified hardware identity, backup, recovery access, and a tested rollback
   path; build success alone never authorizes flashing.
7. Keep the image small and conventional. Prefer OpenWrt packages and native
   services over custom scripts, bundled dashboards, or speculative features.
8. Treat updates as an ongoing process. CI must detect patch drift, build from
   clean source, record manifests and checksums, and make supported OpenWrt
   security releases inexpensive to adopt.

Hardware profile names, partition handling, and recovery commands are
implementation decisions derived from the exact device. They are not fixed
product assumptions and must be revalidated when hardware or upstream support
changes.

