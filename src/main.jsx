import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const defaults = { bossRatio: '47', workerRatio: '45' }
const roleName = { owner: '学习发起人', supervisor: '学习组织者', staff: '学习成员' }
const simulationMode = false
const today = () => new Date().toISOString().slice(0, 10)
const blankLedgerRow = () => ({ source_order_id: '', order_no: '', hafu_m: '', insurance_stamina: '', boss_final: '', worker_final: '', note: '' })
const blankLoss = () => ({ order_no: '', aw: '', six_head: '', six_armor: '', bag45: '', note: '' })
const inventorySkins = item => [item.red_skin,item.knife_skin,item.brick_skin].filter(value => value && !['无','没有'].includes(value)).join(' / ') || '无'
const coinTone = value => Number(value) < 100 ? 'coin-low' : Number(value) >= 300 ? 'coin-high' : Number(value) >= 200 ? 'coin-mid' : ''
const awTone = value => Number(value) >= 100 ? 'aw-high' : ''
const demoListings = [
  {source_order_id:'demo-01',order_no:'SIM-A-01',hafu_m:120,insurance_stamina:'9格/满',boss_final:240,worker_final:260,profit:20,note:'虚构演示资料',region:'模拟区域',login:'模拟方式',worker_ratio:'学习参数',red_skin:'演示外观',knife_skin:'无',brick_skin:'无',aw:36,armor:2,redhead:1,redbag:1,online:'模拟时间',kd:'—',rank:'练习段位',username:'学习成员'},
  {source_order_id:'demo-02',order_no:'SIM-A-02',hafu_m:180,insurance_stamina:'6格/满',boss_final:320,worker_final:340,profit:20,note:'虚构演示资料',region:'模拟区域',login:'模拟方式',worker_ratio:'学习参数',red_skin:'演示外观',knife_skin:'无',brick_skin:'无',aw:52,armor:3,redhead:2,redbag:2,online:'模拟时间',kd:'—',rank:'练习段位',username:'学习成员'}
]
const hasSensitiveText = value => /(?:1[3-9]\d{9}|(?:微信|vx|v信|qq)\s*[:：]?[\w-]{5,}|(?:账号|账号密码|登录密码|联系方式)\s*[:：])/i.test(String(value || ''))

function extract(message, label) {
  return message.match(new RegExp(`(?:${label})[^：:\\n]*[：:]\\s*([^\\n]+)`, 'i'))?.[1]?.trim() || ''
}
function number(value) {
  const text = String(value || ''), arabic = text.match(/\d+(?:\.\d+)?/)
  if (arabic) return Number(arabic[0])
  const digits = { '零':0,'〇':0,'一':1,'壹':1,'二':2,'贰':2,'两':2,'俩':2,'三':3,'叁':3,'四':4,'肆':4,'五':5,'伍':5,'六':6,'陆':6,'七':7,'柒':7,'八':8,'捌':8,'九':9,'玖':9 }, units = { '十':10,'拾':10,'百':100,'佰':100,'千':1000,'仟':1000,'万':10000 }
  const chinese = text.match(/[零〇一二两俩三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+/)?.[0]
  if (!chinese) return 0
  let total = 0, section = 0, current = 0
  for (const char of chinese) { if (char in digits) current = digits[char]; else if (units[char] === 10000) { total += (section + current) * 10000; section = 0; current = 0 } else { section += (current || 1) * units[char]; current = 0 } }
  return total + section + current
}
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
    knife_skin: extract(message, '刀皮'), brick_skin: extract(message, '砖皮'), armor: number(extract(message, '红甲多少件|红甲')),
    redhead: number(extract(message, '红头')), redbag: number(extract(message, '45红包')), aw: number(extract(message, 'AW子弹')),
    face: extract(message, '过人脸'), ban: extract(message, '账号是否有封禁'), online: extract(message, '在线时间'),
    rank: extract(message, '段位'), kd: extract(message, '绝密kd'), rename: extract(message, '能否改名'), source: extract(message, '从哪个主播看见我们的'),
  }
}
function parseLossMessage(message) {
  const take = label => extract(message, label)
  return {
    order_no: take('编号|单号|群名|订单号'),
    aw: number(take('AW子弹|AW')),
    six_head: number(take('满耐六头|六头')),
    six_armor: number(take('满耐六甲|六甲')),
    bag45: number(take('45格包|45包|45红包')),
    note: '',
  }
}
function localCalculation(p) {
  const h = Number(p.hafu_m || 0), boss = Number(p.boss_ratio || 0), worker = Number(p.worker_ratio || 0)
  if (!(h > 0 && boss > 0 && worker > 0 && worker < boss)) return null
  const aw = Number(p.aw || 0) * .7, redhead = Number(p.redhead || 0), armor = Number(p.armor || 0), redbag = Number(p.redbag || 0)
  const bossItems = redhead + armor * 2 + redbag * 2, workerItems = redhead * 2 + armor * 2 + redbag * 3
  const bossFinal = Math.floor((h / boss * 100 + aw + bossItems) * .94)
  const workerFinal = Math.ceil((h / worker * 100 + aw + workerItems) * 1.04)
  return { boss: { final: String(bossFinal) }, worker: { final: String(workerFinal) }, difference: String(workerFinal - bossFinal), aw, bossItems }
}

function PublicStock() {
  const code = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || ''), [listings, setListings] = useState([]), [updatedAt, setUpdatedAt] = useState(''), [message, setMessage] = useState('正在读取实时资料表…')
  useEffect(() => { document.title = '实时资料表'; let mounted = true; const load = async () => { try { const response = await fetch(`/api/public-inventory?code=${encodeURIComponent(code)}`), data = await responseJson(response); if (!mounted) return; if (response.ok) { setListings(data.listings || []); setUpdatedAt(data.synced_at || new Date().toLocaleString()); setMessage('') } else setMessage(data.error || '资料表暂时无法读取。') } catch { if (mounted) setMessage('网络连接异常，请稍后刷新。') } }; load(); const timer = setInterval(load, 15000); return () => { mounted = false; clearInterval(timer) } }, [code])
  return <main className="public-stock"><header><h1>实时资料库</h1><p>此页面每 15 秒自动同步一次最新上架资料。</p></header><section className="card"><div className="section-title"><h2>当前上架资料</h2><small>{updatedAt ? `最近同步：${updatedAt}` : '同步中…'}</small></div>{message ? <p className="notice">{message}</p> : <>{listings.length ? <div className="listing-list">{listings.map(item => <div className="listing-row" key={'card-' + item.order_no}><div><b>{item.order_no}</b><span>{item.hafu_m}m · {item.insurance_stamina}</span><small>{[item.region,item.login,item.skins].filter(Boolean).join(' · ') || '暂无补充资料'}</small></div><div><span>学习成员比例 {item.worker_ratio || '—'}</span><strong>全包价格 {item.worker_final}</strong></div></div>)}</div> : <p>当前没有待售上架单。</p>}<div className="section-title inventory-table-title"><h3>实时资料表</h3></div><div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>序号</th><th>纯币(m)</th><th>保险/体负</th><th>打手比例</th><th>大区</th><th>登录方式</th><th>全包价格</th><th>红皮 / 刀皮 / 砖皮</th><th>AW</th><th>红甲</th><th>红头</th><th>45包</th><th>在线时间</th><th>绝密 KD</th><th>段位</th></tr></thead><tbody>{listings.length ? listings.map(item => <tr key={item.order_no}><td>{item.order_no}</td><td className={coinTone(item.hafu_m)}>{item.hafu_m}</td><td>{item.insurance_stamina}</td><td>{item.worker_ratio || '—'}</td><td>{item.region || '—'}</td><td>{item.login || '—'}</td><td>{item.worker_final}</td><td>{item.skins || '无'}</td><td className={awTone(item.aw)}>{item.aw}</td><td>{item.armor}</td><td>{item.redhead}</td><td>{item.redbag}</td><td>{item.online || '—'}</td><td>{item.kd || '—'}</td><td>{item.rank || '—'}</td></tr>) : <tr><td className="inventory-empty" colSpan="15">暂无待售上架单</td></tr>}</tbody></table></div></>}</section></main>
}

function App() {
  const [user, setUser] = useState(null)
  const [auth, setAuth] = useState({ username: '', password: '', question: '', answer: '', newPassword: '' })
  const [authMode, setAuthMode] = useState('login'), [authMsg, setAuthMsg] = useState(''), [securityQuestion, setSecurityQuestion] = useState('')
  const [message, setMessage] = useState(''), [fields, setFields] = useState({})
  const [bossRatio, setBossRatio] = useState(defaults.bossRatio), [workerRatio, setWorkerRatio] = useState(defaults.workerRatio), [result, setResult] = useState(null)
  const [appMsg, setAppMsg] = useState(''), [saving, setSaving] = useState(false), [orderNo, setOrderNo] = useState(''), [team, setTeam] = useState([])
  const [listings, setListings] = useState([]), [listingsLoading, setListingsLoading] = useState(false), [inventoryOwnerFilter, setInventoryOwnerFilter] = useState('all')
  const [shareLinks, setShareLinks] = useState([]), [myShareLink, setMyShareLink] = useState(null), [shareLinkLoading, setShareLinkLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [ledgerOpen, setLedgerOpen] = useState(false), [ledgerDate, setLedgerDate] = useState(today()), [ledgerRows, setLedgerRows] = useState([blankLedgerRow()])
  const [ledgerSummary, setLedgerSummary] = useState(null), [ledgerSaving, setLedgerSaving] = useState(false)
  const [lossDate, setLossDate] = useState(today()), [lossRows, setLossRows] = useState([]), [lossMessage, setLossMessage] = useState(''), [lossForm, setLossForm] = useState(blankLoss()), [lossSummary, setLossSummary] = useState(null), [lossSaving, setLossSaving] = useState(false)
  const [aiMessage, setAiMessage] = useState(''), [aiReply, setAiReply] = useState(''), [aiLoading, setAiLoading] = useState(false)

  const quotePayload = () => ({ ...fields, boss_ratio: bossRatio, worker_ratio: workerRatio })
  const organize = () => { if (hasSensitiveText(message)) return setAppMsg('学习版不接收真实联系方式、账号或交易资料，请使用虚构示例。'); setFields(parseMessage(message)); setResult(null); setAppMsg('模拟资料已识别，请核对学习参数后点击“开始核算”。') }
  const runCalculation = () => { const next = localCalculation(quotePayload()), boss=Number(bossRatio), worker=Number(workerRatio); setResult(next); setAppMsg(next ? '已按当前资料和比例计算。未上架前不会写入云端账单。' : boss > 0 && worker > 0 && worker >= boss ? '打手比例必须小于号主比例，请修改后再计算。' : '请填写哈夫数量、号主比例和打手比例。') }
  const customerText = result ? `【资料核算明细】\n号主（比例 ${bossRatio}）：\n${fields.hafu_m} ÷ ${bossRatio} × 100 = ${(Number(fields.hafu_m) / Number(bossRatio) * 100).toFixed(2)} 纯币\nAW：${fields.aw || 0} × 0.7 = ${result.aw.toFixed(2)}\n红头红甲红包：${result.bossItems.toFixed(2)}\n号主到手：${result.boss.final}\n\n如需保存，请明确回复“可以保存”。` : '请先粘贴资料并填写比例。'
  const copy = async () => { try { await navigator.clipboard.writeText(customerText); setAppMsg('客户回复已复制。') } catch { setAppMsg('复制失败，请手动复制。') } }
  const generateAiReply = async () => {
    if (!aiMessage.trim()) return setAppMsg('请先输入客户原话。')
    setAiLoading(true); setAiReply('')
    const r = await fetch('/api/ai/reply', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ message:aiMessage, quote:result ? quotePayload() : undefined, mode:'basic' }) })
    const x = await responseJson(r); setAiLoading(false)
    if (r.ok) { setAiReply(x.reply); setAppMsg(x.quote_attached ? '已生成 AI 资料回复草稿，已附加当前核算结果。' : '已生成 AI 资料回复草稿。') } else setAppMsg(x.error || 'AI 回复生成失败。')
  }
  const copyAiReply = async () => { try { await navigator.clipboard.writeText(aiReply); setAppMsg('AI 客服草稿已复制，请核对后再发送给客户。') } catch { setAppMsg('复制失败，请手动复制。') } }
  const handoffToHuman = () => { setAiReply('您好，已为您转人工客服处理。请稍等，我们会尽快回复您。'); setAppMsg('已生成转人工回复。') }

  useEffect(() => { fetch('/api/me').then(r => r.ok ? r.json() : null).then(x => setUser(x?.user ? { ...x.user, username:'学习者' } : null)).catch(() => {}) }, [])
  useEffect(() => {
    const replacements = [['商行报价工作台','个人兴趣资料整理学习版'],['工作台','个人兴趣资料整理学习版'],['模拟经营','个人兴趣'],['经营','兴趣'],['业务','练习'],['产品','资料'],['企业','个人'],['行业','兴趣'],['论坛','兴趣交流'],['博客','学习笔记'],['报价工作台','模拟核算'],['报价','核算'],['利润','差值'],['亏损表','剩余物资差额表'],['亏损','剩余物资差额'],['商行价','计算值'],['原价','对照值'],['客服','学习助手'],['团队','学习小组'],['打手','学习成员'],['客户','学习对象'],['上架','模拟入库'],['售出','模拟结算'],['库存','模拟资料'],['元','']]
    const rewrite = node => { if (node.nodeType === Node.TEXT_NODE && node.parentElement?.tagName !== 'SCRIPT') { let text = node.nodeValue; replacements.forEach(([from,to]) => { text = text.replaceAll(from,to) }); if (text !== node.nodeValue) node.nodeValue = text } }
    const apply = root => { const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) rewrite(node) }
    apply(document.body)
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) rewrite(node); else if (node.nodeType === Node.ELEMENT_NODE) apply(node) })))
    observer.observe(document.body, { childList:true, subtree:true })
    return () => observer.disconnect()
  }, [])
  const submitAuth = async () => {
    if (simulationMode && authMode === 'register') return setAuthMsg('模拟经营学习版暂不开放自助注册。')
    const route = authMode === 'login' ? '/api/login' : authMode === 'reset' ? '/api/password-reset' : '/api/register'
    const body = authMode === 'reset' ? { username: auth.username, answer: auth.answer, newPassword: auth.newPassword } : auth
    try {
      const r = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const x = await responseJson(r)
      if (r.ok) { if (x.user) { setUser(x.user); setAppMsg('登录成功。') }; setAuthMsg(authMode === 'reset' ? '密码已重置，请用新密码登录。' : '登录成功。') } else setAuthMsg(x.error || '操作失败')
    } catch { setAuthMsg('网络连接异常，请稍后重试。') }
  }
  const lookupSecurityQuestion = async () => { const r = await fetch(`/api/security-question?username=${encodeURIComponent(auth.username)}`); const x = await responseJson(r); setSecurityQuestion(r.ok ? x.question : (x.error || '未找到密保问题')) }
  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); setUser(null); setTeam([]); setListings([]); setAuthMode('login'); setAppMsg('已退出登录。') }
  const loadTeam = async () => { const r = await fetch('/api/team'), x = await responseJson(r); if (r.ok) setTeam(x.members || []); else setAppMsg(x.error || '无法读取成员列表。') }
  const updateMember = async (id, change) => { const r = await fetch('/api/team/' + id, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(change) }); const x = await responseJson(r); if (r.ok) { setAppMsg('成员设置已更新。'); loadTeam() } else setAppMsg(x.error || '成员设置失败。') }
  const removeMember = async id => { if (!confirm('确定删除这个员工账号吗？此操作不会删除其已经上架的账单。')) return; const r = await fetch(`/api/team/${id}`, { method: 'DELETE' }); const x = await responseJson(r); if (r.ok) { setAppMsg('员工账号已删除。'); loadTeam() } else setAppMsg(x.error || '删除失败') }

  const loadListings = async () => { if (!user) return; setListingsLoading(true); const r = await fetch('/api/listings'); const x = await responseJson(r); setListingsLoading(false); if (r.ok) setListings(x.listings || []); else setAppMsg(x.error || '无法读取资料库。') }
  const loadShareLinks = async () => { if (user?.role !== 'owner') return; const r = await fetch('/api/share-links'), x = await responseJson(r); if (r.ok) setShareLinks(x.links || []); else setAppMsg(x.error || '无法读取资料表链接。') }
  const loadMyShareLink = async () => { if (!user) return; const r = await fetch('/api/my-share-link'), x = await responseJson(r); if (r.ok) setMyShareLink(x.link || null); else setAppMsg(x.error || '无法读取我的资料表链接。') }
  const createMyShareLink = async () => { const r = await fetch('/api/my-share-link', { method:'POST', headers:{'content-type':'application/json'}, body:'{}' }), x = await responseJson(r); if (r.ok) { setMyShareLink(x.link); setAppMsg('个人资料链接已生成。') } else setAppMsg(x.error || '生成个人资料链接失败。') }
  const shareUrl = code => `${location.origin}/stock/${code}`
  const copyShareLink = async code => { try { await navigator.clipboard.writeText(shareUrl(code)); setAppMsg('链接已复制。') } catch { setAppMsg('复制失败，请手动复制链接。') } }
  const createShareLink = async teamGroup => { setShareLinkLoading(true); const r = await fetch('/api/share-links', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({team_group:teamGroup}) }), x = await responseJson(r); setShareLinkLoading(false); if (r.ok) { setAppMsg(`${teamGroup} 组链接已生成。`); loadShareLinks() } else setAppMsg(x.error || '生成链接失败。') }
  const removeShareLink = async link => { if (!confirm(`关闭 ${link.team_group} 组的链接吗？`)) return; const r = await fetch(`/api/share-links/${link.id}`, { method:'DELETE' }), x = await responseJson(r); if (r.ok) { setAppMsg('链接已关闭。'); loadShareLinks() } else setAppMsg(x.error || '关闭链接失败。') }
  useEffect(() => { if (user) { loadListings(); loadLedger(today()); loadMyShareLink() } }, [user])
  const visibleListings = user?.role === 'owner' && inventoryOwnerFilter !== 'all' ? listings.filter(item => item.username === inventoryOwnerFilter) : listings
  const sellListing = async item => { if (!confirm(`确认 ${item.order_no} 已售出吗？该操作会自动转入今日利润账单，并从上架表移除。`)) return; const r = await fetch(`/api/orders/${item.source_order_id}/sell`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); const x = await responseJson(r); if (r.ok) { setAppMsg(`${item.order_no} 已售出，已自动转入今日利润账单。`); loadListings(); if (ledgerOpen) loadLedger(ledgerDate) } else setAppMsg(x.error || '售出处理失败。') }
  const deleteListing = async item => { if (!confirm(`确认删除上架单 ${item.order_no} 吗？删除后不会出现在上架库或 WPS 表中。`)) return; const r = await fetch(`/api/orders/${item.source_order_id}`, { method: 'DELETE' }); const x = await responseJson(r); if (r.ok) { setAppMsg(`${item.order_no} 已删除。`); loadListings() } else setAppMsg(x.error || '删除上架单失败。') }

  const listToWps = () => window.open('/api/wps.csv', '_blank')
  const downloadInventory = () => {
    const headers = ['序号','纯币(m)','保险/体负','打手比例','大区','登录方式','全包价格','红皮 / 刀皮 / 砖皮','AW','红甲','红头','45包','在线时间','绝密 KD','段位']
    const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
    const cell = (value, className = '') => '<td class="' + className + '">' + escapeHtml(value) + '</td>'
    const rows = visibleListings.map(item => '<tr>' + cell(item.order_no) + cell(item.hafu_m,coinTone(item.hafu_m)) + cell(item.insurance_stamina) + cell(item.worker_ratio || '—') + cell(item.region || '—') + cell(item.login || '—') + cell(item.worker_final) + cell(inventorySkins(item)) + cell(item.aw,awTone(item.aw)) + cell(item.armor) + cell(item.redhead) + cell(item.redbag) + cell(item.online || '—') + cell(item.kd || '—') + cell(item.rank || '—') + '</tr>').join('')
    const html = '<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Microsoft YaHei,sans-serif;font-size:11pt}th,td{border:1px solid #222;padding:8px 10px;text-align:center;white-space:nowrap}th{background:#f8c8cf;color:#47252a;font-weight:700}.coin-low{background:#fff3cf;font-weight:700}.coin-mid{background:#bfe8fa;font-weight:700}.coin-high{background:#d5daf0;font-weight:700}.aw-high{background:#fff3cf}</style></head><body><table><thead><tr>' + headers.map(header => '<th>' + header + '</th>').join('') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="15">暂无待售上架单</td></tr>') + '</tbody></table></body></html>'
    const url = URL.createObjectURL(new Blob([html], { type:'application/vnd.ms-excel;charset=utf-8' })), link = document.createElement('a')
    link.href = url; link.download = '上架库存表_' + today() + '.xls'; link.click(); URL.revokeObjectURL(url)
    setAppMsg('彩色库存表已下载，共 ' + visibleListings.length + ' 单。')
  }
  const updateLedgerRow = (index, key, value) => setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, [key]: value, ...(key === 'order_no' ? { source_order_id: '' } : {}) } : row))
  const ledgerTotals = ledgerRows.reduce((sum, row) => { const boss = Number(row.boss_final || 0), worker = Number(row.worker_final || 0); const present = row.order_no || row.hafu_m || boss || worker || row.note; return { orders: sum.orders + (present ? 1 : 0), hafu: sum.hafu + Number(row.hafu_m || 0), profit: sum.profit + worker - boss } }, { orders: 0, hafu: 0, profit: 0 })
  const loadLedger = async (date = ledgerDate) => { const r = await fetch(`/api/ledger?date=${encodeURIComponent(date)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '无法读取差值表。'); setLedgerRows(x.entries.length ? x.entries.map(({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note }) => ({ source_order_id, order_no, hafu_m, insurance_stamina, boss_final, worker_final, note })) : [blankLedgerRow()]); setLedgerSummary(x.summary) }
  const openLedger = () => { setLedgerOpen(true); setTimeout(() => loadLedger(), 0) }
  const loadLosses = async (date = lossDate) => { const r = await fetch(`/api/losses?date=${encodeURIComponent(date)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '无法读取剩余物资差额表。'); setLossRows(x.records || []); setLossSummary(x.summary || null) }
  const organizeLoss = () => { const next = parseLossMessage(lossMessage); setLossForm(next); setAppMsg(next.order_no || next.aw || next.six_head || next.six_armor || next.bag45 ? '剩余物资已识别，请核对后写入亏损表。' : '未识别到编号或物资数量，请按“编号：K170、AW：9、六头：6”格式粘贴。') }
  const lossPreview = { discounted_total: Number(lossForm.aw || 0) * .7 + Number(lossForm.six_head || 0) + Number(lossForm.six_armor || 0) * 2 + Number(lossForm.bag45 || 0) * 2, original_total: Number(lossForm.aw || 0) * .7 + Number(lossForm.six_head || 0) * 2 + Number(lossForm.six_armor || 0) * 2 + Number(lossForm.bag45 || 0) * 3 }
  lossPreview.loss = lossPreview.original_total - lossPreview.discounted_total
  const saveLoss = async () => { if (simulationMode) return setAppMsg('模拟差额记录已在当前学习会话中演示，不会写入云端。'); if (!lossForm.order_no.trim()) return setAppMsg('请填写群名中的编号，例如 K170。'); setLossSaving(true); const r = await fetch('/api/losses', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ ...lossForm, loss_date:lossDate }) }); const x = await responseJson(r); setLossSaving(false); if (r.ok) { setLossForm(blankLoss()); setLossSummary(x.summary || null); setAppMsg(`${x.record.order_no} 已加入独立亏损表，亏损 ${x.record.loss.toFixed(2)} 元。`); loadLosses(lossDate); loadLedger(ledgerDate) } else setAppMsg(x.error || '保存亏损记录失败。') }
  const deleteLoss = async record => { if (!confirm(`删除 ${record.order_no} 的亏损记录吗？`)) return; const r = await fetch(`/api/losses/${record.id}`, { method:'DELETE' }); const x = await responseJson(r); if (r.ok) { setAppMsg('亏损记录已删除。'); loadLosses(lossDate); loadLedger(ledgerDate) } else setAppMsg(x.error || '删除亏损记录失败。') }
  const switchSection = section => {
    setActiveSection(section)
    if (section === 'inventory') { loadListings(); loadMyShareLink(); if (user?.role === 'owner') loadTeam() }
    if (section === 'ledger') openLedger()
    if (section === 'loss') loadLosses()
    if (section === 'overview' && user?.role === 'owner') loadTeam()
  }
  const lookupLedgerNumber = async index => { const orderNo = String(ledgerRows[index]?.order_no || '').trim(); if (!orderNo) return; const r = await fetch(`/api/ledger-lookup?order_no=${encodeURIComponent(orderNo)}`); const x = await responseJson(r); if (!r.ok) return setAppMsg(x.error || '未找到该上架单。'); setLedgerRows(rows => rows.map((row, i) => i === index ? { ...row, ...x.entry } : row)); setAppMsg(`${x.entry.order_no} 已从上架表读取；保存后会移入利润账单。`) }
  const saveLedger = async () => { if (simulationMode) return setAppMsg('模拟差值练习已完成，不会写入云端。'); setLedgerSaving(true); const r = await fetch('/api/ledger', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: ledgerDate, historical_profit: ledgerSummary?.historical_profit || 0, entries: ledgerRows }) }); const x = await responseJson(r); setLedgerSaving(false); if (r.ok) { setLedgerSummary(x.summary); setLedgerRows(x.entries.length ? x.entries : [blankLedgerRow()]); setAppMsg('每日账单已保存。') } else setAppMsg(x.error || '保存每日账单失败。') }
  const saveListing = async () => { if (!user) return setAppMsg('请先登录，再执行模拟入库。'); if (!result) return setAppMsg('请先完成核算。'); if (simulationMode) return setAppMsg('模拟入库已完成，未写入真实资料库。'); setSaving(true); const r = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...quotePayload(), order_no: orderNo, stage: '已上架' }) }); const x = await responseJson(r); setSaving(false); if (r.ok) { setAppMsg(`上架成功：${x.orderNo || orderNo || '待定'}。`); loadListings() } else setAppMsg(x.error || '上架失败') }

  return <main>
    <header><h1>个人兴趣资料整理学习版</h1><p>{user ? '选择一个兴趣练习区开始整理。资料仅用于个人学习演示。' : '登录后可使用资料整理、参数核算和差值练习。'}</p></header>
    {user && <nav className="workspace-nav" aria-label="工作分区">
      <button className={activeSection === 'overview' ? 'active' : ''} onClick={() => switchSection('overview')}>工作概览</button>
      <button className={activeSection === 'quote' ? 'active' : ''} onClick={() => switchSection('quote')}>资料核算</button>
      {!simulationMode && <button className={activeSection === 'ai' ? 'active' : ''} onClick={() => switchSection('ai')}>AI 助手</button>}
      <button className={activeSection === 'inventory' ? 'active' : ''} onClick={() => switchSection('inventory')}>资料库{listings.length ? ` · ${listings.length}` : ''}</button>
      <button className={activeSection === 'ledger' ? 'active' : ''} onClick={() => switchSection('ledger')}>差值表</button>
      <button className={activeSection === 'loss' ? 'active' : ''} onClick={() => switchSection('loss')}>剩余物资差额表</button>
      {user.role === 'owner' && <button className={activeSection === 'team' ? 'active' : ''} onClick={() => { setActiveSection('team'); loadTeam(); loadShareLinks() }}>团队管理</button>}
    </nav>}
    <section className="card" hidden={user && activeSection !== 'overview'}>
      {user ? <>
      <div className="section-title"><span>当前员工：<b>{user.username}</b>（{roleName[user.role] || user.role} · {user.team_group} 组）</span><button className="secondary" onClick={logout}>退出</button></div>
        <div className="overview-actions"><button onClick={() => switchSection('quote')}>开始核算</button><button className="secondary" onClick={() => switchSection('inventory')}>查看我的资料库</button><button className="secondary" onClick={() => switchSection('ledger')}>查看差值表</button><button className="secondary" onClick={() => switchSection('loss')}>登记剩余物资差额</button></div>
      <div className="totals"><div><span>本组资料记录</span><strong>{listings.length} 条</strong></div><div><span>每月差值</span><strong>{Number(ledgerSummary?.net_profit || 0).toFixed(2)}</strong></div></div>
        <button className="secondary" onClick={listToWps}>查看 / 导出 WPS 资料表</button>
      </> : <>
        <h2>{authMode === 'login' ? '登录' : authMode === 'reset' ? '重置密码' : '注册账号'}</h2>
        <div className="grid"><label>账号<input value={auth.username} onChange={e => setAuth({ ...auth, username: e.target.value })} /></label>{authMode !== 'reset' && <label>密码<input type="password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} /></label>}{authMode === 'register' && <><label>密保问题<input value={auth.question} onChange={e => setAuth({ ...auth, question: e.target.value })} /></label><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label></>}{authMode === 'reset' && <><label>密保答案<input type="password" value={auth.answer} onChange={e => setAuth({ ...auth, answer: e.target.value })} /></label><label>新密码<input type="password" value={auth.newPassword} onChange={e => setAuth({ ...auth, newPassword: e.target.value })} /></label></>}</div>
        {authMode === 'reset' && <><button className="secondary" onClick={lookupSecurityQuestion}>查看密保问题</button>{securityQuestion && <p className="notice">密保问题：{securityQuestion}</p>}</>}
        <button onClick={submitAuth}>{authMode === 'login' ? '登录' : authMode === 'reset' ? '确认重置' : '注册'}</button><button className="secondary" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setSecurityQuestion('') }}>{authMode === 'login' ? '没有账号？注册' : '返回登录'}</button>{authMode === 'login' && <button className="secondary" onClick={() => setAuthMode('reset')}>忘记密码</button>}{authMsg && <p className="notice">{authMsg}</p>}
      </>}
    </section>
  {user && <section className="card" hidden={activeSection !== 'team' || user.role !== 'owner'}><div className="section-title"><h2>团队与资料链接管理</h2><div className="button-row"><button className="secondary" onClick={loadTeam}>刷新成员</button><button className="secondary" onClick={loadShareLinks}>刷新链接</button></div></div><p className="notice">每个学习分组使用一条只读公开资料链接；关闭后立即失效，重新生成会使用新链接代码。</p><div className="share-link-list">{shareLinks.map(link => <div className="share-link-row" key={link.team_group}><span><b>{link.team_group} 组</b><small>{link.share_code || '尚未生成链接'}</small></span>{link.share_code ? <><button onClick={() => copyShareLink(link.share_code)}>复制链接</button><button className="secondary" onClick={() => removeShareLink(link)}>关闭链接</button></> : <button onClick={() => createShareLink(link.team_group)} disabled={shareLinkLoading}>{shareLinkLoading ? '生成中…' : '生成链接'}</button>}</div>)}</div>{team.length > 0 ? <div className="team-list">{team.map(x => <div className="team-row" key={x.id}><span><b>{x.username}</b> · {roleName[x.role] || x.role}</span><span>{x.team_group} 组 · 已上架 {x.orders} 单</span>{x.role !== 'owner' && <select className="role-select" aria-label={x.username + '职位'} value={x.role} onChange={e => updateMember(x.id,{role:e.target.value})}><option value="supervisor">主管</option><option value="staff">员工</option></select>}<input className="group-input" aria-label={x.username + '分组'} defaultValue={x.team_group || 'A'} maxLength="20" onBlur={e => updateMember(x.id,{team_group:e.target.value})} />{x.role !== 'owner' && <button className="text-button" onClick={() => removeMember(x.id)}>删除员工</button>}</div>)}</div> : <p>暂无团队账号。</p>}</section>}
    {user && <section className="card" hidden={activeSection !== 'ai'}><div className="section-title"><h2>简版 AI 客服</h2><span className="notice">仅生成草稿，不会自动发送或上架</span></div><p className="notice">可处理资料模板、报价引导、已核定报价和常见时效问题。涉及付款、封禁、人脸、改名、皮肤或上架确认会转人工。先在“报价工作台”完成计算后，这里只会带入客户可见的老板报价。</p><label>客户原话<textarea value={aiMessage} onChange={e => setAiMessage(e.target.value)} placeholder="例如：这个号怎么报价？资料怎么发？" /></label><div className="button-row"><button onClick={generateAiReply} disabled={aiLoading}>{aiLoading ? '正在生成…' : '生成简版客服回复'}</button><button className="secondary" onClick={handoffToHuman}>转人工</button></div>{aiReply && <div className="ai-reply"><div className="section-title"><h3>发送前请核对</h3><button className="secondary" onClick={copyAiReply}>复制草稿</button></div><pre>{aiReply}</pre></div>}</section>}
    {user && <section className="card" hidden={activeSection !== 'inventory'}>
      <div className="section-title"><h2>我的上架库</h2><div className="button-row"><button className="secondary" onClick={loadListings}>{listingsLoading ? '读取中…' : '刷新'}</button>{user.role === 'owner' && <button className="secondary" onClick={() => { setActiveSection('team'); loadTeam(); loadShareLinks() }}>管理公开资料链接</button>}</div></div>
      {user.role === 'owner' && <div className="inventory-filter"><span>查看库存：</span><button className={inventoryOwnerFilter === 'all' ? 'active' : 'secondary'} onClick={() => setInventoryOwnerFilter('all')}>全部库存</button>{team.filter(member => member.role !== 'owner').map(member => <button className={inventoryOwnerFilter === member.username ? 'active' : 'secondary'} key={member.id} onClick={() => setInventoryOwnerFilter(member.username)}>{member.username}</button>)}</div>}
      {visibleListings.length ? <div className="listing-list">{visibleListings.map(item => <div className="listing-row" key={item.source_order_id}><div><b>{item.order_no}</b><span>{item.hafu_m}m · {item.insurance_stamina}</span><small>{item.note || '无备注'}</small></div><div><span>号主 {item.boss_final} · 打手 {item.worker_final}</span><strong>利润 {item.profit} 元</strong></div><div><button onClick={() => sellListing(item)}>已售出</button><button className="text-button" onClick={() => deleteListing(item)}>删除</button></div></div>)}</div> : <p>{listingsLoading ? '正在读取上架库…' : '当前没有待售上架单。'}</p>}
      <div className="section-title inventory-table-title"><h3>上架库存表</h3><button className="secondary" onClick={downloadInventory}>下载彩色库存表</button></div>
      <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>序号</th><th>纯币(m)</th><th>保险/体负</th><th>打手比例</th><th>大区</th><th>登录方式</th><th>全包价格</th><th>红皮 / 刀皮 / 砖皮</th><th>AW</th><th>红甲</th><th>红头</th><th>45包</th><th>在线时间</th><th>绝密 KD</th><th>段位</th></tr></thead><tbody>{visibleListings.length ? visibleListings.map(item => <tr key={'table-' + item.source_order_id}><td>{item.order_no}</td><td className={coinTone(item.hafu_m)}>{item.hafu_m}</td><td>{item.insurance_stamina}</td><td>{item.worker_ratio || '—'}</td><td>{item.region || '—'}</td><td>{item.login || '—'}</td><td>{item.worker_final}</td><td>{inventorySkins(item)}</td><td className={awTone(item.aw)}>{item.aw}</td><td>{item.armor}</td><td>{item.redhead}</td><td>{item.redbag}</td><td>{item.online || '—'}</td><td>{item.kd || '—'}</td><td>{item.rank || '—'}</td></tr>) : <tr><td className="inventory-empty" colSpan="15">暂无待售上架单</td></tr>}</tbody></table></div>{myShareLink ? <p className="notice">个人资料链接：<a href={`/stock/${encodeURIComponent(myShareLink.share_code)}`} target="_blank" rel="noreferrer">查看我的全部上架账号</a></p> : <p className="notice"><button className="secondary" onClick={createMyShareLink}>生成我的个人资料链接</button></p>}
    </section>}
  {user && <section className="card" hidden={activeSection !== 'loss'}><div className="section-title"><h2>亏损表</h2><button className="secondary" onClick={() => loadLosses(lossDate)}>刷新</button></div><p className="notice">粘贴剩余物资资料后自动识别，再核对并写入本组共享的独立亏损账。满耐六头、六甲按商行损耗计算；多打物品不填，按初始数据登记。</p><label>1. 粘贴剩余物资资料<textarea value={lossMessage} onChange={e => setLossMessage(e.target.value)} placeholder={'例如：\n编号：K170\nAW：9\n满耐六头：6\n满耐六甲：2\n45包：3'} /></label><button className="secondary" onClick={organizeLoss}>自动识别剩余物资</button><h3>2. 核对并计算</h3><div className="grid"><label>亏损日期<input type="date" value={lossDate} onChange={e => { setLossDate(e.target.value); loadLosses(e.target.value) }} /></label><label>群名中的编号<input value={lossForm.order_no} onChange={e => setLossForm({ ...lossForm, order_no:e.target.value })} placeholder="例如 K170" /></label><label>AW 剩余<input type="number" min="0" value={lossForm.aw} onChange={e => setLossForm({ ...lossForm, aw:e.target.value })} /></label><label>六头（满耐）<input type="number" min="0" value={lossForm.six_head} onChange={e => setLossForm({ ...lossForm, six_head:e.target.value })} /></label><label>六甲（满耐）<input type="number" min="0" value={lossForm.six_armor} onChange={e => setLossForm({ ...lossForm, six_armor:e.target.value })} /></label><label>45格包<input type="number" min="0" value={lossForm.bag45} onChange={e => setLossForm({ ...lossForm, bag45:e.target.value })} /></label><label>备注（可选）<input value={lossForm.note} onChange={e => setLossForm({ ...lossForm, note:e.target.value })} placeholder="例如 0829 剩余资产" /></label></div><div className="totals"><div><span>商行价</span><strong>{lossPreview.discounted_total.toFixed(2)} 元</strong></div><div><span>原价</span><strong>{lossPreview.original_total.toFixed(2)} 元</strong></div><div><span>本条亏损</span><strong>{lossPreview.loss.toFixed(2)} 元</strong></div></div><p className="notice">计算：商行价 = AW×0.7 + 六头×1 + 六甲×2 + 45包×2；原价 = AW×0.7 + 六头×2 + 六甲×2 + 45包×3。</p><button onClick={saveLoss} disabled={lossSaving}>{lossSaving ? '正在保存…' : '确认写入亏损表'}</button>{lossRows.length ? <div className="loss-list">{lossRows.map(record => <div className="loss-row" key={record.id}><span><b>{record.loss_date} · {record.order_no}</b><small>AW{record.aw} / 六头{record.six_head} / 六甲{record.six_armor} / 45包{record.bag45}{record.note ? ` · ${record.note}` : ''}</small></span><span>商行价 {Number(record.discounted_total).toFixed(2)} · 原价 {Number(record.original_total).toFixed(2)}<strong>亏损 {Number(record.loss).toFixed(2)} 元</strong></span><button className="text-button" onClick={() => deleteLoss(record)}>删除</button></div>)}</div> : <p className="notice">该日期还没有亏损记录。</p>}{lossSummary && <div className="totals"><div><span>本月亏损</span><strong>{Number(lossSummary.loss || 0).toFixed(2)} 元</strong></div><div><span>当月成交利润</span><strong>{Number(lossSummary.cumulative_profit || 0).toFixed(2)} 元</strong></div><div><span>每月利润（已扣亏损）</span><strong>{Number(lossSummary.net_profit || 0).toFixed(2)} 元</strong></div></div>}</section>}
    {user && ledgerOpen && <section className="card" hidden={activeSection !== 'ledger'}><div className="section-title"><h2>利润表</h2></div><div className="grid"><label>账单日期<input type="date" value={ledgerDate} onChange={e => { setLedgerDate(e.target.value); loadLedger(e.target.value) }} /></label></div><p className="notice">当日利润总和由每单差值自动相加。手动补录时，输入上架编号后点“读取”。亏损请在独立的“亏损表”登记。</p><div className="ledger-table"><div className="ledger-head"><span>编号</span><span>读取</span><span>纯币(m)</span><span>保险/体负</span><span>号主到手</span><span>打手到手</span><span>利润</span><span>备注</span></div>{ledgerRows.map((row,index) => <div className="ledger-row" key={index}><input value={row.order_no} onChange={e => updateLedgerRow(index,'order_no',e.target.value)} onBlur={() => lookupLedgerNumber(index)} placeholder="L01" /><button className="secondary read-button" onClick={() => lookupLedgerNumber(index)}>读取</button><input type="number" value={row.hafu_m} onChange={e => updateLedgerRow(index,'hafu_m',e.target.value)} /><input value={row.insurance_stamina} onChange={e => updateLedgerRow(index,'insurance_stamina',e.target.value)} placeholder="9格/满" /><input type="number" value={row.boss_final} onChange={e => updateLedgerRow(index,'boss_final',e.target.value)} /><input type="number" value={row.worker_final} onChange={e => updateLedgerRow(index,'worker_final',e.target.value)} /><strong>{Number(row.worker_final || 0) - Number(row.boss_final || 0)}</strong><input value={row.note} onChange={e => updateLedgerRow(index,'note',e.target.value)} placeholder="皮肤、物品等" /><button className="text-button" onClick={() => setLedgerRows(rows => rows.length === 1 ? [blankLedgerRow()] : rows.filter((_,i) => i !== index))}>删除</button></div>)}</div><button className="secondary" onClick={() => setLedgerRows(rows => [...rows, blankLedgerRow()])}>新增一单</button><div className="totals"><div><span>成交单量</span><strong>{ledgerTotals.orders} 单</strong></div><div><span>纯币合计</span><strong>{ledgerTotals.hafu}m</strong></div><div><span>当日利润总和</span><strong>{ledgerTotals.profit} 元</strong></div></div>{ledgerSummary && <div className="totals"><div><span>本月亏损</span><strong>{Number(ledgerSummary.loss || 0).toFixed(2)} 元</strong></div><div><span>当月成交利润</span><strong>{Number(ledgerSummary.cumulative_profit || 0).toFixed(2)} 元</strong></div><div><span>每月利润（已扣亏损）</span><strong>{Number(ledgerSummary.net_profit || 0).toFixed(2)} 元</strong></div></div>}<button onClick={saveLedger} disabled={ledgerSaving}>{ledgerSaving ? '正在保存…' : '保存利润表'}</button></section>}
    <section className="card" hidden={user && activeSection !== 'quote'}><h2>1. 粘贴号主资料</h2><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="把号主发来的整段资料直接粘贴到这里" /><button onClick={organize}>自动识别资料</button></section>
    <section className="card" hidden={user && activeSection !== 'quote'}><h2>2. 核对资料与比例</h2><div className="grid"><label>大区<input value={fields.region || ''} onChange={e => setFields({ ...fields, region: e.target.value })} /></label><label>哈夫（m）<input type="number" value={fields.hafu_m || ''} onChange={e => setFields({ ...fields, hafu_m: Number(e.target.value) })} /></label><label>号主比例<input type="number" value={bossRatio} onChange={e => setBossRatio(e.target.value)} /></label><label>打手比例<input type="number" value={workerRatio} onChange={e => setWorkerRatio(e.target.value)} /></label></div><button onClick={runCalculation}>计算报价</button></section>
    <section className="card results" hidden={user && activeSection !== 'quote'}><h2>3. 计算结果（内部）</h2>{result ? <><div className="totals"><div><span>号主到手</span><strong>{result.boss.final} 元</strong></div><div><span>打手到手</span><strong>{result.worker.final} 元</strong></div><div><span>差值</span><strong>{result.difference} 元</strong></div></div><div className="grid"><label>上架编号（可选）<input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="例如 Q20260830-01" /></label></div><button onClick={saveListing} disabled={saving}>{saving ? '正在上架…' : '号主同意，上架到 WPS'}</button></> : <p>资料或比例未填写完整。</p>}</section>
    <section className="card" hidden={user && activeSection !== 'quote'}><div className="section-title"><h2>客户回复</h2><button className="secondary" onClick={copy}>复制</button></div><pre>{customerText}</pre></section>
    <p className="notice">{appMsg || '未获得号主同意时只计算、不保存；只有“号主同意，上架到 WPS”会写入云端账单。'}</p>
  </main>
}

createRoot(document.getElementById('root')).render(location.pathname.startsWith('/stock/') ? <PublicStock /> : <App />)
