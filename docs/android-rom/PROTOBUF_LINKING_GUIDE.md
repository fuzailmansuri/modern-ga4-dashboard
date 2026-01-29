# Android Custom ROM Protobuf Linking Guide

## Overview

This guide addresses protobuf library linking issues in Android custom ROM development, specifically for resolving vendor HAL boot failures due to missing or incompatible protobuf libraries.

## Problem Context

**Device**: Nothing Asteroids  
**ROM**: PixelOS (AOSP-based)  
**Branch**: sixteen-qpr1 (Android 16 QPR1)  
**Issue**: Vendor services crashing with linker errors:
```
CANNOT LINK EXECUTABLE: libprotobuf-cpp-full-21.7.so not found
missing protobuf symbols
```

---

## Part 1: Identifying Vendor Blob Protobuf Version

### Method 1: Using `readelf` to Check Dependencies

The most reliable way to identify the exact protobuf library version vendor blobs require:

```bash
cd proprietary_vendor_nothing_asteroids

# Check all vendor binaries for protobuf dependencies
find vendor/lib64 vendor/bin system_ext/lib64 -type f -executable \
  -exec readelf -d {} \; 2>/dev/null | grep -i protobuf

# More detailed analysis of a specific binary
readelf -d vendor/bin/hw/android.hardware.health-service.example | grep NEEDED
```

**Expected Output**:
```
0x0000000000000001 (NEEDED)    Shared library: [libprotobuf-cpp-full-21.7.so]
0x0000000000000001 (NEEDED)    Shared library: [libprotobuf-cpp-lite-21.7.so]
```

### Method 2: Using `ldd` (On Device via ADB)

If you can get to a shell on the device (even if services are crashing):

```bash
adb shell
su
ldd /vendor/bin/hw/android.hardware.health-service.example
```

### Method 3: Analyzing Linker Errors in Logcat

Boot the device and capture full logcat:

```bash
adb logcat -b all -d | grep -A 10 -B 10 "CANNOT LINK"
```

Look for lines like:
```
linker: library "libprotobuf-cpp-full-21.7.so" not found
linker: library "libprotobuf-cpp-full.so" ("/system/lib64/libprotobuf-cpp-full.so") needed or dlopened by "/vendor/bin/hw/health-service" is not accessible for the namespace "default"
```

### Method 4: Strings Analysis for Version Information

```bash
cd proprietary_vendor_nothing_asteroids

# Search for protobuf version strings
find vendor/ system_ext/ -type f | while read file; do
  strings "$file" | grep -i "protobuf.*21\\.7" && echo "Found in: $file"
done
```

### Method 5: Check Vendor Makefile Dependencies

```bash
cd proprietary_vendor_nothing_asteroids

# Search for protobuf references in Android.bp and .mk files
find . -name "*.bp" -o -name "*.mk" | xargs grep -i protobuf
```

Look for:
```makefile
LOCAL_SHARED_LIBRARIES += libprotobuf-cpp-full-21.7
```

---

## Part 2: Verifying Library Locations

### Expected Locations for Protobuf Libraries

According to Android Treble architecture:

1. **System Libraries** (AOSP-built):
   - `/system/lib64/libprotobuf-cpp-full.so`
   - `/system/lib64/libprotobuf-cpp-lite.so`
   - Version typically matches the AOSP version (e.g., 3.21.12 for Android 14+)

2. **Vendor Libraries** (OEM-built):
   - `/vendor/lib64/libprotobuf-cpp-full.so`
   - `/vendor/lib64/libprotobuf-cpp-full-21.7.so` (versioned)
   - `/system_ext/lib64/libprotobuf-cpp-*.so` (system_ext partition)

### Checking Existing Libraries

#### On Device (via ADB)
```bash
adb root
adb shell ls -la /system/lib64/libprotobuf*
adb shell ls -la /vendor/lib64/libprotobuf*
adb shell ls -la /system_ext/lib64/libprotobuf*
```

#### In Proprietary Vendor Repository
```bash
cd proprietary_vendor_nothing_asteroids

# Check what protobuf libraries are included
find . -name "libprotobuf*.so" -ls

# Verify the library exists at expected path
ls -la proprietary/vendor/lib64/libprotobuf-cpp-full-21.7.so
ls -la proprietary/system_ext/lib64/libprotobuf-cpp-full-21.7.so
```

### Common Issues

**Issue 1**: Library exists but with wrong SONAME
```bash
# Check SONAME of the library
readelf -d vendor/lib64/libprotobuf-cpp-full.so | grep SONAME
```

**Issue 2**: Library exists but in wrong partition
- Vendor blobs looking in `/vendor/lib64/`
- Library placed in `/system_ext/lib64/`

**Issue 3**: Library missing entirely
- Vendor repository doesn't include the required versioned library
- Need to extract from stock firmware or shim

---

## Part 3: Safe Shimming and Packaging Solutions

### Solution 1: Direct Library Placement (Cleanest)

If you have the correct versioned library from stock firmware:

```bash
cd proprietary_vendor_nothing_asteroids

# Place library in vendor partition
mkdir -p proprietary/vendor/lib64
cp /path/to/extracted/libprotobuf-cpp-full-21.7.so proprietary/vendor/lib64/

# Update proprietary-files.txt to include it
echo "vendor/lib64/libprotobuf-cpp-full-21.7.so" >> proprietary-files.txt
```

**Android.bp entry**:
```bp
cc_prebuilt_library_shared {
    name: "libprotobuf-cpp-full-21.7",
    owner: "nothing",
    strip: {
        none: true,
    },
    target: {
        android_arm64: {
            srcs: ["proprietary/vendor/lib64/libprotobuf-cpp-full-21.7.so"],
        },
    },
    compile_multilib: "64",
    check_elf_files: false,
    prefer: true,
    soc_specific: true,
}
```

### Solution 2: Symlink Shim (For Version Mismatches)

If AOSP provides `libprotobuf-cpp-full.so` (v3.21.12) and vendor needs v21.7:

**Step 1**: Check ABI compatibility
```bash
# Compare exported symbols
nm -D system/lib64/libprotobuf-cpp-full.so | grep " T " > aosp_symbols.txt
nm -D vendor/lib64/libprotobuf-cpp-full-21.7.so | grep " T " > vendor_symbols.txt
diff aosp_symbols.txt vendor_symbols.txt
```

**Step 2**: Create symlink if compatible
```makefile
# In device/nothing/asteroids/device.mk

PRODUCT_PACKAGES += \
    libprotobuf-cpp-full-21.7-shim

# Define the shim module
```

**Android.bp for shim**:
```bp
cc_library_shared {
    name: "libprotobuf-cpp-full-21.7-shim",
    vendor: true,
    srcs: ["shim/protobuf_shim.cpp"],
    shared_libs: [
        "libprotobuf-cpp-full",  // AOSP version
    ],
    compile_multilib: "64",
    // This creates libprotobuf-cpp-full-21.7.so that redirects to AOSP
}
```

### Solution 3: LD_PRELOAD Shim (Last Resort)

For incompatible versions where symbols differ:

**shim/protobuf_shim.cpp**:
```cpp
// Wrapper to redirect 21.7 calls to AOSP protobuf
#include <dlfcn.h>

extern "C" {

// Example: Redirect old symbol to new symbol
void* google_protobuf_MessageLite_ParseFromString_21_7(
    const char* data, size_t size) {
    // Load AOSP protobuf
    void* handle = dlopen("libprotobuf-cpp-full.so", RTLD_LAZY);
    if (!handle) return nullptr;
    
    // Call equivalent AOSP function
    typedef void* (*ParseFunc)(const char*, size_t);
    ParseFunc func = (ParseFunc)dlsym(handle, 
        "google_protobuf_MessageLite_ParseFromString");
    
    return func ? func(data, size) : nullptr;
}

}  // extern "C"
```

### Solution 4: Namespace Configuration (Treble-Compliant)

Ensure vendor libraries can access the protobuf library:

**system/core/rootdir/etc/ld.config.txt** (or device-specific override):
```ini
[vendor]
namespace.default.isolated = true
namespace.default.search.paths = /vendor/${LIB}:/vendor/${LIB}/vndk
namespace.default.permitted.paths = /vendor/${LIB}:/system/${LIB}

# Allow vendor to access system protobuf
namespace.default.links = system
namespace.default.link.system.shared_libs = libprotobuf-cpp-full.so:libprotobuf-cpp-lite.so
```

---

## Part 4: Implementation Steps

### Step 1: Extract Stock Firmware Libraries

If you don't have the original library:

```bash
# Download stock firmware for Nothing Asteroids
# Extract system.img, vendor.img, system_ext.img

mkdir -p stock_firmware
cd stock_firmware

# Mount images (Linux)
sudo mount -o loop,ro system.img /mnt/system
sudo mount -o loop,ro vendor.img /mnt/vendor
sudo mount -o loop,ro system_ext.img /mnt/system_ext

# Copy protobuf libraries
cp /mnt/vendor/lib64/libprotobuf*.so .
cp /mnt/system_ext/lib64/libprotobuf*.so .

sudo umount /mnt/system /mnt/vendor /mnt/system_ext
```

### Step 2: Add to Vendor Repository

```bash
cd proprietary_vendor_nothing_asteroids

# Add libraries to proprietary directory
cp ~/stock_firmware/libprotobuf-cpp-full-21.7.so proprietary/vendor/lib64/
cp ~/stock_firmware/libprotobuf-cpp-lite-21.7.so proprietary/vendor/lib64/

# Update proprietary-files.txt
cat >> proprietary-files.txt << EOF
vendor/lib64/libprotobuf-cpp-full-21.7.so
vendor/lib64/libprotobuf-cpp-lite-21.7.so
EOF
```

### Step 3: Create Android.bp Entries

**proprietary/vendor/lib64/Android.bp**:
```bp
// Generated by device/nothing/asteroids/setup-makefiles.sh

cc_prebuilt_library_shared {
    name: "libprotobuf-cpp-full-21.7",
    owner: "nothing",
    strip: {
        none: true,
    },
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
    strip: {
        none: true,
    },
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
```

### Step 4: Include in Device Configuration

**device/nothing/asteroids/device.mk**:
```makefile
# Vendor protobuf libraries
PRODUCT_PACKAGES += \
    libprotobuf-cpp-full-21.7 \
    libprotobuf-cpp-lite-21.7
```

### Step 5: Verify Installation

After building:
```bash
# Check vendor.img contents
cd out/target/product/asteroids
python3 ../../../system/tools/mkbootimg/unpack_bootimg.py --boot_img vendor.img
mount -o loop,ro vendor.img /mnt/vendor
ls -la /mnt/vendor/lib64/libprotobuf*

# Flash and test
adb reboot bootloader
fastboot flash vendor vendor.img
fastboot reboot
adb logcat | grep -i protobuf
```

---

## Part 5: Treble Compliance Considerations

### VNDK and Protobuf

Android Treble requires version isolation between system and vendor:

1. **System Protobuf** (AOSP): Part of system partition
2. **Vendor Protobuf**: Must be self-contained in vendor partition

**Best Practice**:
- Keep vendor-specific versioned protobuf libraries in `/vendor/lib64/`
- Don't modify system partition to add vendor-specific versions
- Use VNDK (Vendor NDK) allowlist if needed

### Checking Treble Compliance

```bash
# Run VTS (Vendor Test Suite) after changes
cd platform_testing/tests/treble
atest VtsHalHealthV2_0Target

# Check for namespace violations
adb shell cat /proc/*/maps | grep protobuf | sort | uniq
```

---

## Part 6: Debugging Boot Issues

### Enable Detailed Linker Logging

```bash
adb root
adb shell setprop debug.ld.all dlerror,dlopen,dlsym
adb reboot

# Capture logs
adb logcat -b all > boot_linker_debug.log
```

### Check Service Status

```bash
adb shell
getprop | grep vendor.
dumpsys servicemanager
logcat -b main -b system | grep -i "health\|protobuf"
```

### Verify Library Loading

```bash
# Check what libraries are actually loaded by vendor services
adb shell cat /proc/$(pidof vendor.health-service)/maps | grep protobuf
```

---

## Quick Reference

### Command Cheat Sheet

```bash
# Identify protobuf dependencies
readelf -d vendor_binary | grep protobuf

# Check library locations
find . -name "libprotobuf*.so"

# Verify SONAME
readelf -d lib.so | grep SONAME

# Compare symbols
nm -D lib1.so > sym1; nm -D lib2.so > sym2; diff sym1 sym2

# Extract from stock firmware
sudo mount -o loop,ro firmware.img /mnt
cp /mnt/lib64/libprotobuf*.so .

# Add to proprietary-files.txt
echo "vendor/lib64/libprotobuf-cpp-full-21.7.so" >> proprietary-files.txt

# Test on device
adb shell ls /vendor/lib64/libprotobuf*
adb logcat | grep -i "protobuf\|linker"
```

---

## Additional Resources

- [Android Treble Documentation](https://source.android.com/devices/architecture/vndk)
- [Vendor Interface Architecture](https://source.android.com/devices/architecture/vintf)
- [Linker Namespace Configuration](https://source.android.com/devices/architecture/vndk/linker-namespace)
- [VNDK Definition Tool](https://android.googlesource.com/platform/development/+/master/vndk/tools/)

---

## Troubleshooting Common Errors

### Error: "library not found"
- **Cause**: Library missing from vendor partition
- **Fix**: Add to proprietary-files.txt and Android.bp

### Error: "symbol not found" 
- **Cause**: Version mismatch between library and binary
- **Fix**: Extract exact version from stock firmware

### Error: "not accessible for namespace"
- **Cause**: Treble namespace restriction
- **Fix**: Update ld.config.txt or move library to vendor partition

### Error: "text relocations" 
- **Cause**: Library not compiled with -fPIC
- **Fix**: Use `check_elf_files: false` in Android.bp (temporary)

---

**Last Updated**: January 2026  
**Target Android Version**: 16 (sixteen-qpr1)  
**Architecture**: ARM64
