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

// 再入荷ボタンコンポーネント
function RestockButtons({ productId, onRestock }) {
  const restockAmounts = [5, 10, 50];
  
  return (
    <div className="restock-buttons">
      {restockAmounts.map(amount => (
        <button
          key={amount}
          onClick={() => onRestock(productId, amount)}
          className="restock-button"
        >
          +{amount}
        </button>
      ))}
    </div>
  );
}

export default function CustomerApp() {
  const { user, logout } = useAuth();
  // ✅ allProductsも追加で取得
  const { products, loading, addProduct, updateProduct, updateStock, generateProductCode, allProducts } = useProducts(user);
  const { toasts, addToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // フィルタリング
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesActive = showInactive || product.isActive !== false;
    
    return matchesSearch && matchesCategory && matchesActive;
  });

  // 在庫変更
  const handleStockChange = async (productId, change) => {
    try {
      await updateStock(productId, change);
      addToast(`在庫を${change > 0 ? '追加' : '減少'}しました`, 'success');
    } catch (error) {
      addToast('在庫更新に失敗しました', 'error');
    }
  };

  // 商品停止/復活
  const handleToggleActive = async (productId, currentActive) => {
    try {
      await updateProduct(productId, { isActive: !currentActive });
      addToast(currentActive ? '商品を停止しました' : '商品を復活しました', 'success');
    } catch (error) {
      addToast('商品状態の更新に失敗しました', 'error');
    }
  };

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
            allProducts={allProducts}  // ✅ 追加：検索用データ
            categories={categories}
            getCategoryGradient={getCategoryGradient}
            addToast={addToast}
          />
        )}

        {activeTab === 'inventory' && (
          <div className="inventory-section">
            {/* 統計表示 */}
            <div className="inventory-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>総在庫価値</h3>
                  <p>¥{products.reduce((sum, p) => sum + (p.cost * p.stock), 0).toLocaleString()}</p>
                </div>
                <div className="stat-card">
                  <h3>想定利益</h3>
                  <p>¥{products.reduce((sum, p) => sum + (p.profit * p.stock), 0).toLocaleString()}</p>
                </div>
                <div className="stat-card">
                  <h3>在庫少商品</h3>
                  <p>{products.filter(p => p.stock <= p.minStock && p.stock > 0).length}品目</p>
                </div>
                <div className="stat-card">
                  <h3>追加商品</h3>
                  <p>{products.filter(p => !p.isMaster).length}品目</p>
                </div>
              </div>
            </div>

            {/* 検索・フィルター */}
            <div className="inventory-controls">
              <div className="search-filters">
                <input
                  type="text"
                  placeholder="商品名・メーカーで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-filter"
                >
                  <option value="">全カテゴリ</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className={`toggle-button ${showInactive ? 'active' : ''}`}
                >
                  {showInactive ? '📦 在庫中' : '📤 停止中'}
                </button>
              </div>
            </div>

            {/* 商品一覧 */}
            <div className="products-grid">
              {filteredProducts.length === 0 ? (
                <div className="no-products">
                  <p>商品がありません</p>
                  <p>新商品を追加するか、フィルターを変更してください</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} className="product-card customer-view">
                    {/* バッジ（修正版） */}
                    <div className="product-top-badges">
                      {/* 左上：★バッジ */}
                      <div className="badge-left">
                        {!product.isMaster && (
                          <span className="user-added-badge">★ 追加</span>
                        )}
                      </div>
                      
                      {/* 中央上：カテゴリバッジ */}
                      <div className="badge-center">
                        <span className="category-badge">
                          {product.category}
                        </span>
                        {product.isActive === false && (
                          <span className="inactive-badge">停止中</span>
                        )}
                      </div>
                      
                      {/* 右上：×ボタン */}
                      <div className="badge-right">
                        {showInactive ? (
                          <button 
                            onClick={() => handleToggleActive(product.id, false)}
                            className="reactivate-button"
                          >
                            復活
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleActive(product.id, true)}
                            className="remove-button"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 商品名 */}
                    <div className="product-name">{product.name}</div>
                    
                    {/* 商品詳細 */}
                    <div className="product-details">
                      {product.manufacturer && <div>{product.manufacturer}</div>}
                      {product.volume && (
                        <div>{product.volume}{product.volumeUnit}</div>
                      )}
                      {product.productCode && (
                        <div>商品コード: {product.productCode}</div>
                      )}
                    </div>

                    {/* 在庫情報 */}
                    <div className={`stock-info ${product.stock <= product.minStock ? 'low' : product.stock === 0 ? 'out' : ''}`}>
                      在庫: {product.stock}
                      {product.minStock && ` (最小: ${product.minStock})`}
                    </div>

                    {/* 在庫操作 */}
                    {product.isActive !== false && (
                      <div className="stock-controls">
                        <button 
                          onClick={() => handleStockChange(product.id, -1)}
                          className="stock-btn"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={product.stock}
                          onChange={(e) => {
                            const newStock = parseInt(e.target.value) || 0;
                            handleStockChange(product.id, newStock - product.stock);
                          }}
                          className="stock-input"
                        />
                        <button 
                          onClick={() => handleStockChange(product.id, 1)}
                          className="stock-btn"
                        >
                          ＋
                        </button>
                      </div>
                    )}

                    {/* 再入荷ボタン */}
                    {product.stock === 0 && product.isActive !== false && (
                      <button 
                        onClick={() => handleStockChange(product.id, 10)}
                        className="restock-button"
                      >
                        📦 再入荷
                      </button>
                    )}

                    {/* 飲み放題バッジ */}
                    {product.isNomihodai && (
                      <div className="nomihodai-badge">飲み放題</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
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