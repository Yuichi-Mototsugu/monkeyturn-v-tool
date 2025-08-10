// app/page.tsx
import ExpectationChecker from './components/ExpectationChecker';

export default function Home() {
  return (
    <main>
      <h1>モンキーターンV 実践ツール</h1>
      <p>ようこそ。現在開発中です。</p>
      
      {/* 期待値チェックコンポーネント */}
      <ExpectationChecker />
    </main>
  );
}
