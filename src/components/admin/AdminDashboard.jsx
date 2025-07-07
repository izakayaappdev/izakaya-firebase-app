import React, { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';

// 唐津市向け飲み物専門カテゴリー（10カテゴリー完全版）
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
    container: '',
    isPopular: false,
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
      container: '',
      isPopular: false,
      isMaster: true
    });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  // 定番商品切り替え機能
  const handleTogglePopular = async (product) => {
    try {
      const newPopularStatus = !product.isPopular;
      
      const updateData = {
        isPopular: newPopularStatus,
        updatedAt: new Date()
      };
      
      console.log(`🔄 定番商品切り替え: ${product.name} → ${newPopularStatus ? '定番' : '非定番'}`);
      console.log('📝 更新データ:', updateData);
      
      const result = await updateProduct(product.id, updateData);
      
      if (result.success) {
        console.log(`✅ 保存成功: ${product.name} isPopular = ${newPopularStatus}`);
        addToast(
          `${product.name}を${newPopularStatus ? '定番商品に設定' : '定番商品から除外'}しました`, 
          'success'
        );
      } else {
        console.error('❌ 保存失敗:', result.error);
        addToast(result.error || '更新に失敗しました', 'error');
      }
    } catch (error) {
      console.error('❌ 定番商品切り替えエラー:', error);
      addToast('定番商品切り替えに失敗しました', 'error');
    }
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
        isNomihodai: false,
        isPopular: newProduct.isPopular
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
      container: product.container || '',
      isPopular: product.isPopular || false,
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
    if (generateProductCode) {
      const autoCode = generateProductCode();
      setNewProduct({...newProduct, productCode: autoCode});
    } else {
      // generateProductCode関数がない場合のフォールバック
      const timestamp = Date.now().toString().slice(-6);
      const autoCode = `PROD${timestamp}`;
      setNewProduct({...newProduct, productCode: autoCode});
    }
  };

  // マスター商品のフィルタリング
  const allMasterProducts = products.filter(product => product.isMaster);
  
  // 定番商品の統計
  const popularProducts = allMasterProducts.filter(product => product.isPopular);

  // 検索・フィルター・ソート処理
  let masterProducts = allMasterProducts;

  // 検索フィルター
  if (searchTerm) {
    masterProducts = masterProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.productCode && product.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // カテゴリーフィルター
  if (filterCategory !== 'all') {
    masterProducts = masterProducts.filter(product => product.category === filterCategory);
  }

  // ソート処理
  masterProducts.sort((a, b) => {
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
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default:
        return 0;
    }
  });

  return (
    <>
      {/* 統計セクション（定番商品数追加） */}
      <div className="admin-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>マスター商品数</h3>
            <p>{allMasterProducts.length}品目</p>
          </div>
          <div className="stat-card popular">
            <h3>定番商品数</h3>
            <p>{popularProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>表示中商品数</h3>
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
                {/* 定番商品切り替えボタン（左上） */}
                <button 
                  className={`popular-toggle ${product.isPopular ? 'popular' : 'non-popular'}`}
                  onClick={() => handleTogglePopular(product)}
                  title={product.isPopular ? '定番商品（クリックで解除）' : '非定番（クリックで定番に設定）'}
                >
                  {product.isPopular ? '●' : '○'}
                </button>

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
                  {product.container && (
                    <div className="product-container">容器: {product.container}</div>
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

                {/* ビールの場合は容器選択追加 */}
                {newProduct.category === 'ビール' && (
                  <div className="form-group">
                    <label htmlFor="product-container">容器</label>
                    <select
                      id="product-container"
                      name="productContainer"
                      value={newProduct.container}
                      onChange={(e) => setNewProduct({...newProduct, container: e.target.value})}
                    >
                      <option value="">容器を選択</option>
                      <option value="生樽">生樽</option>
                      <option value="瓶">瓶</option>
                      <option value="缶">缶</option>
                    </select>
                  </div>
                )}

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

  const handlePromoteToMaster = async (product) => {
    if (window.confirm(`「${product.name}」をマスター商品に追加しますか？`)) {
      try {
        const masterProduct = {
          ...product,
          isMaster: true,
          isPopular: false,
          stock: 0,
          createdAt: new Date()
        };
        
        await addProduct(masterProduct);
        await deleteProduct(product.id);
        
        addToast(`${product.name}をマスター商品に追加しました`, 'success');
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
              <p>顧客追加商品がありません</p>
              <p>お店の方が新商品を追加すると、ここに表示されます</p>
            </div>
          ) : (
            customerProducts.map(product => (
              <div key={product.id} className="product-card customer-product-card" data-category={product.category}>
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
                    <span className="customer-badge">✨ 顧客追加</span>
                  </div>
                </div>

                <div className="product-info">
                  <div className="added-by">追加者: {product.addedBy}</div>
                  <div className="added-date">
                    追加日: {new Date(product.createdAt.seconds * 1000).toLocaleDateString()}
                  </div>
                  {product.description && (
                    <div className="product-description">{product.description}</div>
                  )}
                </div>

                <div className="product-actions">
                  <button onClick={() => handleCheckDuplicate(product)} className="check-button">
                    🔍 重複確認
                  </button>
                  <button onClick={() => handlePromoteToMaster(product)} className="promote-button">
                    ⬆️ マスター化
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
  const popularProducts = masterProducts.filter(product => product.isPopular);

  // カテゴリー別分析
  const categoryAnalysis = categories.map(category => {
    const categoryProducts = masterProducts.filter(product => product.category === category);
    const categoryPopular = popularProducts.filter(product => product.category === category);
    return {
      category,
      count: categoryProducts.length,
      popularCount: categoryPopular.length,
      percentage: masterProducts.length > 0 ? Math.round((categoryProducts.length / masterProducts.length) * 100) : 0
    };
  });

  return (
    <>
      {/* 統計セクション */}
      <div className="admin-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>マスター商品数</h3>
            <p>{masterProducts.length}品目</p>
          </div>
          <div className="stat-card popular">
            <h3>定番商品数</h3>
            <p>{popularProducts.length}品目</p>
          </div>
          <div className="stat-card">
            <h3>顧客追加商品数</h3>
            <p>{customerProducts.length}品目</p>
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
          <h2>データ分析</h2>
          <p>商品マスターの統計情報とカテゴリー別分析</p>
        </div>
      </div>

      {/* カテゴリー分析セクション */}
      <div className="admin-category-section">
        <div className="category-analysis">
          <h3>カテゴリー別分析</h3>
          <div className="category-grid">
            {categoryAnalysis.map(({ category, count, popularCount, percentage }) => (
              <div key={category} className="category-stat-card" data-category={category}>
                <h4>{category}</h4>
                <div className="category-stats">
                  <div className="stat-row">
                    <span>マスター商品:</span>
                    <strong>{count}品目</strong>
                  </div>
                  <div className="stat-row popular-stat">
                    <span>定番商品:</span>
                    <strong>{popularCount}品目</strong>
                  </div>
                  <div className="stat-row">
                    <span>全体に占める割合:</span>
                    <strong>{percentage}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// メイン管理者ダッシュボード
function AdminDashboard({ user, logout, addToast }) {
  const [activeTab, setActiveTab] = useState('products');
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    generateProductCode 
  } = useProducts(user);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <ProductMasterManager
            products={products}
            addProduct={addProduct}
            updateProduct={updateProduct}
            deleteProduct={deleteProduct}
            generateProductCode={generateProductCode}
            addToast={addToast}
          />
        );
      case 'customers':
        return (
          <CustomerProductManager
            products={products}
            addProduct={addProduct}
            deleteProduct={deleteProduct}
            addToast={addToast}
          />
        );
      case 'analytics':
        return <DataAnalytics products={products} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminHeader user={user} logout={logout} />
      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="admin-main-content">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default AdminDashboard;