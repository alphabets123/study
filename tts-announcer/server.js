const express = require('express');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const app = express();
const PORT = 3400;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main Route
app.get('/', (req, res) => {
    res.render('index');
});

// TTS API
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice, count, rate } = req.body;

        if (!text) {
            return res.status(400).json({ success: false, error: '텍스트가 필요합니다.' });
        }

        const tts = new MsEdgeTTS();
        const selectedVoice = voice || 'ko-KR-SunHiNeural';

        // Rate handling (e.g., 1.5 -> '+50%')
        let rateString = "+0%";
        if (rate !== undefined) {
            const numericRate = parseFloat(rate);
            if (!isNaN(numericRate)) {
                const percentage = Math.round((numericRate - 1) * 100);
                rateString = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
            }
        }

        await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const repeatCount = parseInt(count) || 1;
        let fullText = " , , , "; // Padding for mic delay
        for (let i = 0; i < repeatCount; i++) {
            fullText += text + " , , ";
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        const { audioStream } = await tts.toStream(fullText, { rate: rateString });
        audioStream.pipe(res);

        audioStream.on('error', (err) => {
            console.error('TTS Stream Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: '스트림 전송 오류' });
            }
        });
    } catch (err) {
        console.error('TTS Server Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'TTS 변환 중 오류가 발생했습니다.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Standalone TTS Announcer running at http://localhost:${PORT}`);
});
