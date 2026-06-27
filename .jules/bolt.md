## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2024-05-24 - High-Frequency Image Processing Optimization
**Learning:** For real-time video synchronization in Electron, using a persistent canvas with `willReadFrequently: true` and direct pixel manipulation via `getImageData` is significantly more efficient than encoding frames to PNG/Base64 and using heavy libraries like `sharp`.
**Action:** Always prefer native Canvas API for hot paths involving image region analysis to minimize CPU and memory pressure.
