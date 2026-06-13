const { desktopCapturer } = require('electron')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
class Capture {
    constructor(screenId) {
        this.screenshot = null
        this.screenPng = null
        this.stream = null
        this.screenId = screenId
        this.videoElement = null
        this.videoFrame = null
        this.segData = {}
        // Persistent canvas for color extraction to avoid GC pressure and repeated allocations
        this.canvas = document.createElement("canvas")
        this.canvasContext = this.canvas.getContext("2d", { willReadFrequently: true })
        this.startVideoStream()
        this.segmentDuration = 0
        this.durations = []
        this.topCount = 0
        this.segments = {
            left: [5, 6, 7, 8],
            right: [12, 13, 14, 15].reverse(),
            top: [1, 2, 3, 4].reverse(),
            bottom: [9, 10, 11],
        }
        //time delay to calculate segment colors
    }
    async refresh() {
        // return
        while (this.stream) {
            let start = Date.now()
            await this.getSegmentColors()
            this.segmentDuration = Date.now() - start
            await sleep(100)
        }
    }
    stopStream() {
        console.log(`stopped stream`)
        if (this.stream) {
            this.stream.getTracks().forEach(function (track) {
                track.stop();
            });
            this.stream = null
        }
    }
    async startVideoStream() {
        if (this.stream != null) return
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: this.screenId,
                    // minWidth: 1280,
                    maxWidth: 100,
                    // minHeight: 720,
                    // maxHeight: 1280
                }
            }
        })
        this.videoElement = document.querySelector('video')
        this.videoElement.srcObject = this.stream
        this.videoElement.onloadedmetadata = (e) => {
            this.videoElement.play()
            this.refresh()
            this.updateVideoFrame()
        }

    }

    /**
     * Updates the persistent canvas with the current video frame.
     * Optimization: Replaces toDataURL() with drawImage() on a persistent canvas.
     */
    updateVideoFrame() {
        if (!this.videoElement) return
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
        this.canvasContext.drawImage(this.videoElement, 0, 0);
    }

    async getSegmentColors() {
        this.updateVideoFrame()
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

        let promises = [
            this.getSegmentLeft(this.segments.left, width, height),
            this.getSegmentRight(this.segments.right, width, height),
            this.getSegmentTop(this.segments.top, width, height),
            this.getSegmentBottom(this.segments.bottom, width, height)
        ]
        this.createColorBox()
        await Promise.all(promises)

        return this.segData
    }

    async getSegmentLeft(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(0, index * cropHeight, cropWidth, cropHeight)
        }
    }
    async getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        }
    }
    async getSegmentTop(segments, width, height) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        }
        this.singleSegmentDuration = Date.now() - start
    }
    async getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        }
    }

    /**
     * Calculates the average color of a region using native getImageData.
     * Optimization: Replaces sharp.extract().stats() with manual pixel averaging.
     * This avoids expensive buffer copies and native module overhead in the sync loop.
     */
    getCropColors(left, top, width, height) {
        if (width <= 0 || height <= 0) return "#000000";

        const imageData = this.canvasContext.getImageData(left, top, width, height).data;
        let r = 0, g = 0, b = 0;
        const count = imageData.length / 4;

        // Sample every 4th pixel for even better performance if needed,
        // but for small segments, full average is fine.
        for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
        }

        return this.rgbToHex(
            Math.round(r / count),
            Math.round(g / count),
            Math.round(b / count)
        );
    }

    async crop(left, top, width, height) {
        // Keeping this for potential legacy/debug use, but optimizing it slightly
        this.updateVideoFrame()
        const dataUrl = this.canvas.toDataURL('image/png')
        document.getElementById('cropped-image').src = dataUrl
        return dataUrl
    }

    createColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return
        colorViewer.innerHTML = ""
        for (let segment in this.segData) {
            let color = this.segData[segment]
            const box = document.createElement("div");
            box.classList.add('color-box');
            box.style.backgroundColor = color
            colorViewer.appendChild(box);
        }
    }
    capture() {
        desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
            .then(sources => {
                window.sources = sources
                for (const source of sources) {
                    this.screenshot = source.thumbnail.toDataURL()
                    this.screenSource = source
                    this.screenPng = source.thumbnail.toPNG()
                    const img = document.getElementById('screenshot-image')
                    if (img) img.src = this.screenshot

                }
            })
    }

    componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    rgbToHex(r, g, b) {
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }
}

export default Capture
