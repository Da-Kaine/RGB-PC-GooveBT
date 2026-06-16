const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
class Capture {
    constructor(screenId) {
        this.stream = null
        this.screenId = screenId
        this.videoElement = null
        this.segData = {}

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
        }

    }
    getVideoFrame() {
        if (this.canvas.width !== this.videoElement.videoWidth || this.canvas.height !== this.videoElement.videoHeight) {
            this.canvas.width = this.videoElement.videoWidth;
            this.canvas.height = this.videoElement.videoHeight;
        }
        this.ctx.drawImage(this.videoElement, 0, 0);
    }
    async getSegmentColors() {
        this.getVideoFrame()
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
            this.segData[segment] = this.getAverageColor(0, index * cropHeight, cropWidth, cropHeight)
        }
    }
    getSegmentRight(segments, width, height) {
        let cropHeight = Math.floor(height / segments.length)
        let cropWidth = Math.floor(0.3 * width)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getAverageColor(width - cropWidth, index * cropHeight, cropWidth, cropHeight)
        }
    }
    getSegmentTop(segments, width, height) {
        let start = Date.now()
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getAverageColor(index * cropWidth, 0, cropWidth, cropHeight)
        }
        this.singleSegmentDuration = Date.now() - start
    }
    getSegmentBottom(segments, width, height) {
        let cropHeight = Math.floor(height * .3)
        let cropWidth = Math.floor(width / segments.length)

        for (let [index, segment] of segments.entries()) {
            this.segData[segment] = this.getAverageColor(index * cropWidth, height - cropHeight, cropWidth, cropHeight)
        }
    }
    getCropColors(left, top, width, height) {
        return this.getAverageColor(left, top, width, height)
    }
    crop(left, top, width, height) {
        console.log('cropped')
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx.drawImage(this.videoElement, left, top, width, height, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/png')
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

    componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    rgbToHex(r, g, b) {
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }

    getAverageColor(left, top, width, height) {
        const imageData = this.ctx.getImageData(left, top, width, height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        const count = data.length / 4;
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return this.rgbToHex(r, g, b);
    }
}

export default Capture