import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import CitationRenderer from '../components/CitationRenderer';
import { ChatSource } from '../services/enhancedChatService';

const CitationDemoPage: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState(0);

  // Demo content with different citation scenarios
  const demoScenarios = [
    {
      title: "Scientific Research Summary",
      content: `Recent studies have shown that artificial intelligence can significantly improve medical diagnosis accuracy. Machine learning algorithms have demonstrated remarkable performance in detecting early-stage cancer from medical imaging. The integration of AI in healthcare systems has led to reduced diagnostic errors and faster treatment decisions. Furthermore, natural language processing techniques are being used to analyze patient records and identify potential health risks.`,
      sources: [
        {
          id: "study1",
          content: "A comprehensive study of 10,000 medical images showed that AI algorithms achieved 94% accuracy in cancer detection, compared to 87% for human radiologists.",
          relevance: 0.95,
          type: "knowledge_graph",
          source_name: "Medical AI Research Journal",
          timestamp: "2024-01-15",
          confidence: 0.92
        },
        {
          id: "study2", 
          content: "Implementation of AI diagnostic tools in 50 hospitals resulted in 23% reduction in diagnostic errors and 40% faster treatment initiation.",
          relevance: 0.88,
          type: "stored_conversation",
          source_name: "Healthcare Technology Report",
          timestamp: "2024-02-10",
          confidence: 0.89
        },
        {
          id: "study3",
          content: "Natural language processing analysis of 100,000 patient records identified previously undetected risk factors in 15% of cases.",
          relevance: 0.82,
          type: "general_knowledge",
          source_name: "Clinical Data Science Review",
          timestamp: "2024-01-28",
          confidence: 0.85
        }
      ] as ChatSource[]
    },
    {
      title: "Technology Trends Analysis",
      content: `The rapid advancement of quantum computing is reshaping the technology landscape. Major tech companies are investing billions in quantum research and development. These quantum systems promise to solve complex problems that are currently intractable for classical computers. The potential applications span from cryptography to drug discovery and financial modeling.`,
      sources: [
        {
          id: "tech1",
          content: "Google, IBM, and Microsoft have collectively invested over $15 billion in quantum computing research in the past three years.",
          relevance: 0.91,
          type: "knowledge_graph",
          source_name: "Tech Investment Tracker",
          timestamp: "2024-03-01",
          confidence: 0.94
        },
        {
          id: "tech2",
          content: "Quantum computers demonstrated ability to solve optimization problems 1000x faster than traditional supercomputers in controlled tests.",
          relevance: 0.87,
          type: "stored_conversation", 
          source_name: "Quantum Computing Quarterly",
          timestamp: "2024-02-20",
          confidence: 0.88
        }
      ] as ChatSource[]
    },
    {
      title: "Climate Change Impact",
      content: `Global temperatures have risen by 1.1 degrees Celsius since pre-industrial times. This warming trend is causing significant changes in weather patterns worldwide. Arctic ice is melting at an unprecedented rate, contributing to rising sea levels. Scientists predict that without immediate action, we could see catastrophic climate impacts within the next decade.`,
      sources: [
        {
          id: "climate1",
          content: "NASA data shows global average temperature has increased by 1.1°C since 1880, with the fastest warming occurring in the past 40 years.",
          relevance: 0.96,
          type: "knowledge_graph",
          source_name: "NASA Climate Data",
          timestamp: "2024-01-05",
          confidence: 0.97
        },
        {
          id: "climate2",
          content: "Arctic sea ice is declining at a rate of 13% per decade, with summer ice extent reaching record lows in recent years.",
          relevance: 0.89,
          type: "summary",
          source_name: "Climate Research Summary",
          timestamp: "2024-02-15",
          confidence: 0.91
        },
        {
          id: "climate3",
          content: "IPCC reports indicate that limiting warming to 1.5°C requires global emissions to be cut by 45% by 2030 compared to 2010 levels.",
          relevance: 0.84,
          type: "stored_conversation",
          source_name: "IPCC Assessment Report",
          timestamp: "2024-01-20",
          confidence: 0.93
        }
      ] as ChatSource[]
    },
    {
      title: "Multi-Source Knowledge Integration",
      content: `Our enhanced RAG system now integrates multiple knowledge sources for comprehensive responses. Previous conversations provide context from your interaction history. Content summaries offer insights from processed documents and transcriptions. The knowledge graph connects related concepts and entities. This multi-layered approach ensures more accurate and contextually relevant responses.`,
      sources: [
        {
          id: "multi1",
          content: "Previous conversation about RAG systems: User asked about improving AI responses, discussed vector databases and semantic search capabilities.",
          relevance: 0.94,
          type: "stored_conversation",
          source_name: "Previous AI Discussion",
          timestamp: "2024-03-10",
          confidence: 0.92
        },
        {
          id: "multi2",
          content: "Summary: Analysis of retrieval-augmented generation techniques. Key benefits include improved accuracy, reduced hallucination, and better context awareness.",
          relevance: 0.88,
          type: "summary",
          source_name: "RAG Technology Summary",
          timestamp: "2024-03-08",
          confidence: 0.89
        },
        {
          id: "multi3",
          content: "Knowledge graph entity: RAG systems connect to vector databases, use embedding models, and integrate with language models for enhanced generation.",
          relevance: 0.85,
          type: "knowledge_graph",
          source_name: "AI Technology Graph",
          timestamp: "2024-03-05",
          confidence: 0.87
        }
      ] as ChatSource[]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/chat"
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Chat</span>
              </Link>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center space-x-2">
                <Quote size={24} className="text-purple-400" />
                <h1 className="text-xl font-bold text-white">Citation Demo</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scenario Selector */}
          <div className="lg:col-span-1">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen size={20} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Demo Scenarios</h2>
              </div>
              
              <div className="space-y-3">
                {demoScenarios.map((scenario, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedDemo(index)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selectedDemo === index
                        ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h3 className="font-medium mb-1">{scenario.title}</h3>
                    <p className="text-sm opacity-70 line-clamp-2">
                      {scenario.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-60">
                        {scenario.sources.length} sources
                      </span>
                      {selectedDemo === index && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Display */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {demoScenarios[selectedDemo].title}
                </h2>
                <p className="text-white/60 text-sm">
                  Click on the citation numbers [1], [2], etc. to see the source details
                </p>
              </div>

              {/* Citation Renderer Demo */}
              <div className="bg-white/5 rounded-xl p-6">
                <CitationRenderer
                  content={demoScenarios[selectedDemo].content}
                  sources={demoScenarios[selectedDemo].sources}
                />
              </div>

              {/* Source Summary */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Available Sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {demoScenarios[selectedDemo].sources.map((source, index) => (
                    <div key={source.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-purple-500/20 text-purple-400 text-sm px-2 py-1 rounded font-medium">
                          [{index + 1}]
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm mb-1">
                            {source.source_name}
                          </h4>
                          <p className="text-white/70 text-xs leading-relaxed">
                            {source.content}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-white/50">
                              Relevance: {Math.round(source.relevance * 100)}%
                            </span>
                            <span className="text-xs text-white/50">
                              {source.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitationDemoPage;
