import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, Sparkles, ArrowDown } from 'lucide-react';

const AIChatbot = ({ token, role, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Omni-Sense AI. Ask me anything about the credit intelligence system, risk analysis, or restructuring." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const suggestedPrompts = [
    "Run tri-agent scan",
    "Open restructuring simulator",
    "Show diagnostic logs",
    "Explain the risk drivers"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 40;
    setShowScrollIndicator(!isAtBottom && container.scrollHeight > container.clientHeight);
  };

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    const userMessage = { role: 'user', content: queryText };
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      console.log('[CHATBOT] Sending message to backend:', queryText);
      const activeToken = token || localStorage.getItem('omnisense_token');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`
        },
        body: JSON.stringify({
          command_text: queryText,
          corporate_id: 'BALAJI-001',
          deep_analysis: true
        })
      });

      console.log('[CHATBOT] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CHATBOT] Response data:', data);
        const assistantMessage = { role: 'assistant', content: data.response_text || "I apologize, but I couldn't process that request." };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('[CHATBOT] Backend error, using fallback:', error);
      
      // Fallback to local responses
      const lower = queryText.toLowerCase();
      let fallbackResponse = "I apologize, but I'm having trouble connecting to the backend. However, I can still help you with basic navigation.";
      
      if (lower.includes('analysis') || lower.includes('diagnos') || lower.includes('run') || lower.includes('scan')) {
        fallbackResponse = 'To run a scan, click the "Run Tri-Agent Scan" button in the top navigation bar. This will trigger the tri-agent system to analyze the corporate entity.';
      } else if (lower.includes('restructur') || lower.includes('loan') || lower.includes('emi') || lower.includes('financial')) {
        fallbackResponse = 'For restructuring options, navigate to the "EMI Restructure" tab. You can adjust EMI, tenure, interest rates, and other loan parameters there.';
      } else if (lower.includes('map') || lower.includes('location') || lower.includes('monitor') || lower.includes('tactical')) {
        fallbackResponse = 'To view the geographic monitoring, navigate to the "Tactical Maps" tab. This shows real-time anomaly mapping and surveillance data.';
      } else if (lower.includes('help') || lower.includes('command')) {
        fallbackResponse = 'For a list of available commands, navigate to the "Client Help" tab. You can also use voice commands by clicking the microphone button.';
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        fallbackResponse = `Hello ${name || 'User'}! I'm Omni-Sense AI. I can help you navigate the credit intelligence system, explain risk analysis, and assist with restructuring queries.`;
      } else if (lower.includes('risk') || lower.includes('explain') || lower.includes('why') || lower.includes('fail')) {
        fallbackResponse = 'The risk analysis shows three main drivers: Supplier Litigation Risk (41%), Logistics Transit Velocity (34%), and Raw Material Stockpile Depletion (25%). These factors contribute to the overall risk score.';
      } else if (lower.includes('issue') || lower.includes('problem') || lower.includes('error')) {
        fallbackResponse = "I understand you're experiencing an issue. Please describe what's happening and I'll try to help. Common issues include analysis not running, voice commands not working, or restructuring simulator problems.";
      }
      
      const assistantMessage = { role: 'assistant', content: fallbackResponse };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 rounded-full shadow-[0px_4px_20px_rgba(15,23,42,0.15)] flex items-center justify-center text-white hover:bg-blue-700 transition-all border border-blue-500"
        >
          <MessageSquare className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-96 bg-white rounded-2xl shadow-[0px_8px_30px_rgba(15,23,42,0.12)] border border-slate-200 overflow-hidden flex flex-col"
            style={{ height: isMinimized ? 'auto' : '520px' }}
          >
            {/* Header */}
            <div className="bg-blue-600 px-4 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-none flex items-center gap-1.5">
                    Omni-Sense AI
                    <Sparkles className="w-3.5 h-3.5 text-blue-200 fill-blue-200 animate-pulse" />
                  </h3>
                  <p className="text-blue-100 text-[11px] font-medium mt-1">Enterprise Risk Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Body */}
                <div 
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        message.role === 'user' 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`max-w-[78%] p-3 rounded-2xl shadow-sm text-sm font-medium ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-9">
                        <span className="text-xs text-slate-500 font-semibold mr-1">Thinking</span>
                        <div className="flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested Prompts (shown when only initial greeting exists or input is empty) */}
                {messages.length === 1 && !isLoading && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="text-[11px] font-semibold bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-blue-600 px-2.5 py-1 rounded-full transition-all shadow-sm active:scale-95"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scroll Indicator */}
                {showScrollIndicator && (
                  <button 
                    onClick={scrollToBottom}
                    className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 shadow-lg text-slate-600 hover:text-blue-600 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20"
                  >
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                  </button>
                )}

                {/* Input Bar */}
                <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Omni-Sense AI..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none text-xs font-semibold"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatbot;
