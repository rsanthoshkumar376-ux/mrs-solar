import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Sparkles, Bot, X, Send, Mic, MicOff, Volume2, 
  RotateCcw, CheckCircle, ArrowRight, Zap, Award, HelpCircle,
  Phone, MessageSquare, ExternalLink, CreditCard, ShieldCheck,
  AlertTriangle, Copy, Check, Camera, Image, Paperclip
} from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';
import SolarCalculatorModal from './SolarCalculatorModal.jsx';

export default function AiChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [chatLang, setChatLang] = useState(() => getLanguage() || 'en');
  const [showCalculator, setShowCalculator] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Multimodal Attachment State
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const t = translations[chatLang] || translations.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWelcomeText = (lang) => {
    const role = user?.role;
    if (lang === 'ta') {
      if (role === 'admin') {
        return 'வணக்கம் தலைவர் அவர்களே! நான் MRS SOLAR AI. நிறுவனத்தின் மொத்த வருவாய், களப்பணிகள், சோலார் திட்டங்கள் அல்லது பணியாளர் இலக்கு நிலவரம் குறித்து கேட்கலாம்.';
      }
      if (role === 'manager') {
        return 'வணக்கம் குழு மேலாளரே! உங்கள் களப்பணியாளர்களின் ஆய்வு புகைப்படங்கள், பணி ஒப்புதல்கள் மற்றும் இலக்கு விநியோகம் குறித்து கேட்கலாம்.';
      }
      if (role === 'worker') {
        return 'வணக்கம்! உங்கள் இன்றைய சோலார் ஆய்வு பணிகள், இன்வெர்ட்டர் வயரிங் முறைகள் அல்லது கூரை புகைப்படங்களை பதிவேற்றி சரிபார்க்கலாம்.';
      }
      return 'வணக்கம்! நான் MRS SOLAR-ன் Gemini 2.5 Flash AI உதவியாளர். உங்கள் சோலார் கடன் தவணை (EMI), மின் உற்பத்தி, PM சூர்யா கர் மானியம் (₹78,000) அல்லது இன்வெர்ட்டர் பழுது பற்றி என்னிடம் கேட்கலாம்.';
    }
    
    // English
    if (role === 'admin') {
      return 'Welcome Super Admin! I am MRS SOLAR AI (Gemini 2.5 Flash). Inquire about financial collections, lead conversion, project milestones, or employee target audits.';
    }
    if (role === 'manager') {
      return 'Welcome Team Manager! Ask about team task allocations, pending worker inspection reviews, or quota distribution.';
    }
    if (role === 'worker') {
      return 'Hello! Ask about your assigned rooftop surveys, battery-free on-grid wiring guidelines, or upload site photos for instant AI inspection.';
    }
    return 'Hello! I am your 24/7 MRS SOLAR AI Copilot powered by Google Gemini 2.5 Flash. Ask about EMI payments, solar generation, PM Surya Ghar ₹78,000 subsidies, or upload an EB bill / panel photo.';
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          text: getWelcomeText(chatLang),
          time: new Date(),
          source: 'Google Gemini 2.5 Flash'
        }]);
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleResetChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
    setSelectedImage(null);
    setMessages([{
      role: 'assistant',
      text: getWelcomeText(chatLang),
      time: new Date(),
      source: 'Google Gemini 2.5 Flash'
    }]);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Photo size exceeds 8MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({
        file,
        preview: reader.result,
        base64: reader.result,
        mimeType: file.type || 'image/jpeg'
      });
    };
    reader.readAsDataURL(file);
  };

  // Dynamic role-specific prompts
  const getRolePrompts = () => {
    const role = user?.role;
    if (role === 'admin') {
      return [
        { en: 'Summarize today business collections & overdue EMIs', ta: 'இன்றைய கடன் வசூல் & நிலுவை சுருக்கம்' },
        { en: 'What is our ongoing solar projects milestone status?', ta: 'சோலார் திட்டங்களின் தற்போதைய நிலை' },
        { en: 'How is worker target achievement performing this month?', ta: 'பணியாளர்களின் மாத இலக்கு சாதனை நிலவரம்' },
        { en: 'Check pending task approval count', ta: 'நிலுவையில் உள்ள பணி ஒப்புதல்கள்' }
      ];
    }
    if (role === 'manager') {
      return [
        { en: 'Show my team tasks awaiting approval', ta: 'ஒப்புதலுக்கு காத்திருக்கும் பணிகளை காட்டு' },
        { en: 'How to verify rooftop shadow inspection photos?', ta: 'கூரை நிழல் புகைப்படங்களை எவ்வாறு தணிக்கை செய்வது?' },
        { en: 'Team target distribution guidelines', ta: 'குழு இலக்கு பகிர்வு வழிகாட்டுதல்கள்' }
      ];
    }
    if (role === 'worker') {
      return [
        { en: 'What are my assigned field tasks today?', ta: 'இன்று எனக்கு ஒதுக்கப்பட்டுள்ள பணிகள் என்ன?' },
        { en: 'What is the required rooftop structure slope for Tamil Nadu?', ta: 'தமிழ்நாட்டில் கூரை சோலார் கோணம் எவ்வளவு?' },
        { en: 'How to submit site survey completion with photo proof?', ta: 'புகைப்பட ஆதாரத்துடன் ஆய்வை முடிப்பது எப்படி?' }
      ];
    }
    // Customer & Visitor prompts
    return [
      { en: 'What is my PM Surya Ghar subsidy status (₹78,000)?', ta: 'என் PM சூர்யா கர் மானியம் நிலை என்ன (₹78,000)?' },
      { en: 'When is my next EMI due and amount?', ta: 'எனக்கு அடுத்த தவணை (EMI) எப்போது?' },
      { en: 'Inverter red light is showing / not working', ta: 'இன்வெர்ட்டர் சிவப்பு விளக்கு எரிகிறது / பழுது' },
      { en: 'How much solar electricity does 3kW generate in Tamil Nadu?', ta: '3kW சோலார் எவ்வளவு கரண்ட் உற்பத்தி செய்யும்?' },
      { en: 'How to pay my EMI via Google Pay / UPI?', ta: 'Google Pay / UPI மூலம் தவணை செலுத்துவது எப்படி?' },
      { en: 'Why does MRS SOLAR use battery-free on-grid system?', ta: 'ஏன் பேட்டரி இல்லாத ஆன்-கிரிட் அமைப்பை பயன்படுத்துகிறோம்?' }
    ];
  };

  const handleSend = async (textToSend = input) => {
    const query = (textToSend || '').trim();
    if ((!query && !selectedImage) || loading) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);

    const userMsg = {
      role: 'user',
      text: query || (selectedImage ? 'Attached visual photograph for AI inspection' : ''),
      imagePreview: selectedImage?.preview || null,
      time: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const imageToSend = selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : null;
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query || 'Please analyze this uploaded solar inspection image.',
        language: chatLang,
        imageBase64: imageToSend?.base64,
        mimeType: imageToSend?.mimeType
      });

      const botReply = res.data?.reply || (chatLang === 'ta' 
        ? 'மன்னிக்கவும், தகவலைப் பெற முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.' 
        : 'Sorry, I could not process your query at this moment. Please try again.');

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: botReply,
        source: res.data?.source || 'Google Gemini 2.5 Flash',
        isQuotaError: res.data?.isQuotaError || false,
        time: new Date()
      }]);
    } catch (err) {
      console.error('AI chat request error:', err);
      const isQuota = err.response?.data?.error?.includes('429') || err.message?.includes('429');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: isQuota
          ? (chatLang === 'ta' ? 'இலவச API வரம்பு எட்டப்பட்டுள்ளது. சில நொடிகள் கழித்து முயற்சிக்கவும்.' : 'Gemini 2.5 Flash Free Tier limit reached. Please retry in a few seconds.')
          : (chatLang === 'ta' ? 'இணைப்பில் தாமதம் ஏற்பட்டுள்ளது. எங்களை +91 80724 54996 என்ற எண்ணில் அழைக்கலாம்.' : 'Connection timeout. For immediate support, contact our helpline at +91 80724 54996.'),
        time: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(chatLang === 'ta'
        ? 'உங்கள் பிரவுசரில் குரல் அறிதல் ஆதரிக்கப்படவில்லை. தயவுசெய்து Google Chrome அல்லது Microsoft Edge பயன்படுத்தவும்.'
        : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = chatLang === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSpeakText = (text, idx) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = chatLang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const quickPrompts = getRolePrompts();

  return (
    <>
      {/* FLOATING ACTION LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white p-3.5 sm:p-4 rounded-full shadow-2xl hover:shadow-teal-500/40 flex items-center space-x-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group border-2 border-white/20"
          aria-label="Open MRS SOLAR AI Chat"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-wide pr-1">
            {chatLang === 'ta' ? 'MRS சோலார் AI' : 'MRS SOLAR AI'}
          </span>
        </button>
      )}

      {/* CHATBOT WINDOW CONTAINER */}
      {isOpen && (
        <div className="fixed bottom-2 lg:bottom-6 right-2 sm:right-6 z-50 w-[95vw] sm:w-[420px] max-h-[88vh] h-[640px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white flex items-center justify-between border-b border-teal-800/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-inner">
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-black text-sm tracking-tight text-white">MRS SOLAR AI</h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    2.5 Flash
                  </span>
                </div>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{user?.role ? `${user.role.toUpperCase()} Context Active` : 'Free Tier Copilot'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setChatLang(chatLang === 'en' ? 'ta' : 'en')}
                className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-teal-300 border border-slate-700 transition-colors"
                title="Switch Language"
              >
                {chatLang === 'en' ? 'தமிழ்' : 'English'}
              </button>

              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
              >
                {/* Attached Image Thumbnail */}
                {m.imagePreview && (
                  <div className="mb-1 rounded-xl overflow-hidden border border-teal-500 max-w-[160px] shadow-sm">
                    <img src={m.imagePreview} alt="Attached" className="w-full h-24 object-cover" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs font-medium'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* ASSISTANT FOOTER */}
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-teal-500" />
                        <span>{m.source || 'Google Gemini 2.5 Flash'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSpeakText(m.text, idx)}
                        className={`p-1 rounded hover:text-teal-600 transition-colors flex items-center space-x-1 ${
                          speakingIdx === idx ? 'text-teal-600 font-bold' : ''
                        }`}
                        title="Voice output"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{speakingIdx === idx ? 'Stop' : 'Listen'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2 px-1">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[11px] font-medium italic">
                  {chatLang === 'ta' ? 'Gemini 2.5 Flash சிந்திக்கிறது...' : 'Gemini 2.5 Flash is analyzing...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT SUGGESTIONS */}
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap flex space-x-1.5 scrollbar-none">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(chatLang === 'ta' ? qp.ta : qp.en)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors shrink-0 shadow-2xs active:scale-95"
              >
                {chatLang === 'ta' ? qp.ta : qp.en}
              </button>
            ))}
          </div>

          {/* IMAGE ATTACHMENT PREVIEW STRIP */}
          {selectedImage && (
            <div className="px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={selectedImage.preview}
                  alt="Attachment preview"
                  className="w-8 h-8 rounded-lg object-cover border border-teal-400"
                />
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-200">
                  Visual photo attached for Gemini inspection
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* INPUT BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-1.5"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors"
              title="Attach Photograph (Bill, Inverter, Panel, Document)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Mic Voice Input */}
            <button
              type="button"
              onClick={handleSpeechInput}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatLang === 'ta' ? 'கேள்வியை கேட்கவும் அல்லது புகைப்படம் இணைக்கவும்...' : 'Ask question or attach image...'}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* EMBEDDED CALCULATOR MODAL */}
      <SolarCalculatorModal 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />
    </>
  );
}
