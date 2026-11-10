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
- Do not install a candidate until its Wi-Fi/BDF behavior has been tested on the exact hardware revision through initramfs.
- The factory `bootmiwifi` network recovery path writes flash and is not a RAM-test path.
- On the tested CR8809 bootloader, changing `bootcmd` from Linux did not change the next boot path. Do not use an environment override as a substitute for an interactive U-Boot console.
- Recovery that changes NAND slots requires physical access or a previously verified dual-slot procedure.

The stable track remains intentionally conservative. Candidate builds never replace it automatically.

## Candidate Track

The candidate track is based on the pinned current OpenWrt stable release,
currently OpenWrt 25.12.6 with Linux 6.12. OpenWrt supports the IPQ50xx platform
but does not yet include CR8809 as a device, so HomeNet carries one small device
patch and the two required board-data files with pinned source commits and
checksums. It does not carry the old QSDK or NSS implementation.

The candidate image includes the household requirements needed for evaluation:
full `wpad-mbedtls`, `relayd`, `usteer`, `watchcat`, LuCI, and zram. Because this
device has limited memory, free memory and Wi-Fi stability are explicit test
criteria rather than assumptions.

Candidate artifacts publish an initramfs FIT image and a sysupgrade image. The
preferred first test loads initramfs with `tftpboot` and `bootm` from an
interactive serial U-Boot console. When serial access is unavailable, do not
flash until a known-good network recovery image is available, the bootloader
recovery path is understood, and `sysupgrade -T` accepts the candidate. Flashing
is always a separate manual action; the build workflow never changes a router.
