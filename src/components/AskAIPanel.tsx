import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  Send,
  Clock,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSearch,
  ChevronRight
} from 'lucide-react';
import { AIQuestionAnswer } from '../types';
import { MOCK_AI_QA } from '../services/mockData';

interface AskAIPanelProps {
  onSeek: (seconds: number) => void;
  onNavigateToAnalysis?: () => void;
}

export const AskAIPanel: React.FC<AskAIPanelProps> = ({ onSeek, onNavigateToAnalysis }) => {
  const [qaList, setQaList] = useState<AIQuestionAnswer[]>(MOCK_AI_QA);
  const [inputQuery, setInputQuery] = useState('');
  const [activeQA, setActiveQA] = useState<AIQuestionAnswer>(MOCK_AI_QA[0]);
  const [isThinking, setIsThinking] = useState(false);

  const suggestedQuestions = [
    'What happened after the person entered the restricted area?',
    'Who entered the restricted area and how long were they inside?',
    'Was there any unusual or abnormal activity detected?',
    'What happened first in the recording?',
    'Which object or entity had high velocity in the machinery sector?',
  ];

  const handleAsk = (query: string) => {
    if (!query.trim()) return;
    setIsThinking(true);

    // Check if query matches known question
    const matched = qaList.find((q) =>
      q.question.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(q.question.toLowerCase().slice(0, 15))
    );

    setTimeout(() => {
      setIsThinking(false);
      if (matched) {
        setActiveQA(matched);
      } else {
        // Generate contextual answer for arbitrary query
        const customQA: AIQuestionAnswer = {
          id: `custom-${Date.now()}`,
          question: query,
          answer: `Analysis for "${query}": ChronoVision neural reasoner verified Track #12 active between 00:04.2 and 00:14.5 traversing Restricted Vault Access. All movements cross-referenced with spatial boundary polygon #1.`,
          sequence: [
            { time: '00:04.2', seconds: 4.2, description: 'Subject crosses zone boundary' },
            { time: '00:09.1', seconds: 9.1, description: 'Terminal panel engagement' },
            { time: '00:14.5', seconds: 14.5, description: 'Zone exit registered' },
          ],
          evidenceTimestamps: [
            { time: '00:04.2', seconds: 4.2, label: 'Boundary Breach', frameNumber: 126 },
            { time: '00:14.5', seconds: 14.5, label: 'Exit Timestamp', frameNumber: 435 },
          ],
        };
        setQaList((prev) => [customQA, ...prev]);
        setActiveQA(customQA);
      }
    }, 450);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#4C3CB8]">
          <Sparkles className="w-4 h-4 text-[#C9C2FF]" />
          <span>NATURAL LANGUAGE TEMPORAL REASONING</span>
        </div>
        <h2 className="text-2xl font-bold text-[#1F2937] tracking-tight">
          Ask about this video
        </h2>
        <p className="text-xs text-[#6B7280]">
          Ask anything about events, behaviour, people, objects, causality, or timing.
          Every response includes direct verifiable timestamp links.
        </p>

        {/* Input area */}
        <div className="pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(inputQuery);
              setInputQuery('');
            }}
            className="flex items-center gap-2 bg-[#FAFAF8] border border-[#E8E9E6] focus-within:border-[#C9C2FF] rounded-xl px-3 py-2 shadow-xs transition"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask what happened, when it happened, or what happened before..."
              className="bg-transparent flex-1 text-xs text-[#1F2937] placeholder-[#9CA3AF] outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-1.5 bg-[#1F2937] hover:bg-[#111827] text-white disabled:opacity-40 rounded-lg transition"
            >
              <Send className="w-3.5 h-3.5 text-[#C9C2FF]" />
            </button>
          </form>
        </div>

        {/* Suggested Chips */}
        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-[#9CA3AF] mr-1">Suggested:</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F4F5F2] hover:bg-[#F3F1FF] text-[#4B5563] hover:text-[#4C3CB8] border border-[#E8E9E6] hover:border-[#E1DCFF] transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Structured AI Answer Surface */}
      {isThinking ? (
        <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-8 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#C9C2FF] border-t-[#4C3CB8] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B7280]">
            Traversing temporal graph & validating evidence frames...
          </p>
        </div>
      ) : activeQA ? (
        <div className="bg-[#FFFFFF] border border-[#E8E9E6] rounded-2xl p-6 shadow-xs space-y-6">
          {/* Question title */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F0F1EE]">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-semibold text-[#6B7280] uppercase tracking-wider">
                Question
              </span>
              <h3 className="text-base font-bold text-[#1F2937]">
                "{activeQA.question}"
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F0FAF4] text-[#1B663E] border border-[#D1F0DE] font-medium">
              Verified by Neural Reasoner
            </span>
          </div>

          {/* Section 1: Answer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Answer
            </h4>
            <p className="text-sm text-[#1F2937] leading-relaxed bg-[#FAFAF8] border border-[#E8E9E6] p-4 rounded-xl">
              {activeQA.answer}
            </p>
          </div>

          {/* Section 2: Event Sequence */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Event Sequence
            </h4>
            <div className="space-y-2">
              {activeQA.sequence.map((seq, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-[#FFFFFF] border border-[#E8E9E6] hover:border-[#DCDDD9] transition text-xs"
                >
                  <button
                    onClick={() => {
                      onSeek(seq.seconds);
                      if (onNavigateToAnalysis) onNavigateToAnalysis();
                    }}
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F3F1FF] text-[#4C3CB8] border border-[#E1DCFF] hover:bg-[#C9C2FF] hover:text-[#1F2937] transition shrink-0"
                    title="Jump to this moment"
                  >
                    ▶ {seq.time}
                  </button>
                  <span className="text-[#374151] pt-0.5">{seq.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Traceable Evidence Timestamps */}
          <div className="space-y-3 pt-2 border-t border-[#F0F1EE]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Evidence Anchors
              </h4>
              <span className="text-[11px] text-[#9CA3AF]">
                Click any timestamp to seek video player
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeQA.evidenceTimestamps.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSeek(ev.seconds);
                    if (onNavigateToAnalysis) onNavigateToAnalysis();
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F5FF] hover:bg-[#E3EDFF] border border-[#D9E7FF] text-xs font-medium text-[#1E4D8C] transition group"
                >
                  <Play className="w-3 h-3 text-[#1E4D8C] fill-[#1E4D8C]" />
                  <span className="font-mono font-semibold">{ev.time}</span>
                  <span className="text-[#64748B] text-[11px]">• {ev.label}</span>
                  {ev.frameNumber && (
                    <span className="text-[10px] text-[#94A3B8] font-mono">
                      (F#{ev.frameNumber})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
