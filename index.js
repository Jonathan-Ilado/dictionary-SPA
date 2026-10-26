// ==========================================
// 1. API CONFIGURATION
// ==========================================

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

// ==========================================
// 2. SELECT HTML ELEMENTS
// ==========================================

const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const searchButton = document.getElementById("search-button");

const results = document.getElementById("results");
const wordTitle = document.getElementById("word-title");
const phonetic = document.getElementById("phonetic");

const audioContainer = document.getElementById("audio-container");
const definitionsContainer = document.getElementById(
    "definitions-container"
);

const errorMessage = document.getElementById("error-message");
const loadingMessage = document.getElementById("loading-message");

// Track the most recent search to prevent older responses
// from overwriting newer results.
let searchNumber = 0;

// ==========================================
// 3. HANDLE FORM SUBMISSION
// ==========================================

searchForm.addEventListener("submit", handleSearch);

async function handleSearch(event) {
    event.preventDefault();

    const word = wordInput.value.trim();

    if (!word) {
        showError("Please enter a word to search.");
        return;
    }

    await fetchWord(word);
}

// ==========================================
// 4. FETCH WORD DATA FROM THE API
// ==========================================

async function fetchWord(word) {
    const currentSearch = ++searchNumber;

    errorMessage.textContent = "";
    errorMessage.hidden = true;

    results.hidden = true;
    results.setAttribute("aria-busy", "true");

    loadingMessage.hidden = false;
    searchButton.disabled = true;

    try {
        const response = await fetch(
            `${API_URL}${encodeURIComponent(word)}`
        );

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(
                    `Sorry, we couldn't find "${word}". Try another word.`
                );
            }

            throw new Error(
                "Unable to contact the dictionary. Please try again."
            );
        }

        const data = await response.json();

        // Ignore outdated search responses.
        if (currentSearch !== searchNumber) {
            return;
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No dictionary results were found.");
        }

        displayWord(data);

        // Clear the search input after a successful search.
        wordInput.value = "";

    } catch (error) {
        if (currentSearch === searchNumber) {
            showError(error.message);
        }
    } finally {
        if (currentSearch === searchNumber) {
            loadingMessage.hidden = true;
            searchButton.disabled = false;
            results.setAttribute("aria-busy", "false");
        }
    }
}

// ==========================================
// 5. DISPLAY THE WORD AND PRONUNCIATION
// ==========================================

function displayWord(data) {
    const entry = data[0];

    wordTitle.textContent = entry.word;

    // Find the first available phonetic transcription.
    const phoneticEntry = (entry.phonetics || []).find(
        item => item.text
    );

    phonetic.textContent =
        phoneticEntry?.text || entry.phonetic || "Pronunciation unavailable.";

    displayAudio(entry.phonetics || []);

    definitionsContainer.replaceChildren();

    // Display definitions for each returned entry.
    data.forEach(dictionaryEntry => {
        displayDefinitions(dictionaryEntry.meanings || []);
    });

    results.hidden = false;
}

// ==========================================
// 6. DISPLAY AUDIO PRONUNCIATION
// ==========================================

function displayAudio(phonetics) {
    audioContainer.replaceChildren();

    const audioEntry = phonetics.find(
        item => typeof item.audio === "string" && item.audio.trim()
    );

    if (!audioEntry) {
        const message = document.createElement("p");

        message.textContent = "Audio unavailable";
        message.className = "phonetic";

        audioContainer.appendChild(message);
        return;
    }

    const audioButton = document.createElement("button");

    audioButton.type = "button";
    audioButton.className = "audio-button";
    audioButton.setAttribute("aria-label", "Play word pronunciation");
    audioButton.textContent = "🔊 Listen";

    audioButton.addEventListener("click", async () => {
        try {
            const audio = new Audio(audioEntry.audio);

            await audio.play();
        } catch (error) {
            showError(
                "Unable to play the pronunciation. Please try again."
            );
        }
    });

    audioContainer.appendChild(audioButton);
}

// ==========================================
// 7. DISPLAY DEFINITIONS, SYNONYMS AND ANTONYMS
// ==========================================

function displayDefinitions(meanings) {
    meanings.forEach(meaning => {
        const card = document.createElement("article");
        card.className = "definition-card";

        const heading = document.createElement("h3");
        heading.textContent = meaning.partOfSpeech || "Meaning";

        card.appendChild(heading);

        (meaning.definitions || []).forEach((item, index) => {
            const definitionItem = document.createElement("div");
            definitionItem.className = "definition-item";

            const number = document.createElement("span");
            number.className = "definition-number";
            number.textContent = `${index + 1}.`;

            const definitionText = document.createElement("p");
            definitionText.className = "definition-text";
            definitionText.textContent = item.definition;

            definitionItem.append(number, definitionText);

            // Display an example sentence when available.
            if (item.example) {
                const example = document.createElement("p");

                example.className = "example";
                example.textContent = `Example: "${item.example}"`;

                definitionItem.appendChild(example);
            }

            // Combine meaning-level and definition-level synonyms.
            const synonyms = [
                ...(meaning.synonyms || []),
                ...(item.synonyms || [])
            ];

            const uniqueSynonyms = [...new Set(synonyms)];

            if (uniqueSynonyms.length > 0) {
                const synonymParagraph = document.createElement("p");
                synonymParagraph.className = "synonyms";

                const synonymLabel = document.createElement("strong");
                synonymLabel.textContent = "Synonyms: ";

                synonymParagraph.appendChild(synonymLabel);
                synonymParagraph.appendChild(
                    document.createTextNode(uniqueSynonyms.join(", "))
                );

                definitionItem.appendChild(synonymParagraph);
            }

            // Display antonyms when available.
            const antonyms = [
                ...(meaning.antonyms || []),
                ...(item.antonyms || [])
            ];

            const uniqueAntonyms = [...new Set(antonyms)];

            if (uniqueAntonyms.length > 0) {
                const antonymParagraph = document.createElement("p");
                antonymParagraph.className = "antonyms";

                const antonymLabel = document.createElement("strong");
                antonymLabel.textContent = "Antonyms: ";

                antonymParagraph.appendChild(antonymLabel);
                antonymParagraph.appendChild(
                    document.createTextNode(uniqueAntonyms.join(", "))
                );

                definitionItem.appendChild(antonymParagraph);
            }

            card.appendChild(definitionItem);
        });

        definitionsContainer.appendChild(card);
    });
}

// ==========================================
// 8. DISPLAY ERROR MESSAGES
// ==========================================

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}
