## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2024-05-22 - High-Frequency Video Sync Optimization
**Learning:** For real-time video-to-LED sync (100ms intervals), the overhead of native libraries like `sharp`, `Buffer` allocations, and `toDataURL` string conversions becomes a major CPU bottleneck. Replacing these with a persistent Canvas (`willReadFrequently: true`) and direct `getImageData` pixel manipulation reduces sync latency and CPU usage significantly.
**Action:** Prefer native Canvas API over external image processing libraries for high-frequency frame analysis in Electron/Web environments.
