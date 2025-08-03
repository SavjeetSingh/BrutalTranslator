def generate_pronunciation(text, lang):
    # Simple mock pronunciation logic for demonstration purposes
    if lang.startswith('en'):
        return re.sub(r'[aeiou]', 'ɑ', text)  # Mock transformation
    return "Pronunciation not available"

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from deep_translator import GoogleTranslator, MyMemoryTranslator
import os
import logging
from datetime import datetime
import requests
import json
import re

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Translation history for basic analytics
translation_history = []

# Comprehensive list of languages supported by Google Translate
LANGUAGES = {
    'auto': 'Auto-detect',
    'af': 'Afrikaans',
    'sq': 'Albanian',
    'am': 'Amharic',
    'ar': 'Arabic',
    'hy': 'Armenian',
    'az': 'Azerbaijani',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bn': 'Bengali',
    'bs': 'Bosnian',
    'bg': 'Bulgarian',
    'ca': 'Catalan',
    'ceb': 'Cebuano',
    'ny': 'Chichewa',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'co': 'Corsican',
    'hr': 'Croatian',
    'cs': 'Czech',
    'da': 'Danish',
    'nl': 'Dutch',
    'en': 'English',
    'eo': 'Esperanto',
    'et': 'Estonian',
    'tl': 'Filipino',
    'fi': 'Finnish',
    'fr': 'French',
    'fy': 'Frisian',
    'gl': 'Galician',
    'ka': 'Georgian',
    'de': 'German',
    'el': 'Greek',
    'gu': 'Gujarati',
    'ht': 'Haitian Creole',
    'ha': 'Hausa',
    'haw': 'Hawaiian',
    'iw': 'Hebrew',
    'he': 'Hebrew',
    'hi': 'Hindi',
    'hmn': 'Hmong',
    'hu': 'Hungarian',
    'is': 'Icelandic',
    'ig': 'Igbo',
    'id': 'Indonesian',
    'ga': 'Irish',
    'it': 'Italian',
    'ja': 'Japanese',
    'jw': 'Javanese',
    'kn': 'Kannada',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'ko': 'Korean',
    'ku': 'Kurdish (Kurmanji)',
    'ky': 'Kyrgyz',
    'lo': 'Lao',
    'la': 'Latin',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'lb': 'Luxembourgish',
    'mk': 'Macedonian',
    'mg': 'Malagasy',
    'ms': 'Malay',
    'ml': 'Malayalam',
    'mt': 'Maltese',
    'mi': 'Maori',
    'mr': 'Marathi',
    'mn': 'Mongolian',
    'my': 'Myanmar (Burmese)',
    'ne': 'Nepali',
    'no': 'Norwegian',
    'or': 'Odia',
    'ps': 'Pashto',
    'fa': 'Persian',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'pa': 'Punjabi',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sm': 'Samoan',
    'gd': 'Scots Gaelic',
    'sr': 'Serbian',
    'st': 'Sesotho',
    'sn': 'Shona',
    'sd': 'Sindhi',
    'si': 'Sinhala',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'so': 'Somali',
    'es': 'Spanish',
    'su': 'Sundanese',
    'sw': 'Swahili',
    'sv': 'Swedish',
    'tg': 'Tajik',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'ug': 'Uyghur',
    'uz': 'Uzbek',
    'vi': 'Vietnamese',
    'cy': 'Welsh',
    'xh': 'Xhosa',
    'yi': 'Yiddish',
    'yo': 'Yoruba',
    'zu': 'Zulu'
}

def detect_language_from_text(text):
    """
    Detect language based on common patterns and keywords
    """
    text_lower = text.lower()
    
    # Hindi (Romanized) patterns
    hindi_keywords = ['mai', 'mein', 'hu', 'hai', 'ek', 'aur', 'ka', 'ki', 'ke', 'se', 'me', 'ko', 'kya', 'kaise', 'kaha', 'kab']
    if any(word in text_lower for word in hindi_keywords):
        return 'hi'
    
    # Spanish patterns
    spanish_keywords = ['soy', 'es', 'el', 'la', 'de', 'en', 'un', 'una', 'con', 'por', 'para', 'como', 'que', 'muy']
    if any(word in text_lower for word in spanish_keywords):
        return 'es'
    
    # French patterns
    french_keywords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'avec']
    if any(word in text_lower for word in french_keywords):
        return 'fr'
    
    # German patterns
    german_keywords = ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'der', 'die', 'das', 'und', 'oder', 'mit', 'von']
    if any(word in text_lower for word in german_keywords):
        return 'de'
    
    # Default to auto-detect
    return 'auto'

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Get all available languages"""
    return jsonify(LANGUAGES)

@app.route('/api/detect', methods=['POST'])
def detect_language():
    """Detect the language of input text"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        detected_lang = detect_language_from_text(text)
        language_name = LANGUAGES.get(detected_lang, 'Unknown')
        
        return jsonify({
            'language': detected_lang,
            'language_name': language_name,
            'confidence': 0.95
        })
        
    except Exception as e:
        logger.error(f"Language detection error: {str(e)}")
        return jsonify({'error': 'Failed to detect language'}), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text from one language to another"""
    try:
        data = request.json
        text = data.get('text', '')
        target_lang = data.get('targetLang', 'en')
        source_lang = data.get('sourceLang', 'auto')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Detect source language if auto
        if source_lang == 'auto':
            source_lang = detect_language_from_text(text)
            if source_lang == 'auto':
                source_lang = 'en'  # fallback
        
        # Perform translation using deep-translator
        pronunciation = "Pronunciation not available"
        try:
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            translated_text = translator.translate(text)

            # Generate pronunciation based on target language
            pronunciation = generate_pronunciation(translated_text, target_lang)
                
        except Exception as e:
            # Fallback: try with auto-detect
            translator = GoogleTranslator(source='auto', target=target_lang)
            translated_text = translator.translate(text)
            pronunciation = generate_pronunciation(translated_text, target_lang)
            
        # Log translation for analytics
        translation_history.append({
            'timestamp': datetime.now().isoformat(),
            'source_lang': source_lang,
            'target_lang': target_lang,
            'original_text': text[:50] + '...' if len(text) > 50 else text,
            'translated_text': translated_text[:50] + '...' if len(translated_text) > 50 else translated_text
        })
        
        # Keep only last 100 translations
        if len(translation_history) > 100:
            translation_history.pop(0)
        
        return jsonify({
            'translatedText': translated_text,
            'sourceLanguage': source_lang,
            'targetLanguage': target_lang,
            'sourceLanguageName': LANGUAGES.get(source_lang, 'Unknown'),
            'targetLanguageName': LANGUAGES.get(target_lang, 'Unknown'),
            'pronunciation': pronunciation
        })
    
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({'error': f'Failed to translate text: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
def get_translation_history():
    """Get recent translation history"""
    return jsonify(translation_history[-10:])  # Last 10 translations

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get basic translation statistics"""
    total_translations = len(translation_history)
    
    # Count languages
    source_langs = {}
    target_langs = {}
    
    for item in translation_history:
        src = item['source_lang']
        tgt = item['target_lang']
        
        source_langs[src] = source_langs.get(src, 0) + 1
        target_langs[tgt] = target_langs.get(tgt, 0) + 1
    
    return jsonify({
        'total_translations': total_translations,
        'most_used_source_languages': sorted(source_langs.items(), key=lambda x: x[1], reverse=True)[:5],
        'most_used_target_languages': sorted(target_langs.items(), key=lambda x: x[1], reverse=True)[:5]
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
