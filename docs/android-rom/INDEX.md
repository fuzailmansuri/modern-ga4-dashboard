# Complete Documentation Index

## 🎯 Start Here Based on Your Needs

### ⚡ Quick Fix (15-30 minutes)
**You want**: Fast solution to get device booting  
**Read**: [QUICK_START.md](QUICK_START.md)  
**What you get**: 5-step process with commands you can copy-paste

### 📋 Direct Answers to Your Questions
**You want**: Specific answers to the three questions in problem statement  
**Read**: [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md)  
**What you get**: 
1. How to identify exact protobuf version
2. Where the library should exist
3. How to safely package without breaking Treble

### 📚 Deep Dive & Understanding
**You want**: Comprehensive understanding of the issue and all solutions  
**Read**: [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)  
**What you get**: 
- 5 methods to identify protobuf versions
- Location verification techniques
- 4 different solution approaches
- Treble compliance details
- Debugging strategies

### 🔍 Automated Analysis
**You want**: Let a script analyze your vendor repository  
**Run**: `./check_protobuf_deps.sh /path/to/vendor/repo`  
**What you get**: Automated detection of issues and recommendations

### 📝 Configuration Examples
**You want**: Copy-paste configuration files  
**Browse**: [examples/](examples/)  
**What you get**:
- Android.bp module definitions
- device.mk configurations
- proprietary-files.txt templates
- Linker namespace configs
- Shim implementation example

---

## 📖 Document Relationships

```
Problem: Android boot failure with protobuf linker errors
    ↓
SOLUTION_SUMMARY.md (Read this first!)
    ├─ Quick answer to 3 questions
    └─ Points to detailed resources
        ↓
QUICK_START.md (If you want fast fix)
    ├─ 5-step solution
    ├─ Verification checklist
    └─ One-liner commands
        ↓
PROTOBUF_LINKING_GUIDE.md (For deep understanding)
    ├─ Part 1: Identify version (5 methods)
    ├─ Part 2: Verify locations
    ├─ Part 3: Solutions (4 approaches)
    ├─ Part 4: Implementation (5 steps)
    ├─ Part 5: Treble compliance
    └─ Part 6: Debugging
        ↓
examples/ (For implementation)
    ├─ Android.bp
    ├─ device.mk
    ├─ proprietary-files.txt
    ├─ ld.config.txt
    └─ protobuf_shim.cpp
        ↓
check_protobuf_deps.sh (For automation)
    └─ Validates your implementation
```

---

## 🎓 Learning Path

### Beginner (New to Android ROM development)
1. Read [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md) - Understand the problem
2. Read [QUICK_START.md](QUICK_START.md) - Follow step-by-step
3. Use example configs from [examples/](examples/)
4. Run [check_protobuf_deps.sh](check_protobuf_deps.sh) to verify

### Intermediate (Built ROMs before, new to protobuf issues)
1. Read [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md) - Get direct answers
2. Scan [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md) Part 3 - Solutions
3. Implement using [QUICK_START.md](QUICK_START.md) commands
4. Verify with diagnostic script

### Advanced (Understanding deeper issues or edge cases)
1. Read full [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md)
2. Review [examples/protobuf_shim.cpp](examples/protobuf_shim.cpp) for shim approach
3. Study [examples/ld.config.txt](examples/ld.config.txt) for namespace config
4. Customize solutions for your specific device

---

## 🔧 Tools & Scripts

| Tool | Purpose | Usage |
|------|---------|-------|
| check_protobuf_deps.sh | Analyze vendor repo | `./check_protobuf_deps.sh /path/to/repo` |
| readelf | Check binary deps | `readelf -d binary \| grep protobuf` |
| nm | List symbols | `nm -D library.so \| grep protobuf` |
| adb logcat | View linker errors | `adb logcat \| grep -i protobuf` |

---

## 📊 Success Criteria

After implementing the solution, you should see:

✅ **Build Stage**
- [ ] Libraries in `out/target/product/*/vendor/lib64/libprotobuf*`
- [ ] No build errors related to protobuf
- [ ] Android.bp modules built successfully

✅ **Flash Stage**
- [ ] vendor.img flashed without errors
- [ ] Device boots to system

✅ **Runtime Stage**
- [ ] `adb shell ls /vendor/lib64/libprotobuf*` shows libraries
- [ ] No "CANNOT LINK" errors in logcat
- [ ] Vendor HAL services running (check with `dumpsys`)

✅ **Validation Stage**
- [ ] check_protobuf_deps.sh reports no issues
- [ ] `adb shell cat /proc/*/maps | grep protobuf` shows vendor libs loaded
- [ ] No Treble violations in VTS tests

---

## 💡 Common Questions

### Q: Can I use AOSP protobuf instead of vendor version?
**A**: Generally no. Vendor blobs are compiled against specific version. See PROTOBUF_LINKING_GUIDE.md Part 3, Solution 2 for shimming if you must.

### Q: Do I need to rebuild AOSP protobuf?
**A**: No! For eng/userdebug builds, just extract and package the stock firmware library.

### Q: What if I can't get stock firmware?
**A**: Contact device OEM, check firmware archives, or as last resort see shimming solutions in comprehensive guide.

### Q: Will this break Treble compliance?
**A**: No, if you follow the recommended solution (libraries in vendor partition). See SOLUTION_SUMMARY.md Question 3.

### Q: Is shimming safe?
**A**: Only if ABI-compatible. Direct library placement is always safer. See PROTOBUF_LINKING_GUIDE.md Part 3.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Script reports "library not found" | Extract from stock firmware (QUICK_START.md Step 3) |
| Build fails with "module not defined" | Check Android.bp (examples/Android.bp) |
| Device boots but services crash | Check logcat, verify library architecture |
| "text relocations" error | Add `check_elf_files: false` to Android.bp |
| Namespace violation | See examples/ld.config.txt |

---

## 📞 Getting Help

1. **Run diagnostic**: `./check_protobuf_deps.sh your_vendor_repo`
2. **Enable debug logs**: See PROTOBUF_LINKING_GUIDE.md Part 6
3. **Check examples**: Compare your configs with examples/
4. **Review full guide**: Read PROTOBUF_LINKING_GUIDE.md sections relevant to your error

---

## 📦 What's Included

```
docs/android-rom/
├── INDEX.md                          ← You are here
├── README.md                         ← Navigation hub
├── SOLUTION_SUMMARY.md               ← Direct answers (START HERE)
├── QUICK_START.md                    ← Fast 5-step fix
├── PROTOBUF_LINKING_GUIDE.md         ← Comprehensive guide
├── check_protobuf_deps.sh            ← Diagnostic script
└── examples/
    ├── Android.bp                    ← Prebuilt module definitions
    ├── device.mk                     ← Product configuration
    ├── proprietary-files.txt         ← Blob list template
    ├── ld.config.txt                 ← Linker namespace config
    └── protobuf_shim.cpp             ← Compatibility shim (advanced)
```

---

## 🎯 Recommended Reading Order

**For Nothing Asteroids PixelOS specifically:**

1. 📋 [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md) - 10 min read
   - Gets you oriented on the exact problem and solution

2. ⚡ [QUICK_START.md](QUICK_START.md) - 15-30 min implementation
   - Step-by-step commands to fix the issue

3. 🔍 Run diagnostic script - 2 min
   ```bash
   ./check_protobuf_deps.sh ~/proprietary_vendor_nothing_asteroids
   ```

4. ✅ Verify success
   - Build, flash, boot, check logs

**If issues persist:**

5. 📚 [PROTOBUF_LINKING_GUIDE.md](PROTOBUF_LINKING_GUIDE.md) - Deep dive
   - Understand alternative solutions
   - Debug specific errors

---

**Total Time to Fix**: 30-60 minutes (depending on stock firmware availability)

**Difficulty Level**: Intermediate

**Success Rate**: High (when stock firmware library is available)

---

Last Updated: January 2026  
Target: Android 16+ Custom ROM Development  
Maintained for: Nothing Asteroids PixelOS (and similar devices)
