import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, Zap, MessageSquare, User, Bot } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Memory',
    description: 'Instant recall of any conversation or meeting',
  },
  {
    icon: Search,
    title: 'Summary',
    description: 'Key insights extracted automatically',
  },
  {
    icon: Zap,
    title: 'Recall',
    description: 'Find information with natural language queries',
  },
];

const mockMessages = [
  {
    sender: 'user',
    text: 'What did we decide about the Q4 budget?',
    time: '2:34 PM',
  },
  {
    sender: 'ai',
    text: 'Based on your meeting from yesterday, the team approved a $2.3M budget for Q4 with 60% allocated to engineering and 40% to marketing. Sarah mentioned prioritizing the AI features launch.',
    time: '2:34 PM',
  },
  {
    sender: 'user',
    text: 'Show me the action items from that meeting',
    time: '2:35 PM',
  },
];

export default function SmartAIAgent() {
  return (
    <section className="relative py-32 px-6 bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#0A0C10]">
      {/* Flowing particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Smart AI Memory Agent
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Your personal assistant that never forgets
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Features */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              
              return (
                <motion.div
                  key={index}
                  className="flex items-start space-x-6"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-cyan-400/30">
                    <Icon size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Mock Chat Interface */}
          <motion.div
            className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              {mockMessages.map((message, index) => (
                <motion.div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className={`flex items-start space-x-3 max-w-sm ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    
                    <div className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                        : 'bg-black/40 border border-white/10'
                    }`}>
                      <p className="text-white text-sm leading-relaxed">{message.text}</p>
                      <p className="text-white/40 text-xs mt-1">{message.time}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="px-4 py-3 bg-black/40 border border-white/10 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Input area */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-white/40 text-sm">Ask about your stored knowledge...</p>
                </div>
                <button className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl" disabled>
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}