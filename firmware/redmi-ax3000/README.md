# Redmi AX3000 Firmware

This optional build keeps firmware reproducible without mixing a home's private configuration into the image.

## Stable Track

The stable track is pinned to the QSDK release already validated on Redmi AX3000 and Xiaomi CR880x hardware. It keeps the existing wireless and NSS drivers while replacing `wpad-basic-wolfssl` with `wpad-wolfssl` and adding `usteer`.

Run the `Redmi AX3000 firmware` workflow manually. The workflow:

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
- Do not move to the mainline 5.15 track until its Wi-Fi/BDF behavior has been tested for the exact hardware revision.
- Recovery that changes NAND slots requires physical access, TFTP/U-Boot, or a previously verified dual-slot procedure.

The stable track remains intentionally conservative. A newer kernel can be added as a separate candidate track without replacing this known-good build.
