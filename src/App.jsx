const handleDelete = async (productId) => {
    if (window.confirm('この商品を削除しますか？')) {
      try {
        await deleteProduct(productId);
      } catch (error) {
        console.error('商品削除に失敗しました:', error);
        alert('商品削除に失敗しました');
      }
    }
  };import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import './App.css';

// 管理者判定
const ADMIN_EMAIL = 'izakaya.app.dev@gmail.com';

// 管理者用ダッシュボード
function AdminDashboard({ user, logout, products, addProduct, updateProduct, deleteProduct }) {
  const [activeTab, setActiveTab] = useState('products');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // 飲み物専門カテゴリー
  const categories = [
    'ビール', '日本酒', '焼酎', 'ワイン', 'カクテル・チューハイ', 'ノンアルコール', 'ソフトドリンク'
  ];

  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    cost: '',
    price: '',
    description: '',
    isMaster: true // マスター商品として登録
  });

  const resetForm = () => {
    setNewProduct({
      name: '',
      manufacturer: '',
      category: 'ビール',
      cost: '',
      price: '',
      description: '',
      isMaster: true
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
        stock: 0, // マスター商品は在庫0で開始
        minStock: 0,
        profit: (parseFloat(newProduct.price) || 0) - (parseFloat(newProduct.cost) || 0),
        profitRate: (parseFloat(newProduct.price) && parseFloat(newProduct.cost)) ? 
          (((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.price)) * 100) : 0,
        isNomihodai: false
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      
      resetForm();
    } catch (error) {
      console.error('商品マスター保存に失敗しました:', error);
      alert('商品マスター保存に失敗しました');
    }
  };

  const handleEdit = (product) => {
    setNewProduct({
      name: product.name,
      manufacturer: product.manufacturer || '',
      category: product.category,
      cost: product.cost.toString(),
      price: product.price.toString(),
      description: product.description || '',
      isMaster: true
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  // マスター化機能
  const handlePromoteToMaster = async (product) => {
    if (window.confirm(`「${product.name}」をマスター商品に追加しますか？`)) {
      try {
        // マスター商品として新規追加
        const masterProduct = {
          ...product,
          isMaster: true,
          stock: 0, // マスターは在庫0で開始
          createdAt: new Date() // 新しい作成日時
        };
        
        await addProduct(masterProduct);
        
        // 元の顧客商品を削除
        await deleteProduct(product.id);
        
        alert('マスター商品に追加しました');
      } catch (error) {
        console.error('マスター化に失敗しました:', error);
        alert('マスター化に失敗しました');
      }
    }
  };

  // 重複確認機能（将来実装）
  const handleCheckDuplicate = (product) => {
    // 簡単な名前マッチング
    const possibleDuplicates = masterProducts.filter(master => 
      master.name.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(master.name.toLowerCase())
    );
    
    if (possibleDuplicates.length > 0) {
      const duplicateNames = possibleDuplicates.map(p => p.name).join(', ');
      alert(`類似商品が見つかりました: ${duplicateNames}\n\n重複の可能性があります。`);
    } else {
      alert('類似商品は見つかりませんでした。\n\n新商品として安全にマスター化できます。');
    }
  };

  // マスター商品のみ表示
  const masterProducts = products.filter(product => product.isMaster);
  const customerProducts = products.filter(product => !product.isMaster);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🔧 管理者ダッシュボード</h1>
          <div className="user-info">
            <img src={user.photoURL} alt="管理者" className="user-avatar" />
            <span>{user.displayName} (管理者)</span>
            <button onClick={logout} className="logout-button">ログアウト</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* 管理タブ */}
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            商品マスター管理
          </button>
          <button 
            className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            顧客追加商品管理
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            データ分析
          </button>
        </div>

        {/* 商品マスター管理 */}
        {activeTab === 'products' && (
          <div>
            <div className="admin-controls">
              <h2>商品マスター管理</h2>
              <button onClick={() => setShowAddForm(true)} className="add-button">
                ➕ 商品マスター追加
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>マスター商品数</h3>
                <p>{masterProducts.length}品目</p>
              </div>
              <div className="stat-card">
                <h3>顧客利用商品</h3>
                <p>{customerProducts.length}品目</p>
              </div>
            </div>

            {/* 商品マスター一覧 */}
            <div className="products-grid">
              {masterProducts.length === 0 ? (
                <div className="no-products">
                  <p>商品マスターがありません</p>
                  <button onClick={() => setShowAddForm(true)} className="add-first-button">
                    最初の商品マスターを追加
                  </button>
                </div>
              ) : (
                masterProducts.map(product => (
                  <div key={product.id} className="product-card admin-card">
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
                        <div className="profit">
                          利益: {(product.price && product.cost) ? `¥${product.profit} (${product.profitRate.toFixed(1)}%)` : '算出不可'}
                        </div>
                      </div>
                      {product.description && (
                        <div className="product-description">{product.description}</div>
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
          </div>
        )}

        {/* 顧客追加商品管理 */}
        {activeTab === 'customers' && (
          <div>
            <div className="admin-controls">
              <h2>顧客追加商品管理</h2>
              <p>お客さんが手動で追加した商品をマスターに追加できます</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>顧客追加商品</h3>
                <p>{customerProducts.length}品目</p>
              </div>
              <div className="stat-card">
                <h3>マスター化候補</h3>
                <p>{customerProducts.filter(p => !p.isMaster).length}品目</p>
              </div>
            </div>

            {customerProducts.length === 0 ? (
              <div className="no-products">
                <p>顧客が追加した商品はまだありません</p>
                <p>お客さんが新しい商品を手動追加すると、ここに表示されます</p>
              </div>
            ) : (
              <div className="products-grid">
                {customerProducts.map(product => (
                  <div key={product.id} className="product-card customer-card">
                    <div className="product-header">
                      <h3>{product.name}</h3>
                      {product.manufacturer && (
                        <span className="manufacturer">({product.manufacturer})</span>
                      )}
                      <span className="customer-badge">顧客追加</span>
                      <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                        {product.category}
                      </span>
                    </div>

                    <div className="product-info">
                      <div className="price-info">
                        <div>仕入: {product.cost ? `¥${product.cost}` : '未設定'}</div>
                        <div>販売: {product.price ? `¥${product.price}` : '未設定'}</div>
                        <div>現在在庫: {product.stock}</div>
                      </div>
                      <div className="customer-info">
                        <div>追加者: {product.addedBy}</div>
                        <div>追加日: {product.createdAt?.toDate?.()?.toLocaleDateString() || '不明'}</div>
                      </div>
                    </div>

                    <div className="product-actions">
                      <button 
                        onClick={() => handlePromoteToMaster(product)} 
                        className="promote-button"
                        title="この商品をマスターに追加"
                      >
                        ⬆️ マスター化
                      </button>
                      <button 
                        onClick={() => handleCheckDuplicate(product)} 
                        className="check-button"
                        title="重複商品をチェック"
                      >
                        🔍 重複確認
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="delete-button">
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* データ分析 */}
        {activeTab === 'analytics' && (
          <div>
            <h2>データ分析</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>総商品数</h3>
                <p>{products.length}品目</p>
              </div>
              <div className="stat-card">
                <h3>カテゴリ数</h3>
                <p>{categories.length}カテゴリ</p>
              </div>
            </div>
          </div>
        )}

        {/* 商品マスター追加・編集フォーム */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{editingProduct ? '商品マスター編集' : '商品マスター追加'}</h2>
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
                    <label>標準仕入れ値 (円)</label>
                    <input
                      type="number"
                      value={newProduct.cost}
                      onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
                      placeholder="例：125"
                    />
                  </div>

                  <div className="form-group">
                    <label>標準販売価格 (円)</label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="例：450"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>商品説明</label>
                    <textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="例：定番の辛口ビール"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={resetForm} className="cancel-button">
                    キャンセル
                  </button>
                  <button type="submit" className="submit-button">
                    {editingProduct ? 'マスター更新' : 'マスター追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 顧客用アプリ
function CustomerApp({ user, logout, products, updateStock }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = [
    'ビール', '日本酒', '焼酎', 'ワイン', 'カクテル・チューハイ', 'ノンアルコール', 'ソフトドリンク'
  ];

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

  // 検索・フィルター
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

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

        {/* 在庫一覧 */}
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>商品がありません</p>
              <p>管理者が商品マスターを設定するまでお待ちください</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="product-card customer-view">
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

                  {product.stock === 0 && (
                    <button
                      onClick={() => handleStockChange(product.id, 10)}
                      className="restock-button"
                    >
                      🔄 再入荷 (+10)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// メインアプリ
function App() {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const { products, loading: productsLoading, error, addProduct, updateStock, deleteProduct, updateProduct } = useProducts(user);

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🍻 飲み屋在庫管理システム</h1>
          <p>管理者・店舗向け在庫管理システム</p>
          <button onClick={signInWithGoogle} className="login-button">
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || productsLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="error-message">
          エラーが発生しました: {error}
        </div>
      )}
      
      {isAdmin ? (
        <AdminDashboard 
          user={user} 
          logout={logout}
          products={products}
          addProduct={addProduct}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
        />
      ) : (
        <CustomerApp 
          user={user} 
          logout={logout}
          products={products}
          updateStock={updateStock}
        />
      )}
    </>
  );
}

export default App;