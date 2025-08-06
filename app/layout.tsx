// app/layout.tsx
export const metadata = {
  title: 'モンキーターンV 実践ツール',
  description: 'ホール実践向けのモード判別＆期待値判定ツール',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
