## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2025-05-14 - Real-time Color Analysis Optimization
**Learning:** Converting video frames to PNG/base64/Buffer for processing with `sharp` in a high-frequency loop (100ms) is extremely expensive and causes high CPU usage in Electron's renderer process. Direct Canvas API with `willReadFrequently: true` is significantly more efficient.
**Action:** Prefer native Canvas API and `getImageData` for real-time image analysis in renderer code.
