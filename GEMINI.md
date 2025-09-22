### **超詳細設計書：QRコード ファイル転送システム**

#### **1. コンセプトと目標**

*   **コンセプト:** ブラウザのみで完結する、オフライン・P2Pのファイル転送システム。
*   **目標:** ユーザーが選択した任意のファイル（PDF、画像等）を、送信側デバイスの画面に表示される一連のQRコードに変換し、受信側デバイスのカメラでそれを読み取ることで、元のファイルを完全に復元し、ダウンロード可能にする。
*   **技術スタック:** HTML5, CSS3, JavaScript (ES6+), qrcode-generator, jsQR

---

#### **2. 共通プロトコル仕様 (`common.js`)**

このファイルは、送受信システム間の「憲法」であり、いかなる変更も両者に反映されなければならない。

*   **`PROTOCOL_CONFIG` オブジェクト:**
    *   `PAYLOAD_SIZE` (Number): 1つのQRコードに含まれる、ファイル本体データ（ペイロード）の最大バイト数を`1500`とする。これは、Base64エンコードによるデータ量増加（約33%）と、ヘッダー情報のオーバーヘッドを考慮し、QRコードが複雑化しすぎて認識率が低下するのを防ぐための安全な値である。
    *   `TRANSMISSION_INTERVAL` (Number): 送信側がQRコードを切り替える時間間隔を`500`ミリ秒とする。これにより、理論上の最大フレームレートは 2 FPS (Frames Per Second) となる。

*   **`QR_CONFIG` オブジェクト:**
    *   `ERROR_CORRECTION_LEVEL` (String): 誤り訂正レベルを `'M'` とする。これにより、QRコードの最大約15%が欠損・汚損してもデータを復元可能とし、通信の安定性を確保する。
    *   `TYPE_NUMBER` (Number): QRコードのバージョンを `40`（固定）とする。これにより、生成されるQRコードのサイズと複雑さが一定に保たれる。

---

#### **3. 送信側 (`transmitter.html`) 機能要件**

**【UIコンポーネント】**
1.  `fileInput` (`<input type="file">`): ユーザーがローカルファイルを選択するためのインターフェース。
2.  `startButton` (`<button>`): ファイル選択後、QRコードの生成と送信（連続表示）を開始するトリガー。
3.  `stopButton` (`<button>`): 送信を停止するトリガー。初期状態は非表示または無効。
4.  `qrcodeContainer` (`<div>`): 生成されたQRコード画像（Canvasまたはimg要素）が表示されるコンテナ。
5.  `statusText` (`<p>`): 現在の処理状況（例: "ファイルを選択してください", "15/150 送信中...", "送信完了"）を表示するテキストエリア。
6.  `bitrateText` (`<p>`): 実測の転送速度（kbps）を表示するエリア。

**【状態管理変数】**
*   `fileBuffer` (ArrayBuffer): 読み込んだファイル全体のバイナリデータ。
*   `chunks` (Array of Strings): ファイルを分割し、プロトコル形式（JSON文字列）に変換したチャンクの配列。
*   `currentIndex` (Number): 現在表示しているチャンクのインデックス。
*   `transmissionIntervalId` (Number): `setInterval` のID。停止処理に使用。
*   `isTransmitting` (Boolean): 現在送信中かどうかの状態フラグ。

**【実装ステップ（ロジックフロー）】**
1.  **初期化 (`DOMContentLoaded` イベント):**
    *   各UIコンポーネントへの参照を取得する。
    *   `startButton` に `click` イベントリスナーを追加する。`stopButton` にも同様に追加。
2.  **ファイル選択 (`fileInput` の `change` イベント):**
    *   ユーザーがファイルを選択したら、`startButton` を有効化する。
    *   `statusText` に選択されたファイル名とサイズを表示する。
3.  **送信開始 (`startButton` クリック時):**
    1.  `isTransmitting` フラグを `true` に設定し、UIを送信中モード（`startButton`無効化、`stopButton`有効化）に切り替える。
    2.  `FileReader` インスタンスを生成する。
    3.  `reader.readAsArrayBuffer()` を使って、選択されたファイルを `ArrayBuffer` として非同期に読み込む。
    4.  **`reader.onload` イベントハンドラ内（読み込み完了後）:**
        1.  `fileBuffer` に読み込んだデータを格納する。
        2.  **データ分割処理:**
            *   `fileBuffer` を `PROTOCOL_CONFIG.PAYLOAD_SIZE` ごとにスライスし、複数の `ArrayBuffer` チャンクに分割する。
        3.  **プロトコル構築処理:**
            *   `chunks` 配列を初期化する。
            *   分割した各チャンクに対してループ処理を行う:
                *   チャンク（バイナリ）を **Base64** 文字列にエンコードする。（`btoa` と `String.fromCharCode` を組み合わせる）
                *   ヘッダー情報（`i`: 現在のインデックス, `t`: 総チャンク数）とBase64データを組み合わせ、プロトコル仕様通りのJSONオブジェクトを作成する。
                *   `JSON.stringify()` を使って、オブジェクトをJSON文字列に変換し、`chunks` 配列に追加する。
        4.  `currentIndex` を `0` にリセットする。
        5.  `startQrDisplay()` 関数を呼び出す。
4.  **QRコード表示ループ (`startQrDisplay` 関数):**
    *   既存の `transmissionIntervalId` があれば `clearInterval` で停止させる（再開時のため）。
    *   `setInterval` を `PROTOCOL_CONFIG.TRANSMISSION_INTERVAL` の間隔で開始し、`transmissionIntervalId` にIDを保存する。
    *   **`setInterval` のコールバック関数内:**
        1.  `qrcodeContainer` の中身をクリアする。
        2.  `chunks[currentIndex]` から現在のJSON文字列を取得する。
        3.  `qrcode-generator` ライブラリを使い、JSON文字列からQRコードを生成する。`QR_CONFIG` の設定を適用する。
        4.  生成されたQRコードを `qrcodeContainer` に表示する。
        5.  `statusText` を更新する (例: `${currentIndex + 1}/${chunks.length} 送信中...`)。
        6.  `currentIndex` をインクリメントする。
        7.  もし `currentIndex` が `chunks.length` に達したら、`0` に戻す（ループ）。
5.  **送信停止 (`stopButton` クリック時):**
    *   `clearInterval(transmissionIntervalId)` を呼び出してループを停止する。
    *   `isTransmitting` フラグを `false` に設定し、UIを待機モードに戻す。

---

#### **4. 受信側 (`receiver.html`) 機能要件**

**【UIコンポーネント】**
1.  `video` (`<video>`): カメラ映像をリアルタイムで表示するエリア。
2.  `statusText` (`<p>`): 受信状況（例: "カメラをQRコードに向けてください", "75/150 受信中..."）を表示するエリア。
3.  `progressBar` (`<progress>`): 受信進捗を視覚的に示すプログレスバー。
4.  `downloadContainer` (`<div>`): 受信完了後、ダウンロードボタンが表示されるコンテナ。
5.  `logText` (`<textarea>`): デバッグ用に、受信したチャンクのインデックスなどを表示するログエリア（任意）。

**【状態管理変数】**
*   `receivedChunks` (Array of Strings): 受信したBase64データを格納する配列。インデックスを合わせて格納するため、総チャンク数で初期化しておく。
*   `totalChunks` (Number): 受信すべき総チャンク数。最初のQRコードから取得する。
*   `receivedCount` (Number): 現在までに受信したユニークなチャンクの数。
*   `stream` (MediaStream): カメラのストリームオブジェクト。停止処理に使用。

**【実装ステップ（ロジックフロー）】**
1.  **初期化 (`DOMContentLoaded` イベント):**
    *   各UIコンポーネントへの参照を取得する。
    *   `startScan()` 関数を呼び出す。
2.  **スキャン開始 (`startScan` 関数):**
    1.  `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` で背面カメラにアクセスを要求する。
    2.  **Promiseが成功したら (`.then`):**
        *   取得した `stream` を `<video>` 要素の `srcObject` に設定し、再生を開始する。
        *   非表示の `<canvas>` 要素を作成し、ビデオと同じ解像度に設定する。
        *   `tick()` 関数を呼び出してスキャンループを開始する。
3.  **スキャンループ (`tick` 関数):**
    1.  `requestAnimationFrame(tick)` を呼び出して、次のフレームで自身を再度呼び出すようスケジュールする。
    2.  `<video>` が再生可能な状態であれば、ビデオの現在のフレームを非表示Canvasに `drawImage` で描画する。
    3.  Canvasの画像データを `getImageData` で取得する。
    4.  `jsQR` ライブラリに画像データを渡し、QRコードをスキャンする。
    5.  **QRコードが検出された場合 (`jsQR`が結果を返した場合):**
        1.  QRコードのデータを取得し、`JSON.parse()` でJSONオブジェクトにパースする。**（`try-catch`で囲み、不正なデータの場合は無視する）**
        2.  パースしたオブジェクトから `i`, `t`, `d` を取り出す。
        3.  **初回受信時の処理:**
            *   もし `totalChunks` が未設定（`null`や`0`）であれば、`t` の値で `totalChunks` を設定し、`receivedChunks` 配列を `new Array(totalChunks)` で初期化する。
        4.  **データ格納処理:**
            *   `receivedChunks[i]` がまだ空（`undefined`）の場合のみ、以下の処理を行う（**重複受信の排除**）。
                *   `receivedChunks[i]` にBase64データ `d` を格納する。
                *   `receivedCount` をインクリメントする。
                *   UI（`statusText`, `progressBar`）を現在の進捗で更新する。
        5.  **完了判定:**
            *   `receivedCount` が `totalChunks` に達したら、`completeReception()` 関数を呼び出す。
4.  **受信完了 (`completeReception` 関数):**
    *   **スキャンを停止**する（`requestAnimationFrame` のループを止めるか、フラグで制御する）。
    *   カメラのストリームを停止する (`stream.getTracks().forEach(track => track.stop())`)。
    *   `statusText` に「受信完了！ファイルを生成中...」と表示する。
    *   **ファイル再構築処理（非同期で行うことが望ましい）:**
        1.  `receivedChunks` 配列の全要素（Base64文字列）を順番通りに結合する。
        2.  結合した巨大なBase64文字列を、**バイナリデータにデコード**する。（`atob` を使い、文字コードの問題を避けるためUint8Arrayに変換するヘルパー関数を実装する）
        3.  変換した `Uint8Array` から、`new Blob([uint8Array], { type: 'application/pdf' })` のように **Blob** オブジェクトを生成する。**（typeは本来ファイルに応じて動的にすべきだが、今回はPDFで固定する）**
        4.  `URL.createObjectURL(blob)` を使って、BlobへのダウンロードURLを生成する。
        5.  `downloadContainer` に `<a>` タグを生成し、`href` にURL、`download` 属性にファイル名（例: `downloaded_file.pdf`）を設定して表示する。
    *   `statusText` を「ダウンロード準備完了」に更新する。

---

##### **アーキテクチャの改善（Web Workerと適応型スロットリング）**

当初の実装では、メインスレッドでQRコードの解析を行っていたため、特に低スペックなデバイスにおいて、UIのカクつきや、QRコードのフレーム取りこぼしが発生する懸念があった。この問題を解決するため、以下の通りアーキテクチャを大幅に改善した。

*   **課題:**
    *   `jsQR`によるQRコード解析はCPU負荷の高い処理であり、メインスレッドで実行するとUIの応答性を損なう。
    *   カメラからの映像フレーム（最大60fps）をすべて解析しようとすると、処理が追いつかずにキューが溜まり、遅延が増大する。

*   **解決策:**
    1.  **Web Workerの導入:**
        *   QRコードの解析処理を完全にバックグラウンドの**Web Worker**スレッドにオフロードした。
        *   これにより、メインスレッドはUIの更新とカメラ映像の描画に専念でき、アプリケーションの応答性が維持される。
        *   `qr_worker.js`という専用ファイルに解析ロジックを分離した。

    2.  **適応型スロットリング (Adaptive Throttling) の実装:**
        *   Web Workerが処理中かどうかを管理するフラグ (`isWorkerBusy`) を導入。
        *   メインスレッドは、Web Workerが手空きの（`isWorkerBusy === false`）場合にのみ、新しいフレーム画像を解析のために送信する。
        *   フレームを送信すると、すぐに `isWorkerBusy` を `true` に設定。ワーカーからの応答があるまで次のフレームは送信しない。
        *   ワーカーは解析が完了すると、結果とともにメインスレッドに通知し、メインスレッドは `isWorkerBusy` を `false` に戻す。
        *   この仕組みにより、デバイスの処理能力に応じて解析のフレームレートが自動的に調整され、ワーカーの過負荷を防ぎ、効率的な処理を実現する。

*   **状態管理変数の追加:**
    *   `worker` (Worker): Web Workerのインスタンス。
    *   `isWorkerBusy` (Boolean): Web Workerが現在処理中かを示すフラグ。

*   **改訂後のロジックフロー (`tick`関数):**
    1.  `requestAnimationFrame(tick)` でループを継続。
    2.  ビデオフレームをCanvasに描画する。
    3.  **`isWorkerBusy` が `false` の場合のみ、**
        1.  `isWorkerBusy` を `true` に設定する。
        2.  Canvasから `ImageData` を取得する。
        3.  `worker.postMessage()` を使って、`ImageData` の所有権を（コピーではなく）Web Workerに**転送**する。
    4.  Web Workerはバックグラウンドで `jsQR` を実行し、結果を `postMessage` でメインスレッドに返す。
    5.  メインスレッドの `worker.onmessage` ハンドラが結果を受け取り、`isWorkerBusy` を `false` に戻し、QRコードが検出されていれば `handleQrCode()` を呼び出す。