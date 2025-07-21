import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Save, Check, Menu } from 'lucide-react';
import { enhancedChatService, ChatMessage, ChatSource, StreamingChatResponse } from '../services/enhancedChatService';
import ReactMarkdown from 'react-markdown';
import { saveChatSession, saveChatMessage, generateSessionId, getChatSessionById, generateChatTitle, updateChatSessionTitle } from '../services/memorySQLite';
import graphService from '../services/graphService';
import ChatSidebar from '../components/ChatSidebar';
import { Upload, FileText, Image, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';

// Add SVG icon components for use in the Sources Used section
function SourceLinkIcon() {
  return (
    <svg className="w-4 h-4 mr-1 text-fuchsia-300 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14L21 3m0 0v7m0-7h-7" /></svg>
  );
}
function ChartIcon() {
  return (
    <svg className="w-4 h-4 mr-1 text-fuchsia-400 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17v-2a4 4 0 014-4h14" /></svg>
  );
}
function ClockIcon() {
  return (
    <svg className="w-4 h-4 mr-1 text-gray-400 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
  );
}
function NoteIcon() {
  return (
    <svg className="w-4 h-4 mr-1 text-blue-300 inline-block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🤫 **Psst... This room\'s just you and me.** NeuroVault never forgets. Ask away.\n_We pinky-promised not to tell anyone you forgot your own deadline._',
      timestamp: new Date()
    },
    {
      id: '2',
      role: 'assistant',
      content: '🌀🧠 **Forget digging through notes. Just ask.**\n\nNeuroVault Chat is your personal memory loop — trained to remember every "um," "aha," and "who was supposed to email the deck?"\n\n**Try:**\n- "Remind me what we decided on features?"\n- "Wasn\'t Marcus supposed to handle that?"\n- "Did anyone actually schedule the user test?"\n\nNo more tab-flipping. No more scroll-scroll-panic-scroll.\nNeuroVault catches the signal in your chaos.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Track when a new message is sent to reset the indicator
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastSources, setLastSources] = useState<ChatSource[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Auto-scroll functionality
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShouldAutoScroll(true);
  };

  // Handle scroll events to detect when user manually scrolls
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, streamedContent]);

  // Otter AI style suggestions for the inspo tab
  const inspoSuggestions = [
    'What are my action items from last week?',
    'Summarize my last meeting.',
    'What did we decide about the budget?',
    'Show me all tasks assigned to Marcus.',
    'What are the next steps for the project?',
    'Remind me who was supposed to email the deck?'
  ];

  const [showInspo, setShowInspo] = useState(false);
  const navigate = useNavigate();

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    setShowInspo(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFiles(prev => [...prev, file]);
    
    // Add a system message about the uploaded file
    const fileMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📎 **File uploaded**: ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n\nI can now analyze and reference this file in our conversation.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fileMessage]);
    
    // Extract text from PDF (backend) or image (frontend)
    let extractedText = '';
    if (file.type === 'application/pdf') {
      // Send PDF to backend for extraction
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('http://localhost:5001/extract-pdf-text', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.text) {
          extractedText = data.text;
        } else if (data.error) {
          extractedText = `[PDF extraction error: ${data.error}]`;
        }
      } catch (err) {
        extractedText = `[PDF extraction error: ${err}]`;
      }
    } else if (file.type.startsWith('image/')) {
      // Image OCR
      const imageUrl = URL.createObjectURL(file);
      const result = await Tesseract.recognize(imageUrl, 'eng');
      extractedText = result.data.text.trim();
      URL.revokeObjectURL(imageUrl);
    }

    if (extractedText) {
      const systemMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Extracted content from **${file.name}**:\n\n${extractedText.substring(0, 2000)}${extractedText.length > 2000 ? '\n... (truncated)' : ''}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    }
  };

  // Load persistent chat state from localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('currentChatSessionId');
    const savedMessages = localStorage.getItem('currentChatMessages');
    
    if (savedSessionId && savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
        setSessionId(savedSessionId);
      } catch (error) {
        console.error('Error loading saved chat state:', error);
      }
    }
  }, []);

  // Save chat state to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0 && sessionId) {
      localStorage.setItem('currentChatSessionId', sessionId);
      localStorage.setItem('currentChatMessages', JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Close file upload dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.file-upload-container')) {
        setShowFileUpload(false);
      }
    };

    if (showFileUpload) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileUpload]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      setSessionId(currentSessionId);
    }
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);
    setStreamedContent('');
    setSaved(false); // Reset saved indicator
    setSaveTrigger(t => t + 1); // Reset trigger
    
    try {
      // Save user message
      await saveChatMessage('user', userMessage.content, currentSessionId);
      
      // Generate title after first user message
      if (newMessages.filter(m => m.role === 'user').length === 1) {
        try {
          const title = await generateChatTitle(currentSessionId);
          await updateChatSessionTitle(currentSessionId, title);
        } catch (error) {
          console.error('Error generating chat title:', error);
        }
      }

      // Use enhanced chat service with streaming
      const response = await enhancedChatService.sendMessage(
        userMessage.content, 
        newMessages,
        (chunk: StreamingChatResponse) => {
          setStreamedContent(chunk.content);
          if (chunk.sources) {
            setLastSources(chunk.sources);
          }
        }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: enhancedChatService.formatResponse(response.message, response.sources),
        timestamp: new Date(),
        sources: response.sources
      };
      
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      setLastSources(response.sources || []);
      
      // Save assistant message
      setSaving(true);
      try {
        await saveChatMessage('assistant', response.message, currentSessionId);
        setSaved(true);

        // Add user message to knowledge graph (if it contains meaningful content)
        try {
          // Only add user messages that are likely to contain factual information
          const userContent = userMessage.content.toLowerCase();
          const isFactualQuery = userContent.includes('what') || userContent.includes('who') || userContent.includes('when') ||
                                userContent.includes('where') || userContent.includes('how') || userContent.includes('tell me about') ||
                                userContent.includes('explain') || userContent.includes('describe') || userContent.length > 20;

          if (isFactualQuery) {
            const result = await graphService.addTranscriptToGraph(userMessage.content, 'local-user-1');
            console.log('✅ Added user message to knowledge graph:', result);
          }
        } catch (graphError) {
          console.error('❌ Failed to add user message to knowledge graph:', graphError);
        }

        // Add assistant message to knowledge graph (if it contains factual information)
        try {
          // Only add assistant messages that contain substantial factual content
          const assistantContent = response.message.toLowerCase();
          const hasFactualContent = response.message.length > 100 &&
                                   !assistantContent.includes('sorry') &&
                                   !assistantContent.includes('error') &&
                                   !assistantContent.includes('i don\'t know') &&
                                   !assistantContent.includes('i cannot') &&
                                   (assistantContent.includes('is a') || assistantContent.includes('are') ||
                                    assistantContent.includes('was') || assistantContent.includes('were') ||
                                    assistantContent.includes('founded') || assistantContent.includes('located') ||
                                    assistantContent.includes('company') || assistantContent.includes('organization'));

          if (hasFactualContent) {
            const result = await graphService.addTranscriptToGraph(response.message, 'local-user-1');
            console.log('✅ Added assistant message to knowledge graph:', result);
          }
        } catch (graphError) {
          console.error('❌ Failed to add assistant message to knowledge graph:', graphError);
        }

      } catch (error) {
        console.error('Error saving chat:', error);
      } finally {
        setSaving(false);
      }
    } catch (err: any) {
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error.',
        timestamp: new Date()
      }]);
      setSaving(false);
      setLastSources([]);
    }
    setIsTyping(false);
    setStreamedContent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveChat = async () => {
    if (messages.length <= 1) return; // Don't save if only the initial message
    
    setSaving(true);
    try {
      // Save the chat session first
      const savedSessionId = await saveChatSession(messages);
      
      // Generate a topic-based title
      if (savedSessionId) {
        const title = await generateChatTitle(savedSessionId);
        await updateChatSessionTitle(savedSessionId, title);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Error saving chat:', error);
    } finally {
      setSaving(false);
    }
  };

  // Add a function to clear chat and start a new session
  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '🤫 **Psst... This room\'s just you and me.** NeuroVault never forgets. Ask away.\n_We pinky-promised not to tell anyone you forgot your own deadline._',
        timestamp: new Date()
      },
      {
        id: '2',
        role: 'assistant',
        content: '🌀🧠 **Forget digging through notes. Just ask.**\n\nNeuroVault Chat is your personal memory loop — trained to remember every "um," "aha," and "who was supposed to email the deck?"\n\n**Try:**\n- "Remind me what we decided on features?"\n- "Wasn\'t Marcus supposed to handle that?"\n- "Did anyone actually schedule the user test?"\n\nNo more tab-flipping. No more scroll-scroll-panic-scroll.\nNeuroVault catches the signal in your chaos.',
        timestamp: new Date()
      }
    ]);
    setSessionId(null);
    setSaved(false);
    setSaveTrigger(t => t + 1);
    
    // Clear persistent state
    localStorage.removeItem('currentChatSessionId');
    localStorage.removeItem('currentChatMessages');
    setUploadedFiles([]);
  };

  // Function to load a specific chat session
  const handleSelectSession = async (sessionId: string) => {
    try {
      const sessionMessages = await getChatSessionById(sessionId);
      if (sessionMessages.length > 0) {
        const formattedMessages: ChatMessage[] = sessionMessages.map((msg: any) => ({
          id: msg[0], // id
          role: msg[1], // role
          content: msg[2], // content
          timestamp: new Date(msg[3]) // timestamp
        }));
        setMessages(formattedMessages);
        setSessionId(sessionId);
        setSaved(false);
        setSaveTrigger(t => t + 1);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  // Function to start a new chat
  const handleNewChat = () => {
    handleClearChat();
  };

  // Replace the default welcome message with a fun, engaging intro
  const ChatWelcome = () => (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6 shadow-md border border-blue-100 flex flex-col items-center text-center animate-fade-in">
      <div className="text-3xl mb-2">🤫 Psst... This room\'s just you and me.</div>
      <div className="text-lg font-semibold mb-1 text-blue-700">NeuroVault never forgets. Ask away.</div>
      <div className="text-sm text-gray-500 mb-4">(We pinky-promised not to tell anyone you forgot your own deadline.)</div>
      <div className="text-base mb-4">
        🌀🧠 <span className="font-medium">Forget digging through notes. Just ask.</span>
        <br />
        NeuroVault Chat is your personal memory loop — trained to remember every "um," "aha," and "who was supposed to email the deck?"
      </div>
      <div className="bg-white/70 rounded-lg p-4 mb-4 border border-dashed border-purple-200 w-full max-w-lg mx-auto">
        <div className="font-semibold mb-1 text-purple-700">Try:</div>
        <ul className="text-left text-gray-700 text-sm list-disc list-inside space-y-1">
          <li>"Remind me what we decided on features?"</li>
          <li>"Wasn\'t Marcus supposed to handle that?"</li>
          <li>"Did anyone actually schedule the user test?"</li>
        </ul>
      </div>
      <div className="text-xs text-gray-400 mb-2">No more tab-flipping. No more scroll-scroll-panic-scroll.<br />NeuroVault catches the signal in your chaos.</div>
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 text-white font-bold shadow hover:scale-105 transition-transform mt-2"
        onClick={() => {/* TODO: trigger magic suggestions */}}
        title="Tap for brainy suggestions!"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        Magic Spark
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#000000] flex">
      {/* Chat Sidebar - Fixed on desktop */}
      <div className="hidden lg:block">
        <div className="fixed top-0 left-0 h-full w-80 z-40 bg-black/30 backdrop-blur-xl border-r border-white/10 overflow-y-auto">
          <ChatSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            currentSessionId={sessionId}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onFileUpload={handleFileUpload}
          />
        </div>
      </div>

      {/* Mobile Toggle Button - Only show on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-lg lg:hidden"
      >
        <Menu size={20} className="text-white" />
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pb-40 lg:ml-80">
        {/* Header */}
        <motion.div
          className="pt-20 pb-8 px-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 lg:hidden"
              >
                <Menu size={20} className="text-white" />
              </button>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight flex-1">
                AI Memory Assistant
              </h1>
              <div className="w-10 lg:hidden"></div> {/* Spacer for centering */}
            </div>
            <p className="text-xl text-white/60">
              Ask questions about your stored knowledge or anything else
            </p>
            {messages.length > 1 && (
              <div className="flex items-center justify-center mt-4 min-h-[32px]">
                {saving ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <Save size={16} className="animate-spin" />
                    <span className="text-sm font-medium text-fuchsia-400">Saving to Memory...</span>
                  </motion.div>
                ) : saved ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <Check size={16} />
                    <span className="text-sm font-medium text-fuchsia-400">Chat Saved!</span>
                  </motion.div>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 relative"
          onScroll={handleScroll}
        >
          {/* Scroll to bottom button */}
          {!shouldAutoScroll && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="fixed bottom-32 right-8 z-40 p-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
              title="Scroll to latest message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.button>
          )}
          
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-6 rounded-3xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white'
                    : 'bg-black/30 backdrop-blur-xl border border-white/10 text-white'
                }`}>
                  <div className="flex items-center mb-3">
                    {message.role === 'user' ? (
                      <User size={20} className="mr-2" />
                    ) : (
                      <Bot size={20} className="mr-2" />
                    )}
                    <span className="text-sm font-medium opacity-80">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Typing indicator with streaming content */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] p-6 rounded-3xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center mb-3">
                    <Bot size={20} className="mr-2" />
                    <span className="text-sm font-medium text-white/80">AI Assistant</span>
                  </div>
                  {streamedContent ? (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{streamedContent}</ReactMarkdown>
                      <span className="inline-block w-2 h-4 bg-white/60 animate-pulse ml-1"></span>
                    </div>
                  ) : (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Inline Sources Used section after latest message/typing */}
            {lastSources.length > 0 && (
              <div className="max-w-4xl mx-auto mt-4 mb-8 p-4 bg-black/40 border border-fuchsia-400/20 rounded-2xl shadow-lg">
                <div className="font-bold text-fuchsia-300 mb-2 flex items-center">
                  <SourceLinkIcon />
                  <span>Sources Used:</span>
                </div>
                <ul className="space-y-3">
                  {lastSources.map((src, idx) => (
                    <li key={src.id + idx} className="p-3 rounded-lg bg-white/10 border border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-fuchsia-200 font-semibold flex items-center">
                          <SourceLinkIcon />
                          {src.source_name}
                        </div>
                        <div className="text-xs text-fuchsia-400 bg-fuchsia-400/10 px-2 py-1 rounded">
                          {src.type}
                        </div>
                      </div>
                      <div className="text-xs text-white/80 mb-2 leading-relaxed">
                        {src.content.length > 300 ? src.content.slice(0, 300) + '...' : src.content}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        {src.relevance !== undefined && (
                          <div className="text-fuchsia-400 flex items-center">
                            <ChartIcon />
                            Relevance: {(src.relevance * 100).toFixed(1)}%
                          </div>
                        )}
                        {src.timestamp && (
                          <div className="text-gray-400 flex items-center">
                            <ClockIcon />
                            {new Date(src.timestamp).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {src.note && (
                        <div className="text-xs text-blue-300 mt-1 italic flex items-center">
                          <NoteIcon />
                          {src.note}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-6 pt-6">
          <div className="max-w-4xl mx-auto w-full mt-0.5">
            <div className="relative flex items-center file-upload-container">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white/80 transition-colors"
                title="Upload file"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <input
                type="text"
                className="flex-1 pl-12 pr-16 py-3 rounded-2xl bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 placeholder:text-white/40 text-base shadow"
                placeholder="Ask anything..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isTyping}
                style={{ transition: 'box-shadow 0.2s' }}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={isTyping || !inputText.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-full p-3 shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            </div>
            
            {/* Uploaded Files Display */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white/80 text-sm"
                  >
                    <FileText size={14} />
                    <span className="truncate max-w-32">{file.name}</span>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-white/40 hover:text-white/60"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-1 gap-3">
              {/* AI Voice Call Button */}
              <motion.button
                whileHover={{ scale: 1.08, boxShadow: '0 0 16px 4px #a855f7, 0 0 32px 8px #6366f1' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowVoiceModal(true)}
                className="rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-500 shadow-lg px-5 py-3 flex items-center gap-2 text-white font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 border-2 border-fuchsia-400/20 hover:shadow-fuchsia-500/40"
                style={{ boxShadow: '0 2px 16px 0 #a855f7, 0 0 32px 0 #6366f1' }}
                title="Open AI Voice Chat"
              >
                {/* SVG: Curved phone, minimal neon/gradient line art */}
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.5 4.5C7.5 3.5 9.5 3.5 10.5 4.5L13 7C13.5 7.5 13.5 8.5 13 9L11.5 10.5C12.5 13 14.5 15 17 16L18.5 14.5C19 14 20 14 20.5 14.5L23 17C24 18 24 20 23 21C21.5 22.5 18.5 23.5 13 18C7.5 12.5 8.5 9.5 10 8C11 7 13 7 13 7" stroke="url(#call-gradient)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="call-gradient" x1="6" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#a855f7"/>
                      <stop offset="0.5" stopColor="#6366f1"/>
                      <stop offset="1" stopColor="#06b6d4"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="hidden md:inline">AI Voice Call</span>
              </motion.button>
              {/* Need inspo button (existing) */}
              <button
                onClick={() => setShowInspo(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 text-white font-bold shadow hover:scale-105 transition-transform"
                style={{ fontSize: '1rem' }}
              >
                <span>✨ Need inspo?</span>
              </button>
            </div>
            {showInspo && (
              <div className="mt-2 p-4 bg-black/40 border border-fuchsia-400/20 rounded-2xl shadow-lg flex flex-wrap gap-3 animate-fade-in">
                {inspoSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-400/20 text-fuchsia-200 font-medium transition-colors shadow"
                    style={{ minWidth: '200px', textAlign: 'left' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          {messages.length === 0 && <ChatWelcome />}
        </div>
      </div>
      {/* AI Voice Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="relative w-[90vw] h-[80vh] bg-black rounded-2xl shadow-2xl flex flex-col">
            <button
              onClick={() => setShowVoiceModal(false)}
              className="absolute top-3 right-4 text-white text-2xl z-10 hover:text-fuchsia-400 focus:outline-none"
              title="Close"
            >
              ×
            </button>
            <iframe
              src="http://localhost:5173/"
              title="AI Voice Call"
              className="w-full h-full rounded-2xl border-0"
              allow="microphone; camera"
              style={{ background: 'black' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}