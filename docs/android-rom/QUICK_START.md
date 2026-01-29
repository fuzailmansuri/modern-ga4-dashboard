# Quick Start Guide: Resolving Android Protobuf Linking Issues

## Problem
Your Android custom ROM is experiencing boot failures with errors like:
```
CANNOT LINK EXECUTABLE: libprotobuf-cpp-full-21.7.so not found
```

## Quick Fix (5-Step Solution)

### Step 1: Identify the Required Version
```bash
cd proprietary_vendor_nothing_asteroids
readelf -d vendor/bin/hw/android.hardware.* | grep protobuf
```

Look for output like:
```
0x0000000000000001 (NEEDED) Shared library: [libprotobuf-cpp-full-21.7.so]
```

### Step 2: Check if Library Exists
```bash
find . -name "libprotobuf*.so"
```

**If found**: Skip to Step 4  
**If not found**: Continue to Step 3

### Step 3: Extract from Stock Firmware
```bash
# Download and extract stock ROM for your device
mkdir ~/stock_firmware && cd ~/stock_firmware

# Mount vendor image
sudo mount -o loop,ro vendor.img /mnt/vendor

# Copy protobuf libraries
cp /mnt/vendor/lib64/libprotobuf-cpp-full-21.7.so .
cp /mnt/vendor/lib64/libprotobuf-cpp-lite-21.7.so .

# Unmount
sudo umount /mnt/vendor

# Add to your vendor repository
cd ~/proprietary_vendor_nothing_asteroids
cp ~/stock_firmware/libprotobuf-cpp-*.so proprietary/vendor/lib64/
```

### Step 4: Update Configuration Files

**A. Add to proprietary-files.txt:**
```bash
cat >> proprietary-files.txt << EOF
vendor/lib64/libprotobuf-cpp-full-21.7.so
vendor/lib64/libprotobuf-cpp-lite-21.7.so
EOF
```

**B. Create/Update Android.bp:**
```bash
cat > proprietary/vendor/lib64/Android.bp << 'EOF'
cc_prebuilt_library_shared {
    name: "libprotobuf-cpp-full-21.7",
    owner: "nothing",
    strip: { none: true },
    target: {
        android_arm64: {
            srcs: ["libprotobuf-cpp-full-21.7.so"],
        },
    },
    compile_multilib: "64",
    check_elf_files: false,
    prefer: true,
    soc_specific: true,
}

cc_prebuilt_library_shared {
    name: "libprotobuf-cpp-lite-21.7",
    owner: "nothing",
    strip: { none: true },
    target: {
        android_arm64: {
            srcs: ["libprotobuf-cpp-lite-21.7.so"],
        },
    },
    compile_multilib: "64",
    check_elf_files: false,
    prefer: true,
    soc_specific: true,
}
EOF
```

**C. Update device.mk:**
```bash
# In device/nothing/asteroids/device.mk
# Add these lines:

PRODUCT_PACKAGES += \
    libprotobuf-cpp-full-21.7 \
    libprotobuf-cpp-lite-21.7
```

### Step 5: Build and Test
```bash
# Clean build
cd ~/android/source
make clean

# Build vendor image
m vendorimage -j$(nproc)

# Flash to device
adb reboot bootloader
fastboot flash vendor out/target/product/asteroids/vendor.img
fastboot reboot

# Verify
adb wait-for-device
adb shell ls -la /vendor/lib64/libprotobuf*

# Check logs for errors
adb logcat | grep -i "protobuf\|linker"
```

## Verification Checklist

- [ ] Libraries extracted from stock firmware
- [ ] Files added to proprietary/vendor/lib64/
- [ ] proprietary-files.txt updated
- [ ] Android.bp created with module definitions
- [ ] device.mk updated with PRODUCT_PACKAGES
- [ ] Vendor image built successfully
- [ ] Libraries present on device at /vendor/lib64/
- [ ] No linker errors in logcat
- [ ] Vendor services starting correctly

## Still Having Issues?

### Check 1: Verify Library Architecture
```bash
file proprietary/vendor/lib64/libprotobuf-cpp-full-21.7.so
# Should show: ELF 64-bit LSB shared object, ARM aarch64
```

### Check 2: Verify SONAME
```bash
readelf -d proprietary/vendor/lib64/libprotobuf-cpp-full-21.7.so | grep SONAME
# Should match: libprotobuf-cpp-full-21.7.so
```

### Check 3: Enable Linker Debug Logs
```bash
adb root
adb shell setprop debug.ld.all dlerror,dlopen,dlsym
adb reboot
adb logcat -b all > linker_debug.log
```

### Check 4: Run Diagnostic Script
```bash
./docs/android-rom/check_protobuf_deps.sh proprietary_vendor_nothing_asteroids
```

## Need More Help?

📖 **Read the full guide**: [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)

📝 **See examples**: [examples/](examples/)

🔍 **Run diagnostics**: `./check_protobuf_deps.sh`

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "library not found" | Library not in vendor image | Add to proprietary-files.txt |
| "symbol not found" | Version mismatch | Extract exact version from stock |
| "not accessible for namespace" | Treble violation | Move to vendor partition |
| "text relocations" | Non-PIC library | Add `check_elf_files: false` |

## One-Liner Quick Check
```bash
# Run this from your vendor repo root to check everything:
find . -name "*.so" -exec readelf -d {} \; 2>/dev/null | grep -i protobuf | sort | uniq
```

---

**Estimated Time**: 15-30 minutes  
**Difficulty**: Intermediate  
**Requirements**: Stock firmware, Linux system with mount capabilities
