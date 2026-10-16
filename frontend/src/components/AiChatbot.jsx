import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import { 
  Sparkles, Bot, X, Send, Mic, MicOff, Volume2, 
  RotateCcw, ChevronDown, CheckCircle, ArrowRight, Zap
} from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [chatLang, setChatLang] = useState(() => getLanguage() || 'en');
  const messagesEndRef = useRef(null);

  const t = translations[chatLang] || translations.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Initial welcome message if chat is empty
      if (messages.length === 0) {
        const welcomeText = chatLang === 'ta'
          ? 'வணக்கம்! நான் MRS SOLAR-ன் செயற்கை நுண்ணறிவு உதவியாளர். உங்கள் சோலார் கடன் தவணை (EMI), மின் உற்பத்தி அல்லது PM சூர்யா கர் மானியம் பற்றி ஏதேனும் கேட்கலாம்.'
          : 'Hello! I am your MRS SOLAR AI Copilot. Ask me anything about your upcoming EMI installment, solar power generation, or PM Surya Ghar subsidies.';
        setMessages([{ role: 'assistant', text: welcomeText, time: new Date() }]);
      }
    }
  }, [isOpen, chatLang]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    {
      en: 'How much solar electricity will my system generate?',
      ta: 'என் சோலார் அமைப்பு எவ்வளவு கரண்ட் உற்பத்தி செய்யும்?'
    },
    {
      en: 'When is my next EMI due and amount?',
      ta: 'எனக்கு அடுத்த தவணை (EMI) எப்போது?'
    },
    {
      en: 'PM Surya Ghar Central Subsidy details',
      ta: 'PM சூர்யா கர் மத்திய அரசு சோலார் மானிய விவரங்கள்'
    },
    {
      en: 'TANGEDCO Net Metering rules & bill savings',
      ta: 'TANGEDCO நெட்-மீட்டர் மற்றும் EB பில் சேமிப்பு'
    },
    {
      en: 'How to pay my EMI via Google Pay / UPI?',
      ta: 'Google Pay / UPI மூலம் தவணை செலுத்துவது எப்படி?'
    },
    {
      en: 'How often should I clean my solar panels?',
      ta: 'சோலார் பேனல்களை சுத்தம் செய்வது எப்படி?'
    },
    {
      en: 'How much does a rooftop solar system cost?',
      ta: 'சோலார் அமைக்க எவ்வளவு செலவாகும்?'
    },
    {
      en: 'Customer care helpline number',
      ta: 'வாடிக்கையாளர் உதவி மையம் தொடர்பு எண்'
    }
  ];

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = { role: 'user', text: query, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query,
        language: chatLang
      });

      const botReply = res.data?.reply || (chatLang === 'ta' 
        ? 'மன்னிக்கவும், தகவலைப் பெற முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.' 
        : 'Sorry, I could not process your query at this moment. Please try again.');

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: botReply,
        source: res.data?.source,
        time: new Date()
      }]);
    } catch (err) {
      console.error('AI chat request error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: chatLang === 'ta'
          ? 'இணைப்பில் தாமதம் ஏற்பட்டுள்ளது. வாடிக்கையாளர் உதவிக்கு +91 94892 88376 என்ற எண்ணை அழைக்கவும்.'
          : 'Connection timeout. For immediate support, please contact customer care at +91 94892 88376.',
        time: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = chatLang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (e) => {
      const spokenText = e.results[0][0].transcript;
      setInput(spokenText);
      handleSend(spokenText);
    };

    recognition.start();
  };

  const handleSpeakText = (text, idx) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = chatLang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-5 z-40 p-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-2xl shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 border border-white/20 group"
          title="Ask MRS SOLAR AI Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></span>
          </div>
          <span className="text-xs sm:text-sm font-black hidden sm:inline tracking-wide">
            {chatLang === 'ta' ? 'சோலார் AI உதவியாளர்' : 'AI Solar Copilot'}
          </span>
        </button>
      )}

      {/* CHAT WINDOW DRAWER */}
      {isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[420px] max-h-[85vh] sm:h-[580px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
          
          {/* HEADER */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center space-x-1.5">
                  <span>{chatLang === 'ta' ? 'சோலார் AI உதவியாளர்' : 'MRS SOLAR AI Copilot'}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-yellow-400 text-slate-900 rounded-full font-mono">
                    24/7 Live
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{chatLang === 'ta' ? 'தமிழ் & ஆங்கில ஆதரவு' : 'Bilingual Tamil & English'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setChatLang(prev => prev === 'en' ? 'ta' : 'en')}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                title="Toggle Tamil / English"
              >
                {chatLang === 'ta' ? 'EN' : 'தமிழ்'}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60 shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>
                  
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-400">
                      <span>{m.source || 'AI Intelligence'}</span>
                      <button
                        type="button"
                        onClick={() => handleSpeakText(m.text, idx)}
                        className={`p-1 rounded hover:text-teal-600 transition-colors ${
                          speakingIdx === idx ? 'text-teal-600 dark:text-teal-400 font-bold' : ''
                        }`}
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[11px] italic">
                  {chatLang === 'ta' ? 'பதிலளிக்கிறது...' : 'Thinking...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTION PROMPTS */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/50 dark:border-slate-800/50 overflow-x-auto whitespace-nowrap flex space-x-1.5 scrollbar-none">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(chatLang === 'ta' ? qp.ta : qp.en)}
                className="px-2.5 py-1 rounded-full text-[10px] bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              >
                {chatLang === 'ta' ? qp.ta : qp.en}
              </button>
            ))}
          </div>

          {/* INPUT BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2"
          >
            <button
              type="button"
              onClick={handleSpeechInput}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={isListening ? 'Listening...' : 'Voice Input (Mic)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatLang === 'ta' ? 'கேள்வியை கேட்கவும் (எ.கா: அடுத்த EMI எப்போது?)...' : 'Ask anything (e.g. Next EMI due date, solar units)...'}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white transition-all shadow-md shadow-teal-500/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
