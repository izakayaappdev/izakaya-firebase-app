import React, { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import ToastContainer from '../shared/ToastContainer';
import AddProductTab from './AddProductTab';
import InventoryTab from './InventoryTab';
import MonthlyInventory from './MonthlyInventory';
import NewsTab from './NewsTab';
import '../../styles/Customer.css';

// カテゴリ定義
const categories = [
  'ビール', 'カクテル・チューハイ', '日本酒', '焼酎', 'ウイスキー・ブランデー',
  'ワイン', 'シャンパン・スパークリング', '泡盛', 'ソフトドリンク', 'ノンアルコール'
];

// カテゴリ別グラデーション
const getCategoryGradient = (category) => {
  const gradients = {
    'ビール': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'カクテル・チューハイ': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    '日本酒': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    '焼酎': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'ウイスキー・ブランデー': 'linear-gradient(135deg, #a16207 0%, #92400e 100%)',
    'ワイン': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    'シャンパン・スパークリング': 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    '泡盛': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'ソフトドリンク': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    'ノンアルコール': 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
  };
  return gradients[category] || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
};

export default function CustomerApp() {
  const { user, logout } = useAuth();
  const { products, loading, addProduct, updateProduct, updateStock, generateProductCode, allProducts } = useProducts(user);
  const { toasts, addToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-content">
          <h1>🍻 在庫管理アプリ</h1>
          <div className="header-user">
            <span>{user?.email}</span>
            <button onClick={logout} className="logout-button">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="customer-main-content">
        {activeTab === 'add' && (
          <AddProductTab 
            onAddProduct={addProduct}
            generateProductCode={generateProductCode}
            products={products}
            allProducts={allProducts}
            categories={categories}
            getCategoryGradient={getCategoryGradient}
            addToast={addToast}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab 
            products={products}
            updateStock={updateStock}
            updateProduct={updateProduct}
            addToast={addToast}
          />
        )}

        {activeTab === 'inventory-check' && (
          <MonthlyInventory
            products={products}
            categories={categories}
            getCategoryGradient={getCategoryGradient}
            addToast={addToast}
            user={user}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab products={products} />
        )}

        {activeTab === 'news' && (
          <NewsTab />
        )}
      </main>

      <div className="customer-tabs">
        <button 
          className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <div className="tab-icon">📱</div>
          <div className="tab-label">新商品</div>
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <div className="tab-icon">📦</div>
          <div className="tab-label">在庫</div>
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'inventory-check' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory-check')}
        >
          <div className="tab-icon">📋</div>
          <div className="tab-label">棚卸</div>
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <div className="tab-icon">📊</div>
          <div className="tab-label">分析</div>
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          <div className="tab-icon">🔔</div>
          <div className="tab-label">お知らせ</div>
        </button>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// 分析タブ（棚卸機能を除いた純粋な分析）
function AnalyticsTab({ products }) {
  // 統計計算
  const totalValue = products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockProducts = products.filter(product => product.stock <= product.minStock && product.stock > 0);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  // カテゴリ別分析
  const categoryStats = categories.map(category => {
    const categoryProducts = products.filter(p => p.category === category);
    const count = categoryProducts.length;
    const value = categoryProducts.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const stock = categoryProducts.reduce((sum, p) => sum + p.stock, 0);
    return { category, count, value, stock };
  }).filter(stat => stat.count > 0);

  return (
    <div className="analytics-section">
      <h2>📊 在庫分析</h2>
      
      {/* 全体統計 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>総在庫価値</h3>
          <p className="stat-value">¥{totalValue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>想定利益</h3>
          <p className="stat-value profit">¥{totalProfit.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>商品数</h3>
          <p className="stat-value">{products.length}品目</p>
        </div>
        <div className="stat-card">
          <h3>在庫少商品</h3>
          <p className="stat-value warning">{lowStockProducts.length}品目</p>
        </div>
      </div>

      {/* 在庫アラート */}
      {lowStockProducts.length > 0 && (
        <div className="alert-section">
          <h3>⚠️ 在庫少商品（発注推奨）</h3>
          <div className="alert-products">
            {lowStockProducts.map(product => (
              <div key={product.id} className="alert-product">
                <span className="product-name">{product.name}</span>
                <span className="stock-info">
                  在庫: {product.stock} (最小: {product.minStock})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {outOfStockProducts.length > 0 && (
        <div className="alert-section critical">
          <h3>🚫 在庫切れ商品</h3>
          <div className="alert-products">
            {outOfStockProducts.map(product => (
              <div key={product.id} className="alert-product">
                <span className="product-name">{product.name}</span>
                <span className="stock-info critical">在庫切れ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カテゴリ別分析 */}
      <div className="category-analysis">
        <h3>📈 カテゴリ別分析</h3>
        <div className="category-stats">
          {categoryStats.map(stat => (
            <div key={stat.category} className="category-stat">
              <div className="category-header">
                <span className="category-name">{stat.category}</span>
                <span className="category-count">{stat.count}品目</span>
              </div>
              <div className="category-details">
                <div className="detail-item">
                  <span>在庫価値</span>
                  <span>¥{stat.value.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span>総在庫数</span>
                  <span>{stat.stock}個</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 今後追加予定の機能 */}
      <div className="future-features">
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