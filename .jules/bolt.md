## 2026-06-17 - Portable Build Configuration
**Learning:** Adding 'portable' for Windows and 'AppImage' for Linux to `electronBuilder.builderOptions` in `vue.config.js` enables the generation of standalone executables.
**Action:** Always include both targets when requested to make an app 'portable' to cover major desktop platforms.

## 2026-06-25 - Optimization of Real-Time Video Sync
**Learning:** For high-frequency screen capture analysis (10Hz+), the overhead of Base64 encoding (`toDataURL`), Buffer conversions, and external library (`sharp`) stats calculations far outweighs the cost of direct Canvas pixel manipulation. Synchronous `getImageData` with `willReadFrequently: true` is the most efficient path for small-region color averaging in Electron/Chromium.
**Action:** Prefer native Canvas API over `sharp` or Base64 roundtrips for real-time video/frame analysis.
