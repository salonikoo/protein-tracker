import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const todayKey = () => new Date().toISOString().slice(0, 10)
const fmt = (d) => new Date(d).toLocaleDateString('he-IL')
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const defaultSettings = {
  unit: 'kg',
  weight: 75,
  autoTarget: true,
  gramsPerKg: 1.6,
  targetCustom: 120,
  reminder: false,
  autoCalcFromName: true,
}

function loadLS(key, fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback }catch{return fallback} }
function saveLS(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)) }catch{} }

function calcTarget(sett){
  if(!sett) return 120
  if(!sett.autoTarget) return clamp(Number(sett.targetCustom)||0, 20, 350)
  const weightKg = sett.unit==='kg' ? Number(sett.weight) : Number(sett.weight)*0.453592
  const target = (Number(sett.gramsPerKg)||1.6) * (weightKg||0)
  return clamp(Math.round(target), 20, 350)
}

function useSettings(){
  const [settings, setSettings] = useState(()=>loadLS('protein_settings_v1', defaultSettings))
  useEffect(()=>saveLS('protein_settings_v1', settings),[settings])
  const target = useMemo(()=>calcTarget(settings),[settings])
  return { settings, setSettings, target }
}

function useDiary(){
  const [entries, setEntries] = useState(()=>loadLS('protein_entries_v1', {}))
  useEffect(()=>saveLS('protein_entries_v1', entries),[entries])
  const add=(dateKey,item)=>setEntries(prev=>{ const day=prev[dateKey]?[...prev[dateKey]]:[]; const id=crypto.randomUUID(); day.push({id,...item}); return {...prev,[dateKey]:day} })
  const remove=(dateKey,id)=>setEntries(prev=>({...prev,[dateKey]:(prev[dateKey]||[]).filter(x=>x.id!==id)}))
  const edit=(dateKey,id,patch)=>setEntries(prev=>({...prev,[dateKey]:(prev[dateKey]||[]).map(x=>x.id===id?{...x,...patch}:x)}))
  return { entries, add, remove, edit }
}

function sumGrams(list=[]){ return list.reduce((a,x)=>a+(Number(x.grams)||0),0) }

// Parser — Hebrew free text
function parseAutoProtein(text=""){
  if(!text) return 0
  const t=text.toLowerCase().trim()
  const numWords={"אפס":0,"אחד":1,"אחת":1,"שניים":2,"שתיים":2,"שלוש":3,"ארבע":4,"חמש":5,"שש":6,"שבע":7,"שמונה":8,"תשע":9,"עשר":10}
  const wordToNum=(s)=>{for(const k in numWords){if(s.includes(k))return numWords[k]}return null}
  const firstNumber=(s)=>{let num="";let seen=false;for(let i=0;i<s.length;i++){const c=s[i];if((c>='0'&&c<='9')||c==='.'||c===','){num+=(c===','?'.':c);seen=true}else if(seen)break}return num?Number(num):null}
  const contains=(w)=>t.indexOf(w)!==-1
  const per100=(rate,grams)=>Math.round((rate*grams)/100)

  // eggs / omelette
  if(contains('ביצה')||contains('חביתה')){ const count=firstNumber(t)??wordToNum(t)??1; return Math.round(count*6) }
  // protein scoop
  if(contains('סקופ')||contains('אבקת חלבון')||contains('חלבון מי גבינה')){ const c=firstNumber(t)??wordToNum(t)??1; return Math.round(c*25) }
  // chicken/turkey
  if(contains('חזה עוף')||contains('עוף')||contains('הודו')){ const g=contains('גרם')?(firstNumber(t)??150):150; return per100(31,g) }
  // tuna
  if(contains('טונה')){ if(contains('גרם')) return per100(26,firstNumber(t)??120); if(contains('קופסה')||contains('פחית')) return 24; return 20 }
  // yogurt/skyr/greek
  if(contains('יוגורט')||contains('סקייר')||contains('skyr')||contains('יווני')){ const g=contains('גרם')?(firstNumber(t)??200):200; return per100(10,g) }
  // cottage
  if(contains('קוטג')){ const g=contains('גרם')?(firstNumber(t)??150):150; return per100(11,g) }
  // cheese slice
  if(contains('גבינה צהובה')||contains('פרוסת גבינה')||contains('פרוסה')){ const s=firstNumber(t)??wordToNum(t)??1; return s*6 }
  // beef / steak
  if(contains('בשר')||contains('סטייק')){ const g=contains('גרם')?(firstNumber(t)??150):150; return per100(26,g) }
  // plant milks & dairy
  if(contains('חלב שקדים')){ const ml=(contains('מל')||contains('ml'))?(firstNumber(t)??250):250; return per100(0.5,ml) }
  if(contains('חלב סויה')||(contains('סויה')&&contains('חלב'))){ const ml=(contains('מל')||contains('ml'))?(firstNumber(t)??250):250; return per100(3.3,ml) }
  if(contains('חלב')){ const ml=(contains('מל')||contains('ml'))?(firstNumber(t)??250):250; return per100(3.4,ml) }
  // pita / bread
  if(contains('פיתה')){ if(contains('גרם')) return per100(9,firstNumber(t)??60); const c=firstNumber(t)??wordToNum(t)??1; return Math.round(c*per100(9,60)) }
  if(contains('לחם חלבוני')){ if(contains('גרם')) return per100(20,firstNumber(t)??30); const s=firstNumber(t)??wordToNum(t)??(contains('פרוסה')?1:2); return s*10 }
  if(contains('לחם')){ if(contains('גרם')) return per100(8,firstNumber(t)??30); const s=firstNumber(t)??wordToNum(t)??(contains('פרוסה')?1:2); return s*3 }
  // defaults without grams
  if(contains('סלמון')&&!contains('גרם')) return per100(20,150)
  if(contains('עדשים')&&!contains('גרם')) return per100(9,150)
  // generic grams
  if(contains('גרם')&&(contains('דג')||contains('סלמון')||contains('טופו')||contains('עדשים'))){
    const g=firstNumber(t)??150
    const base=contains('סלמון')?20:contains('טופו')?8:contains('עדשים')?9:20
    return per100(base,g)
  }
  return 0
}

export default function App(){
  const { settings, setSettings, target } = useSettings()
  const { entries, add, remove, edit } = useDiary()
  const [dateKey, setDateKey] = useState(todayKey())
  const [name, setName] = useState("")
  const [grams, setGrams] = useState("")
  const guess = useMemo(()=>settings.autoCalcFromName?parseAutoProtein(name):0,[name,settings.autoCalcFromName])

  const dayEntries = entries[dateKey] || []
  const totalToday = sumGrams(dayEntries)
  const remaining = Math.max(target - totalToday, 0)
  const progress = Math.min((totalToday / target) * 100, 100)

  const onAdd = () => {
    let g = Number(grams)
    if((!g || g <= 0) && settings.autoCalcFromName){ g = Number(guess) || 0 }
    if(!g || g <= 0) return
    add(dateKey, { name: name?.trim() || '—', grams: Math.round(g) })
    setName("")
    setGrams("")
  }

  const quickAdd = (g)=>add(dateKey,{name:'הוספה מהירה', grams:g})
  const last14 = useMemo(()=>{
    const out=[]
    for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); out.push({date:k,total:sumGrams(entries[k]||[]),target}) }
    return out
  },[entries,target])

  return (
    <div className="container vstack">
      <header className="hstack" style={{justifyContent:'space-between'}}>
        <div>
          <div className="title">מעקב חלבון יומי</div>
          <div className="small">הנתונים נשמרים מקומית בדפדפן</div>
        </div>
        <div className="badge">יעד יומי: <b>{target}</b> גרם</div>
      </header>

      <section className="card vstack">
        <div className="title">היום</div>
        <div className="grid grid-3">
          <div>
            <div className="subtitle">תאריך</div>
            <input className="input" type="date" value={dateKey} onChange={e=>setDateKey(e.target.value)} />
          </div>
          <div>
            <div className="subtitle">שם המאכל/תוסף</div>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="ביצה קשה אחת, 150 גרם חזה עוף, סקופ חלבון" />
            {settings.autoCalcFromName && (
              <div className="small" style={{marginTop:6}}>
                {name.trim() ? (guess>0 ? `זוהו ~${guess} גרם חלבון משם המאכל` : 'לא זוהה חלבון - נסה לכלול מספר/גרמים או פריט מוכר') : 'תוכל לכתוב תיאור חופשי - אחשב לבד כשאפשר'}
              </div>
            )}
          </div>
          <div>
            <div className="subtitle">גרם חלבון</div>
            <div className="hstack">
              <input className="input" inputMode="numeric" value={grams} onChange={e=>setGrams(e.target.value.replace(/[^0-9.]/g,''))} placeholder="לדוגמה 30" />
              <button className="btn primary" onClick={onAdd}>הוסף</button>
            </div>
          </div>
        </div>
        <div className="hstack" style={{gap:8,flexWrap:'wrap'}}>
          {[10,20,25,30].map(g=> <button key={g} className="btn" onClick={()=>quickAdd(g)}>+{g} גרם</button>)}
        </div>
      </section>

      <section className="card vstack">
        <div className="title">התקדמות יומית</div>
        <div className="subtitle">סה"כ היום: <b>{totalToday}</b> גרם • נשארו: <b>{remaining}</b> גרם</div>
        <div className="progress"><div style={{width:`${progress}%`}}/></div>
        <div className="small">יעד: {target} גרם</div>
      </section>

      <section className="card vstack">
        <div className="title">רשומות ל{fmt(dateKey)}</div>
        <div className="list">
          {dayEntries.length===0 && <div className="small">אין רשומות ליום זה.</div>}
          {dayEntries.map(e=> (
            <div key={e.id} className="item">
              <div>
                <div style={{fontWeight:600}}>{e.name||'—'}</div>
                <div className="small">{e.grams} גרם</div>
              </div>
              <div className="hstack">
                <button className="btn" onClick={()=>{
                  const val = prompt('עדכון גרמים', String(e.grams) )
                  if(val===null) return
                  const num = Number(String(val).replace(/[^0-9.]/g,''))
                  if(num>0) edit(dateKey, e.id, { grams: Math.round(num) })
                }}>ערוך</button>
                <button className="btn" onClick={()=>remove(dateKey,e.id)}>מחק</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card vstack">
        <div className="title">14 הימים האחרונים</div>
        <div className="subtitle">השוואה מול היעד היומי</div>
        <div style={{width:'100%', height:280}}>
          <ResponsiveContainer>
            <BarChart data={last14} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis dataKey="date" tickFormatter={(d)=>d.slice(5)} fontSize={12} />
              <YAxis width={35} fontSize={12} />
              <Tooltip formatter={(v)=>`${v} גרם`} labelFormatter={(l)=>fmt(l)} />
              <ReferenceLine y={target} strokeDasharray="4 4" />
              <Bar dataKey="total" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card vstack">
        <div className="title">הגדרות</div>
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
          <div className="vstack">
            <div className="subtitle">יחידות משקל</div>
            <div className="hstack">
              <button className={"btn "+(settings.unit==='kg'?'primary':'')} onClick={()=>setSettings({...settings,unit:'kg'})}>ק"ג</button>
              <button className={"btn "+(settings.unit==='lb'?'primary':'')} onClick={()=>setSettings({...settings,unit:'lb'})}>ליברות</button>
            </div>
          </div>
          <div>
            <div className="subtitle">משקל גוף ({settings.unit==='kg'? 'ק"ג':'lb'})</div>
            <input className="input" inputMode="numeric" value={settings.weight} onChange={e=>setSettings({...settings,weight:e.target.value.replace(/[^0-9.]/g,'')})} />
          </div>
          <div className="vstack">
            <div className="subtitle">חישוב אוטומטי לפי גרם לק"ג</div>
            <div className="hstack">
              <label className="small">גרם לכל ק"ג</label>
              <input className="input" style={{maxWidth:120}} inputMode="numeric" value={settings.gramsPerKg} onChange={e=>setSettings({...settings,gramsPerKg:e.target.value.replace(/[^0-9.]/g,'')})} disabled={!settings.autoTarget} />
            </div>
            <div className="small">טווח נפוץ: 1.2 - 2.2 גרם לק"ג. יעד מחושב: <b>{target}</b> גרם</div>
            <div className="hstack">
              <button className={"btn "+(settings.autoTarget?'primary':'')} onClick={()=>setSettings({...settings,autoTarget:true})}>אוטומטי</button>
              <button className={"btn "+(!settings.autoTarget?'primary':'')} onClick={()=>setSettings({...settings,autoTarget:false})}>ידני</button>
            </div>
            {!settings.autoTarget && (
              <div className="hstack">
                <label className="small">יעד ידני</label>
                <input className="input" style={{maxWidth:140}} inputMode="numeric" value={settings.targetCustom} onChange={e=>setSettings({...settings,targetCustom:e.target.value.replace(/[^0-9.]/g,'')})} />
              </div>
            )}
          </div>
          <div className="vstack">
            <div className="subtitle">חישוב אוטומטי משם המאכל</div>
            <div className="hstack">
              <button className={"btn "+(settings.autoCalcFromName?'primary':'')} onClick={()=>setSettings({...settings,autoCalcFromName:true})}>פועל</button>
              <button className={"btn "+(!settings.autoCalcFromName?'primary':'')} onClick={()=>setSettings({...settings,autoCalcFromName:false})}>כבוי</button>
            </div>
            <div className="small">כאשר שדה הגרמים ריק, נזהה מתוך התיאור. ערכים משוערים.</div>
          </div>
        </div>
      </section>
    </div>
  )
}
