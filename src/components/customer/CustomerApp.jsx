import React, { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';

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

// 再入荷ボタンコンポーネント
function RestockButtons({ productId, onRestock }) {
  const [showControls, setShowControls] = useState(false);
  const [restockAmount, setRestockAmount] = useState(10); // デフォルト10

  if (!showControls) {
    return (
      <button
        onClick={() => setShowControls(true)}
        className="restock-button"
      >
        🔄 再入荷
      </button>
    );
  }

  const handleAmountChange = (change) => {
    setRestockAmount(prev => Math.max(1, prev + change));
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setRestockAmount(Math.max(1, value));
  };

  const handleConfirm = () => {
    onRestock(productId, restockAmount);
    setShowControls(false);
    setRestockAmount(10); // リセット
  };

  const handleCancel = () => {
    setShowControls(false);
    setRestockAmount(10); // リセット
  };

  return (
    <div className="restock-controls">
      <div className="restock-amount-controls">
        <button
          onClick={() => handleAmountChange(-1)}
          className="restock-minus-button"
          disabled={restockAmount <= 1}
        >
          ➖
        </button>
        
        <input
          type="number"
          value={restockAmount}
          onChange={handleInputChange}
          min="1"
          max="999"
          className="restock-amount-input"
        />
        
        <button
          onClick={() => handleAmountChange(1)}
          className="restock-plus-button"
        >
          ➕
        </button>
      </div>
      
      <div className="restock-action-buttons">
        <button onClick={handleConfirm} className="restock-confirm-button">
          ✓ 追加
        </button>
        <button onClick={handleCancel} className="restock-cancel-button">
          × キャンセル
        </button>
      </div>
    </div>
  );
}

// カテゴリ別デフォルトアイコン
const getCategoryIcon = (category) => {
  switch (category) {
    case 'ビール': return '🍺';
    case 'カクテル・チューハイ': return '🍹';
    case '日本酒': return '🍶';
    case '焼酎': return '🥃';
    case 'ウイスキー・ブランデー': return '🥃';
    case 'ワイン': return '🍷';
    case 'シャンパン・スパークリング': return '🥂';
    case '泡盛': return '🥃';
    case 'ソフトドリンク': return '🥤';
    case 'ノンアルコール': return '🧃';
    default: return '🥤';
  }
};

// 顧客ヘッダー
function CustomerHeader({ user, logout, profile }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>🍻 在庫管理</h1>
        <div className="user-info">
          {profile?.shopName && (
            <span className="shop-name">{profile.shopName}</span>
          )}
          <img src={user.photoURL} alt="プロフィール" className="user-avatar" />
          <span>{user.displayName}</span>
          <button onClick={logout} className="logout-button">ログアウト</button>
        </div>
      </div>
    </header>
  );
}

// 顧客タブナビゲーション
function CustomerTabs({ activeTab, setActiveTab }) {
  return (
    <div className="customer-tabs">
      <button 
        className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
        onClick={() => setActiveTab('add')}
      >
        ➕ 新商品
      </button>
      <button 
        className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
        onClick={() => setActiveTab('inventory')}
      >
        📦 在庫
      </button>
      <button 
        className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
      >
        📊 分析
      </button>
      <button 
        className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
        onClick={() => setActiveTab('news')}
      >
        🔔 お知らせ
      </button>
    </div>
  );
}

// 新商品追加タブ（サジェスト機能付き）
function AddProductTab({ 
  addProduct, 
  generateProductCode, 
  addToast,
  products
}) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    stock: '',
    minStock: '',
    description: '',
    productCode: '',
    volume: '',
    volumeUnit: 'ml',
    isNomihodai: false,
    isMaster: false
  });

  // サジェスト機能の状態
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const resetForm = () => {
    setNewProduct({
      name: '',
      manufacturer: '',
      category: 'ビール',
      stock: '',
      minStock: '',
      description: '',
      productCode: '',
      volume: '',
      volumeUnit: 'ml',
      isNomihodai: false,
      isMaster: false
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // 商品名入力時のサジェスト検索
  const handleNameChange = (value) => {
    setNewProduct({...newProduct, name: value});
    
    if (value.trim().length >= 2) {
      // 類似商品を検索（商品名とメーカー名から）
      const searchResults = products.filter(product => 
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        (product.manufacturer && product.manufacturer.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5); // 最大5件
      
      setSuggestions(searchResults);
      setShowSuggestions(searchResults.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // サジェストから商品情報をコピー（価格情報除く）
  const selectFromSuggestion = (product) => {
    setNewProduct({
      name: product.name,
      manufacturer: product.manufacturer || '',
      category: product.category,
      stock: '',
      minStock: product.minStock.toString(),
      description: product.description || '',
      productCode: '', // 新しい商品コードを生成
      volume: product.volume?.toString() || '',
      volumeUnit: product.volumeUnit || 'ml',
      isNomihodai: product.isNomihodai || false,
      isMaster: false
    });
    setShowSuggestions(false);
    setSuggestions([]);
    addToast('商品情報をコピーしました', 'info');
  };

  // サジェスト以外の場所をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.name-input-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim()) {
      addToast('商品名は必須です', 'error');
      return;
    }

    // 重複チェック
    const duplicateProduct = products.find(product => 
      product.name.toLowerCase() === newProduct.name.toLowerCase() &&
      product.manufacturer?.toLowerCase() === newProduct.manufacturer.toLowerCase()
    );

    if (duplicateProduct) {
      if (!window.confirm(`類似商品「${duplicateProduct.name}」が既に存在します。それでも追加しますか？`)) {
        return;
      }
    }

    try {
      const productData = {
        ...newProduct,
        cost: 0, // 仕入値は設定しない
        price: 0, // 販売価格は設定しない
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        volume: parseFloat(newProduct.volume) || 0,
        profit: 0, // 価格設定なしなので利益も0
        profitRate: 0, // 価格設定なしなので利益率も0
        isActive: true // デフォルトでアクティブ
      };

      const result = await addProduct(productData);
      if (result.success) {
        addToast(`${newProduct.name}を追加しました！`, 'success');
        resetForm();
      } else {
        addToast(result.error || '商品の保存に失敗しました', 'error');
      }
    } catch (error) {
      console.error('商品の保存に失敗しました:', error);
      addToast('商品の保存に失敗しました', 'error');
    }
  };

  const handleGenerateProductCode = () => {
    const autoCode = generateProductCode();
    setNewProduct({...newProduct, productCode: autoCode});
  };

  return (
    <div className="add-product-section">
      <h2>新商品追加</h2>
      <p className="form-note">
        ℹ️ 追加された商品は管理者の確認後、他の店舗でも利用可能になります
      </p>
      
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* 商品名入力（サジェスト機能付き） */}
          <div className="form-group">
            <label>商品名 *</label>
            <div className="name-input-container">
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="例：スーパードライ"
                required
                autoComplete="off"
              />
              
              {/* サジェスト表示 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map(product => (
                    <div 
                      key={product.id} 
                      className="suggestion-item"
                      onClick={() => selectFromSuggestion(product)}
                    >
                      <div className="suggestion-main">
                        <strong>{product.name}</strong>
                        {product.manufacturer && <span> - {product.manufacturer}</span>}
                      </div>
                      <div className="suggestion-details">
                        <span className="category-badge">{product.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>メーカー</label>
            <input
              type="text"
              value={newProduct.manufacturer}
              onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
              placeholder="例：アサヒビール"
            />
          </div>

          <div className="form-group">
            <label>カテゴリー *</label>
            <select
              value={newProduct.category}
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              required
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>商品コード</label>
            <div className="product-code-input">
              <input
                type="text"
                value={newProduct.productCode}
                onChange={(e) => setNewProduct({...newProduct, productCode: e.target.value})}
                placeholder="例：PROD001"
              />
              <button
                type="button"
                onClick={handleGenerateProductCode}
                className="generate-code-button"
              >
                自動生成
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>容量</label>
            <input
              type="number"
              value={newProduct.volume}
              onChange={(e) => setNewProduct({...newProduct, volume: e.target.value})}
              placeholder="例：350"
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label>容量単位</label>
            <select
              value={newProduct.volumeUnit}
              onChange={(e) => setNewProduct({...newProduct, volumeUnit: e.target.value})}
            >
              <option value="ml">ml</option>
              <option value="L">L</option>
            </select>
          </div>

          <div className="form-group">
            <label>現在在庫</label>
            <input
              type="number"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
              placeholder="例：80"
            />
          </div>

          <div className="form-group">
            <label>最小在庫</label>
            <input
              type="number"
              value={newProduct.minStock}
              onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
              placeholder="例：20"
            />
          </div>

          <div className="form-group full-width">
            <label>商品説明</label>
            <textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
              placeholder="例：キリッとした辛口。夏におすすめ"
              rows="3"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={newProduct.isNomihodai}
                onChange={(e) => setNewProduct({...newProduct, isNomihodai: e.target.checked})}
              />
              飲み放題対象
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={resetForm} className="cancel-button">
            リセット
          </button>
          <button type="submit" className="submit-button">
            商品追加
          </button>
        </div>
      </form>
    </div>
  );
}

// 在庫管理タブ
function InventoryTab({ 
  products, 
  updateStock, 
  updateProduct,
  addToast 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showInactive, setShowInactive] = useState(false); // 停止中商品表示切り替え

  const handleStockChange = async (productId, change) => {
    try {
      const product = products.find(p => p.id === productId);
      const newStock = Math.max(0, product.stock + change);
      await updateStock(productId, newStock);
      
      addToast(`${product.name} ${change > 0 ? '+' : ''}${change}`, 'info', 2000);
    } catch (error) {
      console.error('在庫更新に失敗しました:', error);
      addToast('在庫更新に失敗しました', 'error');
    }
  };

  const handleDeactivate = async (productId, productName) => {
    if (window.confirm(`「${productName}」を在庫管理から外しますか？\n※商品データは残り、後で復活できます`)) {
      try {
        await updateProduct(productId, { isActive: false });
        addToast(`${productName}を在庫管理から外しました`, 'success');
      } catch (error) {
        console.error('在庫管理から外すのに失敗しました:', error);
        addToast('在庫管理から外すのに失敗しました', 'error');
      }
    }
  };

  const handleReactivate = async (productId, productName) => {
    if (window.confirm(`「${productName}」を在庫管理に復活させますか？`)) {
      try {
        await updateProduct(productId, { isActive: true });
        addToast(`${productName}を在庫管理に復活させました`, 'success');
      } catch (error) {
        console.error('復活に失敗しました:', error);
        addToast('復活に失敗しました', 'error');
      }
    }
  };

  // アクティブ商品と非アクティブ商品を分ける
  const activeProducts = products.filter(product => product.isActive !== false);
  const inactiveProducts = products.filter(product => product.isActive === false);
  
  // 表示する商品を決定
  const displayProducts = showInactive ? inactiveProducts : activeProducts;

  // 統計計算（アクティブ商品のみ）
  const totalValue = activeProducts.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = activeProducts.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockCount = activeProducts.filter(product => product.stock <= product.minStock && product.stock > 0).length;
  const myAddedCount = activeProducts.filter(product => !product.isMaster).length;

  // 検索・フィルター
  const filteredProducts = displayProducts
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  return (
    <>
      {/* 統計 */}
      <div className="inventory-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>在庫価値</h3>
            <p>¥{totalValue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>想定利益</h3>
            <p>¥{totalProfit.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>在庫少警告</h3>
            <p>{lowStockCount}品目</p>
          </div>
          <div className="stat-card">
            <h3>追加商品</h3>
            <p>{myAddedCount}品目</p>
          </div>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="inventory-controls">
        <div className="search-filters">
          <input
            type="text"
            placeholder="商品名・メーカーで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">全カテゴリー</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`toggle-button ${showInactive ? 'active' : ''}`}
          >
            {showInactive ? '📦 在庫中' : '📤 停止中'}
            {showInactive && inactiveProducts.length > 0 && ` (${inactiveProducts.length})`}
          </button>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            {showInactive ? (
              <>
                <p>停止中の商品はありません</p>
                <p>在庫管理から外した商品がここに表示されます</p>
              </>
            ) : (
              <>
                <p>商品がありません</p>
                <p>管理者が商品マスターを設定するか、新商品を追加してください</p>
              </>
            )}
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="product-card customer-view" data-category={product.category}>
              {/* 上部バッジ行（新レイアウト） */}
              <div className="product-top-badges">
                {/* 左：ユーザー追加バッジ */}
                <div>
                  {!product.isMaster && (
                    <span className="user-added-badge">✨</span>
                  )}
                </div>
                
                {/* 中央：カテゴリバッジ */}
                <div>
                  <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                    {product.category}
                  </span>
                  {showInactive && (
                    <span className="inactive-badge">💤</span>
                  )}
                </div>
                
                {/* 右：×ボタン */}
                <div>
                  {showInactive ? (
                    <button 
                      onClick={() => handleReactivate(product.id, product.name)} 
                      className="reactivate-button"
                      title="在庫管理に復活"
                    >
                      🔄
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDeactivate(product.id, product.name)} 
                      className="remove-button"
                      title="在庫管理から外す"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="product-image">
                {getCategoryIcon(product.category)}
              </div>

              <div className="product-header">
                <h3>{product.name}</h3>
                {product.manufacturer && (
                  <span className="manufacturer">({product.manufacturer})</span>
                )}
              </div>

              <div className="product-info">
                {product.volume > 0 && (
                  <div className="product-volume-display">容量: {product.volume}{product.volumeUnit}</div>
                )}

                {!showInactive && (
                  <div className="stock-controls">
                    <button
                      onClick={() => handleStockChange(product.id, -1)}
                      className="stock-button minus"
                      disabled={product.stock <= 0}
                    >
                      ➖
                    </button>
                    <span className={`stock-display ${product.stock <= product.minStock ? 'low-stock' : ''}`}>
                      在庫: {product.stock}
                      {product.stock <= product.minStock && product.stock > 0 && ' ⚠️'}
                      {product.stock === 0 && ' 🚫'}
                    </span>
                    <button
                      onClick={() => handleStockChange(product.id, 1)}
                      className="stock-button plus"
                    >
                      ➕
                    </button>
                  </div>
                )}

                {product.isNomihodai && (
                  <div className="nomihodai-badge">🍻 飲み放題</div>
                )}

                {!showInactive && (
                  <RestockButtons 
                    productId={product.id} 
                    onRestock={handleStockChange}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// 分析タブ
function AnalyticsTab({ products }) {
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

// お知らせタブ
function NewsTab() {
  const news = [
    {
      id: 1,
      date: '2025/07/07',
      title: 'バッジレイアウトが改善されました',
      content: '商品カードのバッジが見やすく整理され、✨は左上、カテゴリは中央上、×ボタンは右上に配置されました。',
      type: 'feature'
    },
    {
      id: 2,
      date: '2025/07/07',
      title: 'サジェスト機能が追加されました',
      content: '商品名入力時に既存商品の候補が表示され、情報をコピーできるようになりました。価格は設定不要です。',
      type: 'feature'
    },
    {
      id: 3,
      date: '2025/07/07',
      title: '商品コード・容量機能が追加されました',
      content: '商品に商品コードと容量情報を登録できるようになりました。将来のバーコード読み取り機能にも対応予定です。',
      type: 'update'
    },
    {
      id: 4,
      date: '2025/07/07',
      title: 'タブ機能でより使いやすく',
      content: 'アプリがタブ化され、機能ごとに画面が分かれて使いやすくなりました。',
      type: 'feature'
    },
    {
      id: 5,
      date: '2025/07/06',
      title: '管理者ダッシュボード完成',
      content: '管理者向けの高度な商品管理機能が完成しました。検索・フィルター・ソート機能を搭載。',
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
            <strong>バージョン:</strong> v4.3.1
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

// メイン顧客アプリ
function CustomerApp({ user, logout, addToast, profile }) {
  const { products, loading, error, addProduct, updateProduct, updateStock, generateProductCode } = useProducts(user);
  const [activeTab, setActiveTab] = useState('inventory'); // デフォルトは在庫タブ

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>商品データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <CustomerHeader user={user} logout={logout} profile={profile} />

      <main className="customer-main-content">
        {error && (
          <div className="error-message">
            エラーが発生しました: {error}
          </div>
        )}

        {activeTab === 'add' && (
          <AddProductTab 
            addProduct={addProduct}
            generateProductCode={generateProductCode}
            addToast={addToast}
            products={products}
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

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            products={products}
          />
        )}

        {activeTab === 'news' && (
          <NewsTab />
        )}
      </main>

      <CustomerTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default CustomerApp;