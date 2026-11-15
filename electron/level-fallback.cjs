const path = require("node:path");
const { createWorker } = require("tesseract.js");
const { parseLevel } = require("./level-ocr.cjs");
const { parseGold } = require("./gold-ocr.cjs");
let workerPromise;
function worker() {
  if (!workerPromise)
    workerPromise = createWorker("eng", 1, {
      langPath: path
        .join(__dirname, "ocr")
        .replace("app.asar" + path.sep, "app.asar.unpacked" + path.sep),
      workerPath: require
        .resolve("tesseract.js/src/worker-script/node/index.js")
        .replace("app.asar" + path.sep, "app.asar.unpacked" + path.sep),
      gzip: false,
      cacheMethod: "none",
    }).then(async (w) => {
      await w.setParameters({ tessedit_pageseg_mode: "7" });
      return w;
    });
  return workerPromise;
}
async function readLevelImage(base64, digits = false) {
  if (typeof base64 !== "string" || base64.length > 500000) return "";
  const bytes = Buffer.from(base64, "base64");
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return "";
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const w = await worker();
        await w.setParameters({
          tessedit_pageseg_mode: digits ? "8" : "7",
          tessedit_char_whitelist: digits ? "0123456789" : "",
        });
        let { data } = await w.recognize(bytes);
        if (digits && (data.confidence < 70 || parseGold(data.text) === null)) {
          // Word mode preserves the HUD's 3 (block mode reads 36 as 46).
          // An isolated 8 sometimes needs block mode, with the same floor.
          await w.setParameters({tessedit_pageseg_mode:"6"});
          const second = await w.recognize(bytes);
          if (second.data.confidence >= 70 && parseGold(second.data.text) !== null)
            data = second.data;
        }
        const firstLevel = parseLevel(data.text);
        if (!digits && firstLevel !== null && data.confidence >= 40 && data.confidence < 60) {
          // The tiny "Nv." label can depress the word score (Nv.9 scores 50).
          // A second, HUD-only pass must agree and meet the normal confidence
          // floor; never turn a bare shop digit into a labelled level.
          await w.setParameters({tessedit_char_whitelist: "NnVvLlEeIi0123456789.:"});
          const second = await w.recognize(bytes);
          if (second.data.confidence >= 60 && parseLevel(second.data.text) === firstLevel)
            data = second.data;
        }
        // Short HUD labels (e.g. "Nv. 8") score lower than prose. Only the
        // strict labelled level parser may use this floor; gold stays at 70.
        // The session still requires two frames and rejects downward jumps.
        const valid = digits ? data.confidence >= 70 :
          data.confidence >= 60 && parseLevel(data.text) !== null;
        return valid ? data.text : "";
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Tempo de leitura de nível excedido")),
          5000,
        );
      }),
    ]);
  } catch (error) {
    void stopLevelWorker();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function stopLevelWorker() {
  const pending = workerPromise;
  workerPromise = undefined;
  if (pending)
    try {
      await (await pending).terminate();
    } catch {}
}
const readGoldImage = (base64) => readLevelImage(base64, true);
module.exports = { readLevelImage, readGoldImage, stopLevelWorker };
