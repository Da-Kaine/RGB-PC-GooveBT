const { desktopCapturer } = require('electron')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Capture {
    constructor(screenId) {
        this.screenshot = null
        this.screenPng = null
        this.stream = null
        this.screenId = screenId
        this.videoElement = null
        // this.videoFrame kept for compatibility, updated only when needed for crop or if explicitly requested
        this.videoFrame = null
        this.segData = {}

        // Persistent canvas for frame capture and analysis
        this.canvas = document.createElement("canvas");
        // willReadFrequently optimization for frequent getImageData calls
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

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
    }

    async refresh() {
        while (this.stream) {
            let start = Date.now()
            this.getSegmentColors()
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
                    maxWidth: 100,
                }
            }
        })
        this.videoElement = document.querySelector('video')
        this.videoElement.srcObject = this.stream
        this.videoElement.onloadedmetadata = (e) => {
            this.videoElement.play()
            this.refresh()
        }
    }

    updateVideoFrame() {
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.ctx.drawImage(this.videoElement, 0, 0);
    }

    getSegmentColors() {
        this.updateVideoFrame()
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

        this.getSegmentLeft(this.segments.left, width, height)
        this.getSegmentRight(this.segments.right, width, height)
        this.getSegmentTop(this.segments.top, width, height)
        this.getSegmentBottom(this.segments.bottom, width, height)

        this.updateColorBox()

        return this.segData
    }

    getSegmentLeft(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(0, index * cropHeight, cropWidth, cropHeight)
        })
    }

    getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        })
    }

    getSegmentTop(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        })
    }

    getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        })
    }

    getCropColors(left, top, width, height) {
        // Use getImageData for synchronous, high-performance pixel access
        const imageData = this.ctx.getImageData(left, top, width, height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const count = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return this.rgbToHex(r, g, b);
    }

    /**
     * Restore crop functionality without sharp
     * @param {number} left
     * @param {number} top
     * @param {number} width
     * @param {number} height
     */
    async crop(left, top, width, height) {
        this.updateVideoFrame();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(this.canvas, left, top, width, height, 0, 0, width, height);

        const dataUrl = tempCanvas.toDataURL('image/png');
        const base64Data = dataUrl.split("base64,")[1];

        const croppedImageElement = document.getElementById('cropped-image');
        if (croppedImageElement) {
            croppedImageElement.src = dataUrl;
        }

        // Return a mock sharp-like object or at least one that has toBuffer if needed
        // but looking at original code it returned the sharp object.
        // We'll return the buffer as requested by the original implementation's usage pattern if it existed.
        return {
            toBuffer: async () => Buffer.from(base64Data, 'base64')
        };
    }

    updateColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return;

        let boxes = colorViewer.getElementsByClassName('color-box');
        let segmentIds = Object.keys(this.segData);

        // Reuse existing boxes to avoid DOM thrashing
        for (let i = 0; i < segmentIds.length; i++) {
            let color = this.segData[segmentIds[i]];
            if (boxes[i]) {
                boxes[i].style.backgroundColor = color;
            } else {
                const box = document.createElement("div");
                box.classList.add('color-box');
                box.style.backgroundColor = color;
                colorViewer.appendChild(box);
            }
        }

        // Remove extra boxes if any
        while (boxes.length > segmentIds.length) {
            colorViewer.removeChild(boxes[boxes.length - 1]);
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
                    const screenshotImg = document.getElementById('screenshot-image');
                    if (screenshotImg) screenshotImg.src = this.screenshot
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
