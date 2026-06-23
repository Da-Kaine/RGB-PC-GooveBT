const { desktopCapturer } = require('electron')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
class Capture {
    constructor(screenId) {
        this.screenshot = null
        this.screenPng = null
        this.stream = null
        this.screenId = screenId
        this.videoElement = null
        this.canvas = null
        this.ctx = null
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
            this.canvas = document.createElement("canvas");
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
            this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
            this.refresh()
        }

    }
    getVideoFrame() {
        this.ctx.drawImage(this.videoElement, 0, 0);
    }
    async getSegmentColors() {
        this.getVideoFrame()
        let width = this.videoElement.videoWidth
        let height = this.videoElement.videoHeight

        // Use Promise.all to keep concurrency, though getCropColors is now sync
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

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(0, index * cropHeight, cropWidth, cropHeight)
        })
    }
    async getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        })
    }
    async getSegmentTop(segments, width, height) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        segments.forEach((segment, index) => {
            this.segData[segment] = this.getCropColors(index * cropWidth, 0, cropWidth, cropHeight)
        })
        this.singleSegmentDuration = Date.now() - start
    }
    async getSegmentBottom(segments, width, height) {
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

        // Sampling every 4th pixel for performance (RGBA)
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        return this.rgbToHex(
            Math.floor(r / totalPixels),
            Math.floor(g / totalPixels),
            Math.floor(b / totalPixels)
        );
    }
    createColorBox() {
        let colorViewer = document.getElementById('color-viewer')
        if (!colorViewer) return;

        let boxes = colorViewer.getElementsByClassName('color-box');
        let index = 0;

        for (let segment in this.segData) {
            let color = this.segData[segment]
            let box = boxes[index];

            if (!box) {
                box = document.createElement("div");
                box.classList.add('color-box');
                colorViewer.appendChild(box);
            }

            if (box.style.backgroundColor !== color) {
                box.style.backgroundColor = color;
            }
            index++;
        }

        // Remove extra boxes if segData shrunk (though unlikely here)
        while (boxes.length > index) {
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
}

export default Capture