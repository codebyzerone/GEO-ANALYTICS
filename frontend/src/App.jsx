import { useState, useEffect } from 'react'
import { analyzeBrand, fetchSample, fetchHistory, fetchTrends, compareBrands, exportCsv } from './api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line
} from 'recharts'

const GlitchText = ({ text }) => (
  <span style={{ position: 'relative', display: 'inline-block' }}>
    {text}
    <span style={{ position: 'absolute', left: '2px', top: 0, color: '#00fff0', clipPath: 'inset(0 0 60% 0)', animation: 'glitch1 3s infinite', opacity: 0.8 }}>{text}</span>
    <span style={{ position: 'absolute', left: '-2px', top: 0, color: '#ff006e', clipPath: 'inset(40% 0 0 0)', animation: 'glitch2 3s infinite', opacity: 0.8 }}>{text}</span>
  </span>
)

const AnimatedNumber = ({ value, duration = 1500 }) => {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = value / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
}

const ScoreRing = ({ score, size = 160 }) => {
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 75 ? '#00ff88' : score >= 50 ? '#ffcc00' : score >= 25 ? '#ff6b35' : '#ff003c'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a1a2e" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
        strokeWidth="10" strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.5s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
    </svg>
  )
}

const TerminalLine = ({ text, delay = 0, color = '#00ff88' }) => {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s', color, fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.8 }}>
      {text}
    </div>
  )
}

export default function App() {
  const [brand, setBrand] = useState('')
  const [queries, setQueries] = useState('What are the best payment apps in India?\nWhich UPI app is most recommended?\nBest digital payment solution for businesses')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [particles, setParticles] = useState([])
  const [history, setHistory] = useState([])
  const [trends, setTrends] = useState(null)
  const [trendLoading, setTrendLoading] = useState(false)
  const [compareBrand1, setCompareBrand1] = useState('')
  const [compareBrand2, setCompareBrand2] = useState('')
  const [compareBrand3, setCompareBrand3] = useState('')
  const [compareResults, setCompareResults] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState(null)

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1, speed: Math.random() * 20 + 10,
      opacity: Math.random() * 0.5 + 0.1
    }))
    setParticles(p)
  }, [])

  const handleAnalyze = async () => {
    if (!brand.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setActiveTab('overview')
    try {
      const queryList = queries.split('\n').filter(q => q.trim())
      const data = await analyzeBrand(brand, queryList)
      setResult(data)
      loadHistory(data.brand)
      loadTrends(data.brand)
    } catch (err) {
      setError('Analysis failed — the LLM backend may be unavailable. Load the sample report below to see the dashboard.')
    }
    setLoading(false)
  }

  const handleLoadSample = async () => {
    setSampleLoading(true)
    setError(null)
    setActiveTab('overview')
    try {
      const data = await fetchSample()
      setResult(data)
      loadHistory(data.brand)
      loadTrends(data.brand)
    } catch (err) {
      setError('Failed to load sample report.')
    }
    setSampleLoading(false)
  }

  const handleCompare = async () => {
    const brands = [compareBrand1, compareBrand2, compareBrand3].filter(b => b.trim())
    if (brands.length < 2) {
      setCompareError('Enter at least 2 brand names to compare.')
      return
    }
    if (brands.length > 3) {
      setCompareError('Maximum 3 brands for comparison.')
      return
    }
    setCompareLoading(true)
    setCompareError(null)
    setCompareResults(null)
    const queryList = queries.split('\n').filter(q => q.trim())
    try {
      const data = await compareBrands(brands, queryList)
      if (data.error) {
        setCompareError(data.error)
      } else {
        setCompareResults(data)
      }
    } catch (err) {
      setCompareError('Comparison failed — ensure the backend is running.')
    }
    setCompareLoading(false)
  }

  const handleDownloadCsv = async () => {
    const brand = result ? result.brand : (compareResults ? compareResults.brands[0] : null)
    if (!brand) return
    try {
      const blob = await exportCsv(brand)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${brand.replace(/\s+/g, '_')}_analysis.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('CSV export failed.')
    }
  }

  const handleDownloadJson = () => {
    const data = result || (compareResults ? { comparison: compareResults } : null)
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const name = result ? `${result.brand.replace(/\s+/g, '_')}_report.json` : 'comparison.json'
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadHistory = async (brandName) => {
    try {
      const data = await fetchHistory(brandName)
      setHistory(data)
    } catch (err) {
      setHistory([])
    }
  }

  const loadTrends = async (brandName) => {
    setTrendLoading(true)
    try {
      const data = await fetchTrends(brandName)
      setTrends(data)
    } catch (err) {
      setTrends(null)
    }
    setTrendLoading(false)
  }

  const score = result?.average_geo_score || 0
  const scoreColor = score >= 75 ? '#00ff88' : score >= 50 ? '#ffcc00' : score >= 25 ? '#ff6b35' : '#ff003c'
  const grade = score >= 75 ? 'DOMINANT' : score >= 50 ? 'VISIBLE' : score >= 25 ? 'WEAK' : 'INVISIBLE'

  const chartData = result?.query_reports?.map((r, i) => ({
    name: `Q${i + 1}`,
    Precise: r.per_llm?.gemma_precise?.score || 0,
    Creative: r.per_llm?.gemma_creative?.score || 0,
  }))

  const radarData = result ? [
    { metric: 'Mention Rate', value: result.query_reports?.filter(r => r.per_llm?.gemma_precise?.mentioned || r.per_llm?.gemma_creative?.mentioned).length / result.total_queries * 100 || 0 },
    { metric: 'Position', value: result.query_reports?.[0]?.per_llm?.gemma_precise?.position === 'early' ? 90 : result.query_reports?.[0]?.per_llm?.gemma_precise?.position === 'middle' ? 55 : 20 },
    { metric: 'Sentiment', value: result.query_reports?.filter(r => r.per_llm?.gemma_precise?.sentiment === 'positive').length / result.total_queries * 100 || 0 },
    { metric: 'Frequency', value: Math.min((result.query_reports?.reduce((a, r) => a + (r.per_llm?.gemma_precise?.mention_count || 0), 0) / result.total_queries) * 40, 100) },
    { metric: 'Coverage', value: (result.query_reports?.filter(r => r.per_llm?.gemma_precise?.mentioned).length / result.total_queries) * 100 || 0 },
  ] : []

  const recommendations = score === 0 ? [
    { icon: '🔴', text: `${result?.brand} scored 0/100 — completely invisible to AI models`, color: '#ff003c' },
    { icon: '📝', text: 'Publish detailed comparison articles mentioning your brand', color: '#ff6b35' },
    { icon: '🔗', text: 'Get featured in top industry blogs that AI models reference', color: '#ff6b35' },
    { icon: '📊', text: 'Create Wikipedia-style factual content about your brand', color: '#ffcc00' },
    { icon: '🎯', text: 'Target long-tail queries where competition is lower', color: '#ffcc00' },
  ] : score < 50 ? [
    { icon: '🟡', text: `${result?.brand} has weak AI presence — needs immediate action`, color: '#ffcc00' },
    { icon: '📝', text: 'Increase content volume around these specific query topics', color: '#ffcc00' },
    { icon: '🔗', text: 'Build authoritative backlinks from sources AI models trust', color: '#00b4d8' },
    { icon: '🎯', text: 'Optimize brand mentions in developer communities', color: '#00b4d8' },
  ] : score < 75 ? [
    { icon: '🟢', text: `${result?.brand} has moderate AI visibility — room to grow`, color: '#00b4d8' },
    { icon: '📈', text: 'Expand content to adjacent query topics', color: '#00b4d8' },
    { icon: '🏆', text: 'Target early-position mentions in AI responses', color: '#00ff88' },
  ] : [
    { icon: '🏆', text: `${result?.brand} dominates AI visibility — maintain momentum`, color: '#00ff88' },
    { icon: '📊', text: 'Monitor competitor scores weekly', color: '#00ff88' },
    { icon: '🎯', text: 'Expand to new query categories', color: '#00ff88' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050510', color: '#e0e0ff', fontFamily: "'Courier New', monospace", overflow: 'hidden', position: 'relative' }}>

      <style>{`
        @keyframes glitch1 { 0%,100%{clip-path:inset(0 0 90% 0)} 25%{clip-path:inset(20% 0 60% 0)} 50%{clip-path:inset(50% 0 30% 0)} 75%{clip-path:inset(80% 0 5% 0)} }
        @keyframes glitch2 { 0%,100%{clip-path:inset(60% 0 0 0)} 25%{clip-path:inset(40% 0 20% 0)} 50%{clip-path:inset(10% 0 70% 0)} 75%{clip-path:inset(5% 0 85% 0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes scan { 0%{top:0} 100%{top:100%} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .card { background: linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%); border:1px solid rgba(0,255,136,0.15); border-radius:4px; backdrop-filter:blur(10px); transition: border-color 0.3s; }
        .card:hover { border-color:rgba(0,255,136,0.3); }
        .tab { cursor:pointer; padding:0.5rem 1.5rem; font-size:0.75rem; letter-spacing:0.15em; border-bottom:2px solid transparent; transition:all 0.2s; color:#666; }
        .tab:hover { color:#00ff88; }
        .tab.active { color:#00ff88; border-bottom-color:#00ff88; }
        input:focus, textarea:focus { border-color:rgba(0,255,136,0.5) !important; box-shadow:0 0 20px rgba(0,255,136,0.1) !important; outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#050510; }
        ::-webkit-scrollbar-thumb { background:#00ff88; border-radius:2px; }
      `}</style>

      {/* Background Grid */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{ position: 'fixed', left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%', backgroundColor: '#00ff88', opacity: p.opacity, animation: `float ${p.speed}s ease-in-out infinite`, animationDelay: `${p.id * 0.5}s`, pointerEvents: 'none' }} />
      ))}

      {/* Scan Line */}
      <div style={{ position: 'fixed', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(0,255,136,0.3),transparent)', animation: 'scan 8s linear infinite', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', position: 'relative', zIndex: 2 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeUp 0.8s ease' }}>
          <div style={{ display: 'inline-block', border: '1px solid rgba(0,255,136,0.3)', padding: '0.25rem 1rem', fontSize: '0.7rem', letterSpacing: '0.3em', color: '#00ff88', marginBottom: '1rem' }}>
            GEO ANALYTICS · AI VISIBILITY PLATFORM
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, margin: '0.5rem 0', letterSpacing: '-0.02em' }}>
            <GlitchText text="AI VISIBILITY" />
            <br />
            <span style={{ color: '#00ff88', textShadow: '0 0 30px rgba(0,255,136,0.5)' }}>INTELLIGENCE</span>
          </h1>
          <p style={{ color: '#445566', fontSize: '0.8rem', letterSpacing: '0.3em', marginTop: '0.5rem' }}>
            TRACK · SCORE · IMPROVE · LLM BRAND PRESENCE
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: '#00ff88', fontSize: '0.75rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff88', animation: 'pulse 1.5s infinite', boxShadow: '0 0 10px #00ff88' }} />
            SYSTEM ONLINE
          </div>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: result ? '340px 1fr' : '500px', justifyContent: result ? '' : 'center', gap: '1.5rem', transition: 'all 0.5s' }}>

          {result?.is_sample && (
            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(0,180,216,0.1)', border: '1px solid #00b4d8', borderRadius: '4px', color: '#00b4d8', fontSize: '0.75rem', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700 }}>● SAMPLE DATA</span>
              <span>Fictional brand "NovaPay (Sample)" — zero LLM setup required. Replace with a real analysis above.</span>
            </div>
          )}

          {/* ── INPUT PANEL ── */}
          <div className="card" style={{ padding: '1.5rem', animation: 'fadeUp 0.8s ease 0.2s both', alignSelf: 'start' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#00ff88', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>▶</span> ANALYSIS TERMINAL
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#445566', display: 'block', marginBottom: '0.5rem' }}>TARGET ENTITY</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="e.g. Razorpay, Zomato..."
                style={{ width: '100%', backgroundColor: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '0.75rem', color: '#00ff88', fontSize: '0.9rem', fontFamily: 'monospace', boxSizing: 'border-box', transition: 'all 0.3s' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#445566', display: 'block', marginBottom: '0.5rem' }}>QUERY VECTORS</label>
              <textarea
                value={queries}
                onChange={e => setQueries(e.target.value)}
                rows={5}
                style={{ width: '100%', backgroundColor: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '4px', padding: '0.75rem', color: '#e0e0ff', fontSize: '0.8rem', fontFamily: 'monospace', resize: 'none', boxSizing: 'border-box', lineHeight: 1.8, transition: 'all 0.3s' }}
              />
              <div style={{ fontSize: '0.65rem', color: '#334', marginTop: '0.25rem' }}>
                {queries.split('\n').filter(q => q.trim()).length} queries loaded
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !brand.trim()}
              style={{ width: '100%', padding: '0.875rem', backgroundColor: loading ? 'transparent' : 'rgba(0,255,136,0.1)', border: `1px solid ${loading ? 'rgba(0,255,136,0.3)' : '#00ff88'}`, borderRadius: '4px', color: '#00ff88', fontSize: '0.8rem', fontFamily: 'monospace', letterSpacing: '0.2em', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s', boxShadow: loading ? 'none' : '0 0 20px rgba(0,255,136,0.2)' }}
            >
              {loading ? <span>PROCESSING<span style={{ animation: 'blink 1s infinite' }}>_</span></span> : '▶ EXECUTE ANALYSIS'}
            </button>

            <button
              onClick={handleLoadSample}
              disabled={sampleLoading}
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', backgroundColor: sampleLoading ? 'transparent' : 'rgba(0,180,216,0.1)', border: `1px solid ${sampleLoading ? 'rgba(0,180,216,0.3)' : '#00b4d8'}`, borderRadius: '4px', color: '#00b4d8', fontSize: '0.8rem', fontFamily: 'monospace', letterSpacing: '0.2em', cursor: sampleLoading ? 'not-allowed' : 'pointer', transition: 'all 0.3s' }}
            >
              {sampleLoading ? 'LOADING SAMPLE...' : '▶ TRY SAMPLE (NO LLM)'}
            </button>

            {error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255,0,60,0.1)', border: '1px solid rgba(255,0,60,0.3)', borderRadius: '4px', color: '#ff003c', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                ⚠ {error}
                <button
                  onClick={handleLoadSample}
                  disabled={sampleLoading}
                  style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(0,180,216,0.1)', border: '1px solid #00b4d8', borderRadius: '4px', color: '#00b4d8', fontSize: '0.7rem', fontFamily: 'monospace', cursor: sampleLoading ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
                >
                  {sampleLoading ? 'Loading...' : 'Load sample report instead'}
                </button>
              </div>
            )}

            {loading && (
              <div style={{ marginTop: '1.5rem' }}>
                <TerminalLine text="$ initializing analysis engine..." delay={0} />
                <TerminalLine text="$ querying gemma_precise model..." delay={500} />
                <TerminalLine text="$ querying gemma_creative model..." delay={1000} />
                <TerminalLine text="$ running NLP pipeline..." delay={1500} color="#ffcc00" />
                <TerminalLine text="$ calculating visibility scores..." delay={2000} color="#ffcc00" />
                <TerminalLine text="$ generating report..." delay={2500} color="#00ff88" />
              </div>
            )}

            {!result && !loading && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,255,136,0.1)' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#334', marginBottom: '1rem' }}>SYSTEM INFO</div>
                {[
                  { label: 'Models Active', value: '2' },
                  { label: 'NLP Engine', value: 'spaCy' },
                  { label: 'Sentiment', value: 'VADER' },
                  { label: 'Backend', value: 'FastAPI' },
                  { label: 'LLM Engine', value: 'Ollama' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem' }}>
                    <span style={{ color: '#445566' }}>{item.label}</span>
                    <span style={{ color: '#00ff88' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RESULTS PANEL ── */}
          {result && (
            <div style={{ animation: 'fadeUp 0.5s ease' }}>
              {/* Sample data banner — visible only when the displayed report is the demo sample */}
              {result && result.is_sample && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(0,180,216,0.1)', border: '1px solid #00b4d8', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#00b4d8', fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#00b4d8', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  <strong>SAMPLE DATA — DEMO</strong>
                  <span>«{result.brand}» is a fictional brand. No LLM was involved. This report matches the real POST /analyze response schema.</span>
                </div>
              )}

              {/* Score Header */}
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ScoreRing score={score} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                      <AnimatedNumber value={score} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#445566', letterSpacing: '0.1em' }}>/ 100</div>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '0.25rem' }}>ENTITY ANALYZED</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{result.brand}</div>
                  <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.75rem', backgroundColor: `${scoreColor}15`, border: `1px solid ${scoreColor}40`, borderRadius: '2px', color: scoreColor, fontSize: '0.75rem', letterSpacing: '0.2em' }}>
                    {grade}
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#445566' }}>
                    {result.total_queries} queries · 2 AI models · {result.query_reports?.filter(r => r.per_llm?.gemma_precise?.mentioned || r.per_llm?.gemma_creative?.mentioned).length} hits
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { label: 'QUERIES', value: result.total_queries },
                    { label: 'MODELS', value: 2 },
                    { label: 'MENTIONS', value: result.query_reports?.reduce((acc, r) => acc + (r.per_llm?.gemma_precise?.mention_count || 0) + (r.per_llm?.gemma_creative?.mention_count || 0), 0) },
                    { label: 'GEO SCORE', value: score },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: '4px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00ff88' }}>{s.value}</div>
                      <div style={{ fontSize: '0.6rem', color: '#334', letterSpacing: '0.15em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,255,136,0.1)', marginBottom: '1rem' }}>
                {['overview', 'breakdown', 'radar', 'trends'].map(tab => (
                  <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                    {tab.toUpperCase()}
                  </div>
                ))}
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '1rem' }}>SCORES PER QUERY</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.05)" />
                      <XAxis dataKey="name" stroke="#334" fontSize={11} fontFamily="monospace" />
                      <YAxis domain={[0, 100]} stroke="#334" fontSize={11} fontFamily="monospace" />
                      <Tooltip contentStyle={{ backgroundColor: '#0a0a1a', border: '1px solid rgba(0,255,136,0.2)', fontFamily: 'monospace', fontSize: '0.75rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.7rem', fontFamily: 'monospace' }} />
                      <Bar dataKey="Precise" fill="#00ff88" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Creative" fill="#00b4d8" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── BREAKDOWN TAB ── */}
              {activeTab === 'breakdown' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.query_reports.map((r, i) => (
                    <div key={i} className="card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#445566', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#00ff88' }}>Q{i + 1}</span>
                        <span>›</span>
                        <span>{r.query}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {Object.entries(r.per_llm).map(([llm, data]) => (
                          <div key={llm} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${data.mentioned ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,60,0.2)'}`, borderRadius: '4px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.65rem', color: '#445566', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
                              {llm.replace('_', ' ').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: data.mentioned ? '#00ff88' : '#ff003c' }}>
                              {data.score}
                            </div>
                            <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                              <span style={{ color: data.mentioned ? '#00ff88' : '#ff003c' }}>
                                {data.mentioned ? '● FOUND' : '○ ABSENT'}
                              </span>
                              {data.mentioned && <span style={{ color: '#445566', marginLeft: '0.5rem' }}>{data.position} · {data.sentiment}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── RADAR TAB ── */}
              {activeTab === 'radar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '1rem' }}>VISIBILITY PROFILE</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(0,255,136,0.1)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#445566', fontSize: 11, fontFamily: 'monospace' }} />
                        <Radar name="Score" dataKey="value" stroke="#00ff88" fill="#00ff88" fillOpacity={0.1} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {[
                      { label: 'MENTION RATE', score: result.query_reports?.filter(r => r.per_llm?.gemma_precise?.mentioned || r.per_llm?.gemma_creative?.mentioned).length, max: result.total_queries, color: '#00ff88' },
                      { label: 'AVG SENTIMENT', score: result.query_reports?.filter(r => r.per_llm?.gemma_precise?.sentiment === 'positive').length, max: result.total_queries, color: '#00b4d8' },
                      { label: 'GEO SCORE', score: Math.round(score), max: 100, color: scoreColor },
                    ].map(item => (
                      <div key={item.label} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: item.color }}>
                          {item.score}<span style={{ fontSize: '0.8rem', color: '#334' }}>/{item.max}</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#334', letterSpacing: '0.15em', marginTop: '0.25rem' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border: '1px solid rgba(0,255,136,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(0,255,136,0.05)', borderBottom: '1px solid rgba(0,255,136,0.1)', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00ff88' }}>
                      ▶ ACTIONABLE RECOMMENDATIONS
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {recommendations.map((rec, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.6rem 0.75rem', backgroundColor: `${rec.color}08`, border: `1px solid ${rec.color}20`, borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{rec.icon}</span>
                          <span style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.5 }}>{rec.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(0,180,216,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(0,180,216,0.05)', borderBottom: '1px solid rgba(0,180,216,0.1)', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00b4d8' }}>
                      ▶ INDUSTRY BENCHMARK
                    </div>
                    <div style={{ padding: '1rem' }}>
                      {[
                        { label: 'Market Leader', score: 85, color: '#00ff88' },
                        { label: 'Strong Competitor', score: 65, color: '#00b4d8' },
                        { label: 'Average Brand', score: 40, color: '#ffcc00' },
                        { label: result.brand, score: Math.round(score), color: scoreColor },
                      ].sort((a, b) => b.score - a.score).map((item, i) => (
                        <div key={i} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                            <span style={{ color: item.label === result.brand ? scoreColor : '#445566' }}>
                              {item.label === result.brand ? `▶ ${item.label}` : item.label}
                            </span>
                            <span style={{ color: item.color }}>{item.score}/100</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.score}%`, backgroundColor: item.color, borderRadius: '2px', transition: 'width 1.5s ease', boxShadow: `0 0 8px ${item.color}` }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize: '0.65rem', color: '#334', marginTop: '0.5rem' }}>
                        * Benchmark scores are industry averages for reference
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TRENDS TAB ── */}
        {activeTab === 'trends' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '1rem' }}>TREND OVER TIME</div>
            {trendLoading && (
              <div style={{ color: '#00b4d8', fontSize: '0.8rem', fontFamily: 'monospace' }}>Loading trend data...</div>
            )}
            {trends && trends.points && trends.points.length && !trendLoading && (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.05)" />
                    <XAxis dataKey="date" stroke="#334" fontSize={11} fontFamily="monospace" />
                    <YAxis domain={[0, 100]} stroke="#334" fontSize={11} fontFamily="monospace" />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a1a', border: '1px solid rgba(0,180,216,0.2)', fontFamily: 'monospace', fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey="score" stroke="#00b4d8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#445566' }}>
                  {trends.points.length} recorded run{trends.points.length !== 1 ? 's' : ''} for <strong>{trends.brand}</strong>
                </div>
              </>
            )}
            {!trendLoading && trends && (!trends.points || trends.points.length === 0) && (
              <div style={{ color: '#445566', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                No trend data yet for this brand. Run an analysis to begin tracking.
              </div>
            )}
          </div>
        )}

        {/* ── COMPARISON SECTION ── */}
        {compareResults || compareError || compareLoading || (compareBrand1.trim() || compareBrand2.trim() || compareBrand3.trim()) && (
          <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>MULTI-BRAND COMPARISON</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleDownloadCsv}
                  disabled={!compareResults && !result}
                  style={{ padding: '0.4rem 0.7rem', backgroundColor: 'rgba(0,180,216,0.1)', border: '1px solid #00b4d8', borderRadius: '4px', color: '#00b4d8', fontSize: '0.7rem', fontFamily: 'monospace', cursor: (!compareResults && !result) ? 'not-allowed' : 'pointer' }}
                >
                  ↓ CSV
                </button>
                <button
                  onClick={handleDownloadJson}
                  disabled={!compareResults && !result}
                  style={{ padding: '0.4rem 0.7rem', backgroundColor: 'rgba(0,180,216,0.1)', border: '1px solid #00b4d8', borderRadius: '4px', color: '#00b4d8', fontSize: '0.7rem', fontFamily: 'monospace', cursor: (!compareResults && !result) ? 'not-allowed' : 'pointer' }}
                >
                  ↓ JSON
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input
                value={compareBrand1}
                onChange={e => setCompareBrand1(e.target.value)}
                placeholder="Brand 1"
                style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace', minWidth: '120px' }}
              />
              <input
                value={compareBrand2}
                onChange={e => setCompareBrand2(e.target.value)}
                placeholder="Brand 2"
                style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace', minWidth: '120px' }}
              />
              <input
                value={compareBrand3}
                onChange={e => setCompareBrand3(e.target.value)}
                placeholder="Brand 3 (optional)"
                style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace', minWidth: '150px' }}
              />
              <button
                onClick={handleCompare}
                disabled={compareLoading}
                style={{ padding: '0.5rem 1rem', backgroundColor: compareLoading ? 'transparent' : 'rgba(0,255,136,0.1)', border: `1px solid ${compareLoading ? 'rgba(0,255,136,0.3)' : '#00ff88'}`, borderRadius: '4px', color: '#00ff88', fontSize: '0.8rem', fontFamily: 'monospace', cursor: compareLoading ? 'not-allowed' : 'pointer' }}
              >
                {compareLoading ? 'COMPARING...' : '▶ COMPARE'}
              </button>
            </div>

            {compareError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,0,60,0.1)', border: '1px solid rgba(255,0,60,0.3)', borderRadius: '4px', color: '#ff003c', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
                ⚠ {compareError}
              </div>
            )}

            {compareResults && (
              <div>
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: '#445566', marginBottom: '0.75rem' }}>
                  Comparison across {compareResults.queries.length} query{compareResults.queries.length !== 1 ? 's' : ''}
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={compareResults.summary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.05)" />
                    <XAxis dataKey="brand" stroke="#334" fontSize={11} fontFamily="monospace" />
                    <YAxis domain={[0, 100]} stroke="#334" fontSize={11} fontFamily="monospace" />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a1a', border: '1px solid rgba(0,180,216,0.2)', fontFamily: 'monospace', fontSize: '0.75rem' }} />
                    <Bar dataKey="average_geo_score" fill="#00b4d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem', color: '#445566' }}>Metric</th>
                        {compareResults.brands.map((b, i) => (
                          <th key={i} style={{ textAlign: 'center', padding: '0.5rem', color: i === 0 ? '#00ff88' : i === 1 ? '#00b4d8' : '#ff006e' }}>
                            {b}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '0.5rem', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Average Score</td>
                        {compareResults.brands.map((b, i) => (
                          <td key={i} style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700, color: i === 0 ? '#00ff88' : i === 1 ? '#00b4d8' : '#ff006e' }}>
                            {compareResults.results[b].average_geo_score}
                          </td>
                        ))}
                      </tr>
                      {compareResults.queries.map((q, qi) => (
                        <tr key={qi}>
                          <td style={{ padding: '0.5rem', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>{q}</td>
                          {compareResults.brands.map((b, i) => {
                            const report = compareResults.results[b].query_reports[qi]
                            return (
                              <td key={i} style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {report ? report.overall_score : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.65rem', color: '#223', letterSpacing: '0.2em' }}>
          GEO ANALYTICS · OPEN SOURCE · AI VISIBILITY INTELLIGENCE
        </div>

      </div>
    </div>
  )
}
