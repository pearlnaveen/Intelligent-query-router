import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../records/pages/auth/AuthContext.jsx';
import {
    X, Send, RotateCcw, HelpCircle, Mic, MicOff,
    Volume2, VolumeX, Bot
} from 'lucide-react';
import './ChatbotWidget.css';

export interface AvatarCharacter {
    id: 'nova' | 'apex' | 'athena' | 'spark';
    name: string;
    title: string;
    avatarEmoji: string;
    themeColor: string;
    secondaryColor: string;
    bgGradient: string;
    accentColor: string;
    badgeText: string;
    description: string;
    keywords: string[];
    ttsPitch: number;
    ttsRate: number;
    suggestions: string[];
}

export const AVATARS: Record<string, AvatarCharacter> = {
    nova: {
        id: 'nova',
        name: 'Nova',
        title: 'Campus & Infrastructure Guide',
        avatarEmoji: '🌌',
        themeColor: '#003087',
        secondaryColor: '#0056b3',
        bgGradient: 'linear-gradient(135deg, #003087 0%, #001845 100%)',
        accentColor: '#38bdf8',
        badgeText: 'Campus & Infrastructure',
        description: 'Answers general campus infrastructure, facilities, admissions, founders & transport.',
        keywords: ['infrastructure', 'facility', 'facilities', 'lab', 'labs', 'auditorium', 'building', 'buildings', 'wifi', 'admission', 'founder', 'history', 'fee', 'transport', 'hostel', 'campus', 'contact', 'hello', 'hi'],
        ttsPitch: 1.25,
        ttsRate: 1.75,
        suggestions: [
            "Tell me about campus infrastructure & labs",
            "Who is the founder of NEC?",
            "What transport and hostel facilities exist?"
        ]
    },
    apex: {
        id: 'apex',
        name: 'Apex',
        title: 'Placement Specialist',
        avatarEmoji: '🚀',
        themeColor: '#059669',
        secondaryColor: '#10b981',
        bgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
        accentColor: '#34d399',
        badgeText: 'Careers & Drives',
        description: 'Specialist in campus recruitment, top hiring companies, placement stats & packages.',
        keywords: ['placement', 'recruiter', 'company', 'package', 'salary', 'drive', 'interview', 'intern', 'career', 'hire', 'lpa'],
        ttsPitch: 0.85,
        ttsRate: 1.75,
        suggestions: [
            "What is the overall placement percentage?",
            "Which top companies visit NEC for placement?",
            "What is the highest package offered?"
        ]
    },
    athena: {
        id: 'athena',
        name: 'Athena',
        title: 'Academic Dean AI',
        avatarEmoji: '🎓',
        themeColor: '#7c3aed',
        secondaryColor: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
        accentColor: '#c084fc',
        badgeText: 'Academics & Regulations',
        description: 'Expert on academic rules, regulations, syllabus, CGPA calculations & examination guidelines.',
        keywords: ['academic', 'exam', 'mark', 'result', 'cgpa', 'gpa', 'syllabus', 'regulation', 'grade', 'timetable', 'attendance', 'dean'],
        ttsPitch: 1.05,
        ttsRate: 1.75,
        suggestions: [
            "What are the academic rules and regulations?",
            "How is the CGPA / GPA calculated?",
            "Tell me about attendance rules"
        ]
    },
    spark: {
        id: 'spark',
        name: 'Spark',
        title: 'Events & Campus Life',
        avatarEmoji: '⚡',
        themeColor: '#ea580c',
        secondaryColor: '#f97316',
        bgGradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
        accentColor: '#fb923c',
        badgeText: 'Clubs & Hackathons',
        description: 'Coordinates symposiums, hackathons, conferences, techfests, sports & student clubs.',
        keywords: ['event', 'events', 'techfest', 'conference', 'deep tech', 'pre-conference', 'sustainable engineering', 'campus life', 'student life', 'hackathon', 'hackathons', 'fest', 'symposium', 'club', 'clubs', 'activity', 'activities', 'sports', 'culture', 'workshop', 'contest', 'award'],
        ttsPitch: 1.35,
        ttsRate: 1.75,
        suggestions: [
            "Tell me about NEC TECHFEST 2k25 and International Conference 2026",
            "What upcoming hackathons and events are scheduled?"
        ]
    }
};

export const DEFAULT_ASSISTANT: AvatarCharacter = {
    id: 'nova',
    name: 'NEC AI Assistant',
    title: 'Smart Campus Guide',
    avatarEmoji: '🤖',
    themeColor: '#003087',
    secondaryColor: '#0056b3',
    bgGradient: 'linear-gradient(135deg, #003087 0%, #001845 100%)',
    accentColor: '#38bdf8',
    badgeText: 'NEC AI Assistant',
    description: 'Official AI Campus Assistant for National Engineering College',
    keywords: [],
    ttsPitch: 1.0,
    ttsRate: 1.75,
    suggestions: []
};

const LOCALIZED_TEXT = {
    welcome: "Hello! Welcome to the **National Engineering College (NEC)** Official AI Assistant. 👋\n\nI am your 24/7 intelligent campus guide. Ask any question in English or Tamil (தமிழ்), or pick a sample question below to consult our specialized AI agent guides!",
    resetWelcome: "Conversation reset! 👋 Welcome to the **National Engineering College (NEC)** Official AI Assistant. Ask any question below in English or Tamil (தமிழ்)!",
    inputPlaceholder: "Ask any campus question (English / தமிழ்)...",
    listeningPlaceholder: "Listening... Speak into mic...",
    listeningBar: "Listening... Speak now",
    specialistGuidesTitle: "Specialized AI Agent Guides / சிறப்பு AI வழிகாட்டிகள்:",
    sampleQuestionsTitle: "Sample Questions / மாதிரி கேள்விகள்:",
    thinkingText: (name: string) => `${name} is thinking...`,
    speakingText: (name: string) => `🗣️ ${name} speaking (1.75x)`,
    readAloud: "Read 1.75x",
    speakingAloud: "Speaking 1.75x",
    micErrorSupported: "Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.",
    micErrorDenied: "Microphone access denied. Please allow microphone permissions in your browser.",
    avatars: {
        nova: { title: "Campus & Infrastructure Guide", badgeText: "Campus & Infrastructure", name: "Nova" },
        apex: { title: "Placement Specialist", badgeText: "Careers & Drives", name: "Apex" },
        athena: { title: "Academic Dean AI", badgeText: "Academics & Regulations", name: "Athena" },
        spark: { title: "Events & Campus Life", badgeText: "Clubs & Hackathons", name: "Spark" },
        default: { title: "Smart Campus Guide", badgeText: "NEC AI Assistant", name: "NEC AI Assistant" }
    },
    suggestions: [
        { text: "Tell me about campus infrastructure & labs", icon: "🌌" },
        { text: "மொத்த வேலைவாய்ப்பு சதவீதம் என்ன?", icon: "🚀" },
        { text: "What are the academic rules and regulations?", icon: "🎓" },
        { text: "NEC TECHFEST மற்றும் நிகழ்வுகள் பற்றி கூறவும்", icon: "⚡" }
    ]
};

interface Message {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    avatarId?: string;
    sourceType?: 'static' | 'database' | 'security';
    language?: 'en' | 'ta';
}

const ChatbotWidget: React.FC = () => {
    const location = useLocation();
    const authContext = useAuth();
    const user = authContext?.user;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    let storedUser = null;
    if (!user && typeof window !== 'undefined') {
        try {
            const rawUser = localStorage.getItem('user');
            if (rawUser) storedUser = JSON.parse(rawUser);
        } catch (e) {}
    }
    const effectiveUser = user || storedUser;
    const isLoggedIn = !!token || !!effectiveUser;
    const rawRole = (effectiveUser?.role || effectiveUser?.position || localStorage.getItem('userRole') || '').toLowerCase();
    const userMail = (effectiveUser?.userMail || effectiveUser?.email || '').toLowerCase();
    const designation = (effectiveUser?.designation || '').toLowerCase();
    const userIdentifier = (effectiveUser?.registerNumber || effectiveUser?.username || effectiveUser?.userName || userMail || '').toLowerCase();
    const isStudentPattern = /^2[0-9]{6,15}/.test(userIdentifier) || /^2[0-9]{6,15}@/.test(userMail);

    let userPosition = 'student';
    let positionTitle = 'Student';

    if (isStudentPattern || rawRole === 'student') {
        userPosition = 'student';
        positionTitle = 'Student';
    } else if (userMail.includes('principal') || designation.includes('principal') || rawRole === 'principal') {
        userPosition = 'principal';
        positionTitle = 'Principal';
    } else if (userMail.includes('director') || designation.includes('director') || rawRole === 'director') {
        userPosition = 'director';
        positionTitle = 'Director';
    } else if (userMail.includes('chairman') || designation.includes('chairman') || rawRole === 'chairman') {
        userPosition = 'chairman';
        positionTitle = 'Chairman';
    } else if (['superadmin', 'admin', 'management'].includes(rawRole)) {
        userPosition = 'superadmin';
        positionTitle = 'Super Admin';
    } else if (userMail.startsWith('hod.') || designation.includes('hod') || designation.includes('head of department') || rawRole === 'hod') {
        userPosition = 'hod';
        positionTitle = 'Head of Department (HOD)';
    } else if (['deptadmin', 'academicadmin', 'iradmin', 'pgadmin', 'placementadmin'].includes(rawRole) || designation.includes('dept admin') || designation.includes('administrator')) {
        userPosition = 'deptadmin';
        positionTitle = 'Department Administrator';
    } else if (rawRole === 'staff' || rawRole === 'faculty') {
        userPosition = 'staff';
        positionTitle = 'Staff / Faculty';
    }

    const getPositionSuggestions = (pos: string) => {
        switch (pos) {
            case 'student':
                return [
                    { text: "What is my attendance percentage?", icon: "📊" },
                    { text: "What is my current CGPA and GPA?", icon: "🎓" },
                    { text: "Show my coding profile & links", icon: "💻" },
                    { text: "Show completed course category", icon: "📘" },
                    { text: "Show my Non-CGPA courses", icon: "🎗️" },
                    { text: "Show my student dashboard", icon: "📈" }
                ];
            case 'staff':
                return [
                    { text: "Show staff dashboard", icon: "👨‍🏫" },
                    { text: "students skillrack", icon: "💻" },
                    { text: "Show me my ward students", icon: "👥" },
                    { text: "My ward students attendance", icon: "📊" },
                    { text: "Show my funded projects & patents", icon: "💰" }
                ];
            case 'hod':
            case 'deptadmin':
                return [
                    { text: "Show admin dashboard", icon: "🏛️" },
                    { text: "Show staff activities summary", icon: "💼" },
                    { text: "Department attendance summary", icon: "📊" },
                    { text: "Top CGPA students in my department", icon: "🏆" }
                ];
            case 'principal':
            case 'director':
            case 'chairman':
            case 'superadmin':
            default:
                return [
                    { text: "Show admin dashboard", icon: "🏛️" },
                    { text: "Show staff activities summary", icon: "💼" },
                    { text: "Overall college academic summary", icon: "🏫" },
                    { text: "Department-wise placement statistics", icon: "📊" }
                ];
        }
    };

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
    const [activeAvatar, setActiveAvatar] = useState<AvatarCharacter | null>(null);

    const currentAvatar = activeAvatar || DEFAULT_ASSISTANT;
    const t = LOCALIZED_TEXT;

    const getLocalizedAvatarInfo = (avatar: AvatarCharacter) => {
        const locInfo = t.avatars[avatar.id as keyof typeof t.avatars] || t.avatars.default;
        return {
            name: locInfo.name,
            title: locInfo.title,
            badgeText: locInfo.badgeText
        };
    };

    const currentLocAvatar = getLocalizedAvatarInfo(currentAvatar);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    const chatbotHost = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
    const CHATBOT_PUBLIC_API_URL = import.meta.env.VITE_CHATBOT_URL || `http://${chatbotHost}:5000/api/chat`;
    const CHATBOT_LOGIN_API_URL = import.meta.env.VITE_CHATBOT_LOGIN_URL || `http://${chatbotHost}:5002/api/chat`;

    const CHATBOT_API_URL = isLoggedIn ? CHATBOT_LOGIN_API_URL : CHATBOT_PUBLIC_API_URL;

    const shouldShowChatbot = (pathname: string): boolean => {
        const lowerPath = pathname.toLowerCase();
        // Hide chatbot on login and auth flow pages
        if (
            lowerPath === '/login' ||
            lowerPath === '/records/login' ||
            lowerPath === '/placement/login' ||
            lowerPath.includes('/forgot-password') ||
            lowerPath.includes('/reset-password')
        ) {
            return false;
        }
        return true;
    };

    if (!shouldShowChatbot(location.pathname)) {
        return null;
    }

    // Helper to select distinct voice per assistant avatar (supports Tamil & English)
    const getVoiceForAvatar = (avatarId: string, synth: SpeechSynthesis, currentLang: 'en' | 'ta'): SpeechSynthesisVoice | null => {
        if (!synth) return null;
        const voices = synth.getVoices();
        if (!voices || voices.length === 0) return null;

        if (currentLang === 'ta') {
            const tamilVoices = voices.filter(v => v.lang.startsWith('ta') || v.lang.toLowerCase().includes('tamil'));
            if (tamilVoices.length > 0) {
                return tamilVoices[0];
            }
        }

        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        const pool = englishVoices.length > 0 ? englishVoices : voices;

        const findVoice = (keywords: string[]) => {
            return pool.find(v =>
                keywords.some(kw => v.name.toLowerCase().includes(kw.toLowerCase()))
            );
        };

        switch (avatarId) {
            case 'nova': {
                const match = findVoice(['zira', 'samantha', 'victoria', 'google us english', 'karen', 'female']);
                return match || pool[0];
            }
            case 'apex': {
                const match = findVoice(['david', 'mark', 'alex', 'george', 'daniel', 'male']);
                return match || pool[1 % pool.length];
            }
            case 'athena': {
                const match = findVoice(['hazel', 'serena', 'catherine', 'susan', 'google uk english female', 'en-gb']);
                return match || pool[2 % pool.length];
            }
            case 'spark': {
                const match = findVoice(['rishi', 'veena', 'en-au', 'australia', 'fiona', 'expressive']);
                return match || pool[3 % pool.length];
            }
            default:
                return pool[0];
        }
    };

    // Initialize Speech Synthesis & Session
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
            if (synthRef.current.onvoiceschanged !== undefined) {
                synthRef.current.onvoiceschanged = () => {
                    synthRef.current?.getVoices();
                };
            }
        }

        const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        setSessionId(newSessionId);

        const welcomeText = isLoggedIn
            ? `Hello ${effectiveUser?.userName || effectiveUser?.name || ''}! Welcome to the **NEC ERP Assistant** (${positionTitle}). 👋\n\nI can help you query live database records for attendance, ongoing courses, CGPA/grades, timetable, and faculty class summaries. Ask your question or pick a suggested query below!`
            : t.welcome;

        setMessages([
            {
                id: 'welcome',
                sender: 'assistant',
                text: welcomeText,
                timestamp: new Date()
            }
        ]);
    }, [isLoggedIn, positionTitle]);

    // Stop TTS voice reading and speech recognition immediately when chatbot is closed
    useEffect(() => {
        if (!isOpen) {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
            setSpeakingMsgId(null);
            if (isListening && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
            }
        }
    }, [isOpen]);

    // Auto-scroll to latest message
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Handle Character Auto Routing per message query
    const detectCharacterForQuery = (text: string): AvatarCharacter => {
        const lower = text.toLowerCase();

        if (AVATARS.apex.keywords.some(kw => lower.includes(kw)) || lower.includes('வேலைவாய்ப்பு') || lower.includes('சம்பளம்') || lower.includes('நிறுவனங்கள்')) {
            return AVATARS.apex;
        }
        if (AVATARS.athena.keywords.some(kw => lower.includes(kw)) || lower.includes('விதிகள்') || lower.includes('பாடத்திட்டம்')) {
            return AVATARS.athena;
        }
        if (AVATARS.spark.keywords.some(kw => lower.includes(kw)) || lower.includes('நிகழ்வுகள்') || lower.includes('ஹேக்கத்தான்')) {
            return AVATARS.spark;
        }
        if (AVATARS.nova.keywords.some(kw => lower.includes(kw)) || lower.includes('வளாகம்') || lower.includes('உள்கட்டமைப்பு') || lower.includes('விடுதி') || lower.includes('நூல்நிலையம்')) {
            return AVATARS.nova;
        }
        return activeAvatar || AVATARS.nova;
    };

    // Text-To-Speech (TTS) handler automatically selecting Tamil or English
    const speakText = (text: string, msgId: string, avatar: AvatarCharacter, msgLang?: 'en' | 'ta') => {
        if (!isOpen || isMuted || !synthRef.current) return;

        synthRef.current.cancel(); // Stop current speech

        if (speakingMsgId === msgId) {
            setSpeakingMsgId(null);
            return;
        }

        // Clean markdown symbols & code blocks for natural speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
            .replace(/[`#>\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.pitch = avatar.ttsPitch;
        utterance.rate = avatar.ttsRate || 1.75; // Explicit 1.75x speech speed rate

        const isTamilText = msgLang === 'ta' || /[\u0B80-\u0BFF]/.test(cleanText);
        if (isTamilText) {
            utterance.lang = 'ta-IN';
        } else {
            utterance.lang = 'en-US';
        }

        // Assign character-specific or language-specific voice
        const charVoice = getVoiceForAvatar(avatar.id, synthRef.current, isTamilText ? 'ta' : 'en');
        if (charVoice) {
            utterance.voice = charVoice;
        }

        utterance.onstart = () => setSpeakingMsgId(msgId);
        utterance.onend = () => setSpeakingMsgId(null);
        utterance.onerror = () => setSpeakingMsgId(null);

        synthRef.current.speak(utterance);
    };

    // Reset / Clear Conversation
    const handleClearConversation = () => {
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
        if (synthRef.current) {
            synthRef.current.cancel();
            setSpeakingMsgId(null);
        }

        const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        setSessionId(newSessionId);
        setInputText('');
        setErrorMessage(null);
        setActiveAvatar(null);

        const resetWelcomeText = isLoggedIn
            ? "Conversation reset! 👋 Welcome to the **NEC ERP Assistant**. Ask your query below!"
            : t.resetWelcome;

        setMessages([
            {
                id: 'welcome_' + Date.now(),
                sender: 'assistant',
                text: resetWelcomeText,
                timestamp: new Date()
            }
        ]);
    };

    // Speech-To-Text (STT) Toggle supporting English & Tamil
    const toggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setErrorMessage(t.micErrorSupported);
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = navigator.language || 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setErrorMessage(null);
            };

            recognition.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setInputText(currentTranscript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setErrorMessage(t.micErrorDenied);
                } else if (event.error !== 'no-speech') {
                    setErrorMessage(`Voice recognition error: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsListening(false);
            setErrorMessage('Could not access microphone.');
        }
    };

    // Send Message to Assistant API
    const handleSendMessage = async (textToSend: string) => {
        const trimmedText = textToSend.trim();
        if (trimmedText === '') return;
        if (trimmedText.length > 500) {
            setErrorMessage('Message cannot exceed 500 characters.');
            return;
        }

        setErrorMessage(null);

        // Determine target Avatar for this specific message query
        const targetAvatar = detectCharacterForQuery(trimmedText);
        setActiveAvatar(targetAvatar);

        const userMsg: Message = {
            id: 'msg_' + Math.random().toString(36).substring(2, 11) + Date.now(),
            sender: 'user',
            text: trimmedText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(CHATBOT_API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: trimmedText,
                    sessionId: sessionId,
                    avatar: targetAvatar.id,
                    user: effectiveUser
                })
            });

            const data = await response.json();

            if (response.ok && data.reply) {
                const assistantMsgId = 'msg_' + Math.random().toString(36).substring(2, 11) + Date.now();
                const assistantMsg: Message = {
                    id: assistantMsgId,
                    sender: 'assistant',
                    avatarId: targetAvatar.id,
                    text: data.reply,
                    timestamp: new Date(),
                    sourceType: data.sourceType,
                    language: data.language
                };
                setMessages(prev => [...prev, assistantMsg]);

                // Auto read-aloud at 1.75x with animated speaking face if not muted
                if (!isMuted) {
                    speakText(data.reply, assistantMsgId, targetAvatar, data.language);
                }
            } else {
                setErrorMessage(data.error || 'Failed to get a response from the assistant.');
            }
        } catch (error) {
            console.error('Chatbot fetch error:', error);
            setErrorMessage('Could not connect to the chatbot service. Please ensure the server is running.');
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage(inputText);
        }
    };

    // Safe Markdown rendering
    const renderMessageContent = (text: string, avatar: AvatarCharacter) => {
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        const lines = html.split('\n');
        let inList = false;
        const processedLines = lines.map(line => {
            if (line.trim().startsWith('- ')) {
                const content = line.trim().substring(2);
                let listPrefix = '';
                if (!inList) {
                    inList = true;
                    listPrefix = '<ul style="margin: 0 0 10px 0; padding-left: 18px; list-style-type: disc;">';
                }
                return `${listPrefix}<li style="margin-bottom: 4px;">${content}</li>`;
            } else {
                let listSuffix = '';
                if (inList) {
                    inList = false;
                    listSuffix = '</ul>';
                }

                if (line.startsWith('### ')) {
                    return `${listSuffix}<h3 style="font-family: inherit; color: inherit; margin: 10px 0 4px 0; font-weight: bold; font-size: 14px;">${line.substring(4)}</h3>`;
                }
                if (line.startsWith('## ')) {
                    return `${listSuffix}<h2 style="font-family: inherit; color: inherit; margin: 12px 0 6px 0; font-weight: bold; font-size: 16px;">${line.substring(3)}</h2>`;
                }
                if (line.startsWith('> ')) {
                    return `${listSuffix}<blockquote style="border-left: 3px solid ${avatar.accentColor}; padding-left: 8px; margin: 8px 0; font-style: italic; opacity: 0.85;">${line.substring(2)}</blockquote>`;
                }
                if (line.trim() === '') {
                    return `${listSuffix}<br />`;
                }

                return `${listSuffix}<p style="margin: 0 0 6px 0;">${line}</p>`;
            }
        });

        if (inList) {
            processedLines.push('</ul>');
        }

        return <div dangerouslySetInnerHTML={{ __html: processedLines.join('') }} />;
    };

    return (
        <>
            {/* Floating Trigger Button with Animated Glow Ring */}
            <div className="chatbot-trigger-wrapper">
                <button
                    className={`chatbot-trigger ${isOpen ? 'active' : ''}`}
                    style={{ background: currentAvatar.bgGradient }}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Open AI Assistant"
                >
                    {isOpen ? <X size={26} /> : <Bot size={28} />}
                </button>
                {!isOpen && (
                    <span className="chatbot-trigger-badge" style={{ backgroundColor: isLoggedIn ? '#003087' : currentAvatar.themeColor }}>
                        {isLoggedIn ? "NEC ERP Assistant" : currentLocAvatar.badgeText}
                    </span>
                )}
            </div>

            {/* Main Glassmorphism Chat Panel */}
            <div className={`chatbot-panel ${isOpen ? 'open' : ''}`}>

                {/* Unified Assistant Header */}
                <div className="chatbot-header" style={{ background: isLoggedIn ? 'linear-gradient(135deg, #003087 0%, #001845 100%)' : currentAvatar.bgGradient }}>
                    <div className="chatbot-title-area">
                        <div className={`avatar-ring-container ${speakingMsgId ? 'speaking-face-pulse' : ''}`}>
                            <span className="avatar-emoji">{isLoggedIn ? '🤖' : (speakingMsgId ? currentAvatar.avatarEmoji : (activeAvatar ? activeAvatar.avatarEmoji : '🤖'))}</span>
                            <span className={`status-indicator ${isListening ? 'listening' : isTyping ? 'thinking' : 'online'}`}></span>
                        </div>
                        <div className="chatbot-header-text">
                            <div className="character-name-row">
                                <h3>{isLoggedIn ? "NEC ERP Assistant" : currentLocAvatar.name}</h3>
                            </div>
                            <span className="character-subtitle">
                                {isTyping ? (isLoggedIn ? "ERP Assistant is thinking..." : t.thinkingText(currentLocAvatar.name)) : speakingMsgId ? (isLoggedIn ? "Speaking..." : t.speakingText(currentLocAvatar.name)) : (isLoggedIn ? "Live Academic & ERP Records" : currentLocAvatar.title)}
                            </span>
                        </div>
                    </div>

                    <div className="chatbot-actions">
                        {/* Mute/Unmute Audio Button */}
                        <button
                            className="chatbot-action-btn"
                            onClick={() => {
                                setIsMuted(!isMuted);
                                if (synthRef.current) synthRef.current.cancel();
                                setSpeakingMsgId(null);
                            }}
                            title={isMuted ? "Unmute Voice Reading" : "Mute Voice Reading (1.75x)"}
                        >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>

                        {/* Reset Conversation Button */}
                        <button
                            className="chatbot-action-btn"
                            onClick={handleClearConversation}
                            title="Reset Conversation"
                        >
                            <RotateCcw size={16} />
                        </button>

                        {/* Minimize / Close Button */}
                        <button
                            className="chatbot-action-btn"
                            onClick={() => setIsOpen(false)}
                            title="Minimize"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Message Log Area */}
                <div className="chatbot-messages">
                    {messages.map(msg => {
                        const msgAvatar = msg.avatarId ? AVATARS[msg.avatarId] || currentAvatar : DEFAULT_ASSISTANT;
                        const locMsgAvatar = getLocalizedAvatarInfo(msgAvatar);
                        const isSpeakingThis = speakingMsgId === msg.id;

                        return (
                            <div key={msg.id} className={`chat-message ${msg.sender}`}>
                                {msg.sender === 'assistant' && (
                                    <div
                                        className={`msg-avatar-icon ${isSpeakingThis ? 'speaking-animated-face' : ''}`}
                                        style={{ background: isLoggedIn ? 'linear-gradient(135deg, #003087 0%, #001845 100%)' : msgAvatar.bgGradient }}
                                        title={isLoggedIn ? "NEC ERP Assistant" : `${locMsgAvatar.name} - ${locMsgAvatar.title}`}
                                    >
                                        <span className="msg-face-emoji">{isLoggedIn ? '🤖' : msgAvatar.avatarEmoji}</span>
                                    </div>
                                )}

                                <div className="message-content-wrapper">
                                    {/* Character Avatar Tag Header inside Assistant Bubble (Only shown before login) */}
                                    {!isLoggedIn && msg.sender === 'assistant' && (
                                        <div className="msg-character-tag" style={{ color: msgAvatar.themeColor }}>
                                            <span className="char-tag-pill" style={{ backgroundColor: msgAvatar.themeColor }}>
                                                {msgAvatar.avatarEmoji} {locMsgAvatar.name}
                                            </span>
                                            <span className="char-tag-title">{locMsgAvatar.title}</span>
                                        </div>
                                    )}

                                    <div
                                        className="message-bubble"
                                        style={msg.sender === 'user' ? { backgroundColor: isLoggedIn ? '#003087' : currentAvatar.themeColor } : { borderColor: (isLoggedIn ? '#003087' : msgAvatar.themeColor) + '40' }}
                                    >
                                        {renderMessageContent(msg.text, msgAvatar)}

                                        {/* Render Suggestions & Agent Showcase on Welcome */}
                                        {msg.id.startsWith('welcome') && (
                                            <div className="chatbot-suggestions" style={{ marginTop: '12px' }}>
                                                {!isLoggedIn && (
                                                    <>
                                                        <div className="suggestions-title" style={{ fontWeight: 600, marginBottom: '8px' }}>
                                                            {t.specialistGuidesTitle}
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(0, 48, 135, 0.06)', borderRadius: '8px', border: '1px solid rgba(0, 48, 135, 0.15)' }}>
                                                                <span style={{ fontSize: '16px' }}>🌌</span>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#003087' }}>{t.avatars.nova.name}</div>
                                                                    <div style={{ fontSize: '9px', color: '#64748b' }}>{t.avatars.nova.badgeText}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(5, 150, 105, 0.06)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.15)' }}>
                                                                <span style={{ fontSize: '16px' }}>🚀</span>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>{t.avatars.apex.name}</div>
                                                                    <div style={{ fontSize: '9px', color: '#64748b' }}>{t.avatars.apex.badgeText}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(124, 58, 237, 0.06)', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                                                                <span style={{ fontSize: '16px' }}>🎓</span>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>{t.avatars.athena.name}</div>
                                                                    <div style={{ fontSize: '9px', color: '#64748b' }}>{t.avatars.athena.badgeText}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(234, 88, 12, 0.06)', borderRadius: '8px', border: '1px solid rgba(234, 88, 12, 0.15)' }}>
                                                                <span style={{ fontSize: '16px' }}>⚡</span>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c' }}>{t.avatars.spark.name}</div>
                                                                    <div style={{ fontSize: '9px', color: '#64748b' }}>{t.avatars.spark.badgeText}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="suggestions-title" style={{ fontWeight: 600, marginBottom: '6px' }}>
                                                    {isLoggedIn ? `Suggested Queries (${positionTitle}):` : t.sampleQuestionsTitle}
                                                </div>
                                                <div className="suggestions-grid">
                                                    {(isLoggedIn ? getPositionSuggestions(userPosition) : t.suggestions).map((sug, i) => (
                                                        <button key={i} className="suggestion-pill" onClick={() => handleSendMessage(sug.text)}>
                                                            <HelpCircle size={12} style={{ marginRight: '6px' }} />
                                                            {sug.icon} {sug.text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Footer Meta & TTS Audio Toggle */}
                                    <div className="message-meta-row">
                                        <span className="message-meta">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {msg.sender === 'assistant' && (
                                            <button
                                                className={`tts-read-btn ${isSpeakingThis ? 'speaking' : ''}`}
                                                onClick={() => speakText(msg.text, msg.id, msgAvatar)}
                                                title={isSpeakingThis ? "Stop Reading" : "Listen at 1.75x speed"}
                                            >
                                                <Volume2 size={12} />
                                                <span>{isSpeakingThis ? t.speakingAloud : t.readAloud}</span>
                                                {isSpeakingThis && <span className="sound-wave-mini"><span></span><span></span><span></span></span>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Character Thinking / Typing Indicator */}
                    {isTyping && (
                        <div className="chat-message assistant">
                            <div className="msg-avatar-icon thinking-animated-face" style={{ background: currentAvatar.bgGradient }}>
                                <span className="msg-face-emoji">{currentAvatar.avatarEmoji}</span>
                            </div>
                            <div className="message-content-wrapper">
                                <div className="msg-character-tag" style={{ color: currentAvatar.themeColor }}>
                                    <span className="char-tag-pill" style={{ backgroundColor: currentAvatar.themeColor }}>
                                        {currentAvatar.avatarEmoji} {currentLocAvatar.name}
                                    </span>
                                    <span className="char-tag-title">{currentLocAvatar.title}</span>
                                </div>
                                <div className="message-bubble thinking-bubble">
                                    <div className="typing-dots" style={{ '--dot-color': currentAvatar.themeColor } as any}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="thinking-text">{t.thinkingText(currentLocAvatar.name)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="chat-error-banner">
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Audio Wave Visualizer bar when voice listening */}
                {isListening && (
                    <div className="voice-equalizer-bar" style={{ borderColor: currentAvatar.themeColor }}>
                        <span className="equalizer-text">{t.listeningBar}</span>
                        <div className="equalizer-waves">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="chatbot-input-area">
                    <input
                        type="text"
                        className={`chatbot-input ${isListening ? 'listening' : ''}`}
                        placeholder={isListening ? t.listeningPlaceholder : (isLoggedIn ? "Ask any campus or ERP query..." : t.inputPlaceholder)}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping}
                        maxLength={500}
                    />

                    {/* STT Microphone Button */}
                    <button
                        type="button"
                        className={`chatbot-mic-btn ${isListening ? 'listening' : ''}`}
                        onClick={toggleListening}
                        disabled={isTyping}
                        title={isListening ? "Stop Voice Input" : "Start Voice Input"}
                        aria-label={isListening ? "Stop listening" : "Start voice input"}
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    {/* Send Button */}
                    <button
                        className="chatbot-send-btn"
                        style={{ backgroundColor: currentAvatar.themeColor }}
                        onClick={() => handleSendMessage(inputText)}
                        disabled={isTyping || inputText.trim() === ''}
                    >
                        <Send size={18} />
                    </button>
                </div>

            </div>
        </>
    );
};

export default ChatbotWidget;
