import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Sparkles, Bot, X, Send, Mic, MicOff, Volume2, 
  RotateCcw, CheckCircle, ArrowRight, Zap, Award, HelpCircle,
  Phone, MessageSquare, ExternalLink, CreditCard, ShieldCheck, AlertTriangle, Copy, Check,
  Camera, Image as ImageIcon, Paperclip, Headphones, UserCheck, Star, ChevronDown, ChevronUp,
  Clock, RefreshCw
} from 'lucide-react';
import { translations, getLanguage } from '../utils/translations.js';
import SolarCalculatorModal from './SolarCalculatorModal.jsx';
import { getSocket, joinTicketRoom, leaveTicketRoom } from '../utils/socket.js';

export default function AiChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState('ai'); // 'ai' | 'live_manager'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [chatLang, setChatLang] = useState(() => getLanguage() || 'en');
  const [showCalculator, setShowCalculator] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [attachedImage, setAttachedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // Live Manager Support States
  const [activeTicket, setActiveTicket] = useState(null);
  const [managerMessages, setManagerMessages] = useState([]);
  const [managerInput, setManagerInput] = useState('');
  const [sendingManagerMsg, setSendingManagerMsg] = useState(false);
  const [showAiTranscript, setShowAiTranscript] = useState(false);
  const [connectingToManager, setConnectingToManager] = useState(false);
  const [starRating, setStarRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [unreadManagerCount, setUnreadManagerCount] = useState(0);

  const managerMessagesEndRef = useRef(null);

  const handleChatImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Attachment exceeds 10MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        base64: reader.result,
        previewUrl: reader.result,
        mimeType: file.type || 'image/jpeg',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const t = translations[chatLang] || translations.en;

  const scrollToBottom = () => {
    if (chatMode === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      managerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getWelcomeText = (lang) => {
    const role = user?.role;
    if (lang === 'ta') {
      if (role === 'admin') {
        return 'வணக்கம் தலைவர் அவர்களே! நான் MRS SOLAR AI. நிறுவனத்தின் மொத்த வருவாய், கள ஆய்வு புகைப்படங்கள் அல்லது பணியாளர் இலக்கு நிலவரம் குறித்து கேட்கலாம்.';
      }
      if (role === 'manager') {
        return 'வணக்கம் குழு மேலாளரே! உங்கள் களப்பணியாளர்களின் ஆய்வு புகைப்படங்கள், பணி ஒப்புதல்கள் மற்றும் சாதன சரிபார்ப்பு குறித்து கேட்கலாம்.';
      }
      if (role === 'worker') {
        return 'வணக்கம் களப்பணியாளரே! உங்கள் சோலார் கூரை புகைப்படங்கள், இன்வெர்ட்டர் பழுது குறியீடுகள் அல்லது வயரிங் முறைகளை பதிவேற்றி சரிபார்க்கலாம்.';
      }
      return 'வணக்கம்! நான் MRS SOLAR-ன் நேரடி AI உதவியாளர். உங்கள் சோலார் கடன் தவணை (EMI), மின் உற்பத்தி, PM சூர்யா கர் மானியம் (₹78,000) அல்லது இன்வெர்ட்டர் பழுது பற்றி என்னிடம் கேட்கலாம். மேலும் மேலாளருடன் நேரடியாக பேச "Connect to Manager" பட்டனை கிளிக் செய்யலாம்.';
    }

    if (role === 'admin') {
      return 'Welcome Owner/Admin! I am MRS SOLAR AI. Inquire about collections, review AI inspection reports, or upload photos for instant diagnostics.';
    }
    if (role === 'manager') {
      return 'Welcome Team Manager! Ask about team task allocations, pending field inspection reviews, or check equipment specifications.';
    }
    if (role === 'worker') {
      return 'Hello Field Engineer! Upload rooftop installation photos, inverter error codes, or ask wiring and structural questions.';
    }
    return 'Hello! I am your 24/7 MRS SOLAR AI Copilot. Ask me about your upcoming EMI installment, solar power generation, PM Surya Ghar subsidies (up to ₹78,000), or upload photos for technical diagnosis. You can also connect to a human manager at any time!';
  };

  // Check for active ticket on mount or when chatbot opens
  const checkActiveTicket = async () => {
    try {
      const res = await api.get('/support/customer/active-ticket');
      if (res.data?.hasActiveTicket && res.data.ticket) {
        setActiveTicket(res.data.ticket);
        joinTicketRoom(res.data.ticket.ticketId);
        loadTicketMessages(res.data.ticket._id);
      }
    } catch (err) {
      // Ignore guest or unauthenticated errors
    }
  };

  const loadTicketMessages = async (ticketDbId) => {
    if (!ticketDbId) return;
    try {
      const res = await api.get(`/support/tickets/${ticketDbId}/messages`);
      if (res.data?.messages) {
        setManagerMessages(res.data.messages);
      }
    } catch (err) {
      console.warn('Could not load manager messages:', err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkActiveTicket();
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
  }, [messages, managerMessages, loading, chatMode]);

  // Socket.IO event listener for real-time manager responses
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg) => {
      if (!activeTicket) return;
      if (msg.ticketId === activeTicket.ticketId || msg.ticket === activeTicket._id) {
        setManagerMessages((prev) => {
          if (prev.some((m) => m._id === msg._id || (m.createdAt === msg.createdAt && m.message === msg.message))) {
            return prev;
          }
          return [...prev, msg];
        });

        if (chatMode === 'ai' && msg.senderRole === 'manager') {
          setUnreadManagerCount((c) => c + 1);
        }
      }
    };

    const handleTicketAccepted = (data) => {
      if (activeTicket && data.ticketId === activeTicket.ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          status: 'in_progress',
          assignedManagerName: data.assignedManagerName || 'Support Manager',
          assignedManagerId: data.assignedManagerId
        }));
      }
    };

    const handleStatusChanged = (data) => {
      if (activeTicket && data.ticketId === activeTicket.ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          status: data.status
        }));
        if (data.status === 'resolved') {
          setFeedbackDone(false);
        }
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('ticket_accepted', handleTicketAccepted);
    socket.on('ticket_status_changed', handleStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('ticket_accepted', handleTicketAccepted);
      socket.off('ticket_status_changed', handleStatusChanged);
    };
  }, [activeTicket, chatMode]);

  // 3-second Polling fallback when in live manager mode to ensure zero message loss
  useEffect(() => {
    if (!isOpen || chatMode !== 'live_manager' || !activeTicket?._id) return;

    const interval = setInterval(() => {
      loadTicketMessages(activeTicket._id);
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, chatMode, activeTicket?._id]);

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

  // CONNECT TO MANAGER ACTION
  const handleConnectToManager = async (customIssue = '') => {
    try {
      setConnectingToManager(true);

      const issueText = customIssue || input || (messages.length > 1 ? messages[messages.length - 1].text : 'Customer requested human manager consultation.');

      const res = await api.post('/support/request-manager', {
        issue: issueText,
        language: chatLang,
        conversationHistory: messages.map(m => ({
          role: m.role,
          text: m.text,
          time: m.time
        })),
        customerDetails: {
          customerId: user?.customerId,
          name: user?.fullName || user?.username,
          mobileNumber: user?.mobileNumber,
          email: user?.email,
          systemCapacityKw: user?.systemCapacityKw,
          district: user?.district
        }
      });

      const ticket = res.data?.ticket;
      if (ticket) {
        setActiveTicket(ticket);
        joinTicketRoom(ticket.ticketId);
        await loadTicketMessages(ticket._id);
        setChatMode('live_manager');
        setUnreadManagerCount(0);

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.data?.confirmationMessage || (chatLang === 'ta'
              ? `உங்கள் கோரிக்கை மேலாளருக்கு அனுப்பப்பட்டுள்ளது. டிக்கெட் எண்: ${ticket.ticketId}. மேலாளர் விரைவில் இணைவார்.`
              : `Your request has been forwarded to our support team. A manager will connect with you shortly. Your Ticket ID is ${ticket.ticketId}.`),
            ticket: {
              ticketNumber: ticket.ticketId,
              priority: 'High'
            },
            time: new Date(),
            source: 'Support Dispatch Center'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to connect to manager:', err);
      alert(err.response?.data?.message || 'Could not connect to support manager right now. Please try calling our helpline.');
    } finally {
      setConnectingToManager(false);
    }
  };

  // SEND LIVE MESSAGE TO MANAGER
  const handleSendManagerMessage = async (e) => {
    if (e) e.preventDefault();
    const text = managerInput.trim();
    if (!text || !activeTicket?._id || sendingManagerMsg) return;

    try {
      setSendingManagerMsg(true);
      const res = await api.post(`/support/tickets/${activeTicket._id}/messages`, {
        message: text,
        senderRole: 'customer'
      });

      if (res.data?.messageRecord) {
        setManagerMessages((prev) => [...prev, res.data.messageRecord]);
      }
      setManagerInput('');
    } catch (err) {
      console.error('Failed to send manager message:', err);
      alert('Could not deliver message to manager. Please retry.');
    } finally {
      setSendingManagerMsg(false);
    }
  };

  // SUBMIT CUSTOMER FEEDBACK & 1-5 STAR RATING
  const handleSubmitFeedback = async () => {
    if (!activeTicket?._id || submittingFeedback) return;
    try {
      setSubmittingFeedback(true);
      await api.post(`/support/tickets/${activeTicket._id}/feedback`, {
        rating: starRating,
        feedback: feedbackComment
      });
      setFeedbackDone(true);
      setActiveTicket((prev) => ({ ...prev, customerRating: starRating, customerFeedback: feedbackComment, status: 'closed' }));
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('Failed to record feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const quickPrompts = [
    {
      en: 'Connect me to a manager',
      ta: 'மேலாளரிடம் பேச வேண்டும் (Connect to Manager)',
      isEscalation: true
    },
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
      en: 'Customer care helpline number & office',
      ta: 'வாடிக்கையாளர் உதவி மையம் தொடர்பு எண்'
    }
  ];

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if ((!query && !attachedImage) || loading) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);

    // Escalation Intent Detection: "manager", "human", "staff", "speak with someone", etc.
    const isEscalateQuery = /manager|human|staff|person|executive|supervisor|talk\s*to\s*a|speak\s*with|connect\s*me|மேலாளர்|மனிதர்|நேரடி\s*உதவி|உதவி\s*வேண்டும்/i.test(query);

    const imageToUpload = attachedImage;
    const displayText = query || (imageToUpload ? (chatLang === 'ta' ? '📷 இந்த புகைப்படத்தை ஆய்வு செய்யவும்' : '📷 Inspect this solar photo') : '');

    const userMsg = { 
      role: 'user', 
      text: displayText, 
      imagePreview: imageToUpload?.previewUrl || null,
      time: new Date() 
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query || 'Inspect this uploaded solar equipment, electricity bill, or rooftop photo and explain what is visible, any defects, errors, or next actions.',
        language: chatLang,
        imageBase64: imageToUpload?.base64 || null,
        mimeType: imageToUpload?.mimeType || 'image/jpeg'
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
        escalated: res.data?.escalated || isEscalateQuery,
        suggestManager: isEscalateQuery,
        userQuery: query,
        time: new Date()
      }]);

      // If user explicitly asked for human/manager, trigger connection prompt
      if (isEscalateQuery) {
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err) {
      console.error('AI chat request error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: chatLang === 'ta'
          ? 'இணைப்பில் தாமதம் ஏற்பட்டுள்ளது. எங்களின் உதவி எண்ணை +91 80724 54996 அழைக்கலாம் அல்லது மேலாளருடன் நேரலையில் இணையலாம்.'
          : 'Connection timeout. For immediate assistance, you can talk directly with our manager or call +91 80724 54996.',
        suggestManager: true,
        userQuery: query,
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
        if (chatMode === 'ai') {
          setInput(spokenText);
          handleSend(spokenText);
        } else {
          setManagerInput(spokenText);
        }
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
            {chatLang === 'ta' ? 'சோலார் AI & நேரடி உதவி' : 'AI Solar & Human Help'}
          </span>
          {unreadManagerCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
              {unreadManagerCount}
            </span>
          )}
        </button>
      )}

      {/* CHAT WINDOW DRAWER */}
      {isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[460px] max-h-[88vh] sm:h-[650px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
          
          {/* HEADER */}
          <div className="px-4 py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                {chatMode === 'ai' ? (
                  <Bot className="w-5 h-5 text-yellow-300" />
                ) : (
                  <Headphones className="w-5 h-5 text-yellow-300 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center space-x-1.5">
                  <span>
                    {chatMode === 'ai'
                      ? (chatLang === 'ta' ? 'சோலார் AI உதவியாளர்' : 'MRS SOLAR AI Copilot')
                      : (chatLang === 'ta' ? 'மேலாளர் நேரடி அரட்டை' : 'Manager Live Support')}
                  </span>
                  <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full font-mono shadow-xs ${
                    chatMode === 'ai' ? 'bg-yellow-400 text-slate-900' : 'bg-emerald-400 text-slate-900'
                  }`}>
                    {chatMode === 'ai' ? 'AI 2.5' : (activeTicket?.ticketId || 'Live')}
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100 flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  <span>
                    {chatMode === 'ai'
                      ? (chatLang === 'ta' ? 'தானியங்கி AI • மேலாளர் இணைப்பு உண்டு' : 'Smart Assistant • Human Escalation')
                      : (activeTicket?.assignedManagerName 
                          ? `${activeTicket.assignedManagerName} (Online)` 
                          : 'Support Queue (Connecting...)')}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Reset AI Conversation */}
              {chatMode === 'ai' && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Restart chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setChatLang(prev => prev === 'en' ? 'ta' : 'en')}
                className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-black transition-colors border border-white/20"
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

          {/* DUAL MODE SELECTOR TAB BAR */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setChatMode('ai')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                chatMode === 'ai'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-teal-500" />
              <span>{chatLang === 'ta' ? 'AI உதவியாளர்' : 'AI Assistant'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTicket) {
                  setChatMode('live_manager');
                  setUnreadManagerCount(0);
                  loadTicketMessages(activeTicket._id);
                } else {
                  handleConnectToManager();
                }
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                chatMode === 'live_manager'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-amber-500" />
              <span>{chatLang === 'ta' ? 'மேலாளர் நேரடி உதவி' : 'Connect to Manager'}</span>
              {activeTicket && (
                <span className={`w-2 h-2 rounded-full ${
                  activeTicket.status === 'in_progress' ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
                }`} />
              )}
              {unreadManagerCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold">
                  {unreadManagerCount}
                </span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: AI COPILOT CHAT STREAM */}
          {/* ========================================================================= */}
          {chatMode === 'ai' && (
            <>
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
                      {m.imagePreview && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-48 border border-white/20 bg-black/40">
                          <img src={m.imagePreview} alt="Attached photo" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p>{m.text}</p>
                      
                      {/* CONNECT TO MANAGER PROMPT CARD (Appears on escalation intent) */}
                      {m.suggestManager && !activeTicket && (
                        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/50 dark:border-amber-500/40">
                          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold mb-1">
                            <Headphones className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>{chatLang === 'ta' ? 'மேலாளரிடம் பேச விரும்புகிறீர்களா?' : 'Need to speak directly with our Manager?'}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2.5">
                            {chatLang === 'ta'
                              ? 'உங்கள் கணக்கு விவரங்கள் மற்றும் முந்தைய உரையாடலுடன் எங்கள் மேலாளருக்கு உடனடி டிக்கெட் உருவாக்கப்படும்.'
                              : 'Our solar manager will inspect your rooftop dossier, bills, and assist you in real-time.'}
                          </p>
                          <button
                            type="button"
                            disabled={connectingToManager}
                            onClick={() => handleConnectToManager(m.userQuery)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>
                              {connectingToManager 
                                ? (chatLang === 'ta' ? 'இணைக்கிறது...' : 'Connecting to Manager...') 
                                : (chatLang === 'ta' ? 'மேலாளருடன் இணைக்கவும் (Connect to Manager)' : 'Connect to Manager Now')}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* ACTIVE TICKET BANNER */}
                      {m.ticket && (
                        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-400/40 dark:border-emerald-500/40">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono shadow-xs">
                              {m.ticket.ticketNumber}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>Live Support Queue</span>
                            </span>
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 space-y-0.5">
                            <p className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{chatLang === 'ta' ? 'மேலாளருக்கு கோரிக்கை அனுப்பப்பட்டது' : 'Forwarded to Manager Portal'}</span>
                            </p>
                          </div>
                          <div className="mt-2.5 flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setChatMode('live_manager');
                                loadTicketMessages(activeTicket?._id);
                              }}
                              className="flex-1 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center space-x-1 shadow-sm transition-all"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{chatLang === 'ta' ? 'மேலாளர் அரட்டையை திற' : 'Open Manager Chat'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(m.ticket.ticketNumber, `tkt-${idx}`)}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors"
                            >
                              {copiedId === `tkt-${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
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
                <div className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between text-xs shadow-inner">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    <span className="font-black tracking-wide">
                      {chatLang === 'ta' ? '🎙️ உங்கள் குரலைக் கேட்கிறது... பேசவும்' : '🎙️ Listening... Speak now'}
                    </span>
                  </div>
                </div>
              )}

              {/* QUICK SUGGESTION PROMPTS */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/50 dark:border-slate-800/50 overflow-x-auto whitespace-nowrap flex space-x-1.5 scrollbar-none">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (qp.isEscalation) {
                        handleConnectToManager();
                      } else {
                        handleSend(chatLang === 'ta' ? qp.ta : qp.en);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors shrink-0 shadow-2xs active:scale-95 ${
                      qp.isEscalation
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black hover:opacity-95'
                        : 'bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {chatLang === 'ta' ? qp.ta : qp.en}
                  </button>
                ))}
              </div>

              {/* ATTACHED IMAGE PREVIEW STRIP */}
              {attachedImage && (
                <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img src={attachedImage.previewUrl} alt="Thumb" className="w-9 h-9 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white truncate text-[11px]">{attachedImage.name || 'Image Attached'}</p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400">Ready for Gemini Multimodal Vision</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* AI CHAT INPUT BAR */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2"
              >
                <input
                  type="file"
                  ref={chatFileInputRef}
                  onChange={handleChatImagePick}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                  title="Attach solar panel, inverter, or EB bill photo"
                >
                  <Camera className="w-4 h-4 text-teal-500" />
                </button>

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
                  placeholder={chatLang === 'ta' ? 'கேள்வி அல்லது "Connect to Manager" தட்டச்சு செய்யவும்...' : 'Ask question or "Connect to Manager"...'}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={(!input.trim() && !attachedImage) || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-md shadow-teal-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: LIVE MANAGER SUPPORT CHAT STREAM */}
          {/* ========================================================================= */}
          {chatMode === 'live_manager' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/40">
              
              {/* TICKET STATUS BAR */}
              <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                      {activeTicket?.ticketId || 'Connecting...'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTicket?.status === 'in_progress'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                        : activeTicket?.status === 'resolved'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300'
                        : activeTicket?.status === 'waiting_customer'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                        : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300'
                    }`}>
                      {activeTicket?.status === 'in_progress'
                        ? (chatLang === 'ta' ? 'மேலாளர் பதிலளிக்கிறார்' : 'Manager Connected')
                        : activeTicket?.status === 'resolved'
                        ? (chatLang === 'ta' ? 'தீர்வு காணப்பட்டது' : 'Issue Resolved')
                        : activeTicket?.status === 'waiting_customer'
                        ? (chatLang === 'ta' ? 'உங்கள் பதிலுக்கு காத்திருக்கிறது' : 'Waiting for You')
                        : (chatLang === 'ta' ? 'வரிசையில் உள்ளது' : 'Pending Manager')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Manager: <strong className="text-teal-600 dark:text-teal-400">{activeTicket?.assignedManagerName || 'Support Queue'}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => loadTicketMessages(activeTicket?._id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors"
                    title="Refresh messages"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiTranscript(!showAiTranscript)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center space-x-1 hover:bg-slate-200 transition-colors"
                  >
                    <span>{showAiTranscript ? 'Hide AI History' : 'View AI History'}</span>
                    {showAiTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE PREVIOUS AI CHAT TRANSCRIPT */}
              {showAiTranscript && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900 max-h-40 overflow-y-auto text-[11px] space-y-2">
                  <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Previous AI Chat Transcript (Shared with Manager):</span>
                  </p>
                  {(activeTicket?.aiConversationTranscript || messages).map((m, i) => (
                    <div key={i} className="text-slate-700 dark:text-slate-300">
                      <strong className={m.role === 'user' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}>
                        {m.role === 'user' ? 'You' : 'AI'}:
                      </strong>{' '}
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* LIVE MESSAGE THREAD */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
                {/* Initial Support Forward Announcement */}
                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-center">
                  <p className="font-bold">
                    {chatLang === 'ta'
                      ? 'உங்கள் கோரிக்கை மேலாளர் உதவி மையத்திற்கு அனுப்பப்பட்டது.'
                      : 'Your request is connected with MRS SOLAR Customer Live Support.'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ticket ID: <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{activeTicket?.ticketId}</span> • 
                    AI Issue Summary: "{activeTicket?.issueSummary || 'Technical & Service Consultation'}"
                  </p>
                </div>

                {managerMessages.map((msg, i) => {
                  const isCustomer = msg.senderRole === 'customer';
                  const isSystem = msg.senderRole === 'system';

                  if (isSystem) {
                    return (
                      <div key={i} className="text-center py-1.5 px-3 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 text-[10px] font-bold text-slate-600 dark:text-slate-400 mx-auto max-w-sm">
                        {msg.message}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-line ${
                          isCustomer
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-none shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-bold opacity-80">
                          {isCustomer ? (
                            <span>You</span>
                          ) : (
                            <span className="flex items-center space-x-1 text-teal-600 dark:text-teal-300">
                              <Headphones className="w-3 h-3" />
                              <span>{msg.senderName || 'Manager'}</span>
                            </span>
                          )}
                        </div>
                        <p>{msg.message}</p>
                        <div className="flex items-center justify-end space-x-1 mt-1 text-[9px] opacity-70">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {msg.createdAt 
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* RESOLVED / RATING FEEDBACK CARD */}
                {activeTicket?.status === 'resolved' && (
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-center shadow-lg my-3 space-y-3 animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                      <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        {chatLang === 'ta' ? 'மேலாளர் ஆதரவு நிறைவடைந்தது' : 'Support Session Resolved by Manager'}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {chatLang === 'ta'
                          ? `மேலாளர் ${activeTicket?.assignedManagerName || ''}-ன் சேவையை 1 முதல் 5 நட்சத்திரங்களில் மதிப்பீடு செய்யுங்கள்.`
                          : `Please rate your support experience with Manager ${activeTicket?.assignedManagerName || 'our staff'}.`}
                      </p>
                    </div>

                    {!feedbackDone ? (
                      <div className="space-y-3">
                        {/* 5-STAR RATING SELECTOR */}
                        <div className="flex items-center justify-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setStarRating(star)}
                              className="p-1 hover:scale-125 transition-transform"
                            >
                              <Star
                                className={`w-7 h-7 ${
                                  star <= starRating
                                    ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder={chatLang === 'ta' ? 'கருத்து அல்லது பரிந்துரை (விருப்பத்திற்குரியது)...' : 'Optional comments or feedback...'}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        <button
                          type="button"
                          disabled={submittingFeedback}
                          onClick={handleSubmitFeedback}
                          className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                        >
                          {submittingFeedback ? 'Submitting...' : 'Submit Rating & Feedback'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span>Thank you for your rating of {starRating} Stars!</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setChatMode('ai')}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1 inline-block"
                    >
                      ← Return to AI Copilot
                    </button>
                  </div>
                )}

                <div ref={managerMessagesEndRef} />
              </div>

              {/* LIVE MANAGER INPUT BAR */}
              <form
                onSubmit={handleSendManagerMessage}
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
                  title={isListening ? 'Stop Listening' : 'Voice Input (Mic)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={managerInput}
                  onChange={(e) => setManagerInput(e.target.value)}
                  placeholder={chatLang === 'ta' ? 'மேலாளருக்கு செய்தி அனுப்பவும்...' : 'Type message to manager...'}
                  disabled={activeTicket?.status === 'closed'}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!managerInput.trim() || sendingManagerMsg || activeTicket?.status === 'closed'}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40 text-white transition-all shadow-md shadow-teal-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          )}

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
