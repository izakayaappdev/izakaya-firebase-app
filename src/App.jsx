import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import './App.css';

function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { products, loading, error, addProduct, updateStock, deleteProduct, updateProduct } = useProducts(user);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [editingProduct, setEditingProduct] = useState(null);

  // 飲み物専門カテゴリー
  const categories = [
    'ビール',
    '日本酒',
    '焼酎', 
    'ワイン',
    'カクテル・チューハイ',
    'ノンアルコール',
    'ソフトドリンク'
  ];

  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    cost: '',
    price: '',
    stock: '',
    minStock: '',
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
      isNomihodai: false
    });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim()) {
      alert('商品名は必須です');
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
          (((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.price)) * 100) : 
          0
      };

      if (editingProduct) {
        // 編集モード
        if (updateProduct) {
          await updateProduct(editingProduct.id, productData);
        } else {
          alert('編集機能は現在利用できません');
          return;
        }
      } else {
        // 新規追加モード
        await addProduct(productData);
      }
      
      resetForm();
    } catch (error) {
      console.error('商品の保存に失敗しました:', error);
      alert('商品の保存に失敗しました');
    }
  };

  const handleStockChange = async (productId, change) => {
    try {
      const product = products.find(p => p.id === productId);
      const newStock = Math.max(0, product.stock + change);
      await updateStock(productId, newStock);
    } catch (error) {
      console.error('在庫更新に失敗しました:', error);
      alert('在庫更新に失敗しました');
    }
  };

  const handleEdit = (product) => {
    setNewProduct({
      name: product.name,
      manufacturer: product.manufacturer || '',
      category: product.category,
      cost: product.cost.toString(),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      isNomihodai: product.isNomihodai
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('この商品を削除しますか？')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('商品削除に失敗しました:', error);
        alert('商品削除に失敗しました');
      }
    }
  };

  // 検索・フィルター・ソート機能
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stock':
          return b.stock - a.stock;
        case 'profit':
          return b.profit - a.profit;
        case 'profitRate':
          return b.profitRate - a.profitRate;
        default:
          return 0;
      }
    });

  // 統計計算
  const totalValue = products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const nomihodaiCount = products.filter(product => product.isNomihodai).length;

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🍻 飲み屋在庫管理</h1>
          <p>飲み物専門の在庫管理システム</p>
          <button onClick={signInWithGoogle} className="login-button">
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

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
      <header className="app-header">
        <div className="header-content">
          <h1>🍻 飲み屋在庫管理</h1>
          <div className="user-info">
            <img src={user.photoURL} alt="プロフィール" className="user-avatar" />
            <span>{user.displayName}</span>
            <button onClick={logout} className="logout-button">ログアウト</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-message">
            エラーが発生しました: {error}
          </div>
        )}

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
            <h3>飲み放題対象</h3>
            <p>{nomihodaiCount}品目</p>
          </div>
          <div className="stat-card">
            <h3>総品目数</h3>
            <p>{products.length}品目</p>
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
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">名前順</option>
              <option value="stock">在庫順</option>
              <option value="profit">利益順</option>
              <option value="profitRate">利益率順</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            ➕ 商品追加
          </button>
        </div>

        {/* 商品追加・編集フォーム */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{editingProduct ? '商品編集' : '新商品追加'}</h2>
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
                      placeholder="例：125（任意）"
                    />
                  </div>

                  <div className="form-group">
                    <label>販売価格 (円)</label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="例：450（任意）"
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

        {/* 商品一覧 */}
        <div className="products-grid">
          {filteredAndSortedProducts.length === 0 ? (
            <div className="no-products">
              <p>商品がありません</p>
              <button onClick={() => setShowAddForm(true)} className="add-first-button">
                最初の商品を追加
              </button>
            </div>
          ) : (
            filteredAndSortedProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-header">
                  <h3>{product.name}</h3>
                  {product.manufacturer && (
                    <span className="manufacturer">({product.manufacturer})</span>
                  )}
                  <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                    {product.category}
                  </span>
                </div>

                <div className="product-info">
                  <div className="price-info">
                    <div>仕入: {product.cost ? `¥${product.cost}` : '未設定'}</div>
                    <div>販売: {product.price ? `¥${product.price}` : '未設定'}</div>
                    <div className={`profit ${(product.profitRate || 0) > 50 ? 'high' : (product.profitRate || 0) > 30 ? 'medium' : 'low'}`}>
                      利益: {(product.price && product.cost && product.profitRate !== undefined) ? `¥${product.profit} (${product.profitRate.toFixed(1)}%)` : '算出不可'}
                    </div>
                  </div>

                  <div className="stock-controls">
                    <button
                      onClick={() => handleStockChange(product.id, -1)}
                      className="stock-button minus"
                      disabled={product.stock <= 0}
                    >
                      ➖
                    </button>
                    <span className={`stock-display ${product.stock <= product.minStock ? 'low-stock' : ''}`}>
                      {product.stock}
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
                      🔄 再入荷
                    </button>
                  )}
                </div>

                <div className="product-actions">
                  <button onClick={() => handleEdit(product)} className="edit-button">
                    ✏️ 編集
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="delete-button">
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default App;