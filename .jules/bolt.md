## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2026-07-01 - Native Canvas for High-Frequency Frame Processing
**Learning:** In Electron renderer processes, the native Canvas API with `willReadFrequently: true` is significantly more efficient than using base64-encoded strings (via `toDataURL`) or native Node.js modules like `sharp` for real-time image analysis.
**Action:** Prefer `getImageData` and manual pixel averaging for simple region statistics to eliminate memory allocations and IPC overhead in sync loops.
