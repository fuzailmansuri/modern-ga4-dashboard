# Android Custom ROM Development Documentation

This directory contains technical documentation for Android custom ROM development, specifically focused on solving common issues encountered during device bring-up.

## Contents

📍 **START HERE**: [INDEX.md](INDEX.md) - Complete navigation guide for all documentation

### 📚 Main Guides

- **[SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md)** - 🎯 Direct answers to the 3 main questions (READ FIRST!)
- **[QUICK_START.md](QUICK_START.md)** - ⚡ Fast 5-step solution for protobuf linking issues (15-30 minutes)
- **[PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)** - Comprehensive guide for resolving protobuf library linking issues
  - Identifying vendor blob protobuf versions
  - Verifying library locations and requirements
  - Safe shimming and packaging solutions
  - Treble compliance considerations
  - Debugging boot failures

### 🛠️ Tools & Scripts

- **[check_protobuf_deps.sh](check_protobuf_deps.sh)** - Automated script to analyze protobuf dependencies
  - Scans vendor repository for protobuf libraries
  - Identifies binaries with protobuf dependencies
  - Checks proprietary-files.txt configuration
  - Validates Android.bp module definitions

### 📋 Example Configurations

- **[examples/](examples/)** - Sample configuration files
  - Android.bp prebuilt library definitions
  - device.mk configurations
  - proprietary-files.txt templates
  - Linker namespace configurations

## Quick Start

### For Protobuf Linking Issues

If you're experiencing boot failures with linker errors like:
```
CANNOT LINK EXECUTABLE: libprotobuf-cpp-full-21.7.so not found
```

**Step 1**: Run the diagnostic script
```bash
cd proprietary_vendor_nothing_asteroids
/path/to/check_protobuf_deps.sh .
```

**Step 2**: Follow the comprehensive guide
- Read [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)
- Start with "Part 1: Identifying Vendor Blob Protobuf Version"

**Step 3**: Apply the recommended solution
- Extract libraries from stock firmware (if needed)
- Add to proprietary-files.txt
- Create Android.bp definitions
- Include in device.mk

## Common Use Cases

### 🔍 Diagnostic Phase

1. **Identify the issue**
   ```bash
   adb logcat -b all | grep -i "protobuf\|CANNOT LINK"
   ```

2. **Analyze vendor repository**
   ```bash
   ./check_protobuf_deps.sh /path/to/vendor/repo
   ```

3. **Check binary dependencies**
   ```bash
   readelf -d vendor/bin/hw/health-service | grep protobuf
   ```

### 🔧 Implementation Phase

1. **Extract libraries from stock firmware**
   ```bash
   # See PROTOBUF_LINKING_GUIDE.md - Part 4, Step 1
   ```

2. **Add to vendor repository**
   ```bash
   # See PROTOBUF_LINKING_GUIDE.md - Part 4, Step 2
   ```

3. **Create build definitions**
   ```bash
   # See examples/Android.bp
   ```

### ✅ Verification Phase

1. **Build and flash**
   ```bash
   m vendorimage
   adb reboot bootloader
   fastboot flash vendor vendor.img
   ```

2. **Verify on device**
   ```bash
   adb shell ls -la /vendor/lib64/libprotobuf*
   adb logcat | grep -i protobuf
   ```

## Target Environments

This documentation is focused on:
- **Android Version**: 16 (sixteen-qpr1) and above
- **Architecture**: ARM64
- **Build Type**: eng / userdebug (development builds)
- **Target**: Custom ROM bring-up (PixelOS, LineageOS, etc.)

## Related Issues

Common scenarios addressed:
- ❌ Vendor HAL services crashing on boot
- ❌ Linker cannot find libprotobuf-cpp-full-X.X.so
- ❌ Symbol not found errors for protobuf functions
- ❌ Namespace access violations for vendor binaries
- ❌ Treble compliance issues with protobuf libraries

## Additional Resources

### Android Source & Documentation
- [Android Treble](https://source.android.com/devices/architecture/vndk)
- [Vendor Interface](https://source.android.com/devices/architecture/vintf)
- [Linker Namespaces](https://source.android.com/devices/architecture/vndk/linker-namespace)

### Community Resources
- [XDA Forums - Device Bring-up](https://forum.xda-developers.com/)
- [LineageOS Wiki](https://wiki.lineageos.org/)
- [Android Building Guide](https://source.android.com/setup/build/building)

## Contributing

If you have additional solutions, improvements, or found issues with this documentation:

1. Test your solution thoroughly
2. Document the exact scenario and ROM version
3. Include code examples and verification steps
4. Consider edge cases and Treble compliance

## Support & Questions

For questions about:
- **Protobuf linking issues**: See [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)
- **Device-specific issues**: Check device tree and vendor repository
- **Build errors**: Review build logs and AOSP documentation

## License

This documentation is provided as-is for educational purposes. When working with proprietary vendor blobs, ensure compliance with applicable licenses and agreements.

---

**Last Updated**: January 2026  
**Maintained for**: Android 16+ Custom ROM Development
