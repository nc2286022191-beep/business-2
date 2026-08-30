import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const defaults = { bossRatio: '47', workerRatio: '45' }
const roleName = { owner: '超级管理员', supervisor: '主管', staff: '员工' }
const today = () => new Date().toISOString().slice(0, 10)
const blankLedgerRow = () => ({ source_order_id: '', order_no: '', hafu_m: '', insurance_stamina: '', boss_final: '', worker_final: '', note: '' })

function extract(message, label) {
  return message.match(new RegExp(`(?:${label})[^：:\\n]*[：:]\\s*([^\\n]+)`, 'i'))?.[1]?.trim() || ''
}
function number(value) { return Number(String(value || '').match(/\d+(?:\.\d+)?/)?.[0] || 0) }
async function responseJson(response) {
  const text = await response.text()
  try { return JSON.parse(text) } catch { return { error: '云端服务暂时异常，请稍后重试。' } }
}
function parseMessage(message) {
  return {
    region: extract(message, '大区').replace(/qq/i, 'Q'), warehouse_m: number(extract(message, '仓库资产')),
    hafu_m: number(extract(message, '哈夫数量')), insurance: number(extract(message, '保险')),
    stamina: extract(message, '体力和负重等级'), nine_card: extract(message, '九格体验卡'),
    login: extract(message, '登陆方式|登录方式'), red_skin: extract(message, '干员红皮'), gold_skin: extract(message, '干员金皮'),
    knife_skin: extract(message, '刀皮'), brick_skin: extract(message, '砖皮'), armor: number(extract(message, '红甲多少件')),
    redhead: number(extract(message, '红头')), redbag: number(extract(message, '45红包')), aw: number(extract(message, 'AW子弹')),
    face: extract(message, '过人脸'), ban: extract(message, '账号是否有封禁'), online: extract(message, '在线时间'),
    rank: extract(message, '段位'), kd: extract(message, '绝密kd'), rename: extract(message, '能否改名'), source: extract(message, '从哪个主播看见我们的'),
  }
}
function localCalculation(p) {
  const h = Number(p.hafu_m || 0), boss = Number(p.boss_ratio || 0), worker = Number(p.worker_ratio || 0)
  if (!(h > 0 && boss > 0 && worker > 0)) return null
  const aw = Number(p.aw || 0) * .7, redhead = Number(p.redhead || 0), armor = Number(p.armor || 0), redbag = Number(p.redbag || 0)
  const bossItems = redhead + armor * 2 + redbag * 2, workerItems = redhead * 2 + armor * 2 + redbag * 3
  const bossFinal = Math.floor((h / boss * 100 + aw + bossItems) * .94)
  const workerFinal = Math.ceil((h / worker * 100 + aw + workerItems) * 1.04)
  return { boss: { final: String(bossFinal) }, worker: { final: String(workerFinal) }, difference: String(workerFinal - bossFinal), aw, bossItems }
}

function App() {
  const [user, setUser] = useState(null)
  const [auth, setAuth] = useState({ username: '', password: '', question: '', answer: '', newPassword: '' })
  const [authMode, setAuthMode] = useState('login'), [authMsg, setAuthMsg] = useState(''), [securityQuestion, setSecurityQuestion] = useState('')
  const [message, setMessage] = useState(''), [fields, setFields] = useState({})
  const [bossRatio, setBossRatio] = useState(defaults.bossRatio), [workerRatio, setWorkerRatio] = useState(defaults.workerRatio), [result, setResult] = useState(null)
  const [appMsg, setAppMsg] = useState(''), [saving, setSaving] = useState(false), [orderNo, setOrderNo] = useState(''), [team, setTeam] = useState([])
  const [listings, setListings] = useState([]), [listingsLoading, setListingsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [ledgerOpen, setLedgerOpen] = useState(false), [ledgerDate, setLedgerDate] = useState(today()), [ledgerRows, setLedgerRows] = useState([blankLedgerRow()])
  const [ledgerSummary, setLedgerSummary] = useState(null), [ledgerSaving, setLedgerSaving] = useState(false)
  const [aiMessage, setAiMessage] = useState(''), [aiReply, setAiReply] = useState(''), [aiLoading, setAiLoading] = useState(false)

  const quotePayload = () => ({ ...fields, boss_ratio: bossRatio, worker_ratio: workerRatio })
  const organize = () => { setFields(parseMessage(message)); setResult(null); setAppMsg('资料已识别，请核对哈夫和比例后点击“计算报价”。') }
  const runCalculation = () => { const next = localCalculation(quotePayload()); setResult(next); setAppMsg(next ? '已按当前资料和比例计算。未上架前不会写入云端账单。' : '请填写哈夫数量、号主比例和打手比例。') }
  const customerText = result ? `【报价计算明细】\n号主（比例 ${bossRatio}）：\n${fields.hafu_m} ÷ ${bossRatio} × 100 = ${(Number(fields.hafu_m) / Number(bossRatio) * 100).toFixed(2)} 纯币\nAW：${fields.aw || 0} × 0.7 = ${result.aw.toFixed(2)}\n红头红甲红包：${result.bossItems.toFixed(2)}\n号主到手：${result.boss.final} 元\n\n如同意上架，请明确回复“可以上架”。` : '请先粘贴资料并填写比例。'
  const copy = async () => { try { await navigator.clipboard.writeText(customerText); setAppMsg('客户回复已复制。') } catch { setAppMsg('复制失败，请手动复制。') } }
  const generateAiReply = async () => {
    if (!aiMessage.trim()) return setAppMsg('请先输入客户原话。')
    setAiLoading(true); setAiReply('')
    const r = await fetch('/api/ai/reply', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ message:aiMessage, quote:result ? quotePayload() : undefined, mode:'basic' }) })
    const x = await responseJson(r); setAiLoading(false)
    if (r.ok) { setAiReply(x.reply); setAppMsg(x.quote_attached ? '已生成 AI 客户回复草稿，已附加当前老板报价。' : '已生成 AI 客服回复草稿。') } else setAppMsg(x.error || 'AI 回复生成失败。')
  }
  const copyAiReply = async () => { try { await navigator.clipboard.writeText(aiReply); setAppMsg('AI 客服草稿已复制，请核对后再发送给客户。') } catch { setAppMsg('复制失败，请手动复制。') } }
  const handoffToHuman = () => { setAiReply('您好，已为您转人工客服处理。请稍等，我们会尽快回复您。'); setAppMsg('已生成转人工回复。') }

  useEffect(() => { fetch('/api/me').then(r => r.ok ? r.json() : null).then(x => setUser(x?.user || null)).catch(() => {}) }, [])
  const submitAuth = async () => {
    const route = authMode === 'login' ? '/api/login' : authMode === 'reset' ? '/api/password-reset' : '/api/register'
    const body = authMode === 'reset' ? { username: auth.username, answer: auth.answer, newPassword: auth.newPassword } : auth
    try {
      const r = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x = await responseJson(r)
      if (r.ok) { if (x.user) { setUser(x.user); setAppMsg('登录成功。') }; setAuthMsg(authMode === 'reset' ? '密码已重置，请用新密码登录。' : '登录成功。') } else setAuthMsg(x.error || '操作失败')
    } catch { setAuthMsg('网络连接异常，请稍后重试。') }
  }
  const lookupSecurityQuestion = async () => { const r = await fetch(`/api/security-question?username=${encodeURIComponent(auth.username)}`); const x = await responseJson(r); setSecurityQuestion(r.ok ? x.question : (x.error || '未找到密保问题')) }
  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); setUser(null); setTeam([]); setListings([]); setAuthMode('login'); setAppMsg('已退出登录。') }
  const loadTeam = async () => { const r = await fetch('/api/team'); const x = await responseJson(r); setTeam(x.members || []); if (!r.ok) setAppMsg(x.error || '无法读取团队信息') }
  const removeMember = async id => { if (!confirm('确定删除这个员工账号吗？此操作不会删除其已经上架的账单。')) return; const r = await fetch(`/api/team/${id}`, { method: 'DELETE' }); const x = await responseJson(r); if (r.ok) { setAppMsg('员工账号已删除。'); loadTeam() } else setAppMsg(x.error || '删除失败') }

  const loadListings = async () => { if (!user) return; setListingsLoading(true); const r = await fetch('/api/listings'); const x = await responseJson(r); setListingsLoading(false); if (r.ok) setListings(x.listings || []); else setAppMsg(x.error || '无法读取上架库。') }
  useEffect(() => { if (user) loadListings() }, [user])
  const sellListing = async item => { if (!confirm(`确认 ${item.order_no} 已售出吗？该操作会自动转入今日利润账单，并从上架表移除。`)) return; const r = await fetch(`/api/orders/${item.source_order_id}/sell`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); const x = await responseJson(r); if (r.ok) { setAppMsg(`${item.order_no} 已售出，已自动转入今日利润账单。`); loadListings(); if (ledgerOpen) loadLedger(ledgerDate) } else setAppMsg(x.error || '售出处理失败。') }
  const deleteListing = async item => { if (!confirm(`确认删除上架单 ${item.order_no} 吗？删除后不会出现在上架库或 WPS 表中。`)) return; const r = await fetch(`/api/orders/${item.source_order_id}`, { method: 'DELETE' }); const x = await responseJson(r); if (r.ok) { setAppMsg(`${item.order_no} 已删除。`); loadListings() } else setAppMsg(x.error || '删除上架单失败。') }

  const listToWps = () => window.open('/api/wps.csv', '_blank')
  const updateLedgerRow = (index, key, value) => setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, [key]: value, ...(key === 'order_no' ? { source_order_id: '' } : {}) } : row))
  const ledgerTotals = ledgerRows.reduce((sum, row) => { const boss = Number(row.boss_final || 0), worker = Number(row.worker_final || 0); const present = row.order_no || row.hafu_m || boss || worker || row.note; return { orders: sum.orders + (present ? 1 : 0), hafu: sum.hafu + Number(row.hafu_m || 0), profit: sum.profit + worker - boss } }, { orders: 0, hafu: 0, profit: 0 })
  const loadLedger = async (date = ledgerDate) => { const r = await fetch(`/api/ledger?date=${encodeURIComponent(date)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '无法读取每日账单。'); setLedgerRows(x.entries.length ? x.entries.map(({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note }) => ({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note })) : [blankLedgerRow()]); setLedgerSummary(x.summary) }
  const openLedger = () => { setLedgerOpen(true); setTimeout(() => loadLedger(), 0) }
  const switchSection = section => {
    setActiveSection(section)
    if (section === 'inventory') loadListings()
    if (section === 'ledger') openLedger()
    if (section === 'overview' && user?.role === 'owner') loadTeam()
  }
  const lookupLedgerNumber = async index => { const orderNo = String(ledgerRows[index]?.order_no || '').trim(); if (!orderNo) return; const r = await fetch(`/api/ledger-lookup?order_no=${encodeURIComponent(orderNo)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '未找到该上架单。'); setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, ...x.entry } : row)); setAppMsg(`${x.entry.order_no} 已从上架表读取；保存后会移入利润账单。`) }
  const saveLedger = async () => { setLedgerSaving(true); const r = await fetch('/api/ledger', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: ledgerDate, historical_profit: ledgerSummary?.historical_profit || 0, entries: ledgerRows }) }); const x = await responseJson(r); setLedgerSaving(false); if (r.ok) { setLedgerSummary(x.summary); setLedgerRows(x.entries.length ? x.entries : [blankLedgerRow()]); setAppMsg('每日账单已保存。') } else setAppMsg(x.error || '保存每日账单失败。') }
  const saveListing = async () => { if (!user) return setAppMsg('请先登录，再执行上架。'); if (!result) return setAppMsg('请先完成计算，再执行上架。'); setSaving(true); const r = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...quotePayload(), order_no: orderNo, stage: '已上架' }) }); const x = await responseJson(r); setSaving(false); if (r.ok) { setAppMsg(`上架成功：${x.orderNo || orderNo || '待定'}。`); loadListings() } else setAppMsg(x.error || '上架失败') }

  return <main>
    <header><h1>商行报价工作台</h1><p>{user ? '选择一个工作区开始处理。上架、售出和账单会自动保留在云端。' : '登录后可使用报价、上架库和每日账单。'}</p></header>
    {user && <nav className="workspace-nav" aria-label="工作分区">
      <button className={activeSection === 'overview' ? 'active' : ''} onClick={() => switchSection('overview')}>工作概览</button>
      <button className={activeSection === 'quote' ? 'active' : ''} onClick={() => switchSection('quote')}>报价工作台</button>
      <button className={activeSection === 'ai' ? 'active' : ''} onClick={() => switchSection('ai')}>AI 客服</button>
      <button className={activeSection === 'inventory' ? 'active' : ''} onClick={() => switchSection('inventory')}>上架库{listings.length ? ` · ${listings.length}` : ''}</button>
      <button className={activeSection === 'ledger' ? 'active' : ''} onClick={() => switchSection('ledger')}>每日账单</button>
      {user.role === 'owner' && <button className={activeSection === 'team' ? 'active' : ''} onClick={() => { setActiveSection('team'); loadTeam() }}>团队管理</button>}
    </nav>}
    <section className="card" hidden={user && activeSection !== 'overview'}>
      {user ? <>
        <div className="section-title"><span>当前员工：<b>{user.username}</b>（{roleName[user.role] || user.role}）</span><button className="secondary" onClick={logout}>退出</button></div>
        <div className="overview-actions"><button onClick={() => switchSection('quote')}>开始报价</button><button className="secondary" onClick={() => switchSection('inventory')}>查看我的上架库</button><button className="secondary" onClick={() => switchSection('ledger')}>查看每日账单</button></div>
        <div className="totals"><div><span>待售上架单</span><strong>{listings.length} 单</strong></div><div><span>当前权限</span><strong>{roleName[user.role] || user.role}</strong></div><div><span>下一步</span><strong>开始报价</strong></div></div>
        <button className="secondary" onClick={listToWps}>查看 / 导出上架 WPS 表</button>
      </> : <>
        <h2>{authMode === 'login' ? '登录' : authMode === 'reset' ? '重置密码' : '注册账号'}</h2>
        <div className="grid"><label>账号<input value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })} /></label>{authMode !== 'reset' && <label>密码<input type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} /></label>}{authMode === 'register' && <><label>密保问题<input value={auth.question} onChange={e => setAuth({ ...auth, question: e.target.value })} /></label><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label></>}{authMode === 'reset' && <><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label><label>新密码<input type="password" value={auth.newPassword} onChange={e => setAuth({ ...auth, newPassword: e.target.value })} /></label></>}</div>
        {authMode === 'reset' && <><button className="secondary" onClick={lookupSecurityQuestion}>查看密保问题</button>{securityQuestion && <p className="notice">密保问题：{securityQuestion}</p>}</>}
        <button onClick={submitAuth}>{authMode === 'login' ? '登录' : authMode === 'reset' ? '确认重置' : '注册'}</button><button className="secondary" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setSecurityQuestion('') }}>{authMode === 'login' ? '没有账号？注册' : '返回登录'}</button>{authMode === 'login' && <button className="secondary" onClick={() => setAuthMode('reset')}>忘记密码</button>}{authMsg && <p className="notice">{authMsg}</p>}
      </>}
    </section>
    {user && <section className="card" hidden={activeSection !== 'team' || user.role !== 'owner'}><div className="section-title"><h2>团队管理</h2><button className="secondary" onClick={loadTeam}>刷新</button></div><p className="notice">超级管理员可查看团队上架进度；员工之间无法查看彼此数据。</p>{team.length > 0 ? <div className="team-list">{team.map(x => <div className="team-row" key={x.id}><span><b>{x.username}</b> · {roleName[x.role] || x.role}</span><span>已上架 {x.orders} 单</span>{x.role !== 'owner' && <button className="text-button" onClick={() => removeMember(x.id)}>删除员工</button>}</div>)}</div> : <p>暂无团队账号。</p>}</section>}
    {user && <section className="card" hidden={activeSection !== 'ai'}><div className="section-title"><h2>简版 AI 客服</h2><span className="notice">仅生成草稿，不会自动发送或上架</span></div><p className="notice">可处理资料模板、报价引导、已核定报价和常见时效问题。涉及付款、封禁、人脸、改名、皮肤或上架确认会转人工。先在“报价工作台”完成计算后，这里只会带入客户可见的老板报价。</p><label>客户原话<textarea value={aiMessage} onChange={e => setAiMessage(e.target.value)} placeholder="例如：这个号怎么报价？资料怎么发？" /></label><div className="button-row"><button onClick={generateAiReply} disabled={aiLoading}>{aiLoading ? '正在生成…' : '生成简版客服回复'}</button><button className="secondary" onClick={handoffToHuman}>转人工</button></div>{aiReply && <div className="ai-reply"><div className="section-title"><h3>发送前请核对</h3><button className="secondary" onClick={copyAiReply}>复制草稿</button></div><pre>{aiReply}</pre></div>}</section>}
    {user && <section className="card" hidden={activeSection !== 'inventory'}><div className="section-title"><h2>我的上架库</h2><button className="secondary" onClick={loadListings}>{listingsLoading ? '读取中…' : '刷新'}</button></div>{listings.length ? <div className="listing-list">{listings.map(item => <div className="listing-row" key={item.source_order_id}><div><b>{item.order_no}</b><span>{item.hafu_m}m · {item.insurance_stamina}</span><small>{item.note || '无备注'}</small></div><div><span>号主 {item.boss_final} · 打手 {item.worker_final}</span><strong>利润 {item.profit} 元</strong></div><div><button onClick={() => sellListing(item)}>已售出</button><button className="text-button" onClick={() => deleteListing(item)}>删除</button></div></div>)}</div> : <p>{listingsLoading ? '正在读取上架库…' : '当前没有待售上架单。'}</p>}<p className="notice">“已售出”会自动转入今日利润账单；“删除”仅隐藏该上架单，不影响其他账单。</p></section>}
    {user && ledgerOpen && <section className="card" hidden={activeSection !== 'ledger'}><div className="section-title"><h2>我的每日账单</h2></div><div className="grid"><label>账单日期<input type="date" value={ledgerDate} onChange={e => { setLedgerDate(e.target.value); loadLedger(e.target.value) }} /></label></div><p className="notice">当日利润总和由每单差值自动相加。手动补录时，输入上架编号后点“读取”。</p><div className="ledger-table"><div className="ledger-head"><span>编号</span><span>读取</span><span>纯币(m)</span><span>保险/体负</span><span>号主到手</span><span>打手到手</span><span>利润</span><span>备注</span></div>{ledgerRows.map((row,index) => <div className="ledger-row" key={index}><input value={row.order_no} onChange={e => updateLedgerRow(index,'order_no',e.target.value)} onBlur={() => lookupLedgerNumber(index)} placeholder="L01" /><button className="secondary read-button" onClick={() => lookupLedgerNumber(index)}>读取</button><input type="number" value={row.hafu_m} onChange={e => updateLedgerRow(index,'hafu_m',e.target.value)} /><input value={row.insurance_stamina} onChange={e => updateLedgerRow(index,'insurance_stamina',e.target.value)} placeholder="9格/满" /><input type="number" value={row.boss_final} onChange={e => updateLedgerRow(index,'boss_final',e.target.value)} /><input type="number" value={row.worker_final} onChange={e => updateLedgerRow(index,'worker_final',e.target.value)} /><strong>{Number(row.worker_final || 0) - Number(row.boss_final || 0)}</strong><input value={row.note} onChange={e => updateLedgerRow(index,'note',e.target.value)} placeholder="皮肤、物品等" /><button className="text-button" onClick={() => setLedgerRows(rows => rows.length === 1 ? [blankLedgerRow()] : rows.filter((_,i) => i !== index))}>删除</button></div>)}</div><button className="secondary" onClick={() => setLedgerRows(rows => [...rows, blankLedgerRow()])}>新增一单</button><div className="totals"><div><span>成交单量</span><strong>{ledgerTotals.orders} 单</strong></div><div><span>纯币合计</span><strong>{ledgerTotals.hafu}m</strong></div><div><span>当日利润总和</span><strong>{ledgerTotals.profit} 元</strong></div></div>{ledgerSummary && <div className="totals"><div><span>本月累计利润</span><strong>{ledgerSummary.cumulative_profit.toFixed(2)} 元</strong></div><div><span>本月成交单量</span><strong>{ledgerSummary.orders} 单</strong></div><div><span>本月纯币</span><strong>{ledgerSummary.hafu_m}m</strong></div></div>}<button onClick={saveLedger} disabled={ledgerSaving}>{ledgerSaving ? '正在保存…' : '保存每日账单'}</button></section>}
    <section className="card" hidden={user && activeSection !== 'quote'}><h2>1. 粘贴号主资料</h2><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="把号主发来的整段资料直接粘贴到这里" /><button onClick={organize}>自动识别资料</button></section>
    <section className="card" hidden={user && activeSection !== 'quote'}><h2>2. 核对资料与比例</h2><div className="grid"><label>大区<input value={fields.region || ''} onChange={e => setFields({ ...fields, region: e.target.value })} /></label><label>哈夫（m）<input type="number" value={fields.hafu_m || ''} onChange={e => setFields({ ...fields, hafu_m: Number(e.target.value) })} /></label><label>号主比例<input type="number" value={bossRatio} onChange={e => setBossRatio(e.target.value)} /></label><label>打手比例<input type="number" value={workerRatio} onChange={e => setWorkerRatio(e.target.value)} /></label></div><button onClick={runCalculation}>计算报价</button></section>
    <section className="card results" hidden={user && activeSection !== 'quote'}><h2>3. 计算结果（内部）</h2>{result ? <><div className="totals"><div><span>号主到手</span><strong>{result.boss.final} 元</strong></div><div><span>打手到手</span><strong>{result.worker.final} 元</strong></div><div><span>差值</span><strong>{result.difference} 元</strong></div></div><div className="grid"><label>上架编号（可选）<input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="例如 Q20260830-01" /></label></div><button onClick={saveListing} disabled={saving}>{saving ? '正在上架…' : '号主同意，上架到 WPS'}</button></> : <p>资料或比例未填写完整。</p>}</section>
    <section className="card" hidden={user && activeSection !== 'quote'}><div className="section-title"><h2>客户回复</h2><button className="secondary" onClick={copy}>复制</button></div><pre>{customerText}</pre></section>
    <p className="notice">{appMsg || '未获得号主同意时只计算、不保存；只有“号主同意，上架到 WPS”会写入云端账单。'}</p>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
