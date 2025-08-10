'use client'
import React, { useEffect, useState } from 'react'

type Entry = {
  situation: string;
  diff_range: string;
  start_g: number;
  exp_equal: number;
  exp_56: number;
}

export default function ExpectationChecker() {
  const [data, setData] = useState<Entry[]>([])
  const [situation, setSituation] = useState<string>('朝イチ')
  const [diffRange, setDiffRange] = useState<string>('-')
  const [startG, setStartG] = useState<number>(300)
  const [exchangeType, setExchangeType] = useState<string>('等価') // '等価' or '56枚' or 'カスタム'
  const [customRate, setCustomRate] = useState<number>(47)
  const [result, setResult] = useState<{yen:number, action:string, source: Entry | null} | null>(null)

  useEffect(() => {
    fetch('/expectation_data.json')
      .then(r => r.json())
      .then((json: Entry[]) => {
        setData(json)
        // initialize options
        if (json.length > 0) {
          const s = json[0].situation
          setSituation(s)
          setDiffRange(json[0].diff_range)
        }
      })
      .catch(e => {
        console.error('Failed to load expectation_data.json', e)
      })
  }, [])

  function findBestEntry(situation: string, diffRange: string, g: number): Entry | null {
    // Try exact match of situation and diffRange
    let candidates = data.filter(d => d.situation === situation && d.diff_range === diffRange)
    // fallback: situation with any diffRange
    if (candidates.length === 0) {
      candidates = data.filter(d => d.situation === situation)
    }
    if (candidates.length === 0) return null
    // choose entry with start_g <= g as large as possible; if none, choose smallest start_g
    const le = candidates.filter(c => c.start_g <= g)
    if (le.length > 0) {
      let best = le.reduce((a,b) => (a.start_g > b.start_g ? a : b))
      return best
    } else {
      // choose smallest start_g (earliest)
      let best = candidates.reduce((a,b) => (a.start_g < b.start_g ? a : b))
      return best
    }
  }

  function computeExpected(entry: Entry | null): number {
    if (!entry) return 0
    if (exchangeType === '等価') return entry.exp_equal
    if (exchangeType === '56枚') return entry.exp_56
    // custom interpolation assumption: '等価' corresponds to 47枚
    const equalRate = 47
    const target = customRate || equalRate
    if (target === 56) return entry.exp_56
    if (target === equalRate) return entry.exp_equal
    // linear interpolation between equalRate and 56
    const t = (target - equalRate) / (56 - equalRate)
    const val = Math.round(entry.exp_equal + t * (entry.exp_56 - entry.exp_equal))
    return val
  }

  function onCheck() {
    const entry = findBestEntry(situation, diffRange, startG)
    const yen = computeExpected(entry)
    const action = yen > 0 ? '続行' : 'ヤメ'
    setResult({ yen, action, source: entry })
  }

  // build unique options for selects
  const situations = Array.from(new Set(data.map(d => d.situation)))
  const diffRanges = Array.from(new Set(data.filter(d => d.situation === situation).map(d => d.diff_range)))

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <h2>期待値判定（実践データ参照）</h2>
      <div style={{ marginBottom: 8 }}>
        <label>状況:</label><br/>
        <select value={situation} onChange={e => { setSituation(e.target.value); setDiffRange('-'); }}>
          {situations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>差枚範囲（該当する場合）:</label><br/>
        <select value={diffRange} onChange={e => setDiffRange(e.target.value)}>
          <option value="-">-</option>
          {diffRanges.map(dr => <option key={dr} value={dr}>{dr}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>開始G:</label><br/>
        <input type="number" value={startG} onChange={e => setStartG(Number(e.target.value))} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>交換率:</label><br/>
        <select value={exchangeType} onChange={e => setExchangeType(e.target.value)}>
          <option value="等価">等価</option>
          <option value="56枚">56枚</option>
          <option value="カスタム">カスタム(枚)</option>
        </select>
        {exchangeType === 'カスタム' && (
          <div style={{ marginTop: 6 }}>
            <input type="number" value={customRate} onChange={e => setCustomRate(Number(e.target.value))} /> 枚
            <div style={{ fontSize: 12, color: '#666' }}>注: カスタムは等価(47枚)と56枚の線形補間で推定します。</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onCheck} style={{ padding: '8px 12px' }}>判定する</button>
      </div>

      {result && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: result.yen > 0 ? '#e6ffed' : '#ffe6e6' }}>
          <div><strong>期待値 (約)</strong>: {result.yen >= 0 ? '＋' : ''}{result.yen} 円</div>
          <div><strong>判定</strong>: <span style={{ color: result.yen > 0 ? 'green' : 'red' }}>{result.action}</span></div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>
            {result.source ? `参照: 状況=${result.source.situation} / 差枚=${result.source.diff_range} / 開始G=${result.source.start_g}` : '該当データなし（状況を調整してください）'}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        <div>補足: 開始Gがテーブルの刻みに一致しない場合、入力G以下で最も近い行を使用します（該当なしは最小の行を使用）。</div>
        <div>補正が必要な場合はセリフや周期も将来的に加味します。</div>
      </div>
    </div>
  )
}
