importScripts('https://cdn.jsdelivr.net/npm/qrcode-generator/qrcode.js');

self.onmessage = (event) => {
    const {chunks, qrConfig} = event.data;
    const qrCodeCache=[];
    try{
        for(let i=0;i<chunks.length;i++){
            const jsonChunk=chunks[i];
            const qr=qrcode(qrConfig.TYPE_NUMBER, qrConfig.ERROR_CORRECTION_LEVEL);
            qr.addData(jsonChunk); qr.make();
            qrCodeCache.push(qr.createImgTag(6,4));
            if(i % Math.floor(chunks.length/20)===0 || i===chunks.length-1){ self.postMessage({type:'progress', progress:i+1, total:chunks.length}); }
        }
        self.postMessage({type:'complete', cache:qrCodeCache});
    }catch(e){
        self.postMessage({type:'error', message:e.message});
    }
};
