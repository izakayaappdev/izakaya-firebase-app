import React, { useState } from 'react';

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
  const [restockAmount, setRestockAmount] = useState(10);

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
    setRestockAmount(10);
  };

  const handleCancel = () => {
    setShowControls(false);
    setRestockAmount(10);
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

// 在庫管理タブ
function InventoryTab({ 
  products, 
  updateStock, 
  updateProduct,
  addToast 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

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
              {/* 上部バッジ行（3列グリッド配置） */}
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

export default InventoryTab;