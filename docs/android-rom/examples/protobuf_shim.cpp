// Example Protobuf Shim Implementation
// Location: proprietary_vendor_nothing_asteroids/shim/protobuf_shim.cpp
//
// This file provides a compatibility shim that redirects calls from
// vendor binaries expecting libprotobuf-cpp-full-21.7.so to the
// AOSP-provided libprotobuf-cpp-full.so
//
// WARNING: This approach should only be used if:
// 1. The vendor binary cannot be rebuilt
// 2. ABI is compatible between versions
// 3. Symbol names match or can be easily mapped
//
// Preferred solution: Extract and use the exact protobuf version from stock firmware

#include <dlfcn.h>
#include <android-base/logging.h>
#include <string>

// Global handle to the AOSP protobuf library
static void* g_protobuf_handle = nullptr;

// Initialize the shim by loading AOSP protobuf
__attribute__((constructor))
static void init_protobuf_shim() {
    LOG(INFO) << "Initializing protobuf shim for version 21.7 -> AOSP";
    
    // Try to load AOSP protobuf library
    g_protobuf_handle = dlopen("libprotobuf-cpp-full.so", RTLD_NOW | RTLD_GLOBAL);
    
    if (!g_protobuf_handle) {
        LOG(ERROR) << "Failed to load AOSP protobuf: " << dlerror();
        return;
    }
    
    LOG(INFO) << "Successfully loaded AOSP protobuf library";
}

// Cleanup on unload
__attribute__((destructor))
static void fini_protobuf_shim() {
    if (g_protobuf_handle) {
        LOG(INFO) << "Unloading protobuf shim";
        dlclose(g_protobuf_handle);
        g_protobuf_handle = nullptr;
    }
}

// Helper function to get a symbol from AOSP protobuf
template<typename T>
static T get_symbol(const char* symbol_name) {
    if (!g_protobuf_handle) {
        LOG(ERROR) << "Protobuf handle not initialized";
        return nullptr;
    }
    
    T sym = reinterpret_cast<T>(dlsym(g_protobuf_handle, symbol_name));
    if (!sym) {
        LOG(WARNING) << "Symbol not found: " << symbol_name << " - " << dlerror();
    }
    
    return sym;
}

// Example: Common protobuf symbols that may need shimming
// You'll need to identify which symbols your vendor blobs actually use
// by running: readelf -s vendor_binary | grep protobuf

extern "C" {

// Message initialization functions
void* _ZN6google8protobuf11MessageLite13ParseFromArrayEPKvi(
    void* this_ptr, const void* data, int size) {
    
    typedef void* (*func_t)(void*, const void*, int);
    static func_t original_func = get_symbol<func_t>(
        "_ZN6google8protobuf11MessageLite13ParseFromArrayEPKvi");
    
    if (original_func) {
        return original_func(this_ptr, data, size);
    }
    
    LOG(ERROR) << "ParseFromArray symbol not found";
    return nullptr;
}

void* _ZN6google8protobuf11MessageLite14ParseFromStringERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE(
    void* this_ptr, const std::string& data) {
    
    typedef void* (*func_t)(void*, const std::string&);
    static func_t original_func = get_symbol<func_t>(
        "_ZN6google8protobuf11MessageLite14ParseFromStringERKNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE");
    
    if (original_func) {
        return original_func(this_ptr, data);
    }
    
    LOG(ERROR) << "ParseFromString symbol not found";
    return nullptr;
}

// Serialization functions
bool _ZNK6google8protobuf11MessageLite21SerializeToCodedStreamEPNS0_2io17CodedOutputStreamE(
    const void* this_ptr, void* output) {
    
    typedef bool (*func_t)(const void*, void*);
    static func_t original_func = get_symbol<func_t>(
        "_ZNK6google8protobuf11MessageLite21SerializeToCodedStreamEPNS0_2io17CodedOutputStreamE");
    
    if (original_func) {
        return original_func(this_ptr, output);
    }
    
    LOG(ERROR) << "SerializeToCodedStream symbol not found";
    return false;
}

// Arena allocation (common in newer protobuf)
void* _ZN6google8protobuf5Arena12CreateStringEv(void* arena) {
    typedef void* (*func_t)(void*);
    static func_t original_func = get_symbol<func_t>(
        "_ZN6google8protobuf5Arena12CreateStringEv");
    
    if (original_func) {
        return original_func(arena);
    }
    
    LOG(ERROR) << "Arena::CreateString symbol not found";
    return nullptr;
}

// Reflection functions (if needed)
const void* _ZNK6google8protobuf7Message17GetReflectionImplEv(const void* this_ptr) {
    typedef const void* (*func_t)(const void*);
    static func_t original_func = get_symbol<func_t>(
        "_ZNK6google8protobuf7Message17GetReflectionImplEv");
    
    if (original_func) {
        return original_func(this_ptr);
    }
    
    LOG(ERROR) << "GetReflectionImpl symbol not found";
    return nullptr;
}

} // extern "C"

// Instructions for identifying required symbols:
//
// 1. Find vendor binaries that need protobuf:
//    find vendor/bin -type f -exec readelf -d {} \; 2>/dev/null | grep protobuf
//
// 2. Extract undefined symbols from vendor binary:
//    readelf -s vendor/bin/hw/health-service | grep UND | grep protobuf
//
// 3. Find matching symbols in AOSP protobuf:
//    nm -D system/lib64/libprotobuf-cpp-full.so | grep -i parse
//
// 4. Add shim functions above for each undefined symbol
//
// 5. If symbol names differ between versions, create mapping functions

// Alternative approach if symbol names are different:
// Create a mapping table and use dlsym with mangled names
//
// struct SymbolMapping {
//     const char* old_symbol;  // Symbol name in version 21.7
//     const char* new_symbol;  // Symbol name in AOSP version
// };
//
// const SymbolMapping g_symbol_map[] = {
//     {"_ZN6google8protobuf11MessageLite_V21_7", "_ZN6google8protobuf11MessageLite"},
//     // Add more mappings as needed
// };
