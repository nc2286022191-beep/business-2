const encoder = new TextEncoder()
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
const fail = (message, status = 400) => json({ error: message }, status)
const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('')

async function digest(value, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256))
}
async function passwordRecord(password) { const salt = crypto.randomUUID(); return { salt, hash: await digest(password, salt) } }
const validText = (value, max = 5000) => String(value ?? '').trim().slice(0, max)
function cookie(request, name) { return request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] }
async function actor(request, env) {
  const raw = cookie(request, 'bw_session'); if (!raw) return null
  const tokenHash = await digest(raw, 'business-2-session-v1')
  return env.DB.prepare(`SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash, now()).first()
}
async function issueSession(userId, env) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`
  const tokenHash = await digest(token, 'business-2-session-v1')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(tokenHash, userId, expires).run()
  return `bw_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
}
function parse(message) {
  const take = label => message.match(new RegExp(`(?:${label})[^：:\\n]*[：:]\\s*([^\\n]+)`, 'i'))?.[1]?.trim() || ''
  const number = value => Number(String(value).match(/\\d+(?:\\.\\d+)?/)?.[0] || 0)
  return { region: take('大区').replace(/qq/i,'Q'), warehouse_m:number(take('仓库资产')), hafu_m:number(take('哈夫数量')), stamina:take('体力和负重等级'), insurance:number(take('保险')), nine_card:take('九格体验卡'), login:take('登陆方式|登录方式'), red_skin:take('干员红皮'), gold_skin:take('干员金皮'), knife_skin:take('刀皮'), brick_skin:take('砖皮'), armor:number(take('红甲多少件')), redhead:number(take('红头')), redbag:number(take('45红包')), aw:number(take('AW子弹')), face:take('过人脸'), ban:take('账号是否有封禁'), online:take('在线时间'), rank:take('段位'), kd:take('绝密kd'), rename:take('能否改名'), source:take('从哪个主播看见我们的') }
}
function calculate(p) {
  const n = x => Number(x || 0), h = n(p.hafu_m), bossRatio=n(p.boss_ratio), workerRatio=n(p.worker_ratio)
  if (!(h>0 && bossRatio>0 && workerRatio>0)) throw new Error('哈夫数量、老板比例和打手比例必须大于 0。')
  const aw=n(p.aw), redhead=n(p.redhead), armor=n(p.armor), redbag=n(p.redbag)
  const bossCurrency=h/bossRatio*100, workerCurrency=h/workerRatio*100
  const bossExtra=aw*.7+redhead+armor*2+redbag*2, workerExtra=aw*.7+redhead*2+armor*2+redbag*3
  const bossFinal=Math.floor((bossCurrency+bossExtra)*.94), workerFinal=Math.ceil((workerCurrency+workerExtra)*1.04)
  const skins=[p.red_skin,p.knife_skin,p.brick_skin].filter(x=>x && !['无','没有'].includes(x)).join(' / ') || '无'
  const itemNote=`纯币+AW${aw}+红头${redhead}+红甲${armor}+45红包${redbag}`
  return { boss:{final:String(bossFinal)},worker:{final:String(workerFinal)},difference:String(workerFinal-bossFinal),skins,item_note:itemNote,customer_text:`【报价计算明细】\n老板（比例 ${bossRatio}）：\n${h} ÷ ${bossRatio} × 100 = ${bossCurrency.toFixed(2)} 纯币\nAW：${aw} × 0.7 = ${(aw*.7).toFixed(2)}\n红头红甲：${redhead} + ${armor} × 2 = ${(redhead+armor*2).toFixed(2)}\n45红包：${redbag} × 2 = ${(redbag*2).toFixed(2)}\n老板到手：${bossFinal} 元\n\n如同意上架，请明确回复“可以上架”。` }
}

export async function onRequest({ request, env }) {
  if (!env.DB) return fail('云端数据库尚未绑定，请联系总设计师完成部署。', 503)
  const url = new URL(request.url), path = url.pathname.replace(/^\/api/, '') || '/'
  if (request.method === 'GET' && path === '/security-question') { const username=validText(url.searchParams.get('username'),80); if(!username)return fail('请先填写账号。'); const user=await env.DB.prepare('SELECT security_question FROM users WHERE username=?').bind(username).first(); return user ? json({question:user.security_question}) : fail('账号不存在。',404) }
  if (request.method === 'GET' && path === '/me') { const user=await actor(request,env); return user ? json({user}) : fail('请先登录',401) }
  if (request.method === 'GET' && path === '/orders') { const user=await actor(request,env); if(!user)return fail('请先登录',401); const query=user.role==='owner'?'SELECT o.id,o.order_no,o.stage,o.created_at,u.username,payload_json,calculation_json FROM orders o JOIN users u ON u.id=o.operator_id WHERE o.deleted_at IS NULL ORDER BY o.created_at DESC':'SELECT o.id,o.order_no,o.stage,o.created_at,? AS username,payload_json,calculation_json FROM orders o WHERE o.operator_id=? AND o.deleted_at IS NULL ORDER BY o.created_at DESC'; const rows=await env.DB.prepare(query).bind(...(user.role==='owner'?[]:[user.username,user.id])).all(); return json({orders:rows.results||[]}) }
  if (request.method === 'GET' && path === '/team') { const user=await actor(request,env); if(!user)return fail('请先登录',401); if(user.role!=='owner')return fail('仅总设计师可查看团队',403); const rows=await env.DB.prepare("SELECT u.id,u.username,u.role,u.created_at,COUNT(o.id) AS orders FROM users u LEFT JOIN orders o ON o.operator_id=u.id AND o.deleted_at IS NULL GROUP BY u.id ORDER BY u.created_at").all(); return json({members:rows.results||[]}) }
  if (request.method === 'DELETE' && path.startsWith('/team/')) { const user=await actor(request,env); if(!user)return fail('请先登录',401); if(user.role!=='owner')return fail('仅总设计师可管理员工',403); const target=path.slice('/team/'.length); if(!target || target===user.id)return fail('不能删除当前总设计师账号。'); const found=await env.DB.prepare('SELECT id,role FROM users WHERE id=?').bind(target).first(); if(!found)return fail('员工不存在。',404); if(found.role==='owner')return fail('不能删除总设计师账号。'); await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target).run(); await env.DB.prepare('DELETE FROM users WHERE id=?').bind(target).run(); return json({deleted:true}) }
  if (request.method === 'GET' && path === '/wps.csv') { const user=await actor(request,env); if(!user)return fail('请先登录',401); const rows=await env.DB.prepare(user.role==='owner'?'SELECT o.order_no,o.stage,o.payload_json,o.calculation_json,u.username FROM orders o JOIN users u ON u.id=o.operator_id WHERE o.deleted_at IS NULL ORDER BY json_extract(o.payload_json,\'$.hafu_m\') ASC':'SELECT o.order_no,o.stage,o.payload_json,o.calculation_json,? AS username FROM orders o WHERE o.operator_id=? AND o.deleted_at IS NULL ORDER BY json_extract(o.payload_json,\'$.hafu_m\') ASC').bind(...(user.role==='owner'?[]:[user.username,user.id])).all(); const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"'; const head=['编号','纯币(m)','保险体负','比例','大区','登录方式','老板到手','打手到手','差值','皮肤','计费项','操作人']; const csv='\uFEFF'+[head,...(rows.results||[]).map(r=>{const p=JSON.parse(r.payload_json),c=JSON.parse(r.calculation_json);return[r.order_no,p.hafu_m,`${p.insurance||''}格/${p.stamina||''}`,`${p.boss_ratio||''}/${p.worker_ratio||''}`,p.region||'',p.login||'',c.boss?.final||'',c.worker?.final||'',c.difference||'',c.skins||'',c.item_note||'',r.username]})].map(a=>a.map(esc).join(',')).join('\r\n'); return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="wps-listing.csv"'}}) }
  if (request.method !== 'POST') return fail('未找到接口',404)
  let body={}; try { body=await request.json() } catch { return fail('请求格式错误') }
  if (path === '/register') {
    const username=validText(body.username,80), password=String(body.password||''), question=validText(body.question,200), answer=String(body.answer||'')
    if (username.length<2 || password.length<8 || question.length<4 || answer.length<2) return fail('账号至少 2 位，密码至少 8 位，并完整设置密保。')
    const count=await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first(), role=Number(count.count)===0?'owner':'staff'
    const passwordData=await passwordRecord(password), answerData=await passwordRecord(answer), userId=id()
    try { await env.DB.prepare('INSERT INTO users(id,username,role,password_salt,password_hash,security_question,security_answer_salt,security_answer_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(userId,username,role,passwordData.salt,passwordData.hash,question,answerData.salt,answerData.hash,now()).run() } catch { return fail('该账号已存在。') }
    return json({user:{username,role}},200,{'set-cookie':await issueSession(userId,env)})
  }
  if (path === '/login') {
    const username=validText(body.username,80), user=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first()
    if (!user || user.password_hash !== await digest(String(body.password||''),user.password_salt)) return fail('账号或密码错误。',401)
    return json({user:{username:user.username,role:user.role}},200,{'set-cookie':await issueSession(user.id,env)})
  }
  if (path === '/password-reset') {
    const username=validText(body.username,80), answer=String(body.answer||''), newPassword=String(body.newPassword||'')
    if(newPassword.length<8)return fail('新密码至少 8 位。')
    const user=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first()
    if(!user || user.security_answer_hash!==await digest(answer,user.security_answer_salt))return fail('账号或密保答案错误。',401)
    const passwordData=await passwordRecord(newPassword)
    await env.DB.prepare('UPDATE users SET password_salt=?,password_hash=? WHERE id=?').bind(passwordData.salt,passwordData.hash,user.id).run()
    await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run()
    return json({reset:true})
  }
  if (path === '/logout') { const raw=cookie(request,'bw_session'); if(raw)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(raw,'business-2-session-v1')).run(); return json({ok:true},200,{'set-cookie':'bw_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}) }
  if (path === '/parse') return json({fields:parse(validText(body.message))})
  const user=await actor(request,env); if (!user) return fail('请先登录',401)
  if (path === '/calculate') { try { const result=calculate(body); if(user.role!=='owner'){ result.worker={final:'仅总设计师可见'}; result.difference='仅总设计师可见' } return json(result) } catch(e){ return fail(e.message) } }
  if (path === '/orders') { try { const result=calculate(body); const stage=body.stage==='已上架'?'已上架':'待号主确认'; const orderNo=validText(body.order_no,80)||'待定'; await env.DB.prepare('INSERT INTO orders(id,order_no,operator_id,stage,payload_json,calculation_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(id(),orderNo,user.id,stage,JSON.stringify(body),JSON.stringify(result),now()).run(); return json({saved:true,stage,orderNo}) } catch(e){return fail(e.message)} }
  return fail('未找到接口',404)
}
