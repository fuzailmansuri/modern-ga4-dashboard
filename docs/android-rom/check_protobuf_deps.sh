#!/bin/bash

# Android Protobuf Linker Troubleshooting Script
# Usage: ./check_protobuf_deps.sh [path_to_vendor_repo]

set -e

VENDOR_REPO="${1:-.}"
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m' # No Color

echo "======================================"
echo "Android Protobuf Dependency Checker"
echo "======================================"
echo ""

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${COLOR_NC}"
}

# Check if vendor repo exists
if [ ! -d "$VENDOR_REPO" ]; then
    print_status "$COLOR_RED" "ERROR: Vendor repository not found at: $VENDOR_REPO"
    exit 1
fi

cd "$VENDOR_REPO"
print_status "$COLOR_GREEN" "Analyzing vendor repository: $(pwd)"
echo ""

# Part 1: Find all protobuf library references
print_status "$COLOR_YELLOW" "=== Step 1: Finding Protobuf Libraries ==="
echo ""

echo "Searching for libprotobuf*.so files..."
PROTOBUF_LIBS=$(find . -name "libprotobuf*.so" 2>/dev/null || true)

if [ -z "$PROTOBUF_LIBS" ]; then
    print_status "$COLOR_RED" "❌ No protobuf libraries found in vendor repository"
else
    print_status "$COLOR_GREEN" "✓ Found protobuf libraries:"
    echo "$PROTOBUF_LIBS"
fi
echo ""

# Part 2: Check binaries for protobuf dependencies
print_status "$COLOR_YELLOW" "=== Step 2: Checking Binary Dependencies ==="
echo ""

echo "Scanning vendor binaries for protobuf dependencies..."
BINARIES_WITH_PROTOBUF=""

# Check vendor/bin
if [ -d "vendor/bin" ]; then
    for binary in $(find vendor/bin -type f -executable 2>/dev/null); do
        if readelf -d "$binary" 2>/dev/null | grep -q "libprotobuf"; then
            BINARIES_WITH_PROTOBUF+="$binary\n"
            echo ""
            print_status "$COLOR_GREEN" "Found: $binary"
            readelf -d "$binary" 2>/dev/null | grep "NEEDED" | grep "protobuf"
        fi
    done
fi

# Check vendor/lib64
if [ -d "vendor/lib64" ]; then
    for lib in $(find vendor/lib64 -name "*.so" 2>/dev/null); do
        if readelf -d "$lib" 2>/dev/null | grep -q "libprotobuf"; then
            BINARIES_WITH_PROTOBUF+="$lib\n"
            echo ""
            print_status "$COLOR_GREEN" "Found: $lib"
            readelf -d "$lib" 2>/dev/null | grep "NEEDED" | grep "protobuf"
        fi
    done
fi

# Check system_ext
if [ -d "system_ext/lib64" ]; then
    for lib in $(find system_ext/lib64 -name "*.so" 2>/dev/null); do
        if readelf -d "$lib" 2>/dev/null | grep -q "libprotobuf"; then
            BINARIES_WITH_PROTOBUF+="$lib\n"
            echo ""
            print_status "$COLOR_GREEN" "Found: $lib"
            readelf -d "$lib" 2>/dev/null | grep "NEEDED" | grep "protobuf"
        fi
    done
fi

if [ -z "$BINARIES_WITH_PROTOBUF" ]; then
    print_status "$COLOR_YELLOW" "⚠ No binaries with protobuf dependencies found"
fi
echo ""

# Part 3: Identify required protobuf versions
print_status "$COLOR_YELLOW" "=== Step 3: Required Protobuf Versions ==="
echo ""

REQUIRED_VERSIONS=$(readelf -d $(find . -type f \( -name "*.so" -o -executable \) 2>/dev/null) 2>/dev/null | \
    grep -o "libprotobuf[^]]*\.so" | sort | uniq || true)

if [ -z "$REQUIRED_VERSIONS" ]; then
    print_status "$COLOR_YELLOW" "⚠ Could not identify required protobuf versions"
else
    print_status "$COLOR_GREEN" "Required protobuf libraries:"
    echo "$REQUIRED_VERSIONS" | while read version; do
        echo "  - $version"
    done
fi
echo ""

# Part 4: Check proprietary-files.txt
print_status "$COLOR_YELLOW" "=== Step 4: Checking proprietary-files.txt ==="
echo ""

if [ -f "proprietary-files.txt" ]; then
    PROTOBUF_IN_PROP_FILES=$(grep -i "protobuf" proprietary-files.txt || true)
    
    if [ -z "$PROTOBUF_IN_PROP_FILES" ]; then
        print_status "$COLOR_RED" "❌ No protobuf libraries listed in proprietary-files.txt"
        echo ""
        print_status "$COLOR_YELLOW" "Action needed: Add protobuf libraries to proprietary-files.txt"
        echo "Example:"
        echo "  vendor/lib64/libprotobuf-cpp-full-21.7.so"
        echo "  vendor/lib64/libprotobuf-cpp-lite-21.7.so"
    else
        print_status "$COLOR_GREEN" "✓ Protobuf libraries in proprietary-files.txt:"
        echo "$PROTOBUF_IN_PROP_FILES"
    fi
else
    print_status "$COLOR_YELLOW" "⚠ proprietary-files.txt not found"
fi
echo ""

# Part 5: Check Android.bp files
print_status "$COLOR_YELLOW" "=== Step 5: Checking Android.bp Files ==="
echo ""

ANDROID_BP_WITH_PROTOBUF=$(find . -name "Android.bp" -exec grep -l "protobuf" {} \; 2>/dev/null || true)

if [ -z "$ANDROID_BP_WITH_PROTOBUF" ]; then
    print_status "$COLOR_RED" "❌ No Android.bp files with protobuf definitions found"
    echo ""
    print_status "$COLOR_YELLOW" "Action needed: Create Android.bp entries for protobuf libraries"
    echo "See: docs/android-rom/PROTOBUF_LINKING_GUIDE.md (Part 3, Solution 1)"
else
    print_status "$COLOR_GREEN" "✓ Android.bp files with protobuf:"
    echo "$ANDROID_BP_WITH_PROTOBUF"
fi
echo ""

# Part 6: Summary and Recommendations
print_status "$COLOR_YELLOW" "=== Summary & Recommendations ==="
echo ""

ISSUES_FOUND=0

# Check if libraries exist
if [ -z "$PROTOBUF_LIBS" ]; then
    print_status "$COLOR_RED" "Issue 1: Missing protobuf libraries in repository"
    echo "  → Extract from stock firmware and add to proprietary/vendor/lib64/"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check if proprietary-files.txt is updated
if [ -f "proprietary-files.txt" ] && [ -z "$PROTOBUF_IN_PROP_FILES" ]; then
    print_status "$COLOR_RED" "Issue 2: Protobuf libraries not listed in proprietary-files.txt"
    echo "  → Add library paths to proprietary-files.txt"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check if Android.bp exists
if [ -z "$ANDROID_BP_WITH_PROTOBUF" ]; then
    print_status "$COLOR_RED" "Issue 3: Missing Android.bp module definitions"
    echo "  → Create cc_prebuilt_library_shared modules for protobuf libraries"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
    print_status "$COLOR_GREEN" "✓ No critical issues found!"
    echo ""
    echo "Next steps:"
    echo "  1. Build the ROM and check for linker errors"
    echo "  2. Test on device: adb shell ls /vendor/lib64/libprotobuf*"
    echo "  3. Monitor logs: adb logcat | grep -i protobuf"
else
    print_status "$COLOR_RED" "Found $ISSUES_FOUND issue(s) that need attention"
    echo ""
    echo "For detailed instructions, see:"
    echo "  docs/android-rom/PROTOBUF_LINKING_GUIDE.md"
fi

echo ""
print_status "$COLOR_YELLOW" "Detailed guide: docs/android-rom/PROTOBUF_LINKING_GUIDE.md"
echo ""
