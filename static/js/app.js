const sceneList = document.getElementById("sceneList");
const sceneDetails = document.getElementById("sceneDetails");
let scenes = [];
let selectedSceneId = null; // Used to store the currently selected scene ID

// Render scene list
function renderSceneList() {
    sceneList.innerHTML = "";
    scenes.forEach(scene => {
        const li = document.createElement("li");
        li.textContent = scene.title;
        li.dataset.id = scene.id;
        li.classList.remove("selected");
        li.addEventListener("click", () => {
            selectedSceneId = scene.id;
            highlightSelectedScene(li);
            displayScene(scene);
        });
        sceneList.appendChild(li);
    });
}

// Highlight the selected scene title
function highlightSelectedScene(selectedLi) {
    document.querySelectorAll("#sceneList li").forEach(li => li.classList.remove("selected"));
    selectedLi.classList.add("selected");
}

// Play text-to-speech
function playAudio(text, gender) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Ensure voices are loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        console.warn("No available voices found.");
        utterance.lang = "zh-CN";
        window.speechSynthesis.speak(utterance);
        return;
    }

    // Find voice matching language and gender
    const voice = voices.find(v => {
        return (
            v.lang === "zh-CN" &&
            ((gender === "male" && v.name.toLowerCase().includes("male")) ||
             (gender === "female" && v.name.toLowerCase().includes("female")))
        );
    });

    if (voice) {
        utterance.voice = voice;
    } else {
//        console.warn(`No matching Chinese voice found: gender=${gender}`);
    }

    utterance.lang = "zh-CN";
    window.speechSynthesis.speak(utterance);
}

// Display the selected scene
function displayScene(scene) {
    document.getElementById("sceneTitle").textContent = scene.title;
    document.getElementById("sceneDescription").textContent = scene.description;

    const dialogDiv = document.getElementById("sceneDialog");
    dialogDiv.innerHTML = scene.dialog
        .map(
            (d, index) => `
        <div class="dialog-entry">
            <p><strong>${d.speaker}:</strong> ${d.text} <br> 
            <em>${d.pingyin}</em> <br>
            <span>${scene.translation[index]}</span></p>
            <button class="play-audio" data-index="${index}" data-gender="${d.speaker === 'A' ? 'male' : 'female'}">
                🔊 Play
            </button>
        </div>
        `
        )
        .join("");

    document.querySelectorAll(".play-audio").forEach(button => {
        button.addEventListener("click", event => {
            const index = event.target.getAttribute("data-index");
            const gender = event.target.getAttribute("data-gender");
            const text = scene.dialog[index].text;
            playAudio(text, gender);
        });
    });
}

// Validate scene format
function validateSceneFormat(scene) {
    return (
        scene &&
        typeof scene.title === "string" &&
        typeof scene.description === "string" &&
        Array.isArray(scene.dialog) &&
        scene.dialog.every(d => d.speaker && d.text && d.pingyin) &&
        Array.isArray(scene.translation)
    );
}

// Generate a new scene via GPT
async function generateScene() {
    const descriptionInput = document.getElementById("newSceneDescription").value.trim();

    if (!descriptionInput) {
        alert("Please enter a description for the new scene!");
        return;
    }

    const hourglass = document.getElementById('hourglass');
    const generateSceneBtn = document.getElementById('generateSceneBtn');
    hourglass.style.display = 'block';
    generateSceneBtn.disabled = true;

    const userMessage = `Generate a Chinese conversation based on the following description and provide a title (no more than four English words). The JSON structure should follow:
{
    "id": 1,
    "title": "Scene Title",
    "description": "Scene Description",
    "dialog": [
        { "speaker": "A", "text": "Dialog text 1", "pingyin": "Pinyin 1" },
        { "speaker": "B", "text": "Dialog text 2", "pingyin": "Pinyin 2" }
    ],
    "translation": [
        "A: English translation 1",
        "B: English translation 2"
    ]
}
The dialog should have no more than 6 lines.
Description: ${descriptionInput}`;

    const messages = [
        { "role": "system", "content": "You are an assistant that generates Chinese learning conversations." },
        { "role": "user", "content": userMessage }
    ];

    try {
        const response = await fetch('https://gpt4-111-us.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': '84fba46b577b46f58832ef36527e41d4' // Replace with your actual API key
            },
            body: JSON.stringify({
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            console.error("Error fetching data from GPT:", response.status, response.statusText);
            throw new Error('Error fetching data from OpenAI');
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        let generatedScene;
        try {
            const cleanedContent = rawContent.trim();
            generatedScene = JSON.parse(cleanedContent);

            if (!validateSceneFormat(generatedScene)) {
                console.error("Invalid scene format received from GPT:", generatedScene);
                alert("The generated scene format is incorrect!");
                return;
            }

            displayScene(generatedScene);
        } catch (error) {
            console.error("Error parsing or validating the scene:", error);
            alert("Failed to generate the scene. Invalid data format returned!");
        }
    } catch (error) {
        console.error("Failed to generate the scene:", error);
        alert("Failed to generate the scene. Please check your network or API configuration.");
    } finally {
        hourglass.style.display = 'none';
        generateSceneBtn.disabled = false;
    }
}

// Initialize the app
async function init() {
    scenes = await loadJSON("data/scenes.json");
    renderSceneList();
}

// Event bindings
document.getElementById("generateSceneBtn").addEventListener("click", generateScene);

init();