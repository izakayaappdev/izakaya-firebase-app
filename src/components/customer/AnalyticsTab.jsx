import React from 'react';
import MonthlyInventory from './MonthlyInventory';

// 10カテゴリー対応（仕様書v4.2準拠）
const categories = [
  'ビール',
  'カクテル・チューハイ', 
  '日本酒',
  '焼酎',
  'ウイスキー・ブランデー',
  'ワイン',
  'シャンパン・スパークリング',
  '泡盛',
  'ソフトドリンク',
  'ノンアルコール'
];

// 分析タブ（月末在庫管理統合版）
function AnalyticsTab({ products, addToast }) {
  // 統計計算
  const totalValue = products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockProducts = products.filter(product => product.stock <= product.minStock && product.stock > 0);

  // カテゴリ別分析
  const categoryStats = categories.map(category => {
    const categoryProducts = products.filter(p => p.category === category);
    const count = categoryProducts.length;
    const value = categoryProducts.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    return { category, count, value };
  }).filter(stat => stat.count > 0);

  return (
    <div className="analytics-section">
      <h2>📊 在庫分析</h2>
      
      {/* 大型統計 */}
      <div className="analytics-stats">
        <div className="stats-grid">
          <div className="stat-card large">
            <h3>総在庫価値</h3>
            <p className="large-value">¥{totalValue.toLocaleString()}</p>
          </div>
          <div className="stat-card large">
            <h3>想定総利益</h3>
            <p className="large-value">¥{totalProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* カテゴリ別分析 */}
      <div className="category-analysis">
        <h3>カテゴリ別在庫価値</h3>
        <div className="category-stats">
          {categoryStats.map(stat => (
            <div key={stat.category} className="category-stat">
              <span className={`category-badge category-${stat.category.replace(/[・]/g, '-')}`}>
                {stat.category}
              </span>
              <div className="stat-details">
                <div className="count">{stat.count}品目</div>
                <div className="value">¥{stat.value.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 在庫少商品 */}
      {lowStockProducts.length > 0 && (
        <div className="low-stock-section">
          <h3>⚠️ 在庫少商品（{lowStockProducts.length}品目）</h3>
          <div className="low-stock-list">
            {lowStockProducts.map(product => (
              <div key={product.id} className="low-stock-item">
                <span className="product-name">{product.name}</span>
                <span className="stock-warning">残り{product.stock}個</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月末在庫管理コンポーネントを統合 */}
      <MonthlyInventory 
        products={products} 
        addToast={addToast} 
      />

      {/* 今後追加予定機能 */}
      <div className="coming-soon">
        <h3>🚀 今後追加予定の機能</h3>
        <ul>
          <li>📈 売上推移グラフ</li>
          <li>📊 在庫回転率分析</li>
          <li>🎯 発注推奨リスト</li>
          <li>💡 季節性分析</li>
          <li>🔄 自動発注機能</li>
        </ul>
      </div>
    </div>
  );
}

export default AnalyticsTab;