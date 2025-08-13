'use client'
import React, { useEffect, useState } from 'react'

type Entry = {
  日付: string;
  状態: string;
  G数: number;
  スルー回数: number;
  セリフ種別: string;
  セリフ内容: string;
  舟券色: string;
  ["5枚役回数"]: number;
  総回転数: number;
  ["5枚役確率"]: number;
  判定結果: string | null;
}

type Serifu = {
  type: string;   // セリフ種別
  text: string;   // セリフ内容
  note: string;   // 示唆内容
}

export default function ExpectationChecker() {
  const [data, setData] = useState<Entry[]>([])
  const [serifuList, setSerifuList] = useState<Serifu[]>([])
  const [form, setForm] = useState<Entry>({
    日付: '',
    状態: '通常',
    G数: 0,
    スルー回数: 0,
    セリフ種別: '通常時',
    セリフ内容: '',
    舟券色: '青',
    ["5枚役回数"]: 0,
    総回転数: 0,
    ["5枚役確率"]: 0,
    判定結果: null
  })
  const [result, setResult] = useState<{yen:number, action:string} | null>(null)

  useEffect(() => {
    // 期待値データ読み込み
    fetch('/data/expectation_data.json')
      .then(r => r.json())
      .then((json: Entry[]) => {
        setData(json)
      })
      .catch(e => {
        console.error('Failed to load expectation_data.json', e)
      })

    // セリフリスト読み込み
    fetch('/data/serifu_list.json')
      .then(r => r.json())
      .then((json: Serifu[]) => {
        setSerifuList(json)
      })
      .catch(e => {
        console.error('Failed to load serifu_list.json', e)
      })
  }, [])

  // 期待値ベースを算出（ここではG数と状態をキーに簡易検索）
  function findBaseValue(): number {
    const candidates = data.filter(
      d => d.状態 === form.状態
    )
    if (candidates.length === 0) return 0
    const closest = candidates.reduce((a,b) =>
      Math.abs(a.G数 - form.G数) < Math.abs(b.G数 - form.G数) ? a : b
    )
    return form.状態.includes('朝イチ') ? 2000 : 1000 // 仮：あとで実データに置換
  }

  // 補正ロジック
  function applyCorrection(base: number): number {
    let corrected = base

    // 舟券色補正
    const colorBonus: Record<string, number> = {
      "青": 0,
      "黄": 500,
      "銀": 1000,
      "金": 2000,
      "虹": 3000
    }
    corrected += colorBonus[form.舟券色] || 0

    // セリフ補正例（モードB示唆以上で+500円）
    if (form.セリフ内容.includes('波多野感じ')) corrected += 500
    if (form.セリフ内容.includes('百年早え')) corrected += 1000

    // 5枚役確率補正（設定6付近で+1500円）
    const probability = form.総回転数 > 0
      ? form["5枚役回数"] / form.総回転数
      : 0
    const setting6Prob = 1 / 22.53
    if (probability >= setting6Prob * 0.95) corrected += 1500

    return corrected
  }

  function onCheck() {
    const base = findBaseValue()
    const yen = applyCorrection(base)
    const action = yen > 0 ? '続行' : 'ヤメ'
    setResult({ yen, action })
  }

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2>期待値判定（拡張版）</h2>

      {/* 状態 */}
      <div>
        <label>状態:</label><br/>
        <select value={form.状態} onChange={e => setForm({ ...form, 状態: e.target.value })}>
          <option value="通常">通常</option>
          <option value="朝イチ">朝イチ</option>
          <option value="激走チャージ">激走チャージ</option>
          <option value="完走後">完走後</option>
          <option value="非完走後">非完走後</option>
          <option value="引継ぎ">引継ぎ</option>
        </select>
      </div>

      {/* G数 */}
      <div>
        <label>開始G:</label><br/>
        <input type="number" value={form.G数} onChange={e => setForm({ ...form, G数: Number(e.target.value) })} />
      </div>

      {/* スルー回数 */}
      <div>
        <label>スルー回数:</label><br/>
        <input type="number" value={form.スルー回数} onChange={e => setForm({ ...form, スルー回数: Number(e.target.value) })} />
      </div>

      {/* セリフ */}
      <div>
        <label>セリフ種別:</label><br/>
        <select value={form.セリフ種別} onChange={e => setForm({ ...form, セリフ種別: e.target.value })}>
          <option value="通常時">通常時</option>
          <option value="激走">激走</option>
        </select>
      </div>
      <div>
        <label>セリフ内容:</label><br/>
        <select
          value={form.セリフ内容}
          onChange={e => setForm({ ...form, セリフ内容: e.target.value })}
        >
          <option value="">-</option>
          {serifuList
            .filter(s => s.type === form.セリフ種別)
            .map((s, idx) => (
              <option key={idx} value={s.text}>
                {`${s.text}（${s.note}）`}
              </option>
            ))}
        </select>
      </div>

      {/* 舟券色 */}
      <div>
        <label>舟券色:</label><br/>
        <select value={form.舟券色} onChange={e => setForm({ ...form, 舟券色: e.target.value })}>
          <option value="青">青</option>
          <option value="黄">黄</option>
          <option value="銀">銀</option>
          <option value="金">金</option>
          <option value="虹">虹</option>
        </select>
      </div>

      {/* 5枚役 */}
      <div>
        <label>5枚役回数:</label><br/>
        <input type="number" value={form["5枚役回数"]} onChange={e => setForm({ ...form, ["5枚役回数"]: Number(e.target.value) })} />
      </div>

      {/* 総回転数 */}
      <div>
        <label>総回転数:</label><br/>
        <input type="number" value={form.総回転数} onChange={e => setForm({ ...form, 総回転数: Number(e.target.value) })} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onCheck}>判定する</button>
      </div>

      {result && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: result.yen > 0 ? '#e6ffed' : '#ffe6e6' }}>
          <div><strong>期待値 (約)</strong>: {result.yen >= 0 ? '＋' : ''}{result.yen} 円</div>
          <div><strong>判定</strong>: <span style={{ color: result.yen > 0 ? 'green' : 'red' }}>{result.action}</span></div>
        </div>
      )}
    </div>
  )
}
