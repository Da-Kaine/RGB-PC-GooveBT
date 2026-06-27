const { desktopCapturer } = require('electron')
const sharp = require('sharp')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
class Capture {
    constructor(screenId) {
        this.screenshot = null
        this.screenPng = null
        this.stream = null
        this.screenId = screenId
        this.videoElement = null
        this.segData = {}

        // Persistent canvas for fast pixel access
        this.canvas = document.createElement("canvas")
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })

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
    updateVideoFrame() {
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.ctx.drawImage(this.videoElement, 0, 0);
    }
    get videoFrame() {
        // Maintain compatibility for callers expecting a Buffer, but only generate on demand
        return Buffer.from(this.canvas.toDataURL('image/png').split("base64,")[1], "base64")
    }
    /**
     * Optimized real-time color analysis:
     * 1. Uses a persistent canvas and ctx.drawImage to avoid per-frame DOM creation/toDataURL.
     * 2. Uses { willReadFrequently: true } for faster getImageData readback.
     * 3. Implements manual average color calculation to replace expensive sharp.stats().
     */
    async getSegmentColors() {
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
        const data = this.ctx.getImageData(left, top, width, height).data;
        let r = 0, g = 0, b = 0;
        const totalPixels = width * height;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        r = Math.floor(r / totalPixels);
        g = Math.floor(g / totalPixels);
        b = Math.floor(b / totalPixels);

        return this.rgbToHex(r, g, b)
    }
    async crop(left, top, width, height) {
        await this.capture()
        console.log('cropped')
        let croppedImage = await sharp(this.screenPng).extract({ left, top, width, height })
        const croppedImageBuffer = await croppedImage.toBuffer();
        document.getElementById('cropped-image').src = `data:image/png;base64,${croppedImageBuffer.toString('base64')}`
        return croppedImage

    }
    updateColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return

        let boxes = colorViewer.getElementsByClassName('color-box')
        let segmentIds = Object.keys(this.segData)

        // If count mismatch, rebuild. Otherwise update in place.
        if (boxes.length !== segmentIds.length) {
            colorViewer.innerHTML = ""
            for (let segment in this.segData) {
                let color = this.segData[segment]
                const box = document.createElement("div");
                box.classList.add('color-box');
                box.style.backgroundColor = color
                colorViewer.appendChild(box);
            }
        } else {
            segmentIds.forEach((segment, index) => {
                boxes[index].style.backgroundColor = this.segData[segment]
            })
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
}

export default Capture