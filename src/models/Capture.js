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
        this.canvas = document.createElement('canvas')
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
        this.startVideoStream()
        this.segmentDuration = 0
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
            this.canvas.width = this.videoElement.videoWidth
            this.canvas.height = this.videoElement.videoHeight
            this.videoElement.play()
            this.refresh()
        }

    }
    async getSegmentColors() {
        this.ctx.drawImage(this.videoElement, 0, 0)
        let width = this.canvas.width
        let height = this.canvas.height
        if (width === 0 || height === 0) return this.segData;

        const imageData = this.ctx.getImageData(0, 0, width, height).data

        this.getSegmentLeft(this.segments.left, width, height, imageData)
        this.getSegmentRight(this.segments.right, width, height, imageData)
        this.getSegmentTop(this.segments.top, width, height, imageData)
        this.getSegmentBottom(this.segments.bottom, width, height, imageData)

        this.updateColorBox()

        return this.segData

    }
    getSegmentLeft(segments, width, height, imageData) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(0, index * cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }
    getSegmentRight(segments, width, height, imageData) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }
    getSegmentTop(segments, width, height, imageData) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight, width, imageData)
        })
        this.singleSegmentDuration = Date.now() - start
    }
    getSegmentBottom(segments, width, height, imageData) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(index * cropWidth, height - cropHeight, cropWidth, cropHeight, width, imageData)
        })
    }
    getCropColors(left, top, width, height, canvasWidth, imageData) {
        let r = 0, g = 0, b = 0;
        let count = 0;

        for (let y = top; y < top + height; y++) {
            for (let x = left; x < left + width; x++) {
                const i = (y * canvasWidth + x) * 4;
                r += imageData[i];
                g += imageData[i + 1];
                b += imageData[i + 2];
                count++;
            }
        }

        if (count === 0) return "#000000";

        return this.rgbToHex(
            Math.round(r / count),
            Math.round(g / count),
            Math.round(b / count)
        );
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
        let boxes = colorViewer.getElementsByClassName('color-box')
        let i = 0
        for (let segment in this.segData) {
            let color = this.segData[segment]
            if (boxes[i]) {
                boxes[i].style.backgroundColor = color
            } else {
                const box = document.createElement("div");
                box.classList.add('color-box');
                box.style.backgroundColor = color
                colorViewer.appendChild(box);
            }
            i++
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