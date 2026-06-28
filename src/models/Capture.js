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
        this.videoFrame = null
        this.segData = {}
        // Use a persistent canvas to avoid re-allocation and use willReadFrequently for better getImageData performance
        this.canvas = document.createElement("canvas");
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
        //time delay to calculate segment colors
    }
    async refresh() {
        // return
        while (this.stream) {
            let start = Date.now()
            // Draw current video frame to persistent canvas
            if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
                this.canvas.width = this.videoElement.videoWidth;
                this.canvas.height = this.videoElement.videoHeight;
            }
            this.ctx.drawImage(this.videoElement, 0, 0);

            // Update videoFrame for API compatibility
            this.videoFrame = Buffer.from(this.canvas.toDataURL('image/png').split("base64,")[1], "base64");

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
    getVideoFrame() {
        // Reuse persistent canvas instead of creating new ones
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.ctx.drawImage(this.videoElement, 0, 0);
        window.canvas = this.canvas
        return this.canvas.toDataURL('image/png');
    }
    async getSegmentColors() {
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

        let promises = [
            this.getSegmentLeft(this.segments.left, width, height),
            this.getSegmentRight(this.segments.right, width, height),
            this.getSegmentTop(this.segments.top, width, height),
            this.getSegmentBottom(this.segments.bottom, width, height)
        ]
        this.updateColorBox()
        await Promise.all(promises)

        return this.segData
    }
    async getSegmentLeft(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        await Promise.all(segments.map(async (segment, index) => {
            this.segData[segment] = await this.getCropColors(0, index * cropHeight, cropWidth, cropHeight)
        }))
    }
    async getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        await Promise.all(segments.map(async (segment, index) => {
            this.segData[segment] = await this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        }))
    }
    async getSegmentTop(segments, width, height) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        await Promise.all(segments.map(async (segment, index) => {
            this.segData[segment] = await this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        }))
        this.singleSegmentDuration = Date.now() - start
    }
    async getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        await Promise.all(segments.map(async (segment, index) => {
            this.segData[segment] = await this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        }))
    }
    async getCropColors(left, top, width, height) {
        // Optimized: use getImageData and manual average to avoid sharp/buffer overhead
        const imageData = this.ctx.getImageData(left, top, width, height);
        const data = imageData.data;
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
        // Maintain API compatibility by returning a sharp instance
        await this.capture()
        console.log('cropped')
        let croppedImage = await sharp(this.screenPng).extract({ left, top, width, height })
        const croppedImageBuffer = await croppedImage.toBuffer();
        document.getElementById('cropped-image').src = `data:image/png;base64,${croppedImageBuffer.toString('base64')}`
        return croppedImage
    }
    updateColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        // Optimization: reuse existing boxes to minimize DOM churn
        let boxes = colorViewer.getElementsByClassName('color-box');
        let segmentIndex = 0;
        for (let segment in this.segData) {
            let color = this.segData[segment]
            let box;
            if (segmentIndex < boxes.length) {
                box = boxes[segmentIndex];
            } else {
                box = document.createElement("div");
                box.classList.add('color-box');
                colorViewer.appendChild(box);
            }
            box.style.backgroundColor = color
            segmentIndex++;
        }
        // Remove extra boxes if any
        while (colorViewer.children.length > segmentIndex) {
            colorViewer.removeChild(colorViewer.lastChild);
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