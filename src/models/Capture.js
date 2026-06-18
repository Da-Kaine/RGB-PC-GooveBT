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

        // Use a persistent canvas and context for performance
        this.canvas = document.createElement("canvas")
        this.context = this.canvas.getContext("2d", { willReadFrequently: true })

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
        if (!this.videoElement) return
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth
            this.canvas.height = this.videoElement.videoHeight
        }
        this.context.drawImage(this.videoElement, 0, 0)
    }

    getSegmentColors() {
        this.updateVideoFrame()
        let width = this.canvas.width
        let height = this.canvas.height

        if (width === 0 || height === 0) return this.segData

        this.getSegmentLeft(this.segments.left, width, height)
        this.getSegmentRight(this.segments.right, width, height)
        this.getSegmentTop(this.segments.top, width, height)
        this.getSegmentBottom(this.segments.bottom, width, height)

        this.createColorBox()
        return this.segData
    }

    getSegmentLeft(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(0, index * cropHeight, cropWidth, cropHeight)
        }
    }
    getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        }
    }
    getSegmentTop(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        }
    }
    getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        }
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

    getCropColors(left, top, width, height) {
        const imageData = this.context.getImageData(left, top, width, height).data;
        let r = 0, g = 0, b = 0;
        const count = imageData.length / 4;

        for (let i = 0; i < imageData.length; i += 4) {
            r += imageData[i];
            g += imageData[i + 1];
            b += imageData[i + 2];
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return this.rgbToHex(r, g, b);
    }

    async crop(left, top, width, height) {
        // This method was using sharp to extract from screenPng (which comes from desktopCapturer thumbnail)
        // Since it's currently unused and we want to remove sharp, we'll refactor it to use a temporary canvas if needed.
        // For now, let's just make it return a data URL from the current video frame as a fallback.
        this.updateVideoFrame()
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = width
        tempCanvas.height = height
        const tempContext = tempCanvas.getContext('2d')
        tempContext.drawImage(this.canvas, left, top, width, height, 0, 0, width, height)

        const dataUrl = tempCanvas.toDataURL('image/png')
        const img = document.getElementById('cropped-image')
        if (img) img.src = dataUrl

        return dataUrl
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