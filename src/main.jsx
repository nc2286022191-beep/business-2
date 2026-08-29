import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const defaults = { bossRatio: '47', workerRatio: '45' }

function extract(message, label) {
  const match = message.match(new RegExp(`(?:${label})[^：:\\n]*[：:]\\s*([^\\n]+)`, 'i'))
  return match?.[1]?.trim() || ''
}

function parseNumber(value) {
  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function parseMessage(message) {
  return {
    region: extract(message, '大区').replace(/qq/i, 'Q'),
    warehouse: parseNumber(extract(message, '仓库资产')),
    hafu: parseNumber(extract(message, '哈夫数量')),
    insurance: parseNumber(extract(message, '保险')),
    stamina: extract(message, '体力和负重等级'),
    login: extract(message, '登陆方式|登录方式'),
    armor: parseNumber(extract(message, '红甲多少件')),
    redhead: parseNumber(extract(message, '红头')),
    redbag: parseNumber(extract(message, '45红包')),
    aw: parseNumber(extract(message, 'AW子弹')),
    rank: extract(message, '段位'),
  }
}

function calculate(fields, bossRatio, workerRatio) {
  const boss = Number(bossRatio)
  const worker = Number(workerRatio)
  if (!(fields.hafu > 0 && boss > 0 && worker > 0)) return null
  const aw = fields.aw * 0.7
  const bossItems = fields.redhead + fields.armor * 2 + fields.redbag * 2
  const workerItems = fields.redhead * 2 + fields.armor * 2 + fields.redbag * 3
  const bossFinal = Math.floor(((fields.hafu / boss) * 100 + aw + bossItems) * 0.94)
  const workerFinal = Math.ceil(((fields.hafu / worker) * 100 + aw + workerItems) * 1.04)
  return { bossFinal, workerFinal, difference: workerFinal - bossFinal, aw, bossItems }
}

function App() {
  const [user,setUser]=useState(null),[auth,setAuth]=useState({username:'',password:'',question:'',answer:''}),[authMode,setAuthMode]=useState('login'),[authMsg,setAuthMsg]=useState('')
  const [message, setMessage] = useState('')
  const [fields, setFields] = useState({})
  const [bossRatio, setBossRatio] = useState(defaults.bossRatio)
  const [workerRatio, setWorkerRatio] = useState(defaults.workerRatio)
  const [result, setResult] = useState(null)
  const organize = () => { setFields(parseMessage(message)); setResult(null) }
  const runCalculation = () => setResult(calculate(fields, bossRatio, workerRatio))
  const customerText = result ? `【报价计算明细】\n老板（比例 ${bossRatio}）：\n${fields.hafu} ÷ ${bossRatio} × 100 = ${(fields.hafu / Number(bossRatio) * 100).toFixed(2)} 纯币\nAW：${fields.aw} × 0.7 = ${result.aw.toFixed(2)}\n红头红甲红包：${result.bossItems.toFixed(2)}\n老板到手：${result.bossFinal} 元\n\n如同意上架，请明确回复“可以上架”。` : '请先粘贴资料并填写比例。'
  const copy = async () => navigator.clipboard.writeText(customerText)
  useEffect(()=>{fetch('/api/me').then(r=>r.ok?r.json():null).then(x=>setUser(x?.user||null)).catch(()=>{})},[])
  const submitAuth=async()=>{const route=authMode==='login'?'/api/login':'/api/register';const r=await fetch(route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(auth)}),x=await r.json();if(r.ok){setUser(x.user);setAuthMsg('登录成功。')}else setAuthMsg(x.error||'操作失败')}
  const logout=async()=>{await fetch('/api/logout',{method:'POST'});setUser(null)}

  return <main>
    <header><p className="eyebrow">BUSINESS 2</p><h1>商行报价工作台</h1><p>粘贴资料、填写比例、生成客户报价。</p></header>
    <section className="card">{user?<div className="section-title"><span>当前员工：<b>{user.username}</b>（{user.role}）</span><button className="secondary" onClick={logout}>退出</button></div>:<><h2>{authMode==='login'?'登录':'注册首个总设计师/员工'}</h2><div className="grid"><label>账号<input value={auth.username} onChange={e=>setAuth({...auth,username:e.target.value})}/></label><label>密码<input type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/></label>{authMode==='register'&&<><label>密保问题<input value={auth.question} onChange={e=>setAuth({...auth,question:e.target.value})}/></label><label>密保答案<input type="password" value={auth.answer} onChange={e=>setAuth({...auth,answer:e.target.value})}/></label></>}</div><button onClick={submitAuth}>{authMode==='login'?'登录':'注册'}</button><button className="secondary" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'没有账号？注册':'已有账号？登录'}</button><p className="notice">{authMsg||'首个注册账户将成为总设计师。'}</p></>}</section>
    <section className="card">
      <h2>1. 粘贴号主资料</h2>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="把号主发来的整段资料直接粘贴到这里" />
      <button onClick={organize}>自动整理资料</button>
    </section>
    <section className="card">
      <h2>2. 核对资料与比例</h2>
      <div className="grid">
        <label>大区<input value={fields.region || ''} onChange={e => setFields({...fields, region:e.target.value})}/></label>
        <label>哈夫（m）<input type="number" value={fields.hafu || ''} onChange={e => setFields({...fields, hafu:Number(e.target.value)})}/></label>
        <label>老板比例<input type="number" value={bossRatio} onChange={e => setBossRatio(e.target.value)}/></label>
        <label>打手比例<input type="number" value={workerRatio} onChange={e => setWorkerRatio(e.target.value)}/></label>
      </div>
      <button onClick={runCalculation}>计算报价</button>
    </section>
    <section className="card results">
      <h2>3. 计算结果</h2>
      {result ? <div className="totals"><div><span>老板到手</span><strong>{result.bossFinal} 元</strong></div><div><span>打手到手</span><strong>{result.workerFinal} 元</strong></div><div><span>差值</span><strong>{result.difference} 元</strong></div></div> : <p>资料或比例未填写完整。</p>}
    </section>
    <section className="card"><div className="section-title"><h2>客户回复</h2><button className="secondary" onClick={copy}>复制</button></div><pre>{customerText}</pre></section>
    <p className="notice">云端演示版不会上传或保存客户资料。团队登录、共享账单与 WPS 上架需迁移为带数据库的服务端版本后再启用。</p>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
