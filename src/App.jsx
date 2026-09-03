import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import hexagrams from './data/hexagrams.json'
import presetQuestions from './data/preset-questions.json'
import userGuideMarkdown from '../使用指南.md?raw'
import lineQrCode from './assets/Line.jpg'
import facebookQrCode from './assets/Facebook.jpg'
import logoImage from './assets/SEL-Change_Logo.jpg'
import selSlideImage from './assets/SEL-Change_Slide.jpg'
import cardSetImage from './assets/SEL-Change-Card-Set.jpg'
import earthTrigram from './assets/地.png'
import heavenTrigram from './assets/天.png'
import mountainTrigram from './assets/山.png'
import waterTrigram from './assets/水.png'
import lakeTrigram from './assets/澤.png'
import fireTrigram from './assets/火.png'
import thunderTrigram from './assets/雷.png'
import windTrigram from './assets/風.png'
import './App.css'

const STORAGE_KEY = 'iching-learning-journals-v1'
const LINE_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const STEPS = ['基本資料', '設定問題', '卜卦前解方', '擲骰起卦', '卦象結果', '觀象反思', 'AI解卦與行動', '預覽與匯出']
const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
const TRIGRAMS = {
  '111': { name: '天', image: heavenTrigram },
  '000': { name: '地', image: earthTrigram },
  '001': { name: '雷', image: thunderTrigram },
  '010': { name: '水', image: waterTrigram },
  '011': { name: '澤', image: lakeTrigram },
  '100': { name: '山', image: mountainTrigram },
  '101': { name: '火', image: fireTrigram },
  '110': { name: '風', image: windTrigram },
}
const SEL_CAPABILITIES = [
  { name: '自我覺察', english: 'Self-Awareness', description: '認識自己的情緒、價值、動機、優勢與限制。' },
  { name: '自我管理', english: 'Self-Management', description: '調節情緒、衝動與行動，不讓情緒直接控制自己。' },
  { name: '社會覺察', english: 'Social Awareness', description: '理解他人的觀點、情緒與處境，具備同理心與換位思考。' },
  { name: '人際關係技巧', english: 'Relationship Skills', description: '溝通、合作、協商、處理衝突與建立信任。' },
  { name: '負責任的決策', english: 'Responsible Decision-Making', description: '整合自我、他人與情境，評估後果，作出兼顧長期影響的選擇。' },
]

const [userGuideIntro, ...userGuideSectionBlocks] = userGuideMarkdown.trim().split(/\r?\n(?=## )/)
const USER_GUIDE_INTRO = userGuideIntro.split(/\r?\n/).filter((line) => !line.startsWith('# ')).join(' ').trim()
const USER_GUIDE_SECTIONS = userGuideSectionBlocks.map((block) => {
  const [title, ...lines] = block.replace(/^## /, '').split(/\r?\n/)
  return { title, items: lines.filter((line) => /^\d+\. /.test(line)).map((line) => line.replace(/^\d+\. /, '')) }
})

const clean = (value) => value.trim()
const buildAiReflectionPrompt = ({ question, originalName, pairName }) => `你是一位熟悉《易經》哲學、決策思維與社會情緒學習（SEL）的智慧引導者。

請根據以下資訊，回應使用者的問題, 撰寫約 400 字的回應：

### 【本次大哉問】

${question}

### 【本卦】

${originalName}

### 【綜卦/錯卦】

${pairName}

請以「本卦」作為主要分析依據，運用本卦的核心思想回應使用者的「本次大哉問」。

你的目的不是替使用者預測命運或直接給出唯一答案，而是運用《易經》的智慧，幫助使用者：

* 看清目前的處境；
* 察覺自己可能忽略的因素；
* 從不同角度重新理解問題；
* 思考可能的選擇及其後果；
* 找到可以採取的下一步行動。

如有助於深化理解，可以適度運用「綜卦」與「錯卦」，提供與本卦不同、相反或互補的觀點，但分析的核心仍應以「本卦」為主。

接著，請將你的分析連結至以下 SEL 五大核心能力：

### 1. 自我覺察

這個卦象提醒使用者需要察覺哪些情緒、想法、價值觀、優勢、限制或內在需求？

### 2. 自我管理

面對目前的情境，使用者應如何管理自己的情緒、衝動、壓力、目標與行動？

### 3. 社會覺察

使用者需要理解哪些他人的立場、感受、需求、環境因素或更大的情境？

### 4. 人際關係技巧

這個情境中，使用者可以如何改善溝通、合作、傾聽、表達、協商或處理衝突？

### 5. 負責任的決定

綜合本卦的智慧與上述反思，使用者在做決定時應考慮哪些選項、後果、責任、價值與長期影響？

### 【最後請提供】

以簡潔而具有啟發性的方式整理：

**易經給我的提醒：**
用 2–3 句話說明本卦對「本次大哉問」最重要的啟示。

**SEL 五力反思：**
分別指出與本次問題最相關的 SEL 能力與反思重點。

**我可以採取的下一步：**
提出 1–3 個具體、可實行的行動建議。

回答應具有啟發性、反思性與行動導向，避免宿命式、絕對化或過度肯定的預測語言。`
const nowLocal = () => {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '尚未填寫'
const makeId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
const getObservationReflection = (journal) => {
  if (typeof journal.observationReflection === 'string') return journal.observationReflection
  return (journal.reflections || []).map((item) => [
    item.interpretation && `解釋：${item.interpretation}`,
    item.feeling && `感受：${item.feeling}`,
    item.need && `需要：${item.need}`,
    item.insight && `啟發：${item.insight}`,
  ].filter(Boolean).join('\n')).filter(Boolean).join('\n\n')
}
const createJournal = () => {
  const created = new Date().toISOString()
  return {
    journalId: makeId(), schemaVersion: '1.0', hexagramDataVersion: 'Hexagram.xlsx',
    createdAt: created, updatedAt: created, activityAt: nowLocal(), status: 'draft',
    mode: 'individual', groupName: '', members: [], questionType: 'preset', questionSet: 'teachers', questionText: '',
    preSolutions: [''], dice: [], reflections: [], observationReflection: '', sharedInterpretation: '', jointSolution: '',
    nextAction: '', nextActionSummary: '', selReflection: '', selTags: [],
  }
}

function getCalculation(dice) {
  if (dice.length !== 6 || dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) return null
  const bits = dice.map((value) => value % 2 ? '1' : '0')
  const originalId = [...bits].reverse().join('')
  const reversedId = [...originalId].reverse().join('')
  const pairTitle = reversedId === originalId ? '錯卦' : '綜卦'
  const comprehensiveId = reversedId === originalId
    ? [...originalId].map((bit) => bit === '1' ? '0' : '1').join('')
    : reversedId
  return {
    originalId, comprehensiveId, pairTitle,
    original: hexagrams.find((item) => item.id === originalId),
    comprehensive: hexagrams.find((item) => item.id === comprehensiveId),
  }
}

function HexagramLines({ id, partialDice = [], labelled = false }) {
  const items = Array.from({ length: 6 }, (_, index) => {
    const lineNo = 6 - index
    const bit = id
      ? id[index]
      : partialDice[lineNo - 1] === undefined
        ? undefined
        : partialDice[lineNo - 1] % 2 ? '1' : '0'
    return { bit, lineNo, name: LINE_NAMES[lineNo - 1] }
  })
  return <div className={`hexagram-lines ${labelled ? 'is-labelled' : ''}`} aria-label={id ? `卦象 ${id}` : '目前累積卦象'}>
    {items.map(({ bit, lineNo, name }) => (
      <div className="line-row" key={lineNo}>
        {labelled && <span>{name}</span>}
        <div className={`yao ${bit === '0' ? 'yin' : bit === '1' ? 'yang' : 'empty'}`} aria-label={bit ? `${name}：${bit === '1' ? '陽' : '陰'}` : `${name}：尚未擲骰`}>
          <i /><i />
        </div>
      </div>
    ))}
  </div>
}

function DiceFace({ value, compact = false }) {
  const pips = DIE_PIPS[value] || []
  return <span className={`dice-face ${compact ? 'compact' : ''}`} aria-label={`${value} 點骰子`}>
    {Array.from({ length: 9 }, (_, index) => <i className={pips.includes(index) ? 'pip' : ''} key={index} />)}
  </span>
}

function TrigramImages({ id, hexagram }) {
  const trigrams = [TRIGRAMS[id?.slice(0, 3)], TRIGRAMS[id?.slice(3, 6)]].filter(Boolean)
  if (trigrams.length !== 2) return null
  return <div className="trigram-images" aria-label={`${hexagram}的上下三爻`}>
    {trigrams.map((trigram, index) => <img key={`${trigram.name}-${index}`} src={trigram.image} alt={`${index === 0 ? '上' : '下'}卦：${trigram.name}`} />)}
  </div>
}

function Card({ title, data, id }) {
  const [back, setBack] = useState(false)
  const [expanded, setExpanded] = useState(false)
  if (!data) return <div className="notice error">找不到卦象資料，請返回檢查骰子結果。</div>
  const selTags = [...new Set([data.sel1, data.sel2].filter(Boolean))]
  return <article className={`hex-card ${back ? 'is-back' : ''}`}>
    <div className="card-topline"><span>{title}</span><span>第 {data.seq} 卦</span></div>
    {back ? <div className="card-content">
      <p className="card-title">{data.hexagram}</p>
      <p className="quote">「{data.judgement1}」<br />「{data.judgement2}」</p>
      <div className="tag-list">{selTags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
      <button className="text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? '收起大象辭' : '展開大象辭'}</button>
      {expanded && <p className="commentary">{data.commentary}</p>}
    </div> : <div className="card-content card-front">
      <p className="card-title">{data.hexagram}</p>
      <HexagramLines id={id} />
      <TrigramImages id={id} hexagram={data.hexagram} />
      <p className="image-text">{data.imagetext}</p>
    </div>}
    <button className="secondary full-width" onClick={() => setBack(!back)}>{back ? '返回牌面' : '查看牌背'}</button>
  </article>
}

function BasicStep({ journal, update }) {
  const memberText = journal.members.filter(clean).join('、')
  return <section className="step-section">
    <div className="eyebrow">第 1 步，共 8 步：由這次活動開始</div><h2>建立學習日誌</h2>
    <p className="helper">資料僅儲存在此瀏覽器。共用裝置使用後，請記得匯出或清除資料。</p>
    <fieldset className="choice-group"><legend>活動模式</legend>
      <label><input type="radio" checked={journal.mode === 'individual'} onChange={() => update({ mode: 'individual', members: [] })} /> 個人學習</label>
      <label><input type="radio" checked={journal.mode === 'group'} onChange={() => update({ mode: 'group' })} /> 小組學習</label>
    </fieldset>
    <div className="form-grid">
      <label>活動日期與時間<input type="datetime-local" value={journal.activityAt} onChange={(event) => update({ activityAt: event.target.value })} /></label>
      {journal.mode === 'group' && <label>組別名稱<input value={journal.groupName} placeholder="例如：第三組" onChange={(event) => update({ groupName: event.target.value })} /></label>}
    </div>
    {journal.mode === 'group' && <div className="member-editor"><div><h3>成員</h3><p className="helper">可選填；請在同一欄輸入所有成員。</p></div>
      <input value={memberText} placeholder="例如：王小明、李小華、陳小美" aria-label="成員" onChange={(event) => update({ members: clean(event.target.value) ? [event.target.value] : [] })} />
    </div>}
  </section>
}

function QuestionStep({ journal, update }) {
  const selectedQuestionSet = presetQuestions.find((set) => set.id === journal.questionSet) || presetQuestions[0]
  const [isQuestionPickerOpen, setIsQuestionPickerOpen] = useState(false)
  const questionPickerButtonRef = useRef(null)

  const closeQuestionPicker = () => {
    setIsQuestionPickerOpen(false)
    window.setTimeout(() => questionPickerButtonRef.current?.focus(), 0)
  }

  const selectQuestion = (question) => {
    update({ questionText: question })
    closeQuestionPicker()
  }

  return <section className="step-section"><div className="eyebrow">第 2 步，共 8 步：設定問題</div><h2>今天想一起探索什麼？</h2>
    <fieldset className="choice-group"><legend>問題來源</legend>
      <label><input type="radio" checked={journal.questionType === 'preset'} onChange={() => update({ questionType: 'preset', questionText: '' })} /> 選擇大哉問</label>
      <label><input type="radio" checked={journal.questionType === 'custom'} onChange={() => update({ questionType: 'custom', questionText: '' })} /> 自訂問題</label>
    </fieldset>
    {journal.questionType === 'preset' ? <div className="stack-fields"><label>大哉問題組<select value={selectedQuestionSet?.id || ''} onChange={(event) => { setIsQuestionPickerOpen(false); update({ questionSet: event.target.value, questionText: '' }) }}>{presetQuestions.map((set) => <option key={set.id} value={set.id}>{set.label}</option>)}</select></label><div className="question-picker-field" role="group" aria-labelledby="question-picker-label"><span id="question-picker-label">大哉問</span><button ref={questionPickerButtonRef} className="secondary question-picker-button" type="button" aria-haspopup="dialog" onClick={() => setIsQuestionPickerOpen(true)}>選擇題目</button></div><CurrentQuestion question={journal.questionText} label="已選大哉問" /></div> : <label>自訂問題<textarea value={journal.questionText} rows="5" placeholder="寫下你們要探索的問題..." onChange={(event) => update({ questionText: event.target.value })} /></label>}
    {!clean(journal.questionText) && <p className="field-hint">請先設定一項非空白問題，才能進入下一步。</p>}
    {isQuestionPickerOpen && <QuestionPickerDialog questionSet={selectedQuestionSet} onClose={closeQuestionPicker} onSelect={selectQuestion} />}
  </section>
}

function QuestionPickerDialog({ questionSet, onClose, onSelect }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return <div className="question-picker-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="question-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="question-picker-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="question-picker-dialog-header">
        <div><p className="eyebrow">大哉問題組</p><h2 id="question-picker-dialog-title">{questionSet.label}</h2></div>
        <button ref={closeButtonRef} className="icon-button" type="button" aria-label="關閉題目選擇" onClick={onClose}>×</button>
      </header>
      <ol className="question-picker-list">
        {questionSet.questions.map((question, index) => <li key={question}><button type="button" onClick={() => onSelect(question)}><span aria-hidden="true">{index + 1}</span><span>{question}</span></button></li>)}
      </ol>
    </section>
  </div>
}

function CurrentQuestion({ question, label = '本次大哉問' }) {
  if (!clean(question)) return null
  return <aside className="current-question"><span>{label}</span><p>{question}</p></aside>
}

function OfficialAccountLinks() {
  const accounts = [
    { name: '「SEL易想天開」Line官方帳號', url: 'https://lin.ee/Py3z2Uf', image: lineQrCode, alt: '「SEL易想天開」Line官方帳號 QR code' },
    { name: '臉書粉專', url: 'https://www.facebook.com/SEL.yijingboardgames/', image: facebookQrCode, alt: 'SEL易想天開臉書粉專 QR code' },
  ]
  return <div className="official-account-links"><p className="official-account-intro">立即加入「SEL易想天開」官方社群，掃描 QR code 或點選網址，接收最新活動與學習資源。</p>{accounts.map((account) => <article className="official-account" key={account.url}><a className="official-account-qr" href={account.url} target="_blank" rel="noreferrer" aria-label={`開啟${account.name}`}><img src={account.image} alt={account.alt} /></a><div className="official-account-details"><h4>{account.name}</h4><a className="official-account-url" href={account.url} target="_blank" rel="noreferrer">網址：{account.url}</a></div></article>)}</div>
}

function HexagramCarryover({ calculation }) {
  if (!calculation?.original || !calculation?.comprehensive) return null
  const items = [
    ['本卦', calculation.original, calculation.originalId],
    [calculation.pairTitle, calculation.comprehensive, calculation.comprehensiveId],
  ]
  return <div className="hexagram-carryover" aria-label="本卦與配對卦摘要">
    {items.map(([title, data, id]) => <article key={title}>
      <span>{title}</span>
      <strong>第 {data.seq} 卦 · {data.hexagram}</strong>
      <TrigramImages id={id} hexagram={data.hexagram} />
      <p>「{data.judgement1}」<br />「{data.judgement2}」</p>
    </article>)}
  </div>
}

function SolutionsStep({ journal, update }) {
  const [draftSolution, setDraftSolution] = useState('')
  const [summaryText, setSummaryText] = useState(() => journal.preSolutions.map(clean).filter(Boolean).map((solution, index) => `${index + 1}. ${solution}`).join('\n'))
  const summaryRef = useRef(null)
  const draftRef = useRef(null)
  const scrollSummaryAfterAddRef = useRef(false)
  const formatSolutions = (items) => items.map((solution, index) => `${index + 1}. ${solution}`).join('\n')
  const parseSolutions = (value) => value
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)、．]\s*/, '').trim())
    .filter(Boolean)
  const updateFromSummary = (value) => {
    setSummaryText(value)
    update({ preSolutions: parseSolutions(value) })
  }
  const addSolution = () => {
    const nextSolution = clean(draftSolution)
    if (!nextSolution) return
    const nextSolutions = [...parseSolutions(summaryText), nextSolution]
    scrollSummaryAfterAddRef.current = true
    setSummaryText(formatSolutions(nextSolutions))
    update({ preSolutions: nextSolutions })
    setDraftSolution('')
  }
  useLayoutEffect(() => {
    draftRef.current?.focus()
  }, [])
  useLayoutEffect(() => {
    if (!scrollSummaryAfterAddRef.current) return
    scrollSummaryAfterAddRef.current = false
    if (summaryRef.current) summaryRef.current.scrollTop = summaryRef.current.scrollHeight
    draftRef.current?.focus()
  }, [summaryText])
  return <section className="step-section"><div className="eyebrow">第 3 步，共 8 步：卜卦前解方 </div><h2>卜卦前先想想看有哪些解決方案？</h2><p className="helper">請先記下此刻想到的可行解決方案，稍後再與卦象帶來的啟發進行比較。</p>
    <CurrentQuestion question={journal.questionText} />
    <div className="solution-builder">
      <label className="solution-draft-label">請輸入一個可行的解方
        <textarea ref={draftRef} className="solution-draft" value={draftSolution} rows="2" aria-label="請輸入一個可行的解方" onChange={(event) => setDraftSolution(event.target.value)} />
      </label>
      <button className="secondary add-solution-button" onClick={addSolution} disabled={!clean(draftSolution)}>＋ 新增解方</button>
      <h3>已記錄的解方如下(可直接編輯): </h3>
      <textarea ref={summaryRef} className="solution-summary" value={summaryText} rows="9" aria-label="已經想到的解方列表(可以直接編輯)" onChange={(event) => updateFromSummary(event.target.value)} />
      
    </div>
  </section>
}

function DiceStep({ journal, update }) {
  const dice = journal.dice
  const calculation = getCalculation(dice)
  const [isRolling, setIsRolling] = useState(false)
  const [rollingValue, setRollingValue] = useState(null)
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')
  const rollInterval = useRef(null)
  const rollTimeout = useRef(null)
  useEffect(() => () => {
    window.clearInterval(rollInterval.current)
    window.clearTimeout(rollTimeout.current)
  }, [])
  const rollDie = () => {
    if (isRolling || dice.length >= 6) return
    setManualError('')
    setIsRolling(true)
    setRollingValue(Math.floor(Math.random() * 6) + 1)
    rollInterval.current = window.setInterval(() => setRollingValue(Math.floor(Math.random() * 6) + 1), 80)
    rollTimeout.current = window.setTimeout(() => {
      window.clearInterval(rollInterval.current)
      const value = Math.floor(Math.random() * 6) + 1
      setRollingValue(value)
      update({ dice: [...dice, value] })
      setIsRolling(false)
    }, 700)
  }
  const submitManualDie = () => {
    if (isRolling || dice.length >= 6) return
    const value = Number(manualValue)
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      setManualError('請輸入 1 到 6 之間的整數點數。')
      return
    }
    setManualError('')
    setRollingValue(value)
    setManualValue('')
    update({ dice: [...dice, value] })
  }
  const nextLine = LINE_NAMES[dice.length]
  return <section className="step-section dice-step"><div><div className="eyebrow">第 4 步，共 8 步：擲骰起卦 </div><h2>請由下而上擲骰依序建立六爻</h2><p className="helper">依初爻、二爻、三爻、四爻、五爻、上爻的順序，每次按下按鈕擲出一顆骰子。奇數為陽爻，偶數為陰爻。</p>
    <div className="dice-roller"><div className={`die ${isRolling ? 'is-rolling' : ''}`} aria-live="polite" aria-label={isRolling ? '骰子正在滾動' : rollingValue ? `最近擲出 ${rollingValue} 點` : '尚未擲骰'}><DiceFace value={rollingValue || 1} /></div><div><p className="roll-count">第 {Math.min(dice.length + 1, 6)}／6 次 · {nextLine || '六爻已完成'}</p><button className="primary roll-button" onClick={rollDie} disabled={isRolling || dice.length >= 6}>{isRolling ? '骰子滾動中…' : dice.length >= 6 ? '已完成六次擲骰' : `由電腦擲出${nextLine}`}</button><div className="manual-dice-entry"><span id="manual-dice-label">在手動擲骰子🎲後，在此記錄骰子點數：</span><select value={manualValue} aria-label="手動擲骰點數" aria-describedby="manual-dice-label" onChange={(event) => { setManualValue(event.target.value); setManualError('') }} disabled={isRolling || dice.length >= 6}><option value="">1-6</option>{[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}</select><button className="secondary" onClick={submitManualDie} disabled={isRolling || dice.length >= 6}>手動擲骰點數</button></div>{manualError && <p className="manual-dice-error">{manualError}</p>}</div></div>
    <div className="dice-list">{LINE_NAMES.map((name, index) => { const value = dice[index]; return <div className={`dice-entry ${value ? 'recorded' : ''}`} key={name}><span>第 {index + 1} 次：{name}</span><strong>{value ? <DiceFace value={value} compact /> : '等待擲骰'}</strong>{value && <small>{value % 2 ? '奇數 · 陽爻' : '偶數 · 陰爻'}</small>}</div> })}</div>
    {!calculation ? <p className="notice">尚餘 {6 - dice.length} 爻。完成第六爻後才會查詢完整本卦。</p> : <div className="result-chip">六爻已完成，可前往查看本卦與綜卦。</div>}
    {dice.length > 0 && <button className="danger-link" onClick={() => { if (window.confirm('確定清除全部六爻嗎？此操作無法復原。')) update({ dice: [] }) }}>清除全部六爻</button>}</div>
    <aside className="hex-preview"><h3>累積卦象</h3><HexagramLines partialDice={dice} labelled /><p>{dice.length === 6 ? '已完成六爻' : `已記錄 ${dice.length} 爻`}</p></aside>
  </section>
}

function ResultsStep({ journal }) {
  const calculation = getCalculation(journal.dice)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const guideButtonRef = useRef(null)
  const closeGuide = () => {
    setIsGuideOpen(false)
    window.setTimeout(() => guideButtonRef.current?.focus(), 0)
  }
  const guideButton = <><button ref={guideButtonRef} className="secondary guide-button" onClick={() => setIsGuideOpen(true)}>卜卦解卦指南</button>{isGuideOpen && <GuideDialog onClose={closeGuide} />}</>
  if (!calculation) return <section className="step-section"><div className="eyebrow">第 5 步，共 8 步：卦象結果</div><h2>起卦得到的本卦與綜卦／錯卦</h2><CurrentQuestion question={journal.questionText} /><div className="step-guide-action">{guideButton}</div><div className="notice error">請先完成六次擲骰，才能檢視卦象結果。</div></section>
  return <section className="step-section"><div className="eyebrow">第 5 步，共 8 步：卦象結果</div><h2>起卦得到的本卦與綜卦／錯卦</h2><p className="helper">翻閱兩張牌卡，讓金句、SEL 連結與大象辭帶來新的觀看角度。</p><CurrentQuestion question={journal.questionText} /><div className="step-guide-action">{guideButton}</div><div className="card-grid"><Card title="本卦" data={calculation.original} id={calculation.originalId} /><Card title={calculation.pairTitle} data={calculation.comprehensive} id={calculation.comprehensiveId} /></div></section>
}

function GuideDialog({ onClose }) {
  const closeButtonRef = useRef(null)
  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  const sections = [
    {
      title: '一、《易經》不是算命，而是觀念指南針，盲點偵測器',
      points: ['「我原本覺得算命是迷信，但發現易經更像是給建議與方向！」', '「好的卦不一定代表好結果，還是要努力去做。」'],
    },
    {
      title: '二、沒有絕對的命運，只有你怎麼看待與選擇',
      points: ['「卦象的意義不是定論，而是給我參考與提醒。」', '「命運不能決定我，心態與行動才是關鍵。」'],
    },
    {
      title: '三、轉念思維，從「凶卦」中找到正向力量',
      points: ['「壞卦不等於壞事，有可能是提醒我該努力。」', '「塞翁失馬，焉知非福」與「陰陽共生」，理解不確定性的工具。'],
    },
    {
      title: '四、學會發問，也學會觀察自己',
      points: ['「我學到怎麼問問題，也學到怎麼解釋問題。」', '「透過卦象理解我自己的處境，滿有趣的！」', '「將占卜作為反思和對話的工具，不只是單向的尋求解答」。'],
    },
  ]
  return <div className="guide-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="guide-dialog-header"><h2 id="guide-dialog-title">卜卦解卦指南</h2><button ref={closeButtonRef} className="icon-button" aria-label="關閉卜卦解卦指南" onClick={onClose}>×</button></header>
      <div className="guide-dialog-content">
        {sections.map((section) => <section className="guide-section" key={section.title}><h3>{section.title}</h3><ul>{section.points.map((point) => <li key={point}><blockquote>{point}</blockquote></li>)}</ul></section>)}
      </div>
    </section>
  </div>
}

function ReflectionsStep({ journal, update }) {
  const calculation = getCalculation(journal.dice)
  const observationReflection = getObservationReflection(journal)
  return <section className="step-section"><div className="eyebrow">第 6 步，共 8 步：觀象反思</div><h2>受卦象啟發，提出新的解決方案</h2><p className="helper">個人／小組共同根據本卦和綜/錯卦的卦象和金句，對設定問題進行反思。</p><CurrentQuestion question={journal.questionText} />
    <HexagramCarryover calculation={calculation} />
    <article className="reflection-card"><h3>個人／小組根據本卦和綜/錯卦的卦象和金句的啟發，對設定問題提出新的解決方案</h3><textarea rows="10" value={observationReflection} placeholder="請記錄個人／小組根據本卦和綜/錯卦的卦象和金句的觀察與思考後，對設定問題所產生新的解決方案。" aria-label="觀象反思" onChange={(event) => update({ observationReflection: event.target.value })} /></article>
  </section>
}

function IntegrationStep({ journal, update }) {
  const calculation = getCalculation(journal.dice)
  const [isAiReflectionOpen, setIsAiReflectionOpen] = useState(false)
  const aiReflectionButtonRef = useRef(null)
  const closeAiReflection = () => {
    setIsAiReflectionOpen(false)
    window.setTimeout(() => aiReflectionButtonRef.current?.focus(), 0)
  }
  return (
    <section className="step-section">
      <div className="eyebrow">第 7 步，共 8 步：AI 解卦、SEL 反思與行動心得總結</div>
      <CurrentQuestion question={journal.questionText} />
      <div className="ai-reflection-action">
        <p>請點選下方按鈕，讓 AI 根據本卦的核心智慧，分析你的問題，並連結 SEL 五大核心能力，提供反思與行動建議。</p>
        <button ref={aiReflectionButtonRef} className="secondary" type="button" aria-haspopup="dialog" onClick={() => setIsAiReflectionOpen(true)}>開始 AI 解卦與 SEL 反思</button>
      </div>
      <div className="stack-fields">
        <label>請把 AI 的回覆貼在下面，需要的話可以修改。<textarea rows="4" value={journal.sharedInterpretation} placeholder="AI 的回覆" onChange={(event) => update({ sharedInterpretation: event.target.value })} /></label>
        <label>下一步行動和心得總結<textarea rows="5" value={journal.nextActionSummary || ''} placeholder={'我要做什麼？何時開始？如何知道自己做到了？\n\n心得總結：'} onChange={(event) => update({ nextActionSummary: event.target.value })} /></label>
      </div>
      {isAiReflectionOpen && <AiReflectionDialog journal={journal} calculation={calculation} onClose={closeAiReflection} />}
    </section>
  )
}

function AiReflectionDialog({ journal, calculation, onClose }) {
  const closeButtonRef = useRef(null)
  const [copyStatus, setCopyStatus] = useState('')
  const question = clean(journal.questionText) || '尚未填寫本次大哉問'
  const originalName = calculation?.original ? `第 ${calculation.original.seq} 卦 · ${calculation.original.hexagram}` : '尚未完成六次擲骰'
  const pairName = calculation?.comprehensive ? `${calculation.pairTitle} · 第 ${calculation.comprehensive.seq} 卦 · ${calculation.comprehensive.hexagram}` : '尚未完成六次擲骰'
  const prompt = buildAiReflectionPrompt({ question, originalName, pairName })

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyStatus('AI 解讀提示詞已複製到剪貼簿。')
    } catch {
      setCopyStatus('無法自動複製，請選取下方文字後手動複製。')
    }
  }

  return <div className="ai-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="ai-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="ai-dialog-header"><div><p className="eyebrow">Step 7 · 智慧引導</p><h2 id="ai-dialog-title">AI 智慧解卦與 SEL 反思</h2></div><button ref={closeButtonRef} className="icon-button" type="button" aria-label="關閉 AI 智慧解卦與 SEL 反思" onClick={onClose}>×</button></header>
      <div className="ai-dialog-content">
        <section className="ai-context" aria-labelledby="ai-context-title"><h3 id="ai-context-title">本次解讀資訊</h3><dl><div><dt>本次大哉問</dt><dd>{question}</dd></div><div><dt>本卦</dt><dd>{originalName}</dd></div><div><dt>綜卦／錯卦</dt><dd>{pairName}</dd></div></dl></section>
        {(!clean(journal.questionText) || !calculation) && <p className="notice error">請完成本次大哉問與六次擲骰後，再取得包含完整卦象資訊的 AI 解讀提示詞。</p>}
        <section className="ai-prompt-panel" aria-labelledby="ai-prompt-title"><h3 id="ai-prompt-title">AI 解讀提示詞</h3><p>已將本次問題與卦象資料帶入。複製後可貼到您使用的 AI 工具，取得以本卦為主、連結 SEL 五大核心能力的反思與行動建議。</p><div className="ai-prompt-actions ai-prompt-actions-top"><button className="primary" type="button" onClick={copyPrompt}>複製 AI 提示詞</button></div><textarea className="ai-prompt-text" value={prompt} readOnly rows="18" aria-label="AI 解讀提示詞內容" /><div className="ai-prompt-actions"><button className="primary" type="button" onClick={copyPrompt}>複製 AI 提示詞</button><p className="copy-status" role="status" aria-live="polite">{copyStatus}</p></div></section>
      </div>
    </section>
  </div>
}

const valueOrBlank = (value) => clean(value || '') || '尚未填寫'
function JournalPreview({ journal, previewRef }) {
  const result = getCalculation(journal.dice)
  const observationReflection = getObservationReflection(journal)
  const isGroupLearning = journal.mode === 'group'
  const memberNames = journal.members.filter(clean).join('、')
  const hexSection = (title, data, id) => <section className="print-block"><h3>{title}</h3>{data ? <><div className="preview-hex"><HexagramLines id={id} /><div><strong>第 {data.seq} 卦 · {data.hexagram}</strong><TrigramImages id={id} hexagram={data.hexagram} /><p>{data.imagetext}</p></div></div><p>金句：{data.judgement1}；{data.judgement2}</p><p>SEL：{data.sel1}、{data.sel2}</p><p>大象辭：{data.commentary}</p></> : <p>尚未完成六爻</p>}</section>
  return <div className="journal-preview" ref={previewRef}><header><p className="eyebrow">SEL 易想天開</p><h1>學習日誌</h1><p>{formatDate(journal.activityAt)} · {isGroupLearning ? '小組學習' : '個人學習'}</p>{isGroupLearning && <><p>組別名稱：{valueOrBlank(journal.groupName)}</p><p>成員：{memberNames || '尚未填寫'}</p></>}</header>
    <section className="print-block"><h3>問題</h3><p>{valueOrBlank(journal.questionText)}</p><h3>卜卦前的解方</h3><ol>{journal.preSolutions.filter(clean).length ? journal.preSolutions.filter(clean).map((item, index) => <li key={index}>{item}</li>) : <li>尚未填寫</li>}</ol></section>
    {hexSection('本卦', result?.original, result?.originalId)}{hexSection('綜卦', result?.comprehensive, result?.comprehensiveId)}
    <section className="print-block"><h3>觀象反思</h3><p>{valueOrBlank(observationReflection)}</p></section>
    <section className="print-block"><h3>AI解卦</h3><p>AI解卦：{valueOrBlank(journal.sharedInterpretation)}</p></section>
    <section className="print-block"><h3>下一步行動和心得總結</h3><p>{valueOrBlank(journal.nextActionSummary)}</p></section>
    <section className="print-block journal-media-block"><h3>SEL 易想天開與 SEL 五項能力</h3><img src={selSlideImage} alt="易經卦象與 SEL 五項能力的關聯圖" /></section>
    <section className="print-block journal-media-block"><h3>加入 SEL 易想天開官方社群</h3><OfficialAccountLinks /></section>
    <section className="print-block journal-media-block"><h3>SEL 易想天開卡牌</h3><img src={cardSetImage} alt="SEL 易想天開卡牌組，包含卡盒、卡牌與卦象說明卡" /></section>
    <footer>建立時間：{formatDate(journal.createdAt)}　最後更新：{formatDate(journal.updatedAt)}　資料版本：{journal.hexagramDataVersion}</footer>
  </div>
}

function ExportStep({ journal, complete }) {
  const [isFanClubOpen, setIsFanClubOpen] = useState(false)
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const purchaseButtonRef = useRef(null)
  const previewRef = useRef(null)
  const closePurchase = () => {
    setIsPurchaseOpen(false)
    window.setTimeout(() => purchaseButtonRef.current?.focus(), 0)
  }
  const downloadPdf = async () => {
    const preview = previewRef.current
    if (!preview || isPdfGenerating) return
    setIsPdfGenerating(true)
    setPdfError('')
    try {
      await document.fonts?.ready
      await Promise.all(Array.from(preview.querySelectorAll('img')).map(async (image) => {
        if (!image.complete) await new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true })
          image.addEventListener('error', resolve, { once: true })
        })
        await image.decode?.().catch(() => {})
      }))
      const capturePreview = window.html2canvas
      const PdfDocument = window.jspdf?.jsPDF
      if (!capturePreview || !PdfDocument) throw new Error('PDF libraries are unavailable')
      const canvas = await capturePreview(preview, {
        backgroundColor: '#ffffff',
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        windowWidth: preview.scrollWidth,
      })
      const pdf = new PdfDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 10
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2
      const pageHeightPx = Math.floor((pageHeight * canvas.width) / pageWidth)
      for (let offset = 0; offset < canvas.height; offset += pageHeightPx) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - offset)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight
        const context = pageCanvas.getContext('2d')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, pageCanvas.width, sliceHeight)
        if (offset > 0) pdf.addPage()
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageWidth, (sliceHeight * pageWidth) / canvas.width, undefined, 'FAST')
      }
      pdf.save(`SEL易想天開學習日誌-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      setPdfError('PDF 產生失敗，請確認裝置有足夠可用記憶體後再試一次。')
    } finally {
      setIsPdfGenerating(false)
    }
  }
  return <section className="step-section export-step"><div className="eyebrow">第 8 步，共 8 步：收藏與分享</div><h2>預覽完整學習日誌</h2><p className="helper">選擇「列印／另存 PDF」後，可在瀏覽器列印視窗選擇另存為 PDF。未填欄位會標示為「尚未填寫」。</p>
    <div className="export-actions no-print"><button className="primary" onClick={downloadPdf} disabled={isPdfGenerating}>{isPdfGenerating ? '正在產生 PDF…' : '下載 PDF'}</button><button className="secondary" onClick={() => { complete(); window.print() }}>列印／另存 PDF</button><button className="secondary fan-club-button" onClick={() => setIsFanClubOpen(true)}>SEL易想天開官方帳號</button><button ref={purchaseButtonRef} className="secondary purchase-button" onClick={() => setIsPurchaseOpen(true)}>購買SEL易想天開卡牌</button></div>{pdfError && <p className="notice error no-print">{pdfError}</p>}{isFanClubOpen && <FanClubDialog onClose={() => setIsFanClubOpen(false)} />}{isPurchaseOpen && <CardPurchaseDialog onClose={closePurchase} />}<JournalPreview journal={journal} previewRef={previewRef} />
  </section>
}

function CardPurchaseDialog({ onClose }) {
  const closeButtonRef = useRef(null)
  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  return <div className="purchase-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="purchase-dialog-header"><h2 id="purchase-dialog-title">「SEL易想天開」卡牌</h2><button ref={closeButtonRef} className="icon-button" aria-label="關閉購買卡牌資訊" onClick={onClose}>×</button></header>
      <div className="purchase-dialog-content">
        <img src={cardSetImage} alt="SEL易想天開卡牌組，包含卡盒、卡牌與卦象說明卡" />
        <div className="purchase-details"><p className="purchase-price">每套500元，麻煩匯款</p><dl><div><dt>台新銀行西門分行</dt><dd>061 10 0182304 00</dd><dd>蘇秋錦</dd></div></dl><p>匯款之後提供匯款帳號後四碼<br />同時提供手機號碼，地址<br /><a href="mailto:ellischang95@gmail.com">Email 給 ellischang95@gmail.com</a><br />我們會儘快安排出貨</p></div>
      </div>
    </section>
  </div>
}

function FanClubDialog({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  return <div className="fan-club-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="fan-club-dialog" role="dialog" aria-modal="true" aria-labelledby="fan-club-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="fan-club-dialog-header"><h2 id="fan-club-dialog-title">加入 SEL 易想天開官方社群</h2><button className="icon-button" aria-label="關閉官方社群資訊" onClick={onClose}>×</button></div>
      <OfficialAccountLinks />
    </section>
  </div>
}

function SelDialog({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  return <div className="sel-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="sel-dialog" role="dialog" aria-modal="true" aria-labelledby="sel-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sel-dialog-header"><div><p className="eyebrow">SOCIAL-EMOTIONAL LEARNING</p><h2 id="sel-dialog-title">什麼是 SEL？</h2></div><button className="icon-button" aria-label="關閉 SEL 說明" onClick={onClose}>×</button></div>
      <p className="sel-definition">SEL 不只是情緒控制，更是成為能理解自己、理解他人，並作出適切選擇的人。</p>
      <img className="sel-slide-image" src={selSlideImage} alt="易經卦象與 SEL 五項能力的關聯圖" />
      <div className="sel-capabilities">{SEL_CAPABILITIES.map((capability, index) => <article key={capability.name} className={`sel-capability capability-${index + 1}`}><span>{index + 1}</span><h3>{capability.name}</h3><small>{capability.english}</small><p>{capability.description}</p></article>)}</div>
    </section>
  </div>
}

function UserGuideDialog({ onClose }) {
  const closeButtonRef = useRef(null)
  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  return <div className="sel-dialog-backdrop no-print" role="presentation" onMouseDown={onClose}>
    <section className="sel-dialog user-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="user-guide-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="sel-dialog-header"><div><p className="eyebrow">使用指南</p><h2 id="user-guide-dialog-title">SEL 易想天開學習日誌使用指南</h2></div><button ref={closeButtonRef} className="icon-button" type="button" aria-label="關閉使用指南" onClick={onClose}>×</button></header>
      <div className="user-guide-content"><p className="user-guide-intro">{USER_GUIDE_INTRO}</p>{USER_GUIDE_SECTIONS.map((section) => <section className="user-guide-section" key={section.title}><h3>{section.title}</h3><ol>{section.items.map((item) => <li key={item}>{item}</li>)}</ol></section>)}</div>
    </section>
  </div>
}

function App() {
  const [journals, setJournals] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } })
  const [activeId, setActiveId] = useState(null)
  const [step, setStep] = useState(0)
  const [saveState, setSaveState] = useState('已儲存')
  const [isSelDialogOpen, setIsSelDialogOpen] = useState(false)
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false)
  const active = journals.find((item) => item.journalId === activeId)
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(journals)); setSaveState('已儲存') } catch { setSaveState('儲存失敗') } }, [journals])
  const update = (changes) => { setSaveState('儲存中'); setJournals((items) => items.map((item) => item.journalId === activeId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item)) }
  const start = (journal = createJournal()) => { setJournals((items) => items.some((item) => item.journalId === journal.journalId) ? items : [journal, ...items]); setActiveId(journal.journalId); setStep(0) }
  const remove = (id) => { if (window.confirm('確定刪除這份學習日誌嗎？')) setJournals((items) => items.filter((item) => item.journalId !== id)) }
  const duplicate = (journal) => { const copy = { ...journal, journalId: makeId(), status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; start(copy) }
  const canProceed = () => !active || step !== 1 || Boolean(clean(active.questionText))
  const complete = () => update({ status: 'completed' })

  if (!active) return <main className="home-shell"><header className="home-hero"><div><p className="eyebrow">SEL · 易想天開</p> 
  <img className="home-logo" src={logoImage} alt="SEL · 易想天開" />
  <p>透過循序漸進的引導，協助設定問題、提出初步解方，到擲骰起卦、觀察卦象並提出新的解決方案；接著運用 AI 解讀卦象，連結 SEL 反思，形成行動方案，最後完成學習紀錄。</p>
  </div><button className="primary hero-button" onClick={() => start()}>＋ 建立新日誌</button></header>
    <section className="privacy-banner"><strong>本機保存</strong><span>你的反思內容只會保存在這台裝置的瀏覽器中。請在共用裝置上謹慎使用，並定期匯出備份。</span></section>
    <section className="journal-list"><div className="section-heading"><div><p className="eyebrow">YOUR JOURNALS</p><h2>學習報告</h2></div><span>{journals.length} 份紀錄</span></div>{journals.length ? <div className="journal-cards">{journals.map((journal) => <article key={journal.journalId} className="journal-item"><div><span className={`status ${journal.status}`}>{journal.status === 'completed' ? '已完成' : '草稿'}</span><h3>{valueOrBlank(journal.questionText)}</h3><p>{formatDate(journal.activityAt)} · {valueOrBlank(journal.groupName)}</p></div><div className="item-actions"><button className="secondary" onClick={() => { setActiveId(journal.journalId); setStep(0) }}>繼續編輯</button><button className="icon-button" title="另存副本" aria-label="另存副本" onClick={() => duplicate(journal)}>⧉</button><button className="icon-button danger" title="刪除" aria-label="刪除" onClick={() => remove(journal.journalId)}>×</button></div></article>)}</div> : <div className="empty-state"><span>☷</span><h3>還沒有學習日誌</h3><p>建立第一份日誌，跟著八個步驟展開一次新的觀看。</p></div>}</section></main>

  const stepContent = [<BasicStep key="basic" journal={active} update={update} />, <QuestionStep key="question" journal={active} update={update} />, <SolutionsStep key="solutions" journal={active} update={update} />, <DiceStep key="dice" journal={active} update={update} />, <ResultsStep key="results" journal={active} />, <ReflectionsStep key="reflections" journal={active} update={update} />, <IntegrationStep key="integration" journal={active} update={update} />, <ExportStep key="export" journal={active} complete={complete} />][step]
  return <main className="app-shell"><header className="app-header no-print"><button className="brand" onClick={() => setActiveId(null)} aria-label="返回日誌列表"><span>易</span><b>易想天開</b></button><div className="header-actions"><button className="sel-link" onClick={() => setIsUserGuideOpen(true)}>使用指南</button><button className="sel-link" onClick={() => setIsSelDialogOpen(true)}>什麼是 SEL？</button><div className="save-status"><i className={saveState === '已儲存' ? 'saved' : ''} />{saveState}</div><button className="exit-button" onClick={() => setActiveId(null)}>暫存離開</button></div></header>
    <div className="editor-layout"><aside className="step-nav no-print">{STEPS.map((name, index) => <button key={name} className={step === index ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? '✓' : index + 1}</span>{name}</button>)}</aside>
      <div className="editor-main"><div className="mobile-progress no-print"><span>步驟 {step + 1}／8</span><strong>{STEPS[step]}</strong><div><i style={{ width: `${((step + 1) / 8) * 100}%` }} /></div></div>{stepContent}
        <nav className="step-actions no-print"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>← 上一步</button>{step < 7 ? <button className="primary" disabled={!canProceed()} onClick={() => setStep(step + 1)}>下一步 →</button> : <button className="primary" onClick={() => { complete(); window.alert('日誌已標記為完成。') }}>完成日誌</button>}</nav>
      </div></div>
    {isSelDialogOpen && <SelDialog onClose={() => setIsSelDialogOpen(false)} />}{isUserGuideOpen && <UserGuideDialog onClose={() => setIsUserGuideOpen(false)} />}
  </main>
}

export default App
