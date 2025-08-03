/**
 * Main script to handle real-time translation functionality on the client side.
 */

document.addEventListener('DOMContentLoaded', function () {
  const inputText = document.getElementById('inputText');
  const outputText = document.getElementById('outputText');
  const sourceLang = document.getElementById('sourceLanguage');
  const targetLang = document.getElementById('targetLanguage');
  const translateBtn = document.getElementById('translateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const speakBtn = document.getElementById('speakBtn');
  const inputCharCount = document.getElementById('inputCharCount');
  const outputCharCount = document.getElementById('outputCharCount');
  const swapLanguages = document.getElementById('swapLanguages');
  const detectedLanguage = document.getElementById('detectedLanguage');
  const historyTab = document.getElementById('translationHistory');
  const statsTab = document.getElementById('translationStats');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const startSpeechBtn = document.getElementById('startSpeechBtn');
  const stopSpeechBtn = document.getElementById('stopSpeechBtn');
  const speechStatus = document.getElementById('speechStatus');
  const pronunciationText = document.getElementById('pronunciationText');

// Update the count of characters in the input area
  inputText.addEventListener('input', function () {
    inputCharCount.textContent = `${inputText.value.length} characters`;
  });

  // Speech recognition setup
  let recognition;
  
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    startSpeechBtn.addEventListener('click', () => {
      speechStatus.classList.add('listening');
      speechStatus.textContent = '🎤 LISTENING FOR BRUTAL WORDS...';
      startSpeechBtn.classList.add('listening');
      startSpeechBtn.disabled = true;
      stopSpeechBtn.disabled = false;
      recognition.start();
    });

    stopSpeechBtn.addEventListener('click', () => {
      recognition.stop();
      speechStatus.classList.remove('listening');
      speechStatus.textContent = 'Ready to listen...';
      startSpeechBtn.classList.remove('listening');
      startSpeechBtn.disabled = false;
      stopSpeechBtn.disabled = true;
    });

    recognition.onresult = async (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      inputText.value = finalTranscript + interimTranscript;
      inputCharCount.textContent = `${inputText.value.length} characters`;
      
      if (finalTranscript) {
        speechStatus.textContent = `Heard: ${finalTranscript}`;
        // Auto-translate when final result is received
        await autoTranslate();
      }
    };

    recognition.onerror = (event) => {
      speechStatus.classList.add('error');
      speechStatus.textContent = `Error: ${event.error}`;
      startSpeechBtn.disabled = false;
      stopSpeechBtn.disabled = true;
      startSpeechBtn.classList.remove('listening');
    };

    recognition.onend = () => {
      speechStatus.classList.remove('listening');
      startSpeechBtn.classList.remove('listening');
      startSpeechBtn.disabled = false;
      stopSpeechBtn.disabled = true;
    };
  } else {
    // Disable speech buttons if not supported
    startSpeechBtn.disabled = true;
    stopSpeechBtn.disabled = true;
    speechStatus.textContent = 'Speech recognition not supported';
    speechStatus.classList.add('error');
  }

  // Swap source and target language
  swapLanguages.addEventListener('click', function () {
    const temp = sourceLang.value;
    sourceLang.value = targetLang.value;
    targetLang.value = temp;
    inputText.value = '';
    outputText.value = '';
    detectedLanguage.textContent = '';
  });

  // Perform the translation
  translateBtn.addEventListener('click', async function () {
    if (!inputText.value.trim()) return alert('Please enter some text to translate.');

    toggleLoadingOverlay(true);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.value,
          targetLang: targetLang.value,
          sourceLang: sourceLang.value
        })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      outputText.value = result.translatedText;
      detectedLanguage.textContent = `Detected language: ${result.sourceLanguageName}`;
      outputCharCount.textContent = `${result.translatedText.length} characters`;
      pronunciationText.textContent = result.pronunciation || 'Pronunciation not available';

      getTranslationHistory();
      getStats();
    } catch (error) {
      alert('Translation failed. Try again.');
    } finally {
      toggleLoadingOverlay(false);
    }
  });

  // Clear both text areas
  clearBtn.addEventListener('click', function () {
    inputText.value = '';
    outputText.value = '';
    inputCharCount.textContent = '0 characters';
    outputCharCount.textContent = '0 characters';
    detectedLanguage.textContent = '';
  });

  // Copy translated text to clipboard
  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(outputText.value)
      .then(() => alert('Copied to clipboard!'))
      .catch(() => alert('Failed to copy!'));
  });

  // Get language options from server
  async function getLanguages() {
    const response = await fetch('/api/languages');
    const languages = await response.json();

    for (const [code, name] of Object.entries(languages)) {
      const sourceOption = document.createElement('option');
      const targetOption = document.createElement('option');

      sourceOption.value = code;
      sourceOption.textContent = name;
      targetOption.value = code;
      targetOption.textContent = name;

      sourceLang.appendChild(sourceOption);
      targetLang.appendChild(targetOption);
    }
  }

  // Fetch last 10 translations
  async function getTranslationHistory() {
    const response = await fetch('/api/history');
    const history = await response.json();
    historyTab.innerHTML = history.map(entry => `
      <div class="history-entry">
        	<div><strong>From:</strong> ${entry.original_text}</div>
        	<div><strong>To:</strong> ${entry.translated_text}</div>
        	<div><em>	Translated at: ${entry.timestamp}</em></div>
      </div>
    `).join('');
  }

  // Fetch translation statistics
  async function getStats() {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    statsTab.innerHTML = `
      <div>Total Translations: ${stats.total_translations}</div>
      <div>
        <strong>Most Used Source Languages:</strong>
        <ul>
          ${stats.most_used_source_languages.map(lang => `<li>${lang[0]}: ${lang[1]} times</li>`).join('')}
        	</ul>
      </div>
      <div>
        <strong>Most Used Target Languages:</strong>
        <ul>
          ${stats.most_used_target_languages.map(lang => `<li>${lang[0]}: ${lang[1]} times</li>`).join('')}
        	</ul>
      </div>
    `;
  }

  // Auto-translate function for real-time speech translation
  async function autoTranslate() {
    if (!inputText.value.trim()) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.value,
          targetLang: targetLang.value,
          sourceLang: sourceLang.value
        })
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      outputText.value = result.translatedText;
      detectedLanguage.textContent = `Detected: ${result.sourceLanguageName}`;
      outputCharCount.textContent = `${result.translatedText.length} characters`;
      pronunciationText.textContent = result.pronunciation || 'Pronunciation not available';

      // Speak the translation (if browser supports it)
      if ('speechSynthesis' in window && result.translatedText) {
        const utterance = new SpeechSynthesisUtterance(result.translatedText);
        // Map language codes to proper speech synthesis codes
        const speechLangMap = {
          'en': 'en-US',
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'hi': 'hi-IN',
          'ar': 'ar-SA',
          'zh': 'zh-CN',
          'zh-CN': 'zh-CN',
          'zh-TW': 'zh-TW',
          'ja': 'ja-JP',
          'ko': 'ko-KR',
          'ru': 'ru-RU',
          'pt': 'pt-BR',
          'it': 'it-IT',
          'nl': 'nl-NL',
          'sv': 'sv-SE',
          'no': 'no-NO',
          'da': 'da-DK',
          'pl': 'pl-PL',
          'fi': 'fi-FI',
          'tr': 'tr-TR',
          'he': 'he-IL',
          'th': 'th-TH',
          'vi': 'vi-VN',
          'uk': 'uk-UA',
          'cs': 'cs-CZ',
          'hu': 'hu-HU',
          'ro': 'ro-RO',
          'sk': 'sk-SK',
          'bg': 'bg-BG',
          'hr': 'hr-HR',
          'sl': 'sl-SI',
          'et': 'et-EE',
          'lv': 'lv-LV',
          'lt': 'lt-LT',
          'mt': 'mt-MT'
        };
        
        const speechLang = speechLangMap[targetLang.value] || targetLang.value || 'en-US';
        utterance.lang = speechLang;
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        console.log(`Speaking in: ${speechLang} - Text: ${result.translatedText}`);
        speechSynthesis.speak(utterance);
      }

      getTranslationHistory();
      getStats();
    } catch (error) {
      console.error('Auto-translation failed:', error);
      speechStatus.textContent = 'Translation failed';
      speechStatus.classList.add('error');
    }
  }

  // Toggle loading overlay
  function toggleLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
  }

  // Handling tab functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      document.querySelector('.tab-btn.active').classList.remove('active');
      button.classList.add('active');

      document.querySelector('.tab-pane.active').classList.remove('active');
      document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Speak translation manually
  speakBtn.addEventListener('click', function() {
    if ('speechSynthesis' in window && outputText.value.trim()) {
      const utterance = new SpeechSynthesisUtterance(outputText.value);
      const speechLangMap = {
          'en': 'en-US',
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'hi': 'hi-IN',
          'ar': 'ar-SA',
          'zh': 'zh-CN',
          'zh-CN': 'zh-CN',
          'zh-TW': 'zh-TW',
          'ja': 'ja-JP',
          'ko': 'ko-KR',
          'ru': 'ru-RU',
          'pt': 'pt-BR',
          'it': 'it-IT',
          'nl': 'nl-NL',
          'sv': 'sv-SE',
          'no': 'no-NO',
          'da': 'da-DK',
          'pl': 'pl-PL',
          'fi': 'fi-FI',
          'tr': 'tr-TR',
          'he': 'he-IL',
          'th': 'th-TH',
          'vi': 'vi-VN',
          'uk': 'uk-UA',
          'cs': 'cs-CZ',
          'hu': 'hu-HU',
          'ro': 'ro-RO',
          'sk': 'sk-SK',
          'bg': 'bg-BG',
          'hr': 'hr-HR',
          'sl': 'sl-SI',
          'et': 'et-EE',
          'lv': 'lv-LV',
          'lt': 'lt-LT',
          'mt': 'mt-MT'
      };

      const speechLang = speechLangMap[targetLang.value] || targetLang.value || 'en-US';
      utterance.lang = speechLang;
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      
      console.log(`Manual speak in: ${speechLang} - Text: ${outputText.value}`);
      speechSynthesis.speak(utterance);
    }
  });

  // Initialization
  getLanguages();
  getTranslationHistory();
  getStats();
});

