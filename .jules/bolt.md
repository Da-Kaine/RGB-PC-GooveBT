## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2025-05-14 - Real-time Color Analysis Optimization
**Learning:** In Electron applications, the pipeline `Canvas -> toDataURL -> Buffer -> sharp -> stats` is extremely expensive due to multiple encodings and IPC/native bridge overhead. Native `canvasContext.getImageData` with `willReadFrequently: true` and a simple JS loop for average color is orders of magnitude faster for high-frequency (10s of Hz) analysis.
**Action:** Prefer direct Canvas pixel access for real-time video sync over external image processing libraries.
