import React from 'react';

// お知らせタブ
function NewsTab() {
  const news = [
    {
      id: 1,
      date: '2025/07/07',
      title: '月末在庫管理機能が追加されました',
      content: '棚卸し機能・在庫状況分析・カテゴリ別在庫価値分析など、月末の在庫管理に必要な機能を追加しました。',
      type: 'feature'
    },
    {
      id: 2,
      date: '2025/07/07',
      title: 'バッジレイアウトが改善されました',
      content: '商品カードのバッジが見やすく整理され、✨は左上、カテゴリは中央上、×ボタンは右上に配置されました。',
      type: 'feature'
    },
    {
      id: 3,
      date: '2025/07/07',
      title: 'サジェスト機能が追加されました',
      content: '商品名入力時に既存商品の候補が表示され、情報をコピーできるようになりました。価格は設定不要です。',
      type: 'feature'
    },
    {
      id: 4,
      date: '2025/07/07',
      title: '商品コード・容量機能が追加されました',
      content: '商品に商品コードと容量情報を登録できるようになりました。将来のバーコード読み取り機能にも対応予定です。',
      type: 'update'
    },
    {
      id: 5,
      date: '2025/07/07',
      title: 'タブ機能でより使いやすく',
      content: 'アプリがタブ化され、機能ごとに画面が分かれて使いやすくなりました。',
      type: 'feature'
    }
  ];

  const upcomingFeatures = [
    'CSV一括インポート機能',
    'バーコード読み取り機能',
    '売上推移グラフ',
    '自動発注推奨機能',
    'POSレジ連携',
    '会計ソフト連携'
  ];

  return (
    <div className="news-section">
      <h2>🔔 お知らせ</h2>
      
      {/* 最新情報 */}
      <div className="news-list">
        <h3>最新の更新情報</h3>
        {news.map(item => (
          <div key={item.id} className={`news-item ${item.type}`}>
            <div className="news-header">
              <span className="news-date">{item.date}</span>
              <span className={`news-badge ${item.type}`}>
                {item.type === 'update' ? '更新' : 
                 item.type === 'feature' ? '新機能' : 'お知らせ'}
              </span>
            </div>
            <h4>{item.title}</h4>
            <p>{item.content}</p>
          </div>
        ))}
      </div>

      {/* 今後の予定 */}
      <div className="upcoming-features">
        <h3>🚀 今後追加予定の機能</h3>
        <div className="feature-grid">
          {upcomingFeatures.map((feature, index) => (
            <div key={index} className="feature-item">
              <span className="feature-icon">🔜</span>
              <span className="feature-name">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* システム情報 */}
      <div className="system-info">
        <h3>📱 システム情報</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>バージョン:</strong> v5.2
          </div>
          <div className="info-item">
            <strong>最終更新:</strong> 2025年7月7日
          </div>
          <div className="info-item">
            <strong>技術:</strong> React + Firebase + PWA
          </div>
          <div className="info-item">
            <strong>対応地域:</strong> 佐賀県唐津市
          </div>
        </div>
      </div>

      {/* サポート情報 */}
      <div className="support-info">
        <h3>🆘 サポート</h3>
        <p>ご不明な点やご要望がございましたら、管理者までお気軽にお問い合わせください。</p>
        <div className="support-contact">
          <strong>管理者:</strong> izakaya.app.dev@gmail.com
        </div>
      </div>
    </div>
  );
}

export default NewsTab;