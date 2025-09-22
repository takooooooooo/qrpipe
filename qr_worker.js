// QRコード解析ライブラリ(jsQR)をインポート
// Web Worker内ではimportScripts()を使用する
importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

self.onmessage = (event) => {
    // メインスレッドからImageDataオブジェクトを受け取る
    const imageData = event.data;

    // jsQRでQRコードをスキャン
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });

    if (code) {
        // QRコードが見つかった場合、そのデータをメインスレッドに返す
        self.postMessage({ found: true, data: code.data });
    } else {
        // QRコードが見つからなかった場合、その結果を返す
        self.postMessage({ found: false });
    }
};
