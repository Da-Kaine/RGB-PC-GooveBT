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
        this.segmentDuration = 0
        this.durations = []
        this.topCount = 0
        this.segments = {
            left: [5, 6, 7, 8],
            right: [12, 13, 14, 15].reverse(),
            top: [1, 2, 3, 4].reverse(),
            bottom: [9, 10, 11],
        }

        // Performance Optimization: Persistent canvas with willReadFrequently
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

        this.startVideoStream()
    }

    async refresh() {
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
                    maxWidth: 100,
                }
            }
        })
        this.videoElement = document.querySelector('video')
        this.videoElement.srcObject = this.stream
        this.videoElement.onloadedmetadata = (e) => {
            this.videoElement.play()
            this.refresh()
            this.updateFrame()
        }
    }

    updateFrame() {
        if (!this.videoElement) return;
        const width = this.videoElement.videoWidth;
        const height = this.videoElement.videoHeight;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.ctx.drawImage(this.videoElement, 0, 0, width, height);

        // Lazy-update videoFrame only when needed for slow-path operations like crop()
        // This keeps the hot path (getSegmentColors) lean.
    }

    async getSegmentColors() {
        if (!this.videoElement) return this.segData;

        // Draw frame once to the persistent canvas
        this.updateFrame();

        let width = this.canvas.width
        let height = this.canvas.height

        // Performance Optimization: Get all pixel data once
        const imageData = this.ctx.getImageData(0, 0, width, height);

        // Process segments synchronously - faster than async overhead for small canvases
        this.getSegmentLeft(this.segments.left, width, height, imageData);
        this.getSegmentRight(this.segments.right, width, height, imageData);
        this.getSegmentTop(this.segments.top, width, height, imageData);
        this.getSegmentBottom(this.segments.bottom, width, height, imageData);

        // UI Update after calculations to reduce perceived lag
        this.updateColorBox()

        return this.segData
    }

    getSegmentLeft(segments, width, height, imageData) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(0, index * cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }

    getSegmentRight(segments, width, height, imageData) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(width - cropWidth, index * cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }

    getSegmentTop(segments, width, height, imageData) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(index * cropWidth, 0, cropWidth, cropHeight, width, imageData)
        })
    }

    getSegmentBottom(segments, width, height, imageData) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getAverageColor(index * cropWidth, height - cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }

    // Performance Optimization: Direct pixel manipulation instead of sharp library
    getAverageColor(left, top, width, height, canvasWidth, imageData) {
        let r = 0, g = 0, b = 0;
        let count = 0;
        const data = imageData.data;

        for (let y = top; y < top + height; y++) {
            for (let x = left; x < left + width; x++) {
                const i = (y * canvasWidth + x) * 4;
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return this.rgbToHex(r, g, b);
    }

    async crop(left, top, width, height) {
        // Slow path: update screenPng and use sharp
        await this.capture()
        const sharp = require('sharp')
        let croppedImage = await sharp(this.screenPng).extract({ left, top, width, height })
        const croppedImageBuffer = await croppedImage.toBuffer();
        document.getElementById('cropped-image').src = `data:image/png;base64,${croppedImageBuffer.toString('base64')}`
        return croppedImage
    }

    // Performance Optimization: Reuse DOM elements instead of innerHTML = ""
    updateColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return;

        const boxes = colorViewer.getElementsByClassName('color-box');
        let index = 0;

        for (let segment in this.segData) {
            let color = this.segData[segment]
            let box;

            if (index < boxes.length) {
                box = boxes[index];
            } else {
                box = document.createElement("div");
                box.classList.add('color-box');
                colorViewer.appendChild(box);
            }

            box.style.backgroundColor = color
            index++;
        }

        // Remove extra boxes if segments decreased
        while (boxes.length > index) {
            colorViewer.removeChild(boxes[boxes.length - 1]);
        }
    }

    capture() {
        return desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } })
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
