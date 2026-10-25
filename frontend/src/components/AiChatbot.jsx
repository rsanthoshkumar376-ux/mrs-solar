import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import { 
  Sparkles, Bot, X, Send, Mic, MicOff, Volume2, 
  RotateCcw, CheckCircle, ArrowRight, Zap, Award, HelpCircle,
  Phone, MessageSquare, ExternalLink, CreditCard, ShieldCheck, AlertTriangle, Copy, Check
} from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';
import SolarCalculatorModal from './SolarCalculatorModal.jsx';

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [chatLang, setChatLang] = useState(() => getLanguage() || 'en');
  const [showCalculator, setShowCalculator] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const t = translations[chatLang] || translations.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWelcomeText = (lang) => {
    return lang === 'ta'
      ? 'வணக்கம்! நான் MRS SOLAR-ன் நேரடி AI உதவியாளர். உங்கள் சோலார் கடன் தவணை (EMI), மின் உற்பத்தி, PM சூர்யா கர் மானியம் (₹78,000) அல்லது இன்வெர்ட்டர் பழுது பற்றி என்னிடம் கேட்கலாம்.'
      : 'Hello! I am your 24/7 MRS SOLAR AI Copilot. Ask me about your upcoming EMI installment, solar power generation, PM Surya Ghar subsidies (up to ₹78,000), or report any technical issue.';
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          text: getWelcomeText(chatLang),
          time: new Date(),
          source: 'MRS Solar Smart Engine'
        }]);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleResetChat = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
    setMessages([{
      role: 'assistant',
      text: getWelcomeText(chatLang),
      time: new Date(),
      source: 'MRS Solar Smart Engine'
    }]);
  };

  const quickPrompts = [
    {
      en: 'What is my PM Surya Ghar subsidy status?',
      ta: 'என் PM சூர்யா கர் மானியம் நிலை என்ன?'
    },
    {
      en: 'When is my next EMI due and amount?',
      ta: 'எனக்கு அடுத்த தவணை (EMI) எப்போது?'
    },
    {
      en: 'Inverter red light is showing / not working',
      ta: 'இன்வெர்ட்டர் சிவப்பு விளக்கு எரிகிறது / பழுது'
    },
    {
      en: 'How much solar electricity does 3kW generate?',
      ta: '3kW சோலார் எவ்வளவு கரண்ட் உற்பத்தி செய்யும்?'
    },
    {
      en: 'How to pay my EMI via Google Pay / UPI?',
      ta: 'Google Pay / UPI மூலம் தவணை செலுத்துவது எப்படி?'
    },
    {
      en: 'Check my service complaints & tickets',
      ta: 'என் சேவை புகார்கள் & டிக்கெட்டுகள் நிலை'
    },
    {
      en: 'Referral program bonus (₹2,000)',
      ta: 'வாடிக்கையாளர் பரிந்துரை போனஸ் (₹2,000)'
    },
    {
      en: 'Customer care helpline number & office',
      ta: 'வாடிக்கையாளர் உதவி மையம் தொடர்பு எண்'
    }
  ];

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);

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
        ticket: res.data?.ticket,
        action: res.data?.action,
        escalated: res.data?.escalated,
        time: new Date()
      }]);
    } catch (err) {
      console.error('AI chat request error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: chatLang === 'ta'
          ? 'இணைப்பில் தாமதம் ஏற்பட்டுள்ளது. நேரடி உதவிக்கு எங்களை +91 80724 54996 என்ற எண்ணில் அழைக்கலாம்.'
          : 'Connection timeout. For immediate support, please contact our helpline directly at +91 80724 54996.',
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
        : 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
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

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          alert(chatLang === 'ta'
            ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டுள்ளது. பிரவுசரின் முகவரிப் பட்டியில் மைக் அனுமதியை இயக்கவும்.'
            : 'Microphone permission was denied. Please allow microphone access in your browser address bar.');
        }
      };

      recognition.onresult = (e) => {
        const spokenText = e.results[0][0].transcript;
        setInput(spokenText);
        handleSend(spokenText);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
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
    // Clean text of markdown asterisks for smooth speech
    const cleanSpeech = text.replace(/[*#`_~]/g, ' ').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = chatLang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
        <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[440px] max-h-[85vh] sm:h-[620px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
          
          {/* HEADER */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                <Bot className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center space-x-1.5">
                  <span>{chatLang === 'ta' ? 'சோலார் AI உதவியாளர்' : 'MRS SOLAR AI Copilot'}</span>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 bg-yellow-400 text-slate-900 rounded-full font-mono shadow-xs">
                    Live
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100 flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{chatLang === 'ta' ? 'தமிழ் & ஆங்கில குரல் ஆதரவு' : 'Tamil & English Voice AI'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Reset Conversation */}
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Restart chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setChatLang(prev => prev === 'en' ? 'ta' : 'en')}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black transition-colors border border-white/20"
                title="Toggle Tamil / English"
              >
                {chatLang === 'ta' ? 'EN' : 'தமிழ்'}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[88%] whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-slate-700/70 shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>
                  
                  {/* SERVICE TICKET CREATED BADGE */}
                  {m.ticket && (
                    <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-400/40 dark:border-rose-500/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono shadow-xs">
                          {m.ticket.ticketNumber}
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                          <span>{m.ticket.priority || 'High'} Priority</span>
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 space-y-0.5">
                        <p className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{chatLang === 'ta' ? 'அதிகாரப்பூர்வ டிக்கெட் பதிவு செய்யப்பட்டது' : 'Official Service Ticket Logged'}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {chatLang === 'ta' ? 'நிர்வாகி கட்டுப்பாட்டு மையம் மற்றும் களப் பொறியாளருக்கு அனுப்பப்பட்டது.' : 'Dispatched to Owner Portal & Field Technician.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.ticket.ticketNumber, `tkt-${idx}`)}
                        className="mt-2 w-full py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center space-x-1 hover:bg-slate-50 transition-colors"
                      >
                        {copiedId === `tkt-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === `tkt-${idx}` ? 'Copied!' : `Copy Ticket ID (${m.ticket.ticketNumber})`}</span>
                      </button>
                    </div>
                  )}

                  {/* ACTION CARD: PM SURYA GHAR SUBSIDY STATUS */}
                  {m.action?.type === 'SUBSIDY_STATUS' && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 font-extrabold text-[11px]">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>PM Surya Ghar: Stage {m.action.stage} of 5</span>
                        </div>
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{Number(m.action.eligibleAmount || 30000).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {/* Mini 5-stage progress bar */}
                      <div className="grid grid-cols-5 gap-1 my-1.5">
                        {[1, 2, 3, 4, 5].map((stg) => (
                          <div
                            key={stg}
                            className={`h-1.5 rounded-full ${
                              stg <= (m.action.stage || 1)
                                ? 'bg-emerald-500'
                                : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                        Ref: <code className="font-mono text-slate-900 dark:text-white">{m.action.applicationNumber}</code> • Direct DBT to Aadhaar Bank
                      </p>
                    </div>
                  )}

                  {/* ACTION CARD: EMI PAYMENT BUTTON */}
                  {m.action?.type === 'EMI_PAY' && (
                    <div className="mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                          {chatLang === 'ta' ? `தவணை #${m.action.emiNumber || ''} தொகை:` : `Upcoming Due #${m.action.emiNumber || ''}:`}
                        </p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{Number(m.action.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(m.action.upiId || 'rsanthoshkumar376@oksbi')}&pn=MRSSOLAR&am=${encodeURIComponent(m.action.amount)}&cu=INR`}
                        className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10px] shadow-sm flex items-center space-x-1.5 active:scale-95 transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{chatLang === 'ta' ? 'UPI மூலம் செலுத்து' : 'Pay via UPI'}</span>
                      </a>
                    </div>
                  )}

                  {/* ACTION CARD: OPEN SOLAR CALCULATOR */}
                  {m.action?.type === 'OPEN_CALCULATOR' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowCalculator(true)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[11px] shadow-sm flex items-center justify-center space-x-1.5 transition-all active:scale-98"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{chatLang === 'ta' ? '📊 சோலார் சேமிப்பு கணக்கீட்டை திறக்கவும்' : '📊 Launch Solar Savings Calculator'}</span>
                      </button>
                    </div>
                  )}

                  {/* ACTION CARD: CONTACT HELPLINE */}
                  {m.action?.type === 'CONTACT_INFO' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a
                        href="tel:+918072454996"
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{chatLang === 'ta' ? 'அழைக்க (+91 80724)' : 'Call Helpline'}</span>
                      </a>
                      <a
                        href="https://wa.me/918072454996?text=Hello%20MRS%20Solar"
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}

                  {/* ASSISTANT FOOTER (SOURCE & TTS VOICE) */}
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-teal-500" />
                        <span>{m.source || 'MRS Solar AI Engine'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSpeakText(m.text, idx)}
                        className={`p-1 rounded-md hover:text-teal-600 transition-colors flex items-center space-x-1 ${
                          speakingIdx === idx ? 'text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50' : ''
                        }`}
                        title="Read aloud (Voice output)"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[9px]">{speakingIdx === idx ? 'Stop' : 'Listen'}</span>
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
                  {chatLang === 'ta' ? 'சோலார் AI பதிலளிக்கிறது...' : 'MRS SOLAR AI is analyzing...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ACTIVE VOICE LISTENING ANIMATION BANNER */}
          {isListening && (
            <div className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between text-xs shadow-inner">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                <span className="font-black tracking-wide">
                  {chatLang === 'ta' ? '🎙️ உங்கள் குரலைக் கேட்கிறது... பேசவும்' : '🎙️ Listening... Speak now'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-3 bg-white rounded-full animate-bounce"></span>
                <span className="w-1 h-5 bg-white rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.3s]"></span>
                <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:0.45s]"></span>
              </div>
            </div>
          )}

          {/* QUICK SUGGESTION PROMPTS */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/50 dark:border-slate-800/50 overflow-x-auto whitespace-nowrap flex space-x-1.5 scrollbar-none">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(chatLang === 'ta' ? qp.ta : qp.en)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 shadow-2xs active:scale-95"
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
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={isListening ? 'Stop Listening' : 'Voice Input (Mic)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatLang === 'ta' ? 'கேள்வியை கேட்கவும் அல்லது மைக் பட்டனை அழுத்தவும்...' : 'Ask about kW, EMI, subsidy or faults...'}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-md shadow-teal-500/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* EMBEDDED SOLAR SAVINGS & PM SURYA GHAR CALCULATOR MODAL */}
      <SolarCalculatorModal 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />
    </>
  );
}
