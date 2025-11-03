// qr_worker.js （改善後）

/*
importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

self.onmessage = (event) => {
    try {
        const imageData = event.data;
        if (!imageData || !imageData.data) {
            self.postMessage({ found: false, error: 'Invalid imageData received' });
            return;
        }

        // デバッグ追加
        self.postMessage({
            found: false,
            debug: `width=${imageData.width}, height=${imageData.height}, length=${imageData.data.length}`
        });

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth"
        });

        if (code && code.data) {
            self.postMessage({ found: true, data: code.data });
        } else {
            self.postMessage({ found: false });
        }
    } catch (e) {
        self.postMessage({ found: false, error: e.message });
    }
};
*/

// qr_worker.js
importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

self.onmessage = (event) => {
    try {
        const { data, width, height } = event.data;

        if (!data || !width || !height) {
            self.postMessage({ found: false, error: 'Invalid data received' });
            return;
        }

        // jsQR で解析
        const code = jsQR(data, width, height, {
            inversionAttempts: "attemptBoth"
        });

        if (code && code.data) {
            self.postMessage({ found: true, data: code.data });
        } else {
            self.postMessage({ found: false });
        }
    } catch (e) {
        self.postMessage({ found: false, error: e.message });
    }
};
