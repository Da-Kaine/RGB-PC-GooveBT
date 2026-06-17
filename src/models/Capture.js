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

        // Persistent canvas for frame processing
        this.canvas = document.createElement("canvas");
        this.canvasContext = this.canvas.getContext("2d", { willReadFrequently: true });

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
            this.videoFrame = this.getVideoFrame()
        }

    }
    getVideoFrame() {
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.canvasContext.drawImage(this.videoElement, 0, 0);
        return this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    getSegmentColors() {
        this.videoFrame = this.getVideoFrame()
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

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
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        }
        this.singleSegmentDuration = Date.now() - start
    }
    getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        }
    }
    getAverageColor(imageData, x, y, width, height) {
        const data = imageData.data;
        const fullWidth = imageData.width;
        let r = 0, g = 0, b = 0;
        let count = 0;

        for (let j = y; j < y + height; j++) {
            for (let i = x; i < x + width; i++) {
                const index = (j * fullWidth + i) * 4;
                r += data[index];
                g += data[index + 1];
                b += data[index + 2];
                count++;
            }
        }

        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }
    getCropColors(left, top, width, height) {
        const { r, g, b } = this.getAverageColor(this.videoFrame, left, top, width, height);
        return this.rgbToHex(r, g, b)
    }
    async crop(left, top, width, height) {
        await this.capture()
        console.log('cropped')
        // Using canvas for the one-off crop function as well, although this is less performance critical than the sync loop.
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.canvasContext.drawImage(this.videoElement, 0, 0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, left, top, width, height, 0, 0, width, height);

        const croppedImageDataURL = tempCanvas.toDataURL('image/png');
        document.getElementById('cropped-image').src = croppedImageDataURL;
        return croppedImageDataURL;
    }
    createColorBox() {
        let colorViewer = document.getElementById('color-viewer')
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