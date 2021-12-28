// https://jsfiddle.net/kv6x2tf7/

function toggleFullScreen() {
    if (!document.fullscreenElement) {

        var elem = document.getElementById("canvas");
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

const hdConstraints = {
    video: { width: { min: 1280 }, height: { min: 720 } }
};

navigator.mediaDevices.getUserMedia(hdConstraints).
    then((stream) => { video.srcObject = stream });

const video = document.querySelector('video');

video.addEventListener("click", function (e) {
    console.log('click: ' + e);
    toggleFullScreen();
}, false);

video.addEventListener("loadedmetadata", function (e) {
    console.log(colorSelect.value);
    processor.doLoad();
}, false);

const videoElement = document.querySelector('video');
const videoSelect = document.querySelector('select#videoSource');
const colorSelect = document.querySelector('select#colorType');

navigator.mediaDevices.enumerateDevices()
    .then(gotDevices).then(getStream).catch(handleError);

videoSelect.onchange = getStream;


function gotDevices(deviceInfos) {
    for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || 'camera ' +
                (videoSelect.length + 1);
            videoSelect.appendChild(option);
        } else {
            console.log('Found another kind of device: ', deviceInfo);
        }
    }
}

function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach(function (track) {
            track.stop();
        });
    }

    const constraints = {
        video: {
            deviceId: { exact: videoSelect.value }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).
        then(gotStream).catch(handleError);


}

function gotStream(stream) {
    window.stream = stream; // make stream available to console
    videoElement.srcObject = stream;
}

function handleError(error) {
    console.error('Error: ', error);
}

var CVDMatrix = { // Color Vision Deficiency
    "Protanope": [ // reds are greatly reduced (1% men)
        0.0, 2.02344, -2.52581,
		0.0, 1.0,      0.0,
		0.0, 0.0,      1.0
    ],
    "Deuteranope": [ // greens are greatly reduced (1% men)
        1.0, 0.0, 0.0,
        0.494207, 0.0, 1.24827,
        0.0, 0.0, 1.0
    ],
    "Tritanope": [ // blues are greatly reduced (0.003% population)
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        -0.395913, 0.801109, 0.0
    ]
};


var processor = {
    timerCallback: function () {
        if (this.video.paused || this.video.ended) {
            return;
        }
        this.computeFrame();
        var self = this;
        setTimeout(function () {
            self.timerCallback();
        }, 16); // roughly 60 frames per second
    },

    doLoad: function () {
        this.video = document.getElementById("video");
        this.c1 = document.getElementById("canvas");
        this.ctx1 = this.c1.getContext("2d");
        var self = this;

        self.width = self.video.videoWidth;
        self.height = self.video.videoHeight;
        self.timerCallback();
    },

    computeFrame: function () {

        this.ctx1.drawImage(this.video, 0, 0, this.width, this.height);
        var frame = this.ctx1.getImageData(0, 0, this.width, this.height);
        var len = frame.data.length / 4;
        var cvd = CVDMatrix[colorSelect.value],
            cvd_a = cvd[0],
            cvd_b = cvd[1],
            cvd_c = cvd[2],
            cvd_d = cvd[3],
            cvd_e = cvd[4],
            cvd_f = cvd[5],
            cvd_g = cvd[6],
            cvd_h = cvd[7],
            cvd_i = cvd[8];
        var L, M, S, l, m, s, R, G, B, RR, GG, BB, r, g, b;

        for (var i = 0; i < len; i++) {
            var rgb = frame.data.slice(i * 4, i * 4 + 3);
            r = rgb[0];
            g = rgb[1];
            b = rgb[2];
            // RGB to LMS matrix conversion
            L = (17.8824 * r) + (43.5161 * g) + (4.11935 * b);
            M = (3.45565 * r) + (27.1554 * g) + (3.86714 * b);
            S = (0.0299566 * r) + (0.184309 * g) + (1.46709 * b);

            // L = (0.31399022 * r) + (0.63951294 * g) + (0.04649755 * b);
            // M = (0.15537241 * r) + (0.75789446 * g) + (0.08670142 * b);
            // S = (0.01775239 * r) + (0.10944209 * g) + (0.87256922 * b);
            // Simulate color blindness
            l = (cvd_a * L) + (cvd_b * M) + (cvd_c * S);
            m = (cvd_d * L) + (cvd_e * M) + (cvd_f * S);
            s = (cvd_g * L) + (cvd_h * M) + (cvd_i * S);
            // LMS to RGB matrix conversion
            R = (0.0809444479 * l) + (-0.130504409 * m) + (0.116721066 * s);
            G = (-0.0102485335 * l) + (0.0540193266 * m) + (-0.113614708 * s);
            B = (-0.000365296938 * l) + (-0.00412161469 * m) + (0.693511405 * s);

            // R = (5.47221206 * l) + (-4.6419601 * m) + (0.16963708 * s);
            // G = (-1.1252419 * l) + (2.29317094 * m) + (-0.1678952 * s);
            // B = (0.02980165 * l) + (-0.19318073 * m) + (1.16364789 * s);

            // Isolate invisible colors to color vision deficiency (calculate error matrix)
            R = r - R;
            G = g - G;
            B = b - B;
            // Shift colors towards visible spectrum (apply error modifications)
            RR = (0.0 * R) + (0.0 * G) + (0.0 * B);
            GG = (0.7 * R) + (1.0 * G) + (0.0 * B);
            BB = (0.7 * R) + (0.0 * G) + (1.0 * B);
            // Add compensation to original values
            R = RR + r;
            G = GG + g;
            B = BB + b;
            // Clamp values
            if (R < 0) R = 0;
            if (R > 255) R = 255;
            if (G < 0) G = 0;
            if (G > 255) G = 255;
            if (B < 0) B = 0;
            if (B > 255) B = 255;
            // Record color
            frame.data[i * 4 + 0] = R >> 0;
            frame.data[i * 4 + 1] = G >> 0;
            frame.data[i * 4 + 2] = B >> 0;
        }
        this.ctx1.putImageData(frame, 0, 0);

        return;
    }
};

colorSelect.addEventListener("change", function (e) {
    console.log(colorSelect.value);
    processor.doLoad();
}, false);
