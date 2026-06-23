## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.
## 2026-06-23 - Real-time Color Analysis Optimization
**Learning:** Replacing a pipeline that uses , Base64 decoding, and native modules like  for real-time video frame analysis with a native Canvas  approach significantly reduces latency and CPU overhead. Using  on the context is critical for repeated  calls.
**Action:** Prefer browser-native APIs and persistent resources for high-frequency operations in the renderer process.
## 2026-06-23 - Real-time Color Analysis Optimization
**Learning:** Replacing a pipeline that uses `toDataURL`, Base64 decoding, and native modules like `sharp` for real-time video frame analysis with a native Canvas `getImageData` approach significantly reduces latency and CPU overhead. Using `willReadFrequently: true` on the context is critical for repeated `getImageData` calls.
**Action:** Prefer browser-native APIs and persistent resources for high-frequency operations in the renderer process.
