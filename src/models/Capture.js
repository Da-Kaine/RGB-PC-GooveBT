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
        // Optimization: Reuse a persistent canvas for real-time color analysis
        this.canvas = document.createElement("canvas");
        // Use willReadFrequently to optimize for frequent getImageData calls
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
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
        }

    }
    async getSegmentColors() {
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

        // Optimization: Draw the video frame once per cycle to the persistent canvas
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.ctx.drawImage(this.videoElement, 0, 0);

        let promises = [
            this.getSegmentLeft(this.segments.left, width, height),
            this.getSegmentRight(this.segments.right, width, height),
            this.getSegmentTop(this.segments.top, width, height),
            this.getSegmentBottom(this.segments.bottom, width, height)
        ]

        await Promise.all(promises)

        // Update DOM once after all segments are calculated
        this.updateColorBox()

        return this.segData
    }
    async getSegmentLeft(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(0, index * cropHeight, cropWidth, cropHeight)
        })
    }
    async getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        })
    }
    async getSegmentTop(segments, width, height) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(index * cropWidth, 0, cropWidth, cropHeight)
        })
        this.singleSegmentDuration = Date.now() - start
    }
    async getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        })
    }
    async crop(left, top, width, height) {
        await this.capture()
        console.log('cropped')
        // Optimization: Use Canvas API for cropping instead of sharp
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        const img = new Image();
        img.src = this.screenshot;
        await new Promise(resolve => img.onload = resolve);

        ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        document.getElementById('cropped-image').src = dataUrl;
        return { toBuffer: async () => Buffer.from(dataUrl.split(",")[1], 'base64') };
    }
    updateColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return;

        let boxes = colorViewer.getElementsByClassName('color-box');
        let i = 0;
        for (let segment in this.segData) {
            let color = this.segData[segment]
            let box;
            if (i < boxes.length) {
                box = boxes[i];
            } else {
                box = document.createElement("div");
                box.classList.add('color-box');
                colorViewer.appendChild(box);
            }
            box.style.backgroundColor = color
            i++;
        }

        // Remove extra boxes if segments decreased
        while (boxes.length > i) {
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
                    document.getElementById('screenshot-image').src = this.screenshot // The image to display the screenshot

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

    /**
     * Optimization: Synchronous average color calculation using Canvas API.
     * This avoids the overhead of image encoding/decoding and external library calls.
     */
    getAverageColor(left, top, width, height) {
        if (width <= 0 || height <= 0) return "#000000";

        const imageData = this.ctx.getImageData(left, top, width, height).data;
        let r = 0, g = 0, b = 0;
        const count = imageData.length / 4;

        for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
        }

        return this.rgbToHex(
            Math.floor(r / count),
            Math.floor(g / count),
            Math.floor(b / count)
        );
    }
}

export default Capture