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
  予想屋: string;
  AT終了画面: string;
  ["5枚役回数"]: number;
  総回転数: number;
  ["5枚役確率"]: number;
  判定結果: string | null;
}

type Serifu = { type: string; text: string; note: string }

export default function ExpectationChecker() {
  const [data, setData] = useState<Entry[]>([])
  const [serifuList, setSerifuList] = useState<Serifu[]>([])

  const funakenList = [
    { value: "青", note: "最上段選手のライバルモード（弱）示唆" },
    { value: "黄", note: "最上段選手のライバルモード（強）示唆" },
    { value: "銀", note: "設定2 or 4 or 6濃厚示唆" },
    { value: "金", note: "設定4以上濃厚示唆" },
    { value: "虹", note: "設定6濃厚示唆" }
  ]

  const yosouyaList = [
    { value: "予想①（青）", note: "6周期天井否定示唆" },
    { value: "予想②（青）", note: "1 or 3 or 5周期天井示唆" },
    { value: "予想（緑）", note: "1 or 2 or 4周期天井示唆" },
    { value: "特報①（赤）", note: "出現から2周期以内にAT濃厚示唆" },
    { value: "特報②（紫）", note: "当該周期でのAT濃厚示唆" }
  ]

  const helmetList = [
    { value: "ロゴなし", note: "デフォルト" },
    { value: "ロゴ有り", note: "通常B示唆" },
    { value: "ロゴ有り+キラキラ", note: "通常B or 天国濃厚示唆" },
    { value: "ロゴ有り+V", note: "天国濃厚示唆" }
  ]

  const [form, setForm] = useState<Entry>({
    日付: '',
    状態: '通常',
    G数: 0,
    スルー回数: 0,
    セリフ種別: '通常時',
    セリフ内容: '',
    舟券色: '青',
    予想屋: '',
    AT終了画面: '',
    ["5枚役回数"]: 0,
    総回転数: 0,
    ["5枚役確率"]: 0,
    判定結果: null
  })
  const [result, setResult] = useState<{ yen: number, action: string } | null>(null)

  useEffect(() => {
    fetch('/data/expectation_data.json')
      .then(r => r.json())
      .then((json: Entry[]) => setData(json))
      .catch(e => console.error('Failed to load expectation_data.json', e))

    fetch('/data/serifu_list.json')
      .then(r => r.json())
      .then((json: Serifu[]) => setSerifuList(json))
      .catch(e => console.error('Failed to load serifu_list.json', e))
  }, [])

  function findBaseValue(): number {
    const candidates = data.filter(d => d.状態 === form.状態)
    if (candidates.length === 0) return 0
    candidates.reduce((a, b) =>
      Math.abs(a.G数 - form.G数) < Math.abs(b.G数 - form.G数) ? a : b
    )
    return form.状態.includes('朝イチ') ? 2000 : 1000
  }

  function applyCorrection(base: number): number {
    let corrected = base
    const colorBonus: Record<string, number> = {
      "青": 0, "黄": 500, "銀": 1000, "金": 2000, "虹": 3000
    }
    corrected += colorBonus[form.舟券色] || 0
    if (form.セリフ内容.includes('波多野感じ')) corrected += 500
    if (form.セリフ内容.includes('百年早え')) corrected += 1000
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
        <label>状態:</label><br />
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
        <label>開始G:</label><br />
        <input type="number" value={form.G数} onChange={e => setForm({ ...form, G数: Number(e.target.value) })} />
      </div>

      {/* スルー回数 */}
      <div>
        <label>スルー回数:</label><br />
        <input type="number" value={form.スルー回数} onChange={e => setForm({ ...form, スルー回数: Number(e.target.value) })} />
      </div>

      {/* セリフ */}
      <div>
        <label>セリフ種別:</label><br />
        <select value={form.セリフ種別} onChange={e => setForm({ ...form, セリフ種別: e.target.value })}>
          <option value="通常時">通常時</option>
          <option value="激走">激走</option>
        </select>
      </div>
      <div>
        <label>セリフ内容:</label><br />
        <select
          value={form.セリフ内容}
          onChange={e => setForm({ ...form, セリフ内容: e.target.value })}
        >
          <option value="">-</option>
          {serifuList
            .filter(s => s.type === form.セリフ種別)
            .map((s, idx) => (
              <option key={idx} value={s.text}>{s.text}</option>
            ))}
        </select>
        {form.セリフ内容 && (
          <div style={{ fontSize: '0.9em', color: '#555', marginTop: 4 }}>
            {serifuList.find(s => s.text === form.セリフ内容)?.note}
          </div>
        )}
      </div>

      {/* 舟券色 */}
      <div>
        <label>舟券色:</label><br />
        <select value={form.舟券色} onChange={e => setForm({ ...form, 舟券色: e.target.value })}>
          {funakenList.map((f, idx) => (
            <option key={idx} value={f.value}>{f.value}</option>
          ))}
        </select>
        {form.舟券色 && (
          <div style={{ fontSize: '0.9em', color: '#555', marginTop: 4 }}>
            {funakenList.find(f => f.value === form.舟券色)?.note}
          </div>
        )}
      </div>

      {/* 予想屋 */}
      <div>
        <label>予想屋:</label><br />
        <select value={form.予想屋} onChange={e => setForm({ ...form, 予想屋: e.target.value })}>
          <option value="">-</option>
          {yosouyaList.map((y, idx) => (
            <option key={idx} value={y.value}>{y.value}</option>
          ))}
        </select>
        {form.予想屋 && (
          <div style={{ fontSize: '0.9em', color: '#555', marginTop: 4 }}>
            {yosouyaList.find(y => y.value === form.予想屋)?.note}
          </div>
        )}
      </div>

      {/* AT終了画面 */}
      <div>
        <label>AT終了画面:</label><br />
        <select value={form.AT終了画面} onChange={e => setForm({ ...form, AT終了画面: e.target.value })}>
          <option value="">-</option>
          {helmetList.map((h, idx) => (
            <option key={idx} value={h.value}>{h.value}</option>
          ))}
        </select>
        {form.AT終了画面 && (
          <div style={{ fontSize: '0.9em', color: '#555', marginTop: 4 }}>
            {helmetList.find(h => h.value === form.AT終了画面)?.note}
          </div>
        )}
      </div>

      {/* 5枚役 */}
      <div>
        <label>5枚役回数:</label><br />
        <input type="number" value={form["5枚役回数"]} onChange={e => setForm({ ...form, ["5枚役回数"]: Number(e.target.value) })} />
      </div>

      {/* 総回転数 */}
      <div>
        <label>総回転数:</label><br />
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
