const videoUpload = document.getElementById("videoUpload");
const videoPreview = document.getElementById("videoPreview");
const transcribeButton = document.getElementById("transcribeButton");
const transcribedText = document.getElementById("transcribedText");
const transcriptionProgressBar = document.getElementById("transcriptionProgressBar");

let selectedFile;

videoUpload.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        let selectedVideo = URL.createObjectURL(selectedFile);

        videoPreview.src = selectedVideo;
    }
})

async function transcribeVideo() {
    let formData = new FormData();

    formData.append("file", selectedFile);

    transcriptionProgressBar.style.visibility = "visible";

    try {
        let response = await axios.post("http://localhost:1330/transcribe", formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        if (response.data) {
            displayTranscription(response);
        }

            transcriptionProgressBar.style.visibility = "visible";

    } catch(e) {

        transcriptionProgressBar.style.visibility = "visible";

        alert("Video transcription failed.");
    }
}

transcribeButton.addEventListener("click", transcribeVideo);

function displayTranscription(response) {
    transcribedText.value = response.data.text;
}