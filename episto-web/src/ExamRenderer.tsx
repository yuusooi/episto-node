import { useState } from 'react'
import type { ExamPaper, GradingResult } from './types'

interface ExamRendererProps {
  exam: ExamPaper
  gradingResults: GradingResult[]
  gradeScore: string
  onSubmit: (answers: Record<string, string>) => void
}

// 根据题号查找对应的批改结果
function findGrade(
  results: GradingResult[],
  questionIndex: number
): GradingResult | undefined {
  return results.find(r => r.question_number === questionIndex + 1)
}

// 将 correct_answer 匹配回选项字母
// 后端的 correct_answer 可能是字母("A")或选项文字("依赖数组")
function matchCorrectLetter(
  correctAnswer: string,
  options: string[]
): string | null {
  // 如果是单个大写字母，直接返回
  if (/^[A-Z]$/.test(correctAnswer)) return correctAnswer
  // 否则按文字内容匹配
  const idx = options.findIndex(
    opt => opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  )
  if (idx >= 0) return String.fromCharCode(65 + idx)
  return null
}

function ExamRenderer({ exam, gradingResults, gradeScore, onSubmit }: ExamRendererProps) {
  // 用户答案：key 是题号("1","2")，value 是选项字母("A","B")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const isGraded = gradingResults.length > 0

  function handleSelect(questionIndex: number, optionLetter: string) {
    // 批改后锁定，不允许再改答案
    if (isGraded) return
    setAnswers(prev => ({
      ...prev,
      // index 从 0 开始，题号从 1 开始
      [String(questionIndex + 1)]: optionLetter,
    }))
  }

  function handleSubmit() {
    onSubmit(answers)
  }

  // 判断某个选项在批改模式下的样式
  function getOptionStyle(
    isSelected: boolean,
    isCorrectOption: boolean,
    isUserWrong: boolean
  ) {
    if (!isGraded) {
      // 答题模式
      return isSelected
        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700/30'
    }
    // 批改模式
    if (isCorrectOption) {
      return 'border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
    }
    if (isSelected && isUserWrong) {
      return 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
    }
    return 'border-slate-200 dark:border-gray-700 opacity-60'
  }

  // 判断圆圈内部填充点的颜色
  function getDotColor(
    isSelected: boolean,
    isCorrectOption: boolean,
    isUserWrong: boolean
  ) {
    if (!isGraded) {
      return 'bg-blue-500 dark:bg-blue-400'
    }
    if (isCorrectOption) return 'bg-green-500'
    if (isSelected && isUserWrong) return 'bg-red-500'
    return ''
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 考卷标题 + 得分 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-gray-100">
            {exam.title}
          </h1>
          <span className="mt-1 inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
            难度: {exam.difficulty}
          </span>
        </div>
        {isGraded && gradeScore && (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-sm font-semibold shrink-0">
            得分: {gradeScore}
          </span>
        )}
      </div>

      {/* 题目列表 */}
      {exam.questions.map((q, index) => {
        const grade = findGrade(gradingResults, index)
        const correctLetter = grade
          ? matchCorrectLetter(grade.correct_answer, q.options)
          : null

        return (
          <div key={index} className="mb-8">
            {/* 题号 + 题目文本 + 对错标记 */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-sm font-semibold text-slate-500 dark:text-gray-400 min-w-[2rem]">
                {index + 1}.
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-gray-200">
                {q.question}
              </p>
              {grade && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded shrink-0 ${
                  grade.is_correct
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {grade.is_correct ? '正确' : '错误'}
                </span>
              )}
            </div>

            {/* 选项列表 */}
            <div className="space-y-2 pl-[2rem]">
              {q.options.map((option, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex)
                const isSelected = answers[String(index + 1)] === letter
                const isCorrectOption = isGraded && letter === correctLetter
                const isUserWrong = isGraded && !!grade && !grade.is_correct

                return (
                  <div
                    key={letter}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${getOptionStyle(isSelected, isCorrectOption, isUserWrong)} ${!isGraded ? 'cursor-pointer' : ''}`}
                    onClick={() => handleSelect(index, letter)}
                  >
                    {/* 单选圆圈 */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-blue-500 dark:border-blue-400'
                        : 'border-slate-300 dark:border-gray-600'
                    } ${isCorrectOption ? '!border-green-500' : ''}`}>
                      {(isSelected || isCorrectOption) && (
                        <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(isSelected, isCorrectOption, isUserWrong)}`} />
                      )}
                    </div>

                    {/* 选项字母 */}
                    <span className="font-medium text-slate-500 dark:text-gray-400 min-w-[1.5rem]">
                      {letter}.
                    </span>

                    {/* 选项文字 */}
                    <span className="text-sm text-slate-700 dark:text-gray-300">
                      {option}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* 批改后显示解析 */}
            {isGraded && grade && (
              <div className="mt-3 ml-[2rem] p-3 rounded-lg bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">解析：</p>
                <p className="text-sm text-slate-600 dark:text-gray-300">{grade.explanation}</p>
              </div>
            )}
          </div>
        )
      })}

      {/* 交卷按钮，批改后隐藏 */}
      {!isGraded && (
        <div className="mt-6 text-center">
          <button
            onClick={handleSubmit}
            // 全部作答后才能点击
            disabled={Object.keys(answers).length !== exam.questions.length}
            className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600
                       dark:bg-blue-600 dark:hover:bg-blue-500
                       text-white rounded-lg text-sm font-medium
                       cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            交卷
          </button>
        </div>
      )}
    </div>
  )
}

export default ExamRenderer
