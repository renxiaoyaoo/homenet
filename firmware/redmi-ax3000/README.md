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
- Keep a known-good factory image and its checksum before testing a new image.
- Validate package compatibility on a wired-recovery gateway before changing a wireless-only AP.
- Never write U-Boot, MIBIB, ART, calibration, or other boot partitions.
- The factory `bootmiwifi` network recovery path writes flash and is not a RAM-test path.
- On the tested CR8809 bootloader, changing `bootcmd` from Linux did not change the next boot path. Do not use an environment override as a substitute for an interactive U-Boot console.
- The deployed unit has one `rootfs` partition. Candidate builds must preserve
  its observed offset and size and must not implement dual-slot switching.
- Without serial U-Boot, installation is allowed only after the exact factory
  UBI passes static checks and the known-good U-Boot Web recovery path has
  already been exercised on the same device.

The stable track remains intentionally conservative. Candidate builds never replace it automatically.

## Candidate Track

The candidate track pins an OpenWrt-main-based hardware implementation that has
been tested on the Redmi AX3000/CR880x family. HomeNet carries one small patch:
it preserves the deployed CR8809's observed 127 MiB single-rootfs layout and
prevents sysupgrade from changing Xiaomi slot flags. The mature upstream device
implementation supplies the 8-bit NAND ECC, 256 MiB ath11k profile, TrustZone
reservation, QCN6122 memory layout, switch topology, and board data.
All official OpenWrt feeds are pinned to the commits used by the corresponding
upstream release build. The optional third-party NSS feed is excluded.

The candidate image includes the household requirements needed for evaluation:
full `wpad-mbedtls`, `relayd`, `usteer`, `watchcat`, LuCI, and zram. Because this
device has limited memory, free memory and Wi-Fi stability are explicit test
criteria rather than assumptions. NSS acceleration is intentionally disabled:
the room AP does not need routing acceleration, and its weak wireless backhaul
must stay on the conventional kernel data path.

Candidate artifacts publish an initramfs FIT image, a standard sysupgrade image,
and a factory UBI image accepted by the modified U-Boot recovery page. An
initramfs boot remains preferred when serial U-Boot is available. On the
deployed unit it is not available, so the candidate stays blocked until its
factory UBI, manifest, device tree, UBI volumes, package set, and checksum have
all passed offline inspection. Flashing is a separate manual action; the build
workflow never changes a router.
