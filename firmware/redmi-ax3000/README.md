# Redmi AX3000 Firmware

This optional build keeps firmware reproducible without mixing a home's private configuration into the image.

## Stable Track

The stable track is pinned to the QSDK release already validated on Redmi AX3000 and Xiaomi CR880x hardware. It keeps the existing wireless and NSS drivers while replacing `wpad-basic-wolfssl` with `wpad-wolfssl` and adding `usteer`.

Run the `Redmi AX3000 firmware` workflow manually and select the `stable` track. The workflow:

1. Checks out the upstream source at the pinned commit.
2. Installs and records the upstream feeds.
3. Applies the reviewed `stable.config` using the upstream branch's required multi-profile build mode.
4. Adds `wpad-wolfssl` and `usteer` and removes `wpad-basic-wolfssl`.
5. Verifies and publishes only the Redmi AX3000 factory image, manifest, build metadata, and SHA256 file as a workflow artifact.

The full source build is intentional. The upstream ImageBuilder feed omits several device-only Qualcomm firmware packages and cannot safely rebuild this profile.

The image contains no SSID, password, IP address, domain, token, or HomeNet instance data. Apply site-specific settings after installation.

## Safety Boundary

- Building an image is automatic; flashing is never automatic.
- The included dual-rootfs guard refuses `sysupgrade` unless both `rootfs` and
  `rootfs_1` exist as usable MTD devices.
- Keep a known-good factory image and its checksum before testing a new image.
- Validate package compatibility on a wired-recovery gateway before changing a wireless-only AP.
- Do not move to the mainline 5.15 track until its Wi-Fi/BDF behavior has been tested for the exact hardware revision.
- Recovery that changes NAND slots requires physical access, TFTP/U-Boot, or a previously verified dual-slot procedure.

The stable track remains intentionally conservative. Candidate builds never replace it automatically.

## Candidate Track

The candidate track is pinned separately to the upstream OpenWrt 23.05 / Linux 5.15 development branch. It uses the same full `wpad-wolfssl` and `usteer` package policy, but intentionally excludes QSDK NSS packages that the mainline branch does not support.

Select `candidate` only to build an image for a non-critical test router. The upstream status currently reports working boot, switch, CPU Ethernet, and Wi-Fi for Redmi AX3000, with these constraints:

- No NSS NAT or Wi-Fi offload.
- 5 GHz DFS channels can take about one minute to appear.
- Wireless station plus AP backhaul must be tested before promotion.
- A successful boot is not enough; LAN access, backhaul, both radios, DHCP pass-through, roaming, and reboot recovery must all pass.

The platform upgrade code writes the inactive rootfs and retains the previous slot. This protects against a boot failure, but a temporary network-aware rollback check is still required when first testing a candidate on a wireless-only AP.

Some installations expose one combined `rootfs` instead of two rootfs MTD
partitions. The generated image deliberately refuses in-place `sysupgrade` on
that layout. Restoring or changing a bootloader partition table is a separate,
physical-recovery operation and is never automated by this project.

## RAM-Only Candidate Test

Select `candidate-test` to build an initramfs image for `kexec` testing. It does
not contain site credentials. The test bootstrap reads base64-encoded backhaul
credentials and an SSH public key from the kernel command line, connects through
5 GHz, and forces a reboot after 15 minutes. Rebooting returns to the firmware
already installed in flash because the test does not change bootloader flags or
write a rootfs image.

Treat the bootstrap parameters as secrets even though they are temporary. Build
artifacts and logs must never contain the command line used on a real site.
