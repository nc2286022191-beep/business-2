import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const defaults = { bossRatio: '47', workerRatio: '45' }
const roleName = { owner: '超级管理员', supervisor: '主管', staff: '员工' }
const today = () => new Date().toISOString().slice(0, 10)
const blankLedgerRow = () => ({ source_order_id: '', order_no: '', hafu_m: '', insurance_stamina: '', boss_final: '', worker_final: '', note: '' })

function extract(message, label) {
  const match = message.match(new RegExp(`(?:${label})[^：:\\n]*[：:]\\s*([^\\n]+)`, 'i'))
  return match?.[1]?.trim() || ''
}
function parseNumber(value) { return Number(String(value || '').match(/\d+(?:\.\d+)?/)?.[0] || 0) }
async function responseJson(response) {
  const text = await response.text()
  try { return JSON.parse(text) } catch { return { error: '云端服务暂时异常，请稍后重试。' } }
}
function parseMessage(message) {
  return {
    region: extract(message, '大区').replace(/qq/i, 'Q'), warehouse_m: parseNumber(extract(message, '仓库资产')),
    hafu_m: parseNumber(extract(message, '哈夫数量')), insurance: parseNumber(extract(message, '保险')),
    stamina: extract(message, '体力和负重等级'), nine_card: extract(message, '九格体验卡'),
    login: extract(message, '登陆方式|登录方式'), red_skin: extract(message, '干员红皮'), gold_skin: extract(message, '干员金皮'),
    knife_skin: extract(message, '刀皮'), brick_skin: extract(message, '砖皮'), armor: parseNumber(extract(message, '红甲多少件')),
    redhead: parseNumber(extract(message, '红头')), redbag: parseNumber(extract(message, '45红包')), aw: parseNumber(extract(message, 'AW子弹')),
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
  const [bossRatio, setBossRatio] = useState(defaults.bossRatio), [workerRatio, setWorkerRatio] = useState(defaults.workerRatio)
  const [result, setResult] = useState(null), [appMsg, setAppMsg] = useState(''), [saving, setSaving] = useState(false)
  const [orderNo, setOrderNo] = useState(''), [team, setTeam] = useState([])
  const [ledgerOpen, setLedgerOpen] = useState(false), [ledgerDate, setLedgerDate] = useState(today()), [ledgerRows, setLedgerRows] = useState([blankLedgerRow()])
  const [historicalProfit, setHistoricalProfit] = useState(''), [ledgerSummary, setLedgerSummary] = useState(null), [ledgerSaving, setLedgerSaving] = useState(false)
  const organize = () => { setFields(parseMessage(message)); setResult(null); setAppMsg('资料已识别，请核对哈夫和比例后点击“计算报价”。') }
  const quotePayload = () => ({ ...fields, boss_ratio: bossRatio, worker_ratio: workerRatio })
  const runCalculation = () => {
    const next = localCalculation(quotePayload())
    setResult(next)
    setAppMsg(next ? '已按当前资料和比例计算。未上架前不会写入云端账单。' : '请填写哈夫数量、号主比例和打手比例。')
  }
  const customerText = result ? `【报价计算明细】\n号主（比例 ${bossRatio}）：\n${fields.hafu_m} ÷ ${bossRatio} × 100 = ${(Number(fields.hafu_m) / Number(bossRatio) * 100).toFixed(2)} 纯币\nAW：${fields.aw || 0} × 0.7 = ${result.aw.toFixed(2)}\n红头红甲红包：${result.bossItems.toFixed(2)}\n号主到手：${result.boss.final} 元\n\n如同意上架，请明确回复“可以上架”。` : '请先粘贴资料并填写比例。'
  const copy = async () => { try { await navigator.clipboard.writeText(customerText); setAppMsg('客户回复已复制。') } catch { setAppMsg('复制失败，请手动复制。') } }
  useEffect(() => { fetch('/api/me').then(r => r.ok ? r.json() : null).then(x => setUser(x?.user || null)).catch(() => {}) }, [])
  const submitAuth = async () => {
    const route = authMode === 'login' ? '/api/login' : authMode === 'reset' ? '/api/password-reset' : '/api/register'
    const body = authMode === 'reset' ? { username: auth.username, answer: auth.answer, newPassword: auth.newPassword } : auth
    try { const r = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x = await responseJson(r)
      if (r.ok) { if (x.user) { setUser(x.user); setAppMsg('登录成功。') }; setAuthMsg(authMode === 'reset' ? '密码已重置，请用新密码登录。' : '登录成功。') } else setAuthMsg(x.error || '操作失败')
    } catch { setAuthMsg('网络连接异常，请稍后重试。') }
  }
  const lookupSecurityQuestion = async () => { const r = await fetch(`/api/security-question?username=${encodeURIComponent(auth.username)}`); const x = await r.json(); setSecurityQuestion(r.ok ? x.question : (x.error || '未找到密保问题')) }
  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); setUser(null); setTeam([]); setAuthMode('login'); setAppMsg('已退出登录。') }
  const loadTeam = async () => { const r = await fetch('/api/team'); const x = await r.json(); setTeam(x.members || []); if (!r.ok) setAppMsg(x.error || '无法读取团队信息') }
  const removeMember = async id => { if (!confirm('确定删除这个员工账号吗？此操作不会删除其已经上架的账单。')) return; const r = await fetch(`/api/team/${id}`, { method: 'DELETE' }); const x = await r.json(); if (r.ok) { setAppMsg('员工账号已删除。'); loadTeam() } else setAppMsg(x.error || '删除失败') }
  const listToWps = () => window.open('/api/wps.csv', '_blank')
  const updateLedgerRow = (index, key, value) => setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, [key]: value, ...(key === 'order_no' ? { source_order_id: '' } : {}) } : row))
  const ledgerTotals = ledgerRows.reduce((sum, row) => { const boss = Number(row.boss_final || 0), worker = Number(row.worker_final || 0); return { orders: sum.orders + (row.order_no || row.hafu_m || boss || worker || row.note ? 1 : 0), hafu: sum.hafu + Number(row.hafu_m || 0), boss: sum.boss + boss, worker: sum.worker + worker, profit: sum.profit + worker - boss } }, { orders: 0, hafu: 0, boss: 0, worker: 0, profit: 0 })
  const loadLedger = async (date = ledgerDate) => { const r = await fetch(`/api/ledger?date=${encodeURIComponent(date)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '无法读取每日账单。'); setLedgerRows(x.entries.length ? x.entries.map(({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note }) => ({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note })) : [blankLedgerRow()]); setHistoricalProfit(String(x.summary.historical_profit || '')); setLedgerSummary(x.summary) }
  const lookupLedgerNumber = async index => { const orderNo = String(ledgerRows[index]?.order_no || '').trim(); if (!orderNo) return; const r = await fetch(`/api/ledger-lookup?order_no=${encodeURIComponent(orderNo)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '未找到该上架单。'); setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, ...x.entry } : row)); setAppMsg(`${x.entry.order_no} 已从上架表读取；保存每日账单后会移入利润账单。`) }
  const openLedger = () => { setLedgerOpen(true); setTimeout(() => loadLedger(), 0) }
  const saveLedger = async () => { setLedgerSaving(true); const r = await fetch('/api/ledger', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: ledgerDate, historical_profit: historicalProfit, entries: ledgerRows }) }); const x = await responseJson(r); setLedgerSaving(false); if (r.ok) { setLedgerSummary(x.summary); setLedgerRows(x.entries.length ? x.entries : [blankLedgerRow()]); setAppMsg('每日账单已保存。利润按打手到手减号主到手自动计算。') } else setAppMsg(x.error || '保存每日账单失败。') }
  const saveListing = async () => {
    if (!user) return setAppMsg('请先登录，再执行上架。')
    if (!result) return setAppMsg('请先完成计算，再执行上架。')
    setSaving(true); setAppMsg('正在写入云端内部账单…')
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...quotePayload(), order_no: orderNo, stage: '已上架' }) }); const x = await r.json()
    setSaving(false); setAppMsg(r.ok ? `上架成功：${x.orderNo || orderNo || '待定'}。可从“查看 / 导出上架 WPS 表”打开。` : (x.error || '上架失败'))
  }

  return <main>
    <header><h1>商行报价工作台</h1><p>先计算，号主明确同意后才上架并写入云端内部账单。</p></header>
    <section className="card">
      {user ? <><div className="section-title"><span>当前员工：<b>{user.username}</b>（{roleName[user.role] || user.role}）</span><button className="secondary" onClick={logout}>退出</button></div><button className="secondary" onClick={listToWps}>查看 / 导出上架 WPS 表</button><button className="secondary" onClick={openLedger}>每日账单</button>{user.role === 'owner' && <><button className="secondary" onClick={loadTeam}>查看账号与工作状态</button>{team.length > 0 && <div className="grid">{team.map(x => <p key={x.id}>{x.username} · {roleName[x.role] || x.role} · 已上架 {x.orders} 单 {x.role !== 'owner' && <button className="text-button" onClick={() => removeMember(x.id)}>删除</button>}</p>)}</div>}</>}</> : <><h2>{authMode === 'login' ? '登录' : authMode === 'reset' ? '重置密码' : '注册账号'}</h2><div className="grid"><label>账号<input value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })} /></label>{authMode !== 'reset' && <label>密码<input type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} /></label>}{authMode === 'register' && <><label>密保问题<input value={auth.question} onChange={e => setAuth({ ...auth, question: e.target.value })} /></label><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label></>}{authMode === 'reset' && <><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label><label>新密码<input type="password" value={auth.newPassword} onChange={e => setAuth({ ...auth, newPassword: e.target.value })} /></label></>}</div>{authMode === 'reset' && <><button className="secondary" onClick={lookupSecurityQuestion}>查看密保问题</button>{securityQuestion && <p className="notice">密保问题：{securityQuestion}</p>}</>}<button onClick={submitAuth}>{authMode === 'login' ? '登录' : authMode === 'reset' ? '确认重置' : '注册'}</button><button className="secondary" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setSecurityQuestion('') }}>{authMode === 'login' ? '没有账号？注册' : '返回登录'}</button>{authMode === 'login' && <button className="secondary" onClick={() => setAuthMode('reset')}>忘记密码</button>}{authMsg && <p className="notice">{authMsg}</p>}</>}</section>
    {user && ledgerOpen && <section className="card"><div className="section-title"><h2>我的每日账单</h2><button className="secondary" onClick={() => setLedgerOpen(false)}>收起</button></div><div className="grid"><label>账单日期<input type="date" value={ledgerDate} onChange={e => { setLedgerDate(e.target.value); loadLedger(e.target.value) }} /></label><label>本月历史累计利润（可选）<input type="number" value={historicalProfit} onChange={e => setHistoricalProfit(e.target.value)} placeholder="例如 8941.57" /></label></div><p className="notice">输入上架编号并离开输入框，即可自动读取 WPS 上架表；保存后该单转入利润账单。利润自动等于“打手到手 − 号主到手”。</p><div className="ledger-table"><div className="ledger-head"><span>编号</span><span>纯币(m)</span><span>保险/体负</span><span>号主到手</span><span>打手到手</span><span>利润</span><span>备注</span></div>{ledgerRows.map((row,index) => <div className="ledger-row" key={index}><input value={row.order_no} onChange={e => updateLedgerRow(index,'order_no',e.target.value)} onBlur={() => lookupLedgerNumber(index)} placeholder="L01" /><input type="number" value={row.hafu_m} onChange={e => updateLedgerRow(index,'hafu_m',e.target.value)} /><input value={row.insurance_stamina} onChange={e => updateLedgerRow(index,'insurance_stamina',e.target.value)} placeholder="9格/满" /><input type="number" value={row.boss_final} onChange={e => updateLedgerRow(index,'boss_final',e.target.value)} /><input type="number" value={row.worker_final} onChange={e => updateLedgerRow(index,'worker_final',e.target.value)} /><strong>{Number(row.worker_final || 0) - Number(row.boss_final || 0)}</strong><input value={row.note} onChange={e => updateLedgerRow(index,'note',e.target.value)} placeholder="皮肤、物品等" /><button className="text-button" onClick={() => setLedgerRows(rows => rows.length === 1 ? [blankLedgerRow()] : rows.filter((_,i) => i !== index))}>删除</button></div>)}</div><button className="secondary" onClick={() => setLedgerRows(rows => [...rows, blankLedgerRow()])}>新增一单</button><div className="totals"><div><span>成交单量</span><strong>{ledgerTotals.orders} 单</strong></div><div><span>纯币合计</span><strong>{ledgerTotals.hafu}m</strong></div><div><span>当日利润（差值）</span><strong>{ledgerTotals.profit} 元</strong></div></div>{ledgerSummary && <div className="totals"><div><span>本月累计利润</span><strong>{ledgerSummary.cumulative_profit.toFixed(2)} 元</strong></div><div><span>本月成交单量</span><strong>{ledgerSummary.orders} 单</strong></div><div><span>本月纯币</span><strong>{ledgerSummary.hafu_m}m</strong></div></div>}<button onClick={saveLedger} disabled={ledgerSaving}>{ledgerSaving ? '正在保存…' : '保存每日账单'}</button></section>}
    <section className="card"><h2>1. 粘贴号主资料</h2><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="把号主发来的整段资料直接粘贴到这里" /><button onClick={organize}>自动识别资料</button></section>
    <section className="card"><h2>2. 核对资料与比例</h2><div className="grid"><label>大区<input value={fields.region || ''} onChange={e => setFields({ ...fields, region: e.target.value })} /></label><label>哈夫（m）<input type="number" value={fields.hafu_m || ''} onChange={e => setFields({ ...fields, hafu_m: Number(e.target.value) })} /></label><label>号主比例<input type="number" value={bossRatio} onChange={e => setBossRatio(e.target.value)} /></label><label>打手比例<input type="number" value={workerRatio} onChange={e => setWorkerRatio(e.target.value)} /></label></div><button onClick={runCalculation}>计算报价</button></section>
    <section className="card results"><h2>3. 计算结果（内部）</h2>{result ? <><div className="totals"><div><span>号主到手</span><strong>{result.boss.final} 元</strong></div><div><span>打手到手</span><strong>{result.worker.final} 元</strong></div><div><span>差值</span><strong>{result.difference} 元</strong></div></div><div className="grid"><label>上架编号（可选）<input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="例如 Q20260830-01" /></label></div><button onClick={saveListing} disabled={saving}>{saving ? '正在上架…' : '号主同意，上架到 WPS'}</button></> : <p>资料或比例未填写完整。</p>}</section>
    <section className="card"><div className="section-title"><h2>客户回复</h2><button className="secondary" onClick={copy}>复制</button></div><pre>{customerText}</pre></section>
    <p className="notice">{appMsg || '未获得号主同意时只计算、不保存；只有“号主同意，上架到 WPS”会写入云端账单。'}</p>
  </main>
}
createRoot(document.getElementById('root')).render(<App />)
