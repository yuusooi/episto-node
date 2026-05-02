import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Send,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import { useAppStore } from "../store";
import type { GradingResult } from "../types";

// ============================================================
// ExamConsole — Notion-style inline input
// ============================================================

function ExamConsole({
  onGenerate,
  isGenerating,
}: {
  onGenerate: (topic: string) => void;
  isGenerating: boolean;
}) {
  const [topic, setTopic] = useState("");

  return (
    <div className="flex items-center gap-2 mb-8">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && topic.trim() && !isGenerating)
            onGenerate(topic.trim());
        }}
        placeholder="输入考核知识点..."
        disabled={isGenerating}
        className="flex-1 border-b border-transparent bg-transparent px-1 py-1.5 text-[14px] text-[#37352F] dark:text-[#D3D3D3] placeholder-[#a39e98] dark:placeholder-[#6B6B6B] outline-none focus:border-[#0075de] dark:focus:border-[#4DA3E8] transition-colors disabled:opacity-40"
      />
      <button
        onClick={() => topic.trim() && onGenerate(topic.trim())}
        disabled={!topic.trim() || isGenerating}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium text-[#0075de] dark:text-[#4DA3E8] hover:bg-[#f2f9ff] dark:hover:bg-[#1E2A3A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        {isGenerating ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-[#0075de]/30 dark:border-[#4DA3E8]/30 border-t-[#0075de] dark:border-t-[#4DA3E8] rounded-full animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            生成试卷
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function matchCorrectLetter(
  correctAnswer: string,
  options: string[],
): string | null {
  if (/^[A-Z]$/.test(correctAnswer)) return correctAnswer;
  const idx = options.findIndex(
    (opt) => opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase(),
  );
  return idx >= 0 ? String.fromCharCode(65 + idx) : null;
}

function findGrade(
  results: GradingResult[],
  questionIndex: number,
): GradingResult | undefined {
  return results.find((r) => r.question_number === questionIndex + 1);
}

// ============================================================
// ExamRenderer — Notion-style exam display
// ============================================================

interface ExamRendererProps {
  exam: ReturnType<typeof useAppStore.getState>["currentExam"];
  gradingResults: GradingResult[];
  gradeScore: string;
  gradingFeedback?: string;
  gradingWrongCount?: number;
  userAnswers?: Record<string, string>;
  /** If true, this is a read-only view of a past exam (no submit) */
  isReadOnly?: boolean;
  onSubmit?: (answers: Record<string, string>) => void;
  onReset: () => void;
  isGrading: boolean;
}

function ExamRenderer({
  exam,
  gradingResults,
  gradeScore,
  gradingFeedback,
  gradingWrongCount,
  userAnswers,
  isReadOnly = false,
  onSubmit,
  onReset,
  isGrading,
}: ExamRendererProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    userAnswers ?? {},
  );
  const isGraded = gradingResults.length > 0;
  const allAnswered = Object.keys(answers).length === exam!.questions.length;

  const handleSubmit = useCallback(() => {
    if (!allAnswered || !onSubmit) return;
    onSubmit(answers);
  }, [allAnswered, answers, onSubmit]);

  return (
    <div>
      {/* Exam Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-[22px] font-bold text-[#37352F] dark:text-[#D3D3D3] tracking-[-0.25px] leading-tight">
            {exam!.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-block px-1.5 py-0.5 rounded-[9999px] bg-[#f2f9ff] dark:bg-[#1E2A3A] text-[#097fe8] dark:text-[#4DA3E8] text-[11px] font-semibold tracking-[0.0125em]">
              {exam!.difficulty}
            </span>
            <span className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
              {exam!.knowledgePoint}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {isGraded && gradeScore && (
            <span className="px-2 py-0.5 rounded-[9999px] bg-[#eef8f0] dark:bg-[#1E3A22] text-[#1aae39] dark:text-[#3CC754] text-[12px] font-bold tracking-[0.0125em]">
              {gradeScore}
            </span>
          )}
          {!isReadOnly && isGraded && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium text-[#787774] dark:text-[#9B9B9B] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] hover:text-[#37352F] dark:hover:text-[#D3D3D3] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              重新出题
            </button>
          )}
          {isReadOnly && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium text-[#787774] dark:text-[#9B9B9B] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] hover:text-[#37352F] dark:hover:text-[#D3D3D3] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              返回出题
            </button>
          )}
        </div>
      </div>

      {/* Grader feedback — shown after grading */}
      {isGraded && gradingFeedback && (
        <div className="mb-6 px-3 py-2.5 rounded-lg bg-[#F7F7F5] dark:bg-[#2A2A2A] border border-[#E9E9E7] dark:border-[#3A3A3A]">
          <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B] leading-[1.6]">
            {gradingFeedback}
          </p>
          {gradingWrongCount != null && gradingWrongCount > 0 && (
            <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] mt-1">
              本次有 {gradingWrongCount} 道新错题已自动入库
            </p>
          )}
        </div>
      )}

      {/* Questions */}
      {exam!.questions.map((q, index) => {
        const grade = findGrade(gradingResults, index);
        const correctLetter = grade
          ? matchCorrectLetter(grade.correct_answer, q.options)
          : null;

        return (
          <div
            key={index}
            className={`pb-6 ${index > 0 ? "pt-6 border-t border-[#E9E9E7] dark:border-[#2A2A2A]" : ""}`}
          >
            <div className="flex items-start gap-2 mb-3">
              <span className="text-[13px] font-semibold text-[#787774] dark:text-[#9B9B9B] shrink-0 mt-px">
                {index + 1}.
              </span>
              <p className="text-[14px] font-medium text-[#37352F] dark:text-[#D3D3D3] leading-relaxed flex-1">
                {q.question}
              </p>
              {grade && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-[9999px] font-semibold tracking-[0.0125em] shrink-0 ${
                    grade.is_correct
                      ? "bg-[#eef8f0] dark:bg-[#1E3A22] text-[#1aae39] dark:text-[#3CC754]"
                      : "bg-[#fef3ec] dark:bg-[#3A2A1E] text-[#dd5b00] dark:text-[#E8864A]"
                  }`}
                >
                  {grade.is_correct ? "正确" : "错误"}
                </span>
              )}
            </div>

            {/* Options */}
            <div className="space-y-1.5 pl-6">
              {q.options.map((option, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex);
                const isSelected = answers[String(index + 1)] === letter;
                const isCorrectOption = isGraded && letter === correctLetter;
                const isUserWrong = isGraded && !!grade && !grade.is_correct;

                let rowClass =
                  "flex items-center gap-2.5 px-2 py-1.5 rounded transition-colors ";
                if (!isGraded && !isReadOnly) {
                  rowClass += isSelected
                    ? "bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)] cursor-pointer"
                    : "hover:bg-[#F7F7F5] dark:hover:bg-[#2A2A2A] cursor-pointer";
                } else if (isCorrectOption) {
                  rowClass += "bg-[#eef8f0] dark:bg-[#1E3A22]";
                } else if (isSelected && isUserWrong) {
                  rowClass += "bg-[#fef3ec] dark:bg-[#3A2A1E]";
                } else {
                  rowClass += "opacity-40";
                }

                let dotBorder = "border-[#d4d4d0] dark:border-[#4A4A4A]";
                let dotFill = "";
                if (isSelected && !isGraded) {
                  dotBorder = "border-[#0075de] dark:border-[#4DA3E8]";
                  dotFill = "bg-[#0075de] dark:bg-[#4DA3E8]";
                }
                if (isCorrectOption) {
                  dotBorder = "border-[#1aae39] dark:border-[#3CC754]";
                  dotFill = "bg-[#1aae39] dark:bg-[#3CC754]";
                }
                if (isSelected && isUserWrong) {
                  dotBorder = "border-[#dd5b00] dark:border-[#E8864A]";
                  dotFill = "bg-[#dd5b00] dark:bg-[#E8864A]";
                }

                return (
                  <div
                    key={letter}
                    className={rowClass}
                    onClick={() => {
                      if (isGraded || isGrading || isReadOnly) return;
                      setAnswers((prev) => ({
                        ...prev,
                        [String(index + 1)]: letter,
                      }));
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${dotBorder}`}
                    >
                      {(isSelected || isCorrectOption) && (
                        <div className={`w-2 h-2 rounded-full ${dotFill}`} />
                      )}
                    </div>
                    <span className="text-[13px] text-[#787774] dark:text-[#9B9B9B] font-medium min-w-[1.25rem]">
                      {letter}.
                    </span>
                    <span className="text-[14px] text-[#37352F] dark:text-[#D3D3D3]">
                      {option}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {isGraded && grade && (
              <div className="mt-3 ml-6 pl-3 border-l-2 border-[#E9E9E7] dark:border-[#2A2A2A]">
                <p className="text-[12px] font-medium text-[#a39e98] dark:text-[#6B6B6B] mb-0.5">
                  解析
                </p>
                <p className="text-[13px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                  {grade.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Submit — only for live exams */}
      {!isGraded && !isReadOnly && onSubmit && (
        <div className="mt-6 pt-6 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isGrading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-[13px] font-medium text-[#0075de] dark:text-[#4DA3E8] hover:bg-[#f2f9ff] dark:hover:bg-[#1E2A3A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isGrading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                批改中...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                提交批改
              </>
            )}
          </button>
          {!allAnswered && (
            <span className="ml-3 text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
              已答 {Object.keys(answers).length}/{exam!.questions.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Wrong Question Book
// ============================================================

function WrongQuestionBook({
  onGenerateReview,
  isGenerating,
}: {
  onGenerateReview: (topics: string[]) => void;
  isGenerating: boolean;
}) {
  const wrongQuestions = useAppStore((s) => s.wrongQuestions);
  const fetchWrongQuestions = useAppStore((s) => s.fetchWrongQuestions);

  useEffect(() => {
    fetchWrongQuestions();
  }, [fetchWrongQuestions]);

  const topics = [...new Set(wrongQuestions.map((q) => q.topic).filter(Boolean))];

  if (wrongQuestions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <BookOpen className="w-10 h-10 text-[#d4d4d0] dark:text-[#4A4A4A] mb-3" strokeWidth={1.2} />
        <p className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B]">
          还没有错题记录，完成一次评测后会自动收录
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
          共 <strong className="text-[#37352F] dark:text-[#D3D3D3]">{wrongQuestions.length}</strong> 道错题
        </span>
        <span className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
          涉及 <strong className="text-[#37352F] dark:text-[#D3D3D3]">{topics.length}</strong> 个知识点
        </span>
      </div>

      <div className="space-y-0">
        {wrongQuestions.map((q, i) => (
          <div
            key={q.id}
            className={`py-4 ${i > 0 ? "border-t border-[#E9E9E7] dark:border-[#2A2A2A]" : ""}`}
          >
            <span className="inline-block px-1.5 py-0.5 rounded-[9999px] bg-[#fef3ec] dark:bg-[#3A2A1E] text-[#dd5b00] dark:text-[#E8864A] text-[10px] font-semibold mb-2">
              {q.topic}
            </span>
            <p className="text-[14px] text-[#37352F] dark:text-[#D3D3D3] leading-relaxed mb-2">
              {q.question_text}
            </p>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="text-[#dd5b00] dark:text-[#E8864A]">
                你的答案: {q.user_answer}
              </span>
              <span className="text-[#1aae39] dark:text-[#3CC754]">
                正确答案: {q.correct_answer}
              </span>
              {q.created_at && (
                <span className="text-[#a39e98] dark:text-[#6B6B6B] ml-auto">
                  {new Date(q.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {q.explanation && (
              <div className="mt-2 pl-3 border-l-2 border-[#E9E9E7] dark:border-[#2A2A2A]">
                <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
        <button
          onClick={() => onGenerateReview(topics)}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-[13px] font-medium text-white bg-[#0075de] dark:bg-[#4DA3E8] hover:bg-[#0064c2] dark:hover:bg-[#3B8FD4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              一键生成复习卷
            </>
          )}
        </button>
        <span className="ml-3 text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
          基于错题知识点从 ChromaDB 切片生成复习题
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Assessments Page
// ============================================================

type Tab = "exam" | "wrong";

export default function AssessmentsPage() {
  const currentExam = useAppStore((s) => s.currentExam);
  const gradingResults = useAppStore((s) => s.gradingResults);
  const gradeScore = useAppStore((s) => s.gradeScore);
  const gradingFeedback = useAppStore((s) => s.gradingFeedback);
  const gradingWrongCount = useAppStore((s) => s.gradingWrongCount);
  const wrongQuestions = useAppStore((s) => s.wrongQuestions);

  const viewingExamRecordId = useAppStore((s) => s.viewingExamRecordId);
  const examHistory = useAppStore((s) => s.examHistory);

  // Background-capable exam state from global store
  const examIsGenerating = useAppStore((s) => s.examIsGenerating);
  const examStreamingText = useAppStore((s) => s.examStreamingText);
  const examIsGrading = useAppStore((s) => s.examIsGrading);
  const generateExam = useAppStore((s) => s.generateExam);
  const generateReviewExam = useAppStore((s) => s.generateReviewExam);
  const submitExam = useAppStore((s) => s.submitExam);
  const resetExamGeneration = useAppStore((s) => s.resetExamGeneration);
  const exitExamRecord = useAppStore((s) => s.exitExamRecord);

  const [tab, setTab] = useState<Tab>("exam");

  const wrongCount = wrongQuestions.length;

  // Are we viewing a completed historical record?
  const viewingRecord = viewingExamRecordId
    ? examHistory.find((r) => r.id === viewingExamRecordId)
    : null;

  // Are we resuming an incomplete exam from history?
  const currentExamRecordId = useAppStore((s) => s.currentExamRecordId);
  const resumingRecord = !viewingRecord && currentExamRecordId
    ? examHistory.find((r) => r.id === currentExamRecordId && r.status === 'incomplete')
    : null;

  const isExamActive = !!(viewingRecord || resumingRecord || examIsGenerating);

  const handleGenerateReview = useCallback(
    (topics: string[]) => {
      setTab("exam");
      generateReviewExam(topics);
    },
    [generateReviewExam],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-10 pt-8 pb-12 flex flex-col flex-1">
        {/* Page title */}
        <h1 className="text-[28px] font-bold text-[#37352F] dark:text-[#D3D3D3] leading-tight tracking-[-0.4px] mb-1">
          动态评测室
        </h1>
        <p className="text-[14px] text-[#787774] dark:text-[#9B9B9B] mb-6">
          由 Examiner Agent 基于金库文档实时生成个性化试卷
        </p>

        {/* Show ExamConsole only when no exam is active */}
        {!isExamActive && (
          <ExamConsole onGenerate={generateExam} isGenerating={examIsGenerating} />
        )}

        {/* Viewing completed historical record header */}
        {viewingRecord && (
          <div className="flex items-center gap-3 mb-6 px-3 py-2 bg-[#f2f9ff] dark:bg-[#1E2A3A] rounded-lg">
            <ClipboardCheck className="w-4 h-4 text-[#0075de] dark:text-[#4DA3E8] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#37352F] dark:text-[#D3D3D3]">
                查看历史评测: {viewingRecord.title}
              </p>
              <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
                {viewingRecord.completedAt}
                {viewingRecord.score && ` · 得分: ${viewingRecord.score}`}
              </p>
            </div>
            <button
              onClick={exitExamRecord}
              className="text-[12px] font-medium text-[#0075de] dark:text-[#4DA3E8] hover:underline shrink-0"
            >
              返回出题
            </button>
          </div>
        )}

        {/* Resuming incomplete exam header */}
        {resumingRecord && (
          <div className="flex items-center gap-3 mb-6 px-3 py-2 bg-[#fef3ec] dark:bg-[#3A2A1E] rounded-lg">
            <ClipboardCheck className="w-4 h-4 text-[#dd5b00] dark:text-[#E8864A] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#37352F] dark:text-[#D3D3D3]">
                继续答题: {resumingRecord.title}
              </p>
              <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
                {resumingRecord.completedAt} · 未完成
              </p>
            </div>
            <button
              onClick={exitExamRecord}
              className="text-[12px] font-medium text-[#dd5b00] dark:text-[#E8864A] hover:underline shrink-0"
            >
              返回出题
            </button>
          </div>
        )}

        {/* Tabs — hidden when any exam is active */}
        {!isExamActive && (
          <div className="flex items-center gap-0 mb-6 border-b border-[#E9E9E7] dark:border-[#2A2A2A]">
            <button
              onClick={() => setTab("exam")}
              className={`px-3 py-2 text-[13px] font-medium transition-colors relative ${
                tab === "exam"
                  ? "text-[#37352F] dark:text-[#D3D3D3]"
                  : "text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B]"
              }`}
            >
              出题
              {tab === "exam" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0075de] dark:bg-[#4DA3E8] rounded-t" />
              )}
            </button>
            <button
              onClick={() => setTab("wrong")}
              className={`px-3 py-2 text-[13px] font-medium transition-colors relative flex items-center gap-1.5 ${
                tab === "wrong"
                  ? "text-[#37352F] dark:text-[#D3D3D3]"
                  : "text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B]"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              错题本
              {wrongCount > 0 && (
                <span className="px-1 py-0 rounded-full bg-[#fef3ec] dark:bg-[#3A2A1E] text-[#dd5b00] dark:text-[#E8864A] text-[10px] font-bold leading-none">
                  {wrongCount}
                </span>
              )}
              {tab === "wrong" && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0075de] dark:bg-[#4DA3E8] rounded-t" />
              )}
            </button>
          </div>
        )}

        {/* Tab content */}
        {tab === "exam" && (
          <>
            {/* Viewing historical record */}
            {viewingRecord && currentExam && (
              <ExamRenderer
                exam={currentExam}
                gradingResults={gradingResults}
                gradeScore={gradeScore}
                gradingFeedback={gradingFeedback}
                gradingWrongCount={gradingWrongCount}
                userAnswers={viewingRecord.userAnswers}
                isReadOnly={true}
                onReset={exitExamRecord}
                isGrading={false}
              />
            )}

            {/* Not viewing completed record — live exam or resuming */}
            {!viewingRecord && (
              <>
                {/* Streaming text while generating */}
                {examIsGenerating && examStreamingText && !currentExam && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3.5 h-3.5 border-2 border-[#0075de]/30 dark:border-[#4DA3E8]/30 border-t-[#0075de] dark:border-t-[#4DA3E8] rounded-full animate-spin" />
                      <span className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
                        Examiner 正在从知识库生成题目...
                      </span>
                    </div>
                    <div className="text-[13px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed whitespace-pre-wrap streaming-cursor">
                      {examStreamingText}
                    </div>
                  </div>
                )}

                {/* Exam area */}
                {!currentExam && !examIsGenerating && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <BookOpen className="w-10 h-10 text-[#d4d4d0] dark:text-[#4A4A4A] mb-3" strokeWidth={1.2} />
                    <p className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B]">
                      输入知识点并点击「生成试卷」开始考核
                    </p>
                  </div>
                )}

                {currentExam && (
                  <ExamRenderer
                    exam={currentExam}
                    gradingResults={gradingResults}
                    gradeScore={gradeScore}
                    gradingFeedback={gradingFeedback}
                    gradingWrongCount={gradingWrongCount}
                    onSubmit={submitExam}
                    onReset={resumingRecord ? exitExamRecord : resetExamGeneration}
                    isGrading={examIsGrading}
                  />
                )}
              </>
            )}
          </>
        )}

        {tab === "wrong" && !isExamActive && (
          <WrongQuestionBook onGenerateReview={handleGenerateReview} isGenerating={examIsGenerating} />
        )}
      </div>
    </div>
  );
}
