# Local level OCR

`eng.traineddata` is the English LSTM model from the official
https://github.com/tesseract-ocr/tessdata_fast repository (Apache-2.0).
Bundled on 2026-11-14. It is loaded from disk; no screenshot or crop is uploaded
and no model download is needed at runtime. Tesseract.js 6 is used only as a
fallback when Windows OCR cannot read the short level label. Both engines use
the same crop. Tesseract must report confidence >= 70; a level must also pass
the strict label parser and two consecutive readings before updating the guide.
