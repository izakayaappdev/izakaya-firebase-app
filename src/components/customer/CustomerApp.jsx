import React, { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';

// 顧客側も泡盛カテゴリに対応
const categories = [
  'ビール', 
  '日本酒', 
  '焼酎', 
  '泡盛',
  'ワイン', 
  'カクテル・チューハイ', 
  'ソフトドリンク',
  'ノンアルコール'
];

// カテゴリ別デフォルトアイコン
const getCategoryIcon = (category) => {
  switch (category) {
    case 'ビール': return '🍺';
    case '日本酒': return '🍶';
    case '焼酎': return '🥃';
    case '泡盛': return '🥃';
    case 'ワイン': return '🍷';
    case 'カクテル・チューハイ': return '🍹';
    case 'ソフトドリンク': return '🥤';
    case 'ノンアルコール': return '🧃';
    default: return '🥤';
  }
};

// 顧客ヘッダー
function CustomerHeader({ user, logout }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>🍻 在庫管理</h1>
        <div className="user-info">
          <img src={user.photoURL} alt="プロフィール" className="user-avatar" />
          <span>{user.displayName}</span>
          <button onClick={logout} className="logout-button">ログアウト</button>
        </div>
      </div>
    </header>
  );
}

// 顧客統計
function CustomerStats({ products, addToast }) {
  // マスター商品 + 自分で追加した商品のみ表示
  const filteredProducts = products.filter(product => 
    product.isMaster || !product.isMaster // 全商品（自分のデータのみFirestoreから取得済み）
  );

  const totalValue = filteredProducts.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = filteredProducts.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockCount = filteredProducts.filter(product => product.stock <= product.minStock && product.stock > 0).length;
  const myAddedCount = filteredProducts.filter(product => !product.isMaster).length;

  return (
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
  );
}

// 商品リスト
function ProductList({ 
  products, 
  updateStock, 
  deleteProduct,
  searchTerm, 
  setSearchTerm, 
  filterCategory, 
  setFilterCategory,
  addToast 
}) {
  const handleStockChange = async (productId, change) => {
    try {
      const product = products.find(p => p.id === productId);
      const newStock = Math.max(0, product.stock + change);
      await updateStock(productId, newStock);
      
      // 軽量な情報通知（2秒で消去）
      addToast(`${product.name} ${change > 0 ? '+' : ''}${change}`, 'info', 2000);
    } catch (error) {
      console.error('在庫更新に失敗しました:', error);
      addToast('在庫更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (productId, productName, isMaster) => {
    if (isMaster) {
      addToast('マスター商品は削除できません', 'warning');
      return;
    }

    if (window.confirm(`「${productName}」を削除しますか？`)) {
      try {
        await deleteProduct(productId);
        addToast(`${productName}を削除しました`, 'success');
      } catch (error) {
        console.error('商品削除に失敗しました:', error);
        addToast('商品削除に失敗しました', 'error');
      }
    }
  };

  // 検索・フィルター
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  return (
    <>
      {/* 検索・フィルター */}
      <div className="controls">
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
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>商品がありません</p>
            <p>管理者が商品マスターを設定するか、新商品を追加してください</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="product-card customer-view">
              {/* 商品画像 */}
              <div className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  getCategoryIcon(product.category)
                )}
              </div>

              <div className="product-header">
                <h3>{product.name}</h3>
                {product.manufacturer && (
                  <span className="manufacturer">({product.manufacturer})</span>
                )}
                <div className="product-badges">
                  <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                    {product.category}
                  </span>
                  {product.isMaster ? (
                    <span className="master-badge">📋 マスター</span>
                  ) : (
                    <span className="user-added-badge">✨ 自分で追加</span>
                  )}
                </div>
              </div>

              <div className="product-info">
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

                {product.isNomihodai && (
                  <div className="nomihodai-badge">🍻 飲み放題</div>
                )}

                {product.stock === 0 && (
                  <button
                    onClick={() => handleStockChange(product.id, 10)}
                    className="restock-button"
                  >
                    🔄 再入荷 (+10)
                  </button>
                )}
              </div>

              {/* 自分で追加した商品のみ削除可能 */}
              {!product.isMaster && (
                <div className="product-actions">
                  <button 
                    onClick={() => handleDelete(product.id, product.name, product.isMaster)} 
                    className="delete-button"
                  >
                    🗑️ 削除
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// 新商品追加フォーム
function ProductAddForm({ 
  showAddForm, 
  setShowAddForm, 
  addProduct, 
  addToast 
}) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    cost: '',
    price: '',
    stock: '',
    minStock: '',
    description: '',
    image: '', // 画像URL追加
    isNomihodai: false,
    isMaster: false // 顧客が追加する商品はマスターではない
  });

  const resetForm = () => {
    setNewProduct({
      name: '',
      manufacturer: '',
      category: 'ビール',
      cost: '',
      price: '',
      stock: '',
      minStock: '',
      description: '',
      image: '', // 画像URL追加
      isNomihodai: false,
      isMaster: false
    });
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim()) {
      addToast('商品名は必須です', 'error');
      return;
    }

    try {
      const productData = {
        ...newProduct,
        cost: parseFloat(newProduct.cost) || 0,
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        profit: (parseFloat(newProduct.price) || 0) - (parseFloat(newProduct.cost) || 0),
        profitRate: (parseFloat(newProduct.price) && parseFloat(newProduct.cost)) ? 
          (((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.price)) * 100) : 0
      };

      await addProduct(productData);
      addToast(`${newProduct.name}を追加しました！`, 'success');
      resetForm();
    } catch (error) {
      console.error('商品の保存に失敗しました:', error);
      addToast('商品の保存に失敗しました', 'error');
    }
  };

  if (!showAddForm) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>新商品追加</h2>
        <p className="form-note">
          ℹ️ 追加された商品は管理者の確認後、他の店舗でも利用可能になります
        </p>
        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-grid">
            <div className="form-group">
              <label>商品名 *</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="例：スーパードライ"
                required
              />
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
              <label>仕入れ値 (円)</label>
              <input
                type="number"
                value={newProduct.cost}
                onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
                placeholder="例：125"
              />
            </div>

            <div className="form-group">
              <label>販売価格 (円)</label>
              <input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                placeholder="例：450"
              />
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

            <div className="form-group">
              <label>商品画像URL</label>
              <input
                type="url"
                value={newProduct.image}
                onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                placeholder="例：https://example.com/product.jpg"
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
              キャンセル
            </button>
            <button type="submit" className="submit-button">
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// メイン顧客アプリ
function CustomerApp({ user, logout, addToast }) {
  const { products, loading, error, addProduct, updateStock, deleteProduct } = useProducts(user);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

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
      <CustomerHeader user={user} logout={logout} />

      <main className="main-content">
        {error && (
          <div className="error-message">
            エラーが発生しました: {error}
          </div>
        )}

        <CustomerStats products={products} addToast={addToast} />

        {/* 新商品追加ボタン */}
        <div className="customer-controls">
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            ➕ 新商品追加
          </button>
        </div>

        <ProductList 
          products={products}
          updateStock={updateStock}
          deleteProduct={deleteProduct}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          addToast={addToast}
        />

        <ProductAddForm 
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          addProduct={addProduct}
          addToast={addToast}
        />
      </main>
    </div>
  );
}

export default CustomerApp;