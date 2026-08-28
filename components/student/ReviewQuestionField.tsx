'use client'

interface Option { value: string; label?: string }

interface ReviewQuestion {
  id: number
  question_text?: string; questionText?: string
  question_type?: string; questionType?: string
  is_required?: boolean;  isRequired?: boolean
  help_text?: string;     helpText?: string
  display_order?: number
  configuration?: { minimum?: number; maximum?: number }
  option_values?: { options?: Option[] }
  optionValues?:  { options?: Option[] }
}

interface Props {
  question: ReviewQuestion
  value: unknown
  onChange: (val: unknown) => void
}

function getOptions(q: ReviewQuestion): Option[] {
  return q.option_values?.options ?? q.optionValues?.options ?? []
}

function RatingInput({ min, max, value, onChange }: {
  min: number; max: number; value: unknown; onChange: (v: number) => void
}) {
  const current = typeof value === 'number' ? value : 0
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={[
            'w-10 h-10 rounded-[8px] border text-[14px] font-semibold font-display transition-colors',
            current === n
              ? 'bg-[#d51520] border-[#d51520] text-white'
              : 'border-[#e5e7eb] text-[#374151] hover:border-[#d51520] hover:text-[#d51520]',
          ].join(' ')}
        >
          {n}
        </button>
      ))}
      <span className="text-[12px] text-[#9ca3af] font-body ml-1">
        {min} = lowest · {max} = highest
      </span>
    </div>
  )
}

function YesNoInput({ options, value, onChange }: {
  options: string[]; value: unknown; onChange: (v: string) => void
}) {
  const labels: Record<string, string> = { YES: 'Yes', NO: 'No', MAYBE: 'Maybe' }
  return (
    <div className="flex items-center gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'h-9 px-5 rounded-[8px] border text-[13px] font-semibold font-display transition-colors',
            value === opt
              ? 'bg-[#d51520] border-[#d51520] text-white'
              : 'border-[#e5e7eb] text-[#374151] hover:border-[#d51520] hover:text-[#d51520]',
          ].join(' ')}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

export default function ReviewQuestionField({ question, value, onChange }: Props) {
  const type = (question.question_type ?? question.questionType ?? '').toUpperCase()
  const text = question.question_text ?? question.questionText ?? ''
  const required = question.is_required ?? question.isRequired ?? false
  const helpText = question.help_text ?? question.helpText
  const options = getOptions(question)
  const config = question.configuration ?? {}
  const min = config.minimum ?? 1
  const max = config.maximum ?? 5

  const inputClass = 'w-full h-[44px] px-3 border border-[#e5e7eb] rounded-[6px] text-[14px] text-[#111827] font-body bg-white focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]'

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-semibold text-[#111827] font-display">
        {text}
        {required && <span className="text-[#d51520] ml-1">*</span>}
      </label>
      {helpText && <p className="text-[12px] text-[#6b7280] font-body -mt-1">{helpText}</p>}

      {(type === 'TEXT') && (
        <input
          type="text"
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Your answer…"
        />
      )}

      {(type === 'TEXTAREA') && (
        <textarea
          className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[14px] text-[#111827] font-body bg-white focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] min-h-[100px] resize-y"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Your answer…"
        />
      )}

      {(type === 'RATING') && (
        <RatingInput min={min} max={max} value={value} onChange={onChange} />
      )}

      {(type === 'YES_NO') && (
        <YesNoInput options={['YES', 'NO']} value={value} onChange={onChange} />
      )}

      {(type === 'YES_NO_MAYBE') && (
        <YesNoInput options={['YES', 'NO', 'MAYBE']} value={value} onChange={onChange} />
      )}

      {(type === 'RADIO' || type === 'SINGLE_SELECT') && (
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4 h-4 accent-[#d51520]"
              />
              <span className="text-[14px] text-[#374151] font-body group-hover:text-[#111827]">
                {opt.label ?? opt.value}
              </span>
            </label>
          ))}
        </div>
      )}

      {(type === 'CHECKBOX' || type === 'MULTI_SELECT') && (
        <div className="flex flex-col gap-2">
          {options.map(opt => {
            const selected = Array.isArray(value) ? (value as string[]).includes(opt.value) : false
            return (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? (value as string[]) : []
                    onChange(selected ? current.filter(v => v !== opt.value) : [...current, opt.value])
                  }}
                  className="w-4 h-4 accent-[#d51520] rounded"
                />
                <span className="text-[14px] text-[#374151] font-body group-hover:text-[#111827]">
                  {opt.label ?? opt.value}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
