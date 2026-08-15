import { useEffect, useRef, useState } from 'react'
import hexagrams from './data/hexagrams.json'
import presetQuestions from './data/preset-questions.json'
import './App.css'

const STORAGE_KEY = 'iching-learning-journals-v1'
const LINE_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']
const STEPS = ['基本資料', '設定問題', '卜卦前解方', '擲骰建卦', '卦象結果', '個人反思', '共同整合', '預覽與匯出']
const SEL_OPTIONS = ['自我覺察', '自我管理', '社會覺察', '人際關係技巧', '負責任的決定']
const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
const SEL_CAPABILITIES = [
  { name: '自我覺察', english: 'Self-Awareness', description: '認識自己的情緒、價值、動機、優勢與限制。' },
  { name: '自我管理', english: 'Self-Management', description: '調節情緒、衝動與行動，不讓情緒直接控制自己。' },
  { name: '社會覺察', english: 'Social Awareness', description: '理解他人的觀點、情緒與處境，具備同理心與換位思考。' },
  { name: '人際關係技巧', english: 'Relationship Skills', description: '溝通、合作、協商、處理衝突與建立信任。' },
  { name: '負責任的決策', english: 'Responsible Decision-Making', description: '整合自我、他人與情境，評估後果，作出兼顧長期影響的選擇。' },
]

const clean = (value) => value.trim()
const nowLocal = () => {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-TW', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '尚未填寫'
const makeId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
const emptyReflection = (name = '我') => ({ id: makeId(), name, interpretation: '', feeling: '', need: '', insight: '' })
const createJournal = () => {
  const created = new Date().toISOString()
  return {
    journalId: makeId(), schemaVersion: '1.0', hexagramDataVersion: 'Hexagram.xlsx',
    createdAt: created, updatedAt: created, activityAt: nowLocal(), status: 'draft',
    mode: 'individual', groupName: '', members: [], questionType: 'preset', questionText: '',
    preSolutions: [''], dice: [], reflections: [], sharedInterpretation: '', jointSolution: '',
    nextAction: '', selReflection: '', selTags: [],
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
      <p className="image-text">{data.imagetext}</p>
    </div>}
    <button className="secondary full-width" onClick={() => setBack(!back)}>{back ? '返回牌面' : '查看牌背'}</button>
  </article>
}

function BasicStep({ journal, update }) {
  const members = journal.members
  const updateMember = (index, value) => update({ members: members.map((member, i) => i === index ? value : member) })
  return <section className="step-section">
    <div className="eyebrow">Step 1 · 由這次活動開始</div><h2>建立學習日誌</h2>
    <p className="helper">資料僅儲存在此瀏覽器。共用裝置使用後，請記得匯出或清除資料。</p>
    <fieldset className="choice-group"><legend>活動模式</legend>
      <label><input type="radio" checked={journal.mode === 'individual'} onChange={() => update({ mode: 'individual', members: [] })} /> 個人學習</label>
      <label><input type="radio" checked={journal.mode === 'group'} onChange={() => update({ mode: 'group' })} /> 小組學習</label>
    </fieldset>
    <div className="form-grid">
      <label>活動日期與時間<input type="datetime-local" value={journal.activityAt} onChange={(event) => update({ activityAt: event.target.value })} /></label>
      {journal.mode === 'group' && <label>組別名稱<input value={journal.groupName} placeholder="例如：第三組" onChange={(event) => update({ groupName: event.target.value })} /></label>}
    </div>
    {journal.mode === 'group' && <div className="member-editor"><div><h3>成員</h3><p className="helper">可選填，稍後會為每位成員建立反思欄位。</p></div>
      {members.map((member, index) => <div className="inline-field" key={index}><input value={member} placeholder={`成員 ${index + 1}`} onChange={(event) => updateMember(index, event.target.value)} /><button className="icon-button" aria-label={`移除成員 ${index + 1}`} onClick={() => update({ members: members.filter((_, i) => i !== index) })}>×</button></div>)}
      <button className="secondary" onClick={() => update({ members: [...members, ''] })}>＋ 新增成員</button>
    </div>}
  </section>
}

function QuestionStep({ journal, update }) {
  return <section className="step-section"><div className="eyebrow">Step 2 · 定下焦點</div><h2>今天想一起探索什麼？</h2>
    <fieldset className="choice-group"><legend>問題來源</legend>
      <label><input type="radio" checked={journal.questionType === 'preset'} onChange={() => update({ questionType: 'preset', questionText: '' })} /> 選擇大哉問</label>
      <label><input type="radio" checked={journal.questionType === 'custom'} onChange={() => update({ questionType: 'custom', questionText: '' })} /> 自訂問題</label>
    </fieldset>
    {journal.questionType === 'preset' ? <label>大哉問<select value={journal.questionText} onChange={(event) => update({ questionText: event.target.value })}><option value="">請選擇一題</option>{presetQuestions.map((question) => <option key={question}>{question}</option>)}</select></label> : <label>自訂問題<textarea value={journal.questionText} rows="5" placeholder="寫下你們要探索的問題..." onChange={(event) => update({ questionText: event.target.value })} /></label>}
    {!clean(journal.questionText) && <p className="field-hint">請先設定一項非空白問題，才能進入下一步。</p>}
  </section>
}

function CurrentQuestion({ question }) {
  if (!clean(question)) return null
  return <aside className="current-question"><span>本次大哉問</span><p>{question}</p></aside>
}

function HexagramCarryover({ calculation }) {
  if (!calculation?.original || !calculation?.comprehensive) return null
  const items = [
    ['本卦', calculation.original],
    [calculation.pairTitle, calculation.comprehensive],
  ]
  return <div className="hexagram-carryover" aria-label="本卦與配對卦摘要">
    {items.map(([title, data]) => <article key={title}>
      <span>{title}</span>
      <strong>第 {data.seq} 卦 · {data.hexagram}</strong>
      <p>「{data.judgement1}」<br />「{data.judgement2}」</p>
    </article>)}
  </div>
}

function SolutionsStep({ journal, update }) {
  const solutions = journal.preSolutions
  return <section className="step-section"><div className="eyebrow">Step 3 · 先想想看</div><h2>卜卦前，我們已經想到哪些解方？</h2><p className="helper">記下此刻的想法，稍後再和卦象帶來的啟發比較。</p>
    <CurrentQuestion question={journal.questionText} />
    <div className="solution-list">{solutions.map((solution, index) => <div className="solution-row" key={index}><span>{index + 1}</span><textarea value={solution} rows="2" placeholder="一個可行的解方..." onChange={(event) => update({ preSolutions: solutions.map((item, i) => i === index ? event.target.value : item) })} /><div className="reorder">
      <button className="icon-button" disabled={index === 0} aria-label="上移" onClick={() => { const next = [...solutions]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update({ preSolutions: next }) }}>↑</button>
      <button className="icon-button" disabled={index === solutions.length - 1} aria-label="下移" onClick={() => { const next = [...solutions]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update({ preSolutions: next }) }}>↓</button>
      <button className="icon-button" aria-label="刪除解方" onClick={() => update({ preSolutions: solutions.filter((_, i) => i !== index) })}>×</button></div></div>)}</div>
    <button className="secondary" onClick={() => update({ preSolutions: [...solutions, ''] })}>＋ 新增解方</button>
  </section>
}

function DiceStep({ journal, update }) {
  const dice = journal.dice
  const calculation = getCalculation(dice)
  const [isRolling, setIsRolling] = useState(false)
  const [rollingValue, setRollingValue] = useState(null)
  const rollInterval = useRef(null)
  const rollTimeout = useRef(null)
  useEffect(() => () => {
    window.clearInterval(rollInterval.current)
    window.clearTimeout(rollTimeout.current)
  }, [])
  const rollDie = () => {
    if (isRolling || dice.length >= 6) return
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
  const nextLine = LINE_NAMES[dice.length]
  return <section className="step-section dice-step"><div><div className="eyebrow">Step 4 · 由下往上</div><h2>擲出六爻</h2><p className="helper">依初爻、二爻、三爻、四爻、五爻、上爻的順序，每次按下按鈕擲出一顆骰子。奇數為陽爻，偶數為陰爻。</p>
    <div className="dice-roller"><div className={`die ${isRolling ? 'is-rolling' : ''}`} aria-live="polite" aria-label={isRolling ? '骰子正在滾動' : rollingValue ? `最近擲出 ${rollingValue} 點` : '尚未擲骰'}><DiceFace value={rollingValue || 1} /></div><div><p className="roll-count">第 {Math.min(dice.length + 1, 6)}／6 次 · {nextLine || '六爻已完成'}</p><button className="primary roll-button" onClick={rollDie} disabled={isRolling || dice.length >= 6}>{isRolling ? '骰子滾動中…' : dice.length >= 6 ? '已完成六次擲骰' : `擲出${nextLine}`}</button></div></div>
    <div className="dice-list">{LINE_NAMES.map((name, index) => { const value = dice[index]; return <div className={`dice-entry ${value ? 'recorded' : ''}`} key={name}><span>第 {index + 1} 次：{name}</span><strong>{value ? <DiceFace value={value} compact /> : '等待擲骰'}</strong>{value && <small>{value % 2 ? '奇數 · 陽爻' : '偶數 · 陰爻'}</small>}</div> })}</div>
    {!calculation ? <p className="notice">尚餘 {6 - dice.length} 爻。完成第六爻後才會查詢完整本卦。</p> : <div className="result-chip">六爻已完成，可前往查看本卦與綜卦。</div>}
    {dice.length > 0 && <button className="danger-link" onClick={() => { if (window.confirm('確定清除全部六爻嗎？此操作無法復原。')) update({ dice: [] }) }}>清除全部六爻</button>}</div>
    <aside className="hex-preview"><h3>累積卦象</h3><HexagramLines partialDice={dice} labelled /><p>{dice.length === 6 ? '已完成六爻' : `已記錄 ${dice.length} 爻`}</p></aside>
  </section>
}

function ResultsStep({ journal }) {
  const calculation = getCalculation(journal.dice)
  if (!calculation) return <section className="step-section"><div className="eyebrow">Step 5 · 換個視角</div><h2>本卦與綜卦</h2><CurrentQuestion question={journal.questionText} /><div className="notice error">請先完成六次擲骰，才能檢視卦象結果。</div></section>
  return <section className="step-section"><div className="eyebrow">Step 5 · 換個視角</div><h2>本卦與綜卦</h2><p className="helper">翻閱兩張牌卡，讓金句、SEL 連結與大象辭帶來新的觀看角度。</p><CurrentQuestion question={journal.questionText} /><div className="card-grid"><Card title="本卦" data={calculation.original} id={calculation.originalId} /><Card title={calculation.pairTitle} data={calculation.comprehensive} id={calculation.comprehensiveId} /></div></section>
}

function ReflectionsStep({ journal, update }) {
  const calculation = getCalculation(journal.dice)
  const names = journal.mode === 'group' ? journal.members.map(clean).filter(Boolean) : ['我']
  const reflections = names.map((name, index) => journal.reflections.find((item) => item.name === name) || emptyReflection(name || `成員 ${index + 1}`))
  const save = (next) => update({ reflections: next })
  const updateField = (index, field, value) => save(reflections.map((item, i) => i === index ? { ...item, [field]: value } : item))
  return <section className="step-section"><div className="eyebrow">Step 6 · 留下自己的聲音</div><h2>我的解釋、感受與啟發</h2><p className="helper">{names.length ? '分別記錄每個人的想法，再進行共同整合。' : '尚未加入成員，請以一份團體反思先記錄。'}</p><CurrentQuestion question={journal.questionText} />
    <HexagramCarryover calculation={calculation} />
    {(names.length ? reflections : [journal.reflections[0] || emptyReflection('團體')]).map((reflection, index) => <article className="reflection-card" key={reflection.id}><h3>{reflection.name}</h3><div className="form-grid">{[['interpretation', '我的解釋'], ['feeling', '我的感受'], ['need', '我的需要'], ['insight', '得到的啟發']].map(([field, label]) => <label key={field}>{label}<textarea rows="3" value={reflection[field]} onChange={(event) => updateField(index, field, event.target.value)} /></label>)}</div></article>)}
  </section>
}

function IntegrationStep({ journal, update }) {
  const toggleTag = (tag) => update({ selTags: journal.selTags.includes(tag) ? journal.selTags.filter((item) => item !== tag) : [...journal.selTags, tag] })
  return <section className="step-section"><div className="eyebrow">Step 7 · 形成下一步</div><h2>共同整合</h2><CurrentQuestion question={journal.questionText} /><div className="stack-fields">
    <label>共同詮釋<textarea rows="4" value={journal.sharedInterpretation} placeholder="本卦與綜卦如何幫助我們理解這個問題？" onChange={(event) => update({ sharedInterpretation: event.target.value })} /></label>
    <label>共同解方<textarea rows="4" value={journal.jointSolution} placeholder="根據新的理解，我們決定怎麼做？" onChange={(event) => update({ jointSolution: event.target.value })} /></label>
    <label>下一步<textarea rows="3" value={journal.nextAction} placeholder="具體行動、負責人或期限..." onChange={(event) => update({ nextAction: event.target.value })} /></label>
    <fieldset className="tag-selector"><legend>連結 SEL 五大核心能力</legend>{SEL_OPTIONS.map((tag) => <label key={tag}><input type="checkbox" checked={journal.selTags.includes(tag)} onChange={() => toggleTag(tag)} /> {tag}</label>)}</fieldset>
    <label>SEL 反思<textarea rows="3" value={journal.selReflection} placeholder="這些能力如何支持我們的下一步？" onChange={(event) => update({ selReflection: event.target.value })} /></label>
  </div></section>
}

const valueOrBlank = (value) => clean(value || '') || '尚未填寫'
function JournalPreview({ journal }) {
  const result = getCalculation(journal.dice)
  const hexSection = (title, data, id) => <section className="print-block"><h3>{title}</h3>{data ? <><div className="preview-hex"><HexagramLines id={id} /><div><strong>第 {data.seq} 卦 · {data.hexagram}</strong><p>{data.imagetext}</p></div></div><p>金句：{data.judgement1}；{data.judgement2}</p><p>SEL：{data.sel1}、{data.sel2}</p><p>大象辭：{data.commentary}</p></> : <p>尚未完成六爻</p>}</section>
  return <div className="journal-preview"><header><p className="eyebrow">SEL 易想天開</p><h1>學習日誌</h1><p>{formatDate(journal.activityAt)} · {valueOrBlank(journal.groupName)}</p></header>
    <section className="print-block"><h3>問題</h3><p>{valueOrBlank(journal.questionText)}</p><h3>卜卦前的解方</h3><ol>{journal.preSolutions.filter(clean).length ? journal.preSolutions.filter(clean).map((item, index) => <li key={index}>{item}</li>) : <li>尚未填寫</li>}</ol></section>
    <section className="print-block"><h3>擲骰與六爻</h3><table><thead><tr><th>爻位</th><th>點數</th><th>奇偶</th><th>陰陽</th></tr></thead><tbody>{LINE_NAMES.map((name, index) => { const die = journal.dice[index]; return <tr key={name}><td>第 {index + 1} 次：{name}</td><td>{die || '尚未填寫'}</td><td>{die ? die % 2 ? '奇數' : '偶數' : '—'}</td><td>{die ? die % 2 ? '陽爻' : '陰爻' : '—'}</td></tr> })}</tbody></table>{result && <p>已完成六爻。</p>}</section>
    {hexSection('本卦', result?.original, result?.originalId)}{hexSection('綜卦', result?.comprehensive, result?.comprehensiveId)}
    <section className="print-block"><h3>個人／成員反思</h3>{journal.reflections.length ? journal.reflections.map((item) => <div className="reflection-preview" key={item.id}><strong>{item.name}</strong><p>解釋：{valueOrBlank(item.interpretation)}</p><p>感受：{valueOrBlank(item.feeling)}</p><p>需要：{valueOrBlank(item.need)}</p><p>啟發：{valueOrBlank(item.insight)}</p></div>) : <p>尚未填寫</p>}</section>
    <section className="print-block"><h3>共同整合</h3><p>共同詮釋：{valueOrBlank(journal.sharedInterpretation)}</p><p>共同解方：{valueOrBlank(journal.jointSolution)}</p><p>下一步：{valueOrBlank(journal.nextAction)}</p><p>SEL 連結：{journal.selTags.length ? journal.selTags.join('、') : '尚未填寫'}</p><p>SEL 反思：{valueOrBlank(journal.selReflection)}</p></section>
    <footer>建立時間：{formatDate(journal.createdAt)}　最後更新：{formatDate(journal.updatedAt)}　資料版本：{journal.hexagramDataVersion}</footer>
  </div>
}

function ExportStep({ journal, complete }) {
  const copyText = async () => {
    const result = getCalculation(journal.dice)
    const hexagramText = (title, data) => data
      ? `${title}：\n第 ${data.seq} 卦・${data.hexagram}\n卦象：${data.imagetext}\n金句：${data.judgement1}；${data.judgement2}\nSEL：${data.sel1}、${data.sel2}\n大象辭：${data.commentary}`
      : `${title}：\n尚未完成六爻`
    const diceText = LINE_NAMES.map((name, index) => {
      const die = journal.dice[index]
      return `${index + 1}. ${name}：${die || '尚未填寫'}${die ? ` 點（${die % 2 ? '奇數・陽爻・1' : '偶數・陰爻・0'}）` : ''}`
    }).join('\n')
    const reflectionsText = journal.reflections.length
      ? journal.reflections.map((item) => `${item.name}\n解釋：${valueOrBlank(item.interpretation)}\n感受：${valueOrBlank(item.feeling)}\n需要：${valueOrBlank(item.need)}\n啟發：${valueOrBlank(item.insight)}`).join('\n\n')
      : '尚未填寫'
    const text = `SEL 易想天開｜學習日誌\n活動時間：${formatDate(journal.activityAt)}\n模式：${journal.mode === 'group' ? '小組學習' : '個人學習'}\n組別：${valueOrBlank(journal.groupName)}\n成員：${journal.members.filter(clean).join('、') || '尚未填寫'}\n\n問題：\n${valueOrBlank(journal.questionText)}\n\n卜卦前解方：\n${journal.preSolutions.filter(clean).map((item, index) => `${index + 1}. ${item}`).join('\n') || '尚未填寫'}\n\n擲骰與六爻：\n${diceText}\n\n${hexagramText('本卦', result?.original)}\n\n${hexagramText('綜卦', result?.comprehensive)}\n\n個人／成員反思：\n${reflectionsText}\n\n共同整合：\n共同詮釋：${valueOrBlank(journal.sharedInterpretation)}\n共同解方：${valueOrBlank(journal.jointSolution)}\n下一步：${valueOrBlank(journal.nextAction)}\nSEL 連結：${journal.selTags.length ? journal.selTags.join('、') : '尚未填寫'}\nSEL 反思：${valueOrBlank(journal.selReflection)}\n\n建立時間：${formatDate(journal.createdAt)}\n最後更新：${formatDate(journal.updatedAt)}\n資料版本：${journal.hexagramDataVersion}`
    await navigator.clipboard.writeText(text)
    window.alert('已複製學習日誌摘要。')
  }
  return <section className="step-section export-step"><div className="eyebrow">Step 8 · 收藏與分享</div><h2>預覽完整學習日誌</h2><p className="helper">選擇「列印／另存 PDF」後，可在瀏覽器列印視窗選擇另存為 PDF。未填欄位會標示為「尚未填寫」。</p>
    <div className="export-actions no-print"><button className="primary" onClick={() => { complete(); window.print() }}>列印／另存 PDF</button><button className="secondary" onClick={copyText}>複製文字摘要</button></div><JournalPreview journal={journal} />
  </section>
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
      <div className="sel-capabilities">{SEL_CAPABILITIES.map((capability, index) => <article key={capability.name} className={`sel-capability capability-${index + 1}`}><span>{index + 1}</span><h3>{capability.name}</h3><small>{capability.english}</small><p>{capability.description}</p></article>)}</div>
    </section>
  </div>
}

function App() {
  const [journals, setJournals] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } })
  const [activeId, setActiveId] = useState(null)
  const [step, setStep] = useState(0)
  const [saveState, setSaveState] = useState('已儲存')
  const [isSelDialogOpen, setIsSelDialogOpen] = useState(false)
  const active = journals.find((item) => item.journalId === activeId)
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(journals)); setSaveState('已儲存') } catch { setSaveState('儲存失敗') } }, [journals])
  const update = (changes) => { setSaveState('儲存中'); setJournals((items) => items.map((item) => item.journalId === activeId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item)) }
  const start = (journal = createJournal()) => { setJournals((items) => items.some((item) => item.journalId === journal.journalId) ? items : [journal, ...items]); setActiveId(journal.journalId); setStep(0) }
  const remove = (id) => { if (window.confirm('確定刪除這份學習日誌嗎？')) setJournals((items) => items.filter((item) => item.journalId !== id)) }
  const duplicate = (journal) => { const copy = { ...journal, journalId: makeId(), status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; start(copy) }
  const canProceed = () => !active || step !== 1 || Boolean(clean(active.questionText))
  const complete = () => update({ status: 'completed' })

  if (!active) return <main className="home-shell"><header className="home-hero"><div><p className="eyebrow">SEL · I CHING LEARNING JOURNAL</p><h1>易想天開</h1><p>把一場牌卡活動，留下成為能再次閱讀的共同學習。</p></div><button className="primary hero-button" onClick={() => start()}>＋ 建立新日誌</button></header>
    <section className="privacy-banner"><strong>本機保存</strong><span>你的反思內容只會保存在這台裝置的瀏覽器中。請在共用裝置上謹慎使用，並定期匯出備份。</span></section>
    <section className="journal-list"><div className="section-heading"><div><p className="eyebrow">YOUR JOURNALS</p><h2>學習日誌</h2></div><span>{journals.length} 份紀錄</span></div>{journals.length ? <div className="journal-cards">{journals.map((journal) => <article key={journal.journalId} className="journal-item"><div><span className={`status ${journal.status}`}>{journal.status === 'completed' ? '已完成' : '草稿'}</span><h3>{valueOrBlank(journal.questionText)}</h3><p>{formatDate(journal.activityAt)} · {valueOrBlank(journal.groupName)}</p></div><div className="item-actions"><button className="secondary" onClick={() => { setActiveId(journal.journalId); setStep(0) }}>繼續編輯</button><button className="icon-button" title="另存副本" aria-label="另存副本" onClick={() => duplicate(journal)}>⧉</button><button className="icon-button danger" title="刪除" aria-label="刪除" onClick={() => remove(journal.journalId)}>×</button></div></article>)}</div> : <div className="empty-state"><span>☷</span><h3>還沒有學習日誌</h3><p>建立第一份日誌，跟著八個步驟展開一次新的觀看。</p></div>}</section></main>

  const stepContent = [<BasicStep key="basic" journal={active} update={update} />, <QuestionStep key="question" journal={active} update={update} />, <SolutionsStep key="solutions" journal={active} update={update} />, <DiceStep key="dice" journal={active} update={update} />, <ResultsStep key="results" journal={active} />, <ReflectionsStep key="reflections" journal={active} update={update} />, <IntegrationStep key="integration" journal={active} update={update} />, <ExportStep key="export" journal={active} complete={complete} />][step]
  return <main className="app-shell"><header className="app-header no-print"><button className="brand" onClick={() => setActiveId(null)} aria-label="返回日誌列表"><span>易</span><b>易想天開</b></button><div className="header-actions"><button className="sel-link" onClick={() => setIsSelDialogOpen(true)}>什麼是 SEL？</button><div className="save-status"><i className={saveState === '已儲存' ? 'saved' : ''} />{saveState}</div><button className="exit-button" onClick={() => setActiveId(null)}>暫存離開</button></div></header>
    <div className="editor-layout"><aside className="step-nav no-print">{STEPS.map((name, index) => <button key={name} className={step === index ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? '✓' : index + 1}</span>{name}</button>)}</aside>
      <div className="editor-main"><div className="mobile-progress no-print"><span>步驟 {step + 1}／8</span><strong>{STEPS[step]}</strong><div><i style={{ width: `${((step + 1) / 8) * 100}%` }} /></div></div>{stepContent}
        <nav className="step-actions no-print"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>← 上一步</button>{step < 7 ? <button className="primary" disabled={!canProceed()} onClick={() => setStep(step + 1)}>下一步 →</button> : <button className="primary" onClick={() => { complete(); window.alert('日誌已標記為完成。') }}>完成日誌</button>}</nav>
      </div></div>
    {isSelDialogOpen && <SelDialog onClose={() => setIsSelDialogOpen(false)} />}
  </main>
}

export default App
