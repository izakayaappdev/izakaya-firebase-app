import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';
import './App.css';

// 管理者判定
const ADMIN_EMAIL = 'izakaya.app.dev@gmail.com';

// CSVインポートコンポーネント（AdminDashboard内に追加）
function CSVImportComponent({ onImport }) {
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleCSVImport = async () => {
    if (!csvData.trim()) {
      alert('CSVデータを入力してください');
      return;
    }

    setIsImporting(true);
    
    try {
      // CSVをパース
      const lines = csvData.trim().split('\n');
      
      const products = [];
      
      for (let i = 1; i < lines.length; i++) { // ヘッダー行をスキップ
        const values = lines[i].split(',');
        
        if (values.length >= 4) { // 最低限の項目チェック
          const product = {
            name: values[0]?.trim() || '',
            manufacturer: values[1]?.trim() || '',
            category: values[2]?.trim() || 'ビール',
            cost: parseFloat(values[3]) || 0,
            price: parseFloat(values[4]) || 0,
            description: values[5]?.trim() || '',
            stock: 0,
            minStock: 0,
            isMaster: true,
            isNomihodai: false,
            profit: (parseFloat(values[4]) || 0) - (parseFloat(values[3]) || 0),
            profitRate: (parseFloat(values[4]) && parseFloat(values[3])) ? 
              (((parseFloat(values[4]) - parseFloat(values[3])) / parseFloat(values[4])) * 100) : 0
          };
          
          products.push(product);
        }
      }
      
      // 一括インポート実行
      let successCount = 0;
      for (const product of products) {
        try {
          await onImport(product);
          successCount++;
          // Firebase負荷軽減のため少し間隔を空ける
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`商品「${product.name}」の登録に失敗:`, error);
        }
      }
      
      alert(`${successCount}/${products.length}品目のインポートが完了しました！`);
      setCsvData('');
      
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      alert('CSVインポートに失敗しました: ' + error.message);
    }
    
    setIsImporting(false);
  };

  const sampleCSV = `商品名,メーカー,カテゴリ,仕入れ値,販売価格,説明
アサヒスーパードライ 350ml缶,アサヒビール,ビール,150,450,定番の辛口ビール
鍋島 純米吟醸,富久千代酒造,日本酒,1200,2800,佐賀県を代表する銘酒`;

  return (
    <div className="csv-import-section">
      <h3>🚀 CSV一括インポート</h3>
      <p>CSVデータを貼り付けて130品目を一括登録できます</p>
      
      <div className="csv-format-info">
        <h4>CSVフォーマット例:</h4>
        <pre>{sampleCSV}</pre>
      </div>
      
      <textarea
        value={csvData}
        onChange={(e) => setCsvData(e.target.value)}
        placeholder="ここにCSVデータを貼り付けてください...&#10;（商品名,メーカー,カテゴリ,仕入れ値,販売価格,説明の順で）"
        rows="12"
        className="csv-input"
        disabled={isImporting}
      />
      
      <div className="csv-actions">
        <button 
          onClick={handleCSVImport}
          disabled={isImporting || !csvData.trim()}
          className="import-button"
        >
          {isImporting ? 'インポート中...' : '🚀 CSVインポート実行'}
        </button>
        
        <button 
          onClick={() => setCsvData('')}
          disabled={isImporting}
          className="clear-button"
        >
          クリア
        </button>
      </div>
      
      {isImporting && (
        <div className="importing-status">
          <div className="loading-spinner"></div>
          <p>商品を登録中です...しばらくお待ちください（{csvData.split('\n').length - 1}品目）</p>
        </div>
      )}
    </div>
  );
}

// 管理者用ダッシュボード
function AdminDashboard({ user, logout, products, addProduct, updateProduct, deleteProduct }) {
  const [activeTab, setActiveTab] = useState('products');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // 唐津市向け飲み物専門カテゴリー（泡盛追加）
  const categories = [
    'ビール', 
    '日本酒', 
    '焼酎', 
    '泡盛',           // 新規追加
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

  // 重複確認機能
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

            {/* ここにCSVインポート機能を追加 */}
            <CSVImportComponent onImport={addProduct} />

            <div className="stats-grid">
              <div className="stat-card">
                <h3>マスター商品数</h3>
                <p>{masterProducts.length}品目</p>
              </div>
              <div className="stat-card">
                <h3>顧客利用商品</h3>
                <p>{customerProducts.length}品目</p>
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
            
            {/* カテゴリ別分析 */}
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
                      placeholder="例：アサヒスーパードライ 350ml缶"
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
                      placeholder="例：150"
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
      </main>
    </div>
  );
}

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
        isMaster: false, // 顧客商品として追加
        addedBy: user.email, // 追加者を記録
        createdAt: new Date()
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

  // 検索・フィルター（マスター商品 + 自分が追加した商品を表示）
  const filteredProducts = products
    .filter(product => {
      // マスター商品 OR 自分が追加した商品
      return product.isMaster || product.addedBy === user.email;
    })
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

  // 統計計算
  const myProducts = filteredProducts.filter(p => p.addedBy === user.email || p.isMaster);
  const totalValue = myProducts.reduce((sum, product) => sum + (product.cost * product.stock), 0);
  const totalProfit = myProducts.reduce((sum, product) => sum + (product.profit * product.stock), 0);
  const lowStockCount = myProducts.filter(product => product.stock <= product.minStock && product.stock > 0).length;
  const myAddedCount = filteredProducts.filter(p => p.addedBy === user.email && !p.isMaster).length;

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

        {/* 検索・フィルター・商品追加 */}
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
              <p style={{color: '#718096', marginBottom: '1rem', fontSize: '0.9rem'}}>
                {editingProduct ? '商品情報を編集できます' : '新しい商品を追加します。管理者の確認後、他店舗でも利用可能になる場合があります。'}
              </p>
              
              <form onSubmit={handleSubmit} className="product-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>商品名 *</label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="例：湘南ゴールド 350ml缶"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>メーカー</label>
                    <input
                      type="text"
                      value={newProduct.manufacturer}
                      onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                      placeholder="例：地元ブルワリー"
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
                      placeholder="例：200"
                    />
                  </div>

                  <div className="form-group">
                    <label>販売価格 (円)</label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="例：580"
                    />
                  </div>

                  <div className="form-group">
                    <label>現在在庫</label>
                    <input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      placeholder="例：24"
                    />
                  </div>

                  <div className="form-group">
                    <label>最小在庫</label>
                    <input
                      type="number"
                      value={newProduct.minStock}
                      onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
                      placeholder="例：6"
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

                  <div className="form-group full-width">
                    <label>商品説明</label>
                    <textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="例：地元唐津のクラフトビール。柑橘系の爽やかな味わい"
                      rows="3"
                    />
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
                最初の商品を追加
              </button>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className={`product-card ${product.isMaster ? 'master-product' : 'my-product'}`}>
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
                      <span className="my-badge">✨ 自分で追加</span>
                    )}
                  </div>
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

                  {/* 価格情報 */}
                  {(product.cost || product.price) && (
                    <div className="price-info-customer">
                      {product.cost && <span>仕入: ¥{product.cost}</span>}
                      {product.price && <span>販売: ¥{product.price}</span>}
                      {product.profit && (
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

                {/* 自分が追加した商品のみ編集・削除可能 */}
                {(product.addedBy === user.email && !product.isMaster) && (
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
          <p>唐津市の飲み屋向け在庫管理システム</p>
          <p>佐賀の地酒から九州焼酎・沖縄泡盛まで対応</p>
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
          addProduct={addProduct}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
        />
      )}
    </>
  );
}

export default App;