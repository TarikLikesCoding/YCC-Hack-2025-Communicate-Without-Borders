//Declaring stuff
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById("copyBtn");
const finalEl = document.getElementById('finalTranscript');
const interimEl = document.getElementById('interim');
const statusEl = document.getElementById('status');
const languageSelect = document.getElementById('language');
const translatedEl = document.getElementById('translatedOutput');
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");


let recognition;
let isRecording = false;
let finalTranscript = '';

//Open AI API to polish stuff, if I forgot to remove my API key please be nice, tell me, and don't use it😭.
async function polishTranscript(rawText) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer OPEN_AI_API_KEY"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Fix grammar and punctuation of the following text without changing meaning." },
                { role: "user", content: rawText }
            ]
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

//Open AI API to translate stuff, if I forgot to remove my API key please be nice, tell me, and don't use it😭.

async function translateText(text, targetLanguage) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer OPEN_AI_API_KEY"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `You are a translator. Translate the following text into ${targetLanguage}. Keep the meaning accurate and natural.` },
                { role: "user", content: text }
            ],
            temperature: 0.2
        })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

//Checks if ur browser is good
if (!SpeechRecognition) {
    statusEl.textContent = 'Speech Recognition not supported in this browser.';
    startBtn.disabled = true;
    stopBtn.disabled = true;
    clearBtn.disabled = false;
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageSelect.value;

    //If this thing can hear something
    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interim += transcript;
            }
        }
        finalEl.textContent = finalTranscript; // show final updates live
        interimEl.textContent = interim; // show interim live
    };

    //Error recognition (THERE ARE NONE 😭🙏)
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event);
        statusEl.textContent = 'Error: ' + (event.error || 'unknown');
    };

    //Starting the recognition
    recognition.onstart = () => {
        isRecording = true;
        statusEl.textContent = 'Listening…';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        languageSelect.disabled = true;
        translatedEl.disabled = false;
    };

    //Ending the recognition
    recognition.onend = () => {
        isRecording = false;
        statusEl.textContent = 'Idle';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        translatedEl.disabled = true;
        languageSelect.disabled = false;
    };

    //Start button
    startBtn.addEventListener('click', () => {
        finalTranscript = finalEl.textContent.trim() + (finalEl.textContent ? ' ' : '');
        interimEl.textContent = '';
        recognition.lang = languageSelect.value;
        try {
            recognition.start();
        } catch (e) {
            console.warn('recognition.start() error', e);
        }
    });

    //Stop button with polishing feature and translation feature (this block of code is carrying everything) UPDATE: It failed on me twice and wasted YEARS (2 hours) OF MY LIFE.
    stopBtn.addEventListener('click', async () => {
    recognition.stop();
    if (finalTranscript.trim()) {
        statusEl.textContent = 'Polishing transcript...';
        const polished = await polishTranscript(finalTranscript);
        finalEl.textContent = polished;
        let targetLanguage = document.getElementById("translateSelect").value;
        statusEl.textContent = 'Translating...';
        const translated = await translateText(polished, targetLanguage);
        document.getElementById('translatedOutput').textContent = translated;
        statusEl.textContent = 'Idle';
    }
});

    //Clear
    clearBtn.addEventListener('click', () => {
        finalTranscript = '';
        finalEl.textContent = '';
        interimEl.textContent = '';
        translatedEl.textContent = '';
        statusEl.textContent = 'Cleared';
    });

    //Copy to clipboard
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(translatedEl.textContent.trim())
            .then(() => {
                alert("Transcript copied to clipboard!");
            })
            .catch(err => {
                console.error("Clipboard error:", err);
                alert("Failed to copy.");
            });
    });

    //------------------TEXT TO SPEECH-------------------//

    //Gets available voices for the selected language
function loadVoices() {
    availableVoices = speechSynthesis.getVoices();
}
function getVoiceForLanguage(langCode) {
    if (!availableVoices || availableVoices.length === 0) return null;

    // Try to find a voice that matches the language
    const baseLang = langCode.split('-')[0].toLowerCase();

    return (
        availableVoices.find(v => v.lang.toLowerCase().startsWith(baseLang)) ||
        availableVoices.find(v => v.lang.toLowerCase().includes(baseLang)) ||
        availableVoices.find(v => v.lang.toLowerCase().startsWith("en")) // fallback
    );
}



let availableVoices = [];

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();


speakBtn.addEventListener("click", () => {
    const text = translatedEl.textContent.trim();
    if (!text) {
        alert("No translation available to speak!");
        return;
    }

    // Get selected target language from dropdown
    const targetLang = document.getElementById("translateSelect").value || "en-US";
    const voice = getVoiceForLanguage(targetLang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice ? voice.lang : targetLang;
    utterance.voice = voice || null;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speakBtn.disabled = true;
    stopSpeakBtn.disabled = false;
    statusEl.textContent = `Speaking translation in ${utterance.lang}...`;

    speechSynthesis.speak(utterance);

    utterance.onend = () => {
        speakBtn.disabled = false;
        stopSpeakBtn.disabled = true;
        statusEl.textContent = "Speech finished.";
    };
});

stopSpeakBtn.addEventListener("click", () => {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        speakBtn.disabled = false;
        stopSpeakBtn.disabled = true;
        statusEl.textContent = "Speech stopped.";
    } else {
        statusEl.textContent = "Nothing is being spoken.";
    }
});
}