import React, { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';

// 唐津市向け飲み物専門カテゴリー（泡盛追加）
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

// 管理者ヘッダー
function AdminHeader({ user, logout }) {
  return (
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
  );
}

// 管理タブ
function AdminTabs({ activeTab, setActiveTab }) {
  return (
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
  );
}

// 商品マスター管理
function ProductMasterManager({ 
  products, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  generateProductCode,
  addToast 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // フィルター・ソート状態追加
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    cost: '',
    price: '',
    description: '',
    image: '',
    productCode: '',
    volume: '',
    volumeUnit: 'ml',
    isMaster: true
  });

  const resetForm = () => {
    setNewProduct({
      name: '',
      manufacturer: '',
      category: 'ビール',
      cost: '',
      price: '',
      description: '',
      image: '',
      productCode: '',
      volume: '',
      volumeUnit: 'ml',
      isMaster: true
    });
    setShowAddForm(false);
    setEditingProduct(null);
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
        volume: parseFloat(newProduct.volume) || 0,
        stock: 0,
        minStock: 0,
        profit: (parseFloat(newProduct.price) || 0) - (parseFloat(newProduct.cost) || 0),
        profitRate: (parseFloat(newProduct.price) && parseFloat(newProduct.cost)) ? 
          (((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.price)) * 100) : 0,
        isNomihodai: false
      };

      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, productData);
        if (result.success) {
          addToast(`${newProduct.name}を更新しました`, 'success');
        } else {
          addToast(result.error || '更新に失敗しました', 'error');
          return;
        }
      } else {
        const result = await addProduct(productData);
        if (result.success) {
          addToast(`${newProduct.name}を追加しました！`, 'success');
        } else {
          addToast(result.error || '追加に失敗しました', 'error');
          return;
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('商品マスター保存に失敗しました:', error);
      addToast('商品マスター保存に失敗しました', 'error');
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
      image: product.image || '',
      productCode: product.productCode || '',
      volume: product.volume?.toString() || '',
      volumeUnit: product.volumeUnit || 'ml',
      isMaster: true
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId, productName) => {
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

  // 商品コード自動生成
  const handleGenerateProductCode = () => {
    const autoCode = generateProductCode();
    setNewProduct({...newProduct, productCode: autoCode});
  };

  // フィルター・ソート機能
  const masterProducts = products
    .filter(product => product.isMaster)
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (product.productCode && product.productCode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'manufacturer':
          return (a.manufacturer || '').localeCompare(b.manufacturer || '');
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'profit':
          return (b.profit || 0) - (a.profit || 0);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

  const allMasterProducts = products.filter(product => product.isMaster);

  return (
    <>
      {/* 統計セクション */}
      <div className="admin-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>マスター商品数</h3>
            <p>{allMasterProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>表示中</h3>
            <p>{masterProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>カテゴリ数</h3>
            <p>{categories.length}カテゴリ</p>
          </div>
          <div className="stat-card">
            <h3>総商品数</h3>
            <p>{products.length}品目</p>
          </div>
        </div>
      </div>

      {/* コントロールセクション */}
      <div className="admin-controls-section">
        <div className="admin-controls">
          <h2>商品マスター管理</h2>
          <button onClick={() => setShowAddForm(true)} className="add-button">
            ➕ 商品マスター追加
          </button>
        </div>
      </div>

      {/* 検索・フィルター・ソートセクション */}
      <div className="admin-filters-section">
        <div className="admin-search-controls">
          <div className="search-filters">
            <input
              type="text"
              placeholder="商品名・メーカー・商品コードで検索..."
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
              <option value="category">カテゴリ順</option>
              <option value="manufacturer">メーカー順</option>
              <option value="price">価格順</option>
              <option value="profit">利益順</option>
              <option value="created">追加日順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 商品グリッドセクション */}
      <div className="admin-products-section">
        <div className="products-grid">
          {masterProducts.length === 0 ? (
            <div className="no-products">
              {allMasterProducts.length === 0 ? (
                <>
                  <p>商品マスターがありません</p>
                  <button onClick={() => setShowAddForm(true)} className="add-first-button">
                    最初の商品マスターを追加
                  </button>
                </>
              ) : (
                <p>検索条件に一致する商品がありません</p>
              )}
            </div>
          ) : (
            masterProducts.map(product => (
              <div key={product.id} className="product-card admin-card" data-category={product.category}>
                {/* 商品画像 */}
                <div className="product-image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    '📦'
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
                  </div>
                </div>

                <div className="product-info">
                  {product.productCode && (
                    <div className="product-code">商品コード: {product.productCode}</div>
                  )}
                  {product.volume > 0 && (
                    <div className="product-volume">容量: {product.volume}{product.volumeUnit}</div>
                  )}
                  {product.description && (
                    <div className="product-description">{product.description}</div>
                  )}
                </div>

                <div className="product-actions">
                  <button onClick={() => handleEdit(product)} className="edit-button">
                    ✏️ 編集
                  </button>
                  <button onClick={() => handleDelete(product.id, product.name)} className="delete-button">
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 商品マスター追加・編集フォーム */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingProduct ? '商品マスター編集' : '商品マスター追加'}</h2>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="product-name">商品名 *</label>
                  <input
                    id="product-name"
                    name="productName"
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="例：アサヒスーパードライ 350ml缶"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-manufacturer">メーカー</label>
                  <input
                    id="product-manufacturer"
                    name="productManufacturer"
                    type="text"
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                    placeholder="例：アサヒビール"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-category">カテゴリー *</label>
                  <select
                    id="product-category"
                    name="productCategory"
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
                  <label htmlFor="product-code">商品コード</label>
                  <div className="product-code-input">
                    <input
                      id="product-code"
                      name="productCode"
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
                  <label htmlFor="product-volume">容量</label>
                  <input
                    id="product-volume"
                    name="productVolume"
                    type="number"
                    value={newProduct.volume}
                    onChange={(e) => setNewProduct({...newProduct, volume: e.target.value})}
                    placeholder="例：350"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-volume-unit">容量単位</label>
                  <select
                    id="product-volume-unit"
                    name="productVolumeUnit"
                    value={newProduct.volumeUnit}
                    onChange={(e) => setNewProduct({...newProduct, volumeUnit: e.target.value})}
                  >
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="product-cost">標準仕入れ値 (円)</label>
                  <input
                    id="product-cost"
                    name="productCost"
                    type="number"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
                    placeholder="例：150"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-price">標準販売価格 (円)</label>
                  <input
                    id="product-price"
                    name="productPrice"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="例：450"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-image">商品画像URL</label>
                  <input
                    id="product-image"
                    name="productImage"
                    type="url"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    placeholder="例：https://example.com/product.jpg"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="product-description">商品説明</label>
                  <textarea
                    id="product-description"
                    name="productDescription"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="例：定番の辛口ビール。唐津市内でも人気の銘柄"
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
    </>
  );
}

// 顧客追加商品管理
function CustomerProductManager({ 
  products, 
  addProduct, 
  deleteProduct, 
  addToast 
}) {
  const masterProducts = products.filter(product => product.isMaster);
  const customerProducts = products.filter(product => !product.isMaster);

  // マスター化処理の修正版（AdminDashboard.jsx内の該当関数）

const handlePromoteToMaster = async (product) => {
  if (window.confirm(`「${product.name}」をマスター商品に変更しますか？`)) {
    try {
      // 元の商品を削除せず、isMasterフラグだけ変更
      const result = await updateProduct(product.id, {
        isMaster: true,
        updatedAt: new Date()
      });
      
      if (result.success) {
        addToast(`${product.name}をマスター商品に変更しました`, 'success');
      } else {
        addToast(result.error || 'マスター化に失敗しました', 'error');
      }
    } catch (error) {
      console.error('マスター化に失敗しました:', error);
      addToast('マスター化に失敗しました', 'error');
    }
  }
};

  const handleCheckDuplicate = (product) => {
    const possibleDuplicates = masterProducts.filter(master => 
      master.name.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(master.name.toLowerCase())
    );
    
    if (possibleDuplicates.length > 0) {
      const duplicateNames = possibleDuplicates.map(p => p.name).join(', ');
      addToast(`類似商品が見つかりました: ${duplicateNames}`, 'warning');
    } else {
      addToast('類似商品は見つかりませんでした。新商品として安全にマスター化できます。', 'info');
    }
  };

  const handleDelete = async (productId, productName) => {
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

  return (
    <>
      {/* 統計セクション */}
      <div className="admin-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>顧客追加商品</h3>
            <p>{customerProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>マスター化候補</h3>
            <p>{customerProducts.filter(p => !p.isMaster).length}品目</p>
          </div>
          <div className="stat-card">
            <h3>マスター商品</h3>
            <p>{masterProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>総商品数</h3>
            <p>{products.length}品目</p>
          </div>
        </div>
      </div>

      {/* コントロールセクション */}
      <div className="admin-controls-section">
        <div className="admin-controls">
          <h2>顧客追加商品管理</h2>
          <p>お客さんが手動で追加した商品をマスターに追加できます</p>
        </div>
      </div>

      {/* 商品グリッドセクション */}
      <div className="admin-products-section">
        <div className="products-grid">
          {customerProducts.length === 0 ? (
            <div className="no-products">
              <p>顧客が追加した商品はまだありません</p>
              <p>お客さんが新しい商品を手動追加すると、ここに表示されます</p>
            </div>
          ) : (
            customerProducts.map(product => (
              <div key={product.id} className="product-card customer-card">
                {/* 商品画像 */}
                <div className="product-image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    '📦'
                  )}
                </div>

                <div className="product-header">
                  <h3>{product.name}</h3>
                  {product.manufacturer && (
                    <span className="manufacturer">({product.manufacturer})</span>
                  )}
                  <div className="product-badges">
                    <span className="customer-badge">顧客追加</span>
                    <span className={`category-badge category-${product.category.replace(/[・]/g, '-')}`}>
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="customer-info">
                  {product.productCode && (
                    <div>商品コード: {product.productCode}</div>
                  )}
                  {product.volume > 0 && (
                    <div>容量: {product.volume}{product.volumeUnit}</div>
                  )}
                  <div>追加者: {product.addedBy}</div>
                  <div>追加日: {product.createdAt?.toDate?.()?.toLocaleDateString() || '不明'}</div>
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
                  <button onClick={() => handleDelete(product.id, product.name)} className="delete-button">
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// データ分析
function DataAnalytics({ products }) {
  const masterProducts = products.filter(product => product.isMaster);
  const customerProducts = products.filter(product => !product.isMaster);

  return (
    <>
      {/* 統計セクション */}
      <div className="admin-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>総商品数</h3>
            <p>{products.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>マスター商品</h3>
            <p>{masterProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>顧客追加商品</h3>
            <p>{customerProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>カテゴリ数</h3>
            <p>{categories.length}カテゴリ</p>
          </div>
        </div>
      </div>
      
      {/* カテゴリ分析セクション */}
      <div className="admin-category-section">
        <div className="category-analysis">
          <h3>カテゴリ別商品数</h3>
          <div className="category-stats">
            {categories.map(category => {
              const categoryCount = masterProducts.filter(p => p.category === category).length;
              return (
                <div key={category} className="category-stat">
                  <span className={`category-badge category-${category.replace(/[・]/g, '-')}`}>
                    {category}
                  </span>
                  <span className="count">{categoryCount}品目</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// メイン管理者ダッシュボード
function AdminDashboard({ user, logout, addToast }) {
  const { products, loading, error, addProduct, updateProduct, deleteProduct, generateProductCode } = useProducts(user);
  const [activeTab, setActiveTab] = useState('products');

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>管理者データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <AdminHeader user={user} logout={logout} />

      <main className="admin-main-content">
        {error && (
          <div className="error-message">
            エラーが発生しました: {error}
          </div>
        )}

        {activeTab === 'products' && (
          <ProductMasterManager 
            products={products}
            addProduct={addProduct}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
            generateProductCode={generateProductCode}
            addToast={addToast}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerProductManager 
            products={products}
            addProduct={addProduct}
            deleteProduct={deleteProduct}
            addToast={addToast}
          />
        )}

        {activeTab === 'analytics' && (
          <DataAnalytics products={products} />
        )}
      </main>

      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}



export default AdminDashboard;