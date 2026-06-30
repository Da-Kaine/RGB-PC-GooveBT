## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2026-06-30 - Optimized Real-time Color Analysis
**Learning:** For high-frequency image processing (e.g., video sync), using the native Canvas API with `getImageData` and `willReadFrequently: true` is significantly more efficient than using `sharp`. It eliminates the overhead of buffer transfers, base64 encoding/decoding, and external library calls. Synchronous pixel averaging is sufficient and faster than `sharp.stats()` for small regions.
**Action:** Prefer native Canvas API for real-time video analysis loops. Reuse DOM elements to minimize GC and layout thrashing.
