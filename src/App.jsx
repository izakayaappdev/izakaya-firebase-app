import React, { useState, useEffect } from 'react'
import './App.css'
import { useAuth } from './hooks/useAuth'
import { useProducts } from './hooks/useProducts'

function App() {
  const { user, loading, signInWithGoogle, logout } = useAuth()
  const { 
    products, 
    loading: productsLoading, 
    error: productsError,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    updateStock,
    migrateFromLocalStorage 
  } = useProducts(user)
  
  // UI状態管理
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'alcohol',
    stock: 0,
    cost: 0,
    price: 0,
    minStock: 5,
    isNomihodai: false
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [editingId, setEditingId] = useState(null)
  const [migrationStatus, setMigrationStatus] = useState(null)

  // 初回ログイン時のデータ移行チェック
  useEffect(() => {
    if (user && !productsLoading && products.length === 0) {
      const localData = localStorage.getItem('stockapp-products')
      if (localData) {
        const shouldMigrate = window.confirm(
          '既存のローカルデータが見つかりました。\nFirestoreに移行しますか？'
        )
        if (shouldMigrate) {
          handleDataMigration()
        }
      }
    }
  }, [user, productsLoading, products.length])

  // データ移行処理
  const handleDataMigration = async () => {
    setMigrationStatus('移行中...')
    const result = await migrateFromLocalStorage()
    if (result.success) {
      setMigrationStatus('✅ 移行完了！')
      setTimeout(() => setMigrationStatus(null), 3000)
    } else {
      setMigrationStatus('❌ 移行失敗: ' + result.error)
    }
  }

  // ローディング中の表示
  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <h2>🔄 アプリを準備中...</h2>
        </div>
      </div>
    )
  }

  // ログインしていない場合のログイン画面
  if (!user) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-header">
            <h1>🍺 飲み屋在庫管理</h1>
            <p>スマートな在庫管理で売上アップ！</p>
          </div>
          
          <div className="login-features">
            <div className="feature">
              <h3>📱 どこでも使える</h3>
              <p>スマホ・タブレット・PCで同期</p>
            </div>
            <div className="feature">
              <h3>🔍 簡単検索</h3>
              <p>商品名でサクッと検索</p>
            </div>
            <div className="feature">
              <h3>💰 利益計算</h3>
              <p>自動で利益率を計算</p>
            </div>
          </div>

          <button 
            className="google-login-btn"
            onClick={signInWithGoogle}
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
            Googleでログイン
          </button>
          
          <div className="login-note">
            <p>⚡ 30秒で始められます</p>
          </div>
        </div>
      </div>
    )
  }

  // 商品追加処理
  const handleAddProduct = async () => {
    if (newProduct.name.trim()) {
      const result = await addProduct(newProduct)
      if (result.success) {
        setNewProduct({
          name: '',
          category: 'alcohol',
          stock: 0,
          cost: 0,
          price: 0,
          minStock: 5,
          isNomihodai: false
        })
      } else {
        alert('商品追加に失敗しました: ' + result.error)
      }
    }
  }

  // 在庫更新処理
  const handleUpdateStock = async (id, change) => {
    const product = products.find(p => p.id === id)
    if (product) {
      const newStock = Math.max(0, product.stock + change)
      const result = await updateStock(id, newStock)
      if (!result.success) {
        alert('在庫更新に失敗しました: ' + result.error)
      }
    }
  }

  // 商品削除処理
  const handleDeleteProduct = async (id) => {
    if (confirm('この商品を削除しますか？')) {
      const result = await deleteProduct(id)
      if (!result.success) {
        alert('商品削除に失敗しました: ' + result.error)
      }
    }
  }

  // 編集開始
  const startEdit = (product) => {
    setEditingId(product.id)
    setNewProduct(product)
  }

  // 編集保存
  const saveEdit = async () => {
    const result = await updateProduct(editingId, newProduct)
    if (result.success) {
      setEditingId(null)
      setNewProduct({
        name: '',
        category: 'alcohol',
        stock: 0,
        cost: 0,
        price: 0,
        minStock: 5,
        isNomihodai: false
      })
    } else {
      alert('商品更新に失敗しました: ' + result.error)
    }
  }

  // 編集キャンセル
  const cancelEdit = () => {
    setEditingId(null)
    setNewProduct({
      name: '',
      category: 'alcohol',
      stock: 0,
      cost: 0,
      price: 0,
      minStock: 5,
      isNomihodai: false
    })
  }

  // 再入荷処理
  const restockProduct = async (id) => {
    const restockAmount = prompt('入荷数を入力してください:', '10')
    if (restockAmount && !isNaN(restockAmount)) {
      await handleUpdateStock(id, parseInt(restockAmount))
    }
  }

  // フィルタリング・ソート処理
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'stock':
        return a.stock - b.stock
      case 'profit':
        const profitA = ((a.price - a.cost) / a.cost) * 100
        const profitB = ((b.price - b.cost) / b.cost) * 100
        return profitB - profitA
      default:
        return a.name.localeCompare(b.name)
    }
  })

  // ヘルパー関数
  const getProfitRate = (cost, price) => {
    if (cost === 0) return 0
    return ((price - cost) / cost) * 100
  }

  const getProfitColor = (profitRate) => {
    if (profitRate >= 100) return 'high-profit'
    if (profitRate >= 50) return 'medium-profit'
    return 'low-profit'
  }

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return 'out-of-stock'
    if (stock <= minStock) return 'low-stock'
    return 'in-stock'
  }

  // 統計計算
  const totalValue = products.reduce((sum, product) => sum + (product.cost * product.stock), 0)
  const totalProfit = products.reduce((sum, product) => sum + ((product.price - product.cost) * product.stock), 0)
  const nomihodaiCount = products.filter(product => product.isNomihodai).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🍺 飲み屋在庫管理</h1>
          <div className="user-info">
            <img src={user.photoURL} alt="プロフィール" className="user-avatar" />
            <span>{user.displayName}</span>
            <button onClick={logout} className="logout-btn">ログアウト</button>
          </div>
        </div>
      </header>

      {/* データ移行状態表示 */}
      {migrationStatus && (
        <div className="migration-status">
          <p>{migrationStatus}</p>
        </div>
      )}

      {/* エラー表示 */}
      {productsError && (
        <div className="error-message">
          <p>❌ エラー: {productsError}</p>
          <button onClick={() => window.location.reload()}>リロード</button>
        </div>
      )}

      {/* ローディング表示 */}
      {productsLoading && (
        <div className="products-loading">
          <p>🔄 データを読み込み中...</p>
        </div>
      )}

      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">在庫価値</span>
          <span className="stat-value">¥{totalValue.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">想定利益</span>
          <span className="stat-value">¥{totalProfit.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">飲み放題対象</span>
          <span className="stat-value">{nomihodaiCount}品目</span>
        </div>
      </div>

      <div className="controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="🔍 商品名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">全カテゴリ</option>
            <option value="alcohol">🍺 アルコール</option>
            <option value="food">🍖 料理</option>
            <option value="soft-drink">🥤 ソフトドリンク</option>
            <option value="snack">🥜 おつまみ</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">名前順</option>
            <option value="stock">在庫順</option>
            <option value="profit">利益率順</option>
          </select>
        </div>
      </div>

      <div className="add-product">
        <h3>{editingId ? '商品編集' : '新商品追加'}</h3>
        <div className="product-form">
          <div className="form-row">
            <label>商品名</label>
            <input
              type="text"
              placeholder="商品名を入力"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
          </div>
          
          <div className="form-row">
            <label>カテゴリ</label>
            <select 
              value={newProduct.category} 
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
            >
              <option value="alcohol">🍺 アルコール</option>
              <option value="food">🍖 料理</option>
              <option value="soft-drink">🥤 ソフトドリンク</option>
              <option value="snack">🥜 おつまみ</option>
            </select>
          </div>

          <div className="form-row-group">
            <div className="form-row">
              <label>在庫数</label>
              <input
                type="number"
                placeholder="0"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
              />
            </div>
            
            <div className="form-row">
              <label>仕入れ値</label>
              <input
                type="number"
                placeholder="0"
                value={newProduct.cost}
                onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row-group">
            <div className="form-row">
              <label>販売価格</label>
              <input
                type="number"
                placeholder="0"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
              />
            </div>
            
            <div className="form-row">
              <label>最小在庫</label>
              <input
                type="number"
                placeholder="5"
                value={newProduct.minStock}
                onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={newProduct.isNomihodai}
                onChange={(e) => setNewProduct({...newProduct, isNomihodai: e.target.checked})}
              />
              🍻 飲み放題対象商品
            </label>
          </div>

          <div className="form-actions">
            {editingId ? (
              <div className="edit-buttons">
                <button onClick={saveEdit} className="save-btn">💾 保存</button>
                <button onClick={cancelEdit} className="cancel-btn">❌ キャンセル</button>
              </div>
            ) : (
              <button onClick={handleAddProduct} className="add-btn">➕ 商品を追加</button>
            )}
          </div>
        </div>
      </div>

      <div className="products">
        <h3>商品一覧 ({sortedProducts.length}件)</h3>
        {sortedProducts.length === 0 && !productsLoading ? (
          <div className="empty-state">
            <p>商品がありません。上記フォームから商品を追加してください。</p>
            {localStorage.getItem('stockapp-products') && (
              <button onClick={handleDataMigration} className="migrate-btn">
                📦 ローカルデータを移行
              </button>
            )}
          </div>
        ) : (
          <div className="product-list">
            {sortedProducts.map(product => {
              const profitRate = getProfitRate(product.cost, product.price)
              const stockStatus = getStockStatus(product.stock, product.minStock)
              
              return (
                <div key={product.id} className={`product-card ${stockStatus}`}>
                  <div className="product-header">
                    <h4>{product.name}</h4>
                    {product.isNomihodai && <span className="nomihodai-badge">🍻 飲み放題</span>}
                    <div className="product-actions">
                      <button onClick={() => startEdit(product)} className="edit-btn">✏️</button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="delete-btn">🗑️</button>
                    </div>
                  </div>
                  
                  <div className="product-info">
                    <div className="stock-info">
                      <span className="stock-number">{product.stock}</span>
                      <span className="stock-label">個</span>
                      {stockStatus === 'out-of-stock' && (
                        <button onClick={() => restockProduct(product.id)} className="restock-btn">
                          🚚 再入荷
                        </button>
                      )}
                    </div>
                    
                    <div className="stock-controls">
                      <button onClick={() => handleUpdateStock(product.id, -1)} className="stock-btn decrease">-</button>
                      <button onClick={() => handleUpdateStock(product.id, 1)} className="stock-btn increase">+</button>
                    </div>
                  </div>
                  
                  <div className="product-details">
                    <div className="price-info">
                      <span>仕入: ¥{product.cost}</span>
                      <span>販売: ¥{product.price}</span>
                      <span className={`profit ${getProfitColor(profitRate)}`}>
                        利益率: {profitRate.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="stock-warning">
                      {stockStatus === 'out-of-stock' && <span className="warning">⚠️ 完売</span>}
                      {stockStatus === 'low-stock' && <span className="warning">🔻 残り少ない</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default App