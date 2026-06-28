## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2026-06-28 - Native Canvas for Real-time Image Analysis
**Learning:** Using `sharp` for high-frequency image analysis (e.g., 100ms sync loop) in Electron's renderer process is extremely expensive due to Buffer/Base64 roundtrips. Native Canvas API with `getImageData` and `willReadFrequently: true` is significantly faster and more efficient for simple color averaging.
**Action:** Prefer native Canvas APIs over Node.js image libraries for real-time visual feedback in the renderer process.
