import React, { useState } from 'react';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

// 顧客用アプリ（Toast通知対応）
function CustomerApp({ user, logout, products, updateStock, addProduct, updateProduct, deleteProduct }) {
  const { toasts, showToast, removeToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // 顧客側カテゴリ（泡盛対応）
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

  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    cost: '',
    price: '',
    stock: '',
    minStock: '',
    description: '',
    isNomihodai: false
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
      isNomihodai: false
    });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim()) {
      showToast('商品名は必須です', 'error');
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
          (((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.price)) * 100) : 0,
        isMaster: false // 顧客商品として追加
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showToast(`${newProduct.name} を更新しました`, 'success');
      } else {
        await addProduct(productData);
        showToast(`${newProduct.name} を追加しました！`, 'success');
      }
      
      resetForm();
    } catch (error) {
      console.error('商品の保存に失敗しました:', error);
      showToast('商品の保存に失敗しました', 'error');
    }
  };

  const handleStockChange = async (productId, change) => {
    try {
      const product = products.find(p => p.id === productId);
      const newStock = Math.max(0, product.stock + change);
      await updateStock(productId, newStock);
      
      // 軽量な在庫変更通知
      const changeText = change > 0 ? `+${change}` : change.toString();
      showToast(`${product.name} ${changeText}`, 'info', 2000);
    } catch (error) {
      console.error('在庫更新に失敗しました:', error);
      showToast('在庫更新に失敗しました', 'error');
    }
  };

  const handleEdit = (product) => {
    // マスター商品は編集不可
    if (product.isMaster) {
      showToast('マスター商品は編集できません', 'warning');
      return;
    }

    setNewProduct({
      name: product.name,
      manufacturer: product.manufacturer || '',
      category: product.category,
      cost: product.cost.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      description: product.description || '',
      isNomihodai: product.isNomihodai
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    const product = products.find(p => p.id === productId);
    
    // マスター商品は削除不可
    if (product.isMaster) {
      showToast('マスター商品は削除できません', 'warning');
      return;
    }

    if (window.confirm(`${product.name} を削除しますか？`)) {
      try {
        await deleteProduct(productId);
        showToast(`${product.name} を削除しました`, 'success');
      } catch (error) {
        console.error('商品削除に失敗しました:', error);
        showToast('商品削除に失敗しました', 'error');
      }
    }
  };

  // 検索・フィルター（顧客は全商品表示：マスター + 自分が追加した商品）
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  // 統計計算
  const totalValue = filteredProducts.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = filteredProducts.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockCount = filteredProducts.filter(product => product.stock <= product.minStock && product.stock > 0).length;
  const myAddedCount = filteredProducts.filter(product => !product.isMaster).length;

  return (
    <div className="app">
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

      <main className="main-content">
        {/* 統計サマリー */}
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

        {/* 検索・フィルター・アクション */}
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
          
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            ➕ 新商品追加
          </button>
        </div>

        {/* 商品追加・編集フォーム */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{editingProduct ? '商品編集' : '新商品追加'}</h2>
              <p className="form-note">
                {editingProduct ? 
                  '自分で追加した商品のみ編集できます' : 
                  '新商品は管理者確認後、他店舗でも利用可能になります'
                }
              </p>
              <form onSubmit={handleSubmit} className="product-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>商品名 *</label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="例：鍋島 純米吟醸"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>メーカー</label>
                    <input
                      type="text"
                      value={newProduct.manufacturer}
                      onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                      placeholder="例：富久千代酒造"
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
                      placeholder="例：1200"
                    />
                  </div>

                  <div className="form-group">
                    <label>販売価格 (円)</label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="例：2800"
                    />
                  </div>

                  <div className="form-group">
                    <label>現在在庫</label>
                    <input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      placeholder="例：12"
                    />
                  </div>

                  <div className="form-group">
                    <label>最小在庫</label>
                    <input
                      type="number"
                      value={newProduct.minStock}
                      onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
                      placeholder="例：3"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>商品説明</label>
                    <textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="例：佐賀県を代表する銘酒。フルーティーで上品な味わい"
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
                    {editingProduct ? '更新' : '追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 在庫一覧 */}
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>商品がありません</p>
              <button onClick={() => setShowAddForm(true)} className="add-first-button">
                新商品を追加
              </button>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className={`product-card ${product.isMaster ? 'master-product' : 'user-product'}`}>
                <div className="product-header">
                  <h3>{product.name}</h3>
                  {product.manufacturer && (
                    <span className="manufacturer">({product.manufacturer})</span>
                  )}
                  {product.isMaster ? (
                    <span className="master-badge">📋 マスター</span>
                  ) : (
                    <span className="user-badge">✨ 自分で追加</span>
                  )}
                  <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                    {product.category}
                  </span>
                </div>

                <div className="product-info">
                  {product.description && (
                    <div className="product-description">{product.description}</div>
                  )}
                  
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

                  {/* 価格情報（顧客にも表示） */}
                  {(product.cost > 0 || product.price > 0) && (
                    <div className="price-info-customer">
                      {product.cost > 0 && <span>仕入: ¥{product.cost}</span>}
                      {product.price > 0 && <span>販売: ¥{product.price}</span>}
                      {product.profit > 0 && (
                        <span className={`profit ${product.profitRate > 50 ? 'high' : product.profitRate > 30 ? 'medium' : 'low'}`}>
                          利益: ¥{product.profit} ({product.profitRate.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  )}

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

                {/* 編集・削除ボタン（自分で追加した商品のみ） */}
                {!product.isMaster && (
                  <div className="product-actions">
                    <button onClick={() => handleEdit(product)} className="edit-button">
                      ✏️ 編集
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="delete-button">
                      🗑️ 削除
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Toast通知コンテナ */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default CustomerApp;