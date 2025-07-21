import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Users, Tag } from 'lucide-react';

const summaryData = {
  title: "Product Strategy Meeting",
  duration: "45 minutes",
  participants: ["Sarah Chen", "Marcus Rodriguez", "Elena Vasquez"],
  keyPoints: [
    "Q4 roadmap prioritization focusing on AI integration features",
    "User feedback analysis reveals 73% satisfaction with current interface",
    "Budget allocation approved for three additional engineering hires",
    "Partnership discussions with enterprise clients showing positive momentum"
  ],
  actionItems: [
    { task: "Finalize AI feature specifications", assignee: "Sarah Chen", deadline: "Next Friday" },
    { task: "Schedule user research sessions", assignee: "Marcus Rodriguez", deadline: "This week" },
    { task: "Prepare partnership proposal deck", assignee: "Elena Vasquez", deadline: "Monday" }
  ],
  tags: ["Strategy", "AI", "Product", "Q4 Planning"]
};

export default function PremiumSummary() {
  return (
    <section id="summary" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Intelligent Summaries
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            AI-powered extraction of key insights and actionable items
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Summary */}
          <motion.div
            className="lg:col-span-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-semibold text-white">{summaryData.title}</h3>
              <div className="flex items-center space-x-4 text-white/60">
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span className="text-sm font-medium">{summaryData.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={16} />
                  <span className="text-sm font-medium">{summaryData.participants.length} participants</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Key Discussion Points</h4>
                <div className="space-y-3">
                  {summaryData.keyPoints.map((point, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start space-x-3 p-4 bg-black/20 rounded-2xl border border-white/5"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-white/80 leading-relaxed">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Action Items</h4>
                <div className="space-y-3">
                  {summaryData.actionItems.map((item, index) => (
                    <motion.div
                      key={index}
                      className="p-4 bg-black/20 rounded-2xl border border-white/5"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium">{item.task}</p>
                        <span className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                          {item.deadline}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">Assigned to: {item.assignee}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Participants */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="mr-2" size={20} />
                Participants
              </h4>
              <div className="space-y-3">
                {summaryData.participants.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {participant.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-white/80 font-medium">{participant}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Tag className="mr-2" size={20} />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {summaryData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <FileText className="mr-2" size={20} />
                Export
              </h4>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                  Export to PDF
                </button>
                <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                  Send to Notion
                </button>
                <button className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 transition-colors duration-300">
                  Copy to Obsidian
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}