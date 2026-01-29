# Example device.mk Configuration
# Location: device/nothing/asteroids/device.mk
#
# This file defines product packages and configurations for the device

# Protobuf Libraries
# Include vendor-specific protobuf libraries needed for HAL services
PRODUCT_PACKAGES += \
    libprotobuf-cpp-full-21.7 \
    libprotobuf-cpp-lite-21.7

# Alternative: If using shim library
# PRODUCT_PACKAGES += \
#     libprotobuf-cpp-full-21.7-shim

# Health HAL (depends on protobuf)
PRODUCT_PACKAGES += \
    android.hardware.health-service.asteroids \
    android.hardware.health@2.1-impl \
    android.hardware.health@2.1-service

# Copy linker namespace configuration if needed
PRODUCT_COPY_FILES += \
    $(LOCAL_PATH)/configs/ld.config.txt:$(TARGET_COPY_OUT_VENDOR)/etc/ld.config.txt

# Vendor properties for debugging (remove in production)
PRODUCT_PROPERTY_OVERRIDES += \
    ro.vendor.protobuf.version=21.7 \
    ro.vendor.enable_protobuf_shim=0

# Development/Debug Properties (eng/userdebug builds only)
ifneq ($(filter eng userdebug,$(TARGET_BUILD_VARIANT)),)
PRODUCT_PROPERTY_OVERRIDES += \
    debug.ld.all=dlerror,dlopen,dlsym \
    persist.vendor.verbose_logging=true
endif

# Treble VNDK Configuration
# Ensure vendor libraries can find dependencies
PRODUCT_PACKAGES += \
    vndk-libs \
    vndk-sp

# Inherit from vendor blobs
$(call inherit-product, vendor/nothing/asteroids/asteroids-vendor.mk)

# SELinux Policies (if protobuf access needs special permissions)
# BOARD_VENDOR_SEPOLICY_DIRS += $(LOCAL_PATH)/sepolicy/vendor
