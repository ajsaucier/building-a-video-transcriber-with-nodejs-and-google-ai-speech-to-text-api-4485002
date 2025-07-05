const express = require("express");
const cors = require("cors");
const speech = require("@google-cloud/speech");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

const app = express();

app.use(cors());

const client = new speech.SpeechClient();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads")
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

ffmpeg.setFfmpegPath(ffmpegPath);

app.get("/", (req, res) => {
    res.send("Welcome to our API transcription API");
})

app.post("/transcribe", upload.single("file"), async (req, res) => {
    // --- IMPORTANT: Check if a file was actually uploaded ---
    if (!req.file) {
        console.error('No file uploaded or Multer failed to process.');
        return res.status(400).send("No file uploaded. Please select an image.");
    }
    const videoFilePath = req.file.path;
    const audioFilePath = `${videoFilePath}.wav`;

    ffmpeg(videoFilePath)
    .toFormat("wav")
    .audioCodec("pcm_s16le")
    .audioFrequency(16000)
    .audioChannels(1)
    .on("end", async () => {

        const audioBytes = fs.readFileSync(audioFilePath).toString("base64");

        const request = {
            audio: {
                content: audioBytes
            },
            config: {
                encoding: "LINEAR16",
                sampleRateHertz: 16000,
                languageCode: "en-US"
            }
        }

        try {

            const [response] = await client.recognize(request)

            const transcription = response.results
            .map(result => {
                return result.alternatives[0].transcript
            }).join("\n");

            fs.unlinkSync(videoFilePath);
            fs.unlinkSync(audioFilePath);

            res.send({
                text: transcription
            });


        } catch (err) {
            console.error(`API error: ${err}`);
            if (err.code) {
                console.error(`Error Code: ${err.code}`);
            }
            if (err.details) {
                console.error(`Error Details: ${err.details}`);
            }
            if (err.metadata) {
                console.error(`Error Metadata:`, err.metadata);
            }
            return res.status(500).send(`Error transcribing video: ${err.message}`);
        }
    })
    .on("error", (error) => {
        console.log("Error extracting audio", error);

        res.status(500).send("Error processing video");
    })
    .save(audioFilePath);

    // try {

    //     // --- Clean up the uploaded file after processing ---
    //     fs.unlink(filePath, (err) => {
    //         if (err) {
    //             console.error("Failed to delete temporary file:", err);
    //         } else {
    //             console.log("Temporary file deleted:", filePath);
    //         }
    //     });

    // } catch (error) {
    //     console.error("Error during transcript generation:", error);
    //     // If an error occurred after the file was uploaded, try to delete it
    //     if (fs.existsSync(filePath)) {
    //          fs.unlink(filePath, (err) => {
    //             if (err) console.error("Failed to delete temporary file after error:", err);
    //          });
    //     }
    //     if (error.response && error.response.error) {
    //         // If it's a Gemini API error with a structured response
    //         res.status(500).send(`Error from Gemini API: ${error.response.error.message || error.message}`);
    //     } else {
    //         res.status(500).send("An error occurred during transcript generation. Please try again.");
    //     }
    // }
})

const PORT = process.env.PORT || 1330;

app.listen(PORT, ()=> {
    console.log(`Server is running on port: ${PORT}`);
})