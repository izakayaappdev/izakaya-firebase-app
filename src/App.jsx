// App.jsx - データ永続化対応版
import React, { useState, useEffect } from 'react'
import './App.css'

// ローカルストレージキー
const STORAGE_KEY = 'izakaya-stock-app-data'

function App() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // データ読み込み（初回のみ）
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setProducts(parsedData)
        console.log('✅ データを正常に読み込みました:', parsedData.length, '件')
      } else {
        console.log('💡 初回起動のため、サンプルデータを作成します')
        // 初回起動時のサンプルデータ
        const sampleData = [
          {
            id: Date.now() + 1,
            name: 'アサヒスーパードライ',
            category: 'ビール',
            stock: 24,
            price: 150,
            sellPrice: 450,
            isNomihodai: true,
            minStock: 10
          },
          {
            id: Date.now() + 2,
            name: '黒霧島',
            category: '焼酎',
            stock: 3,
            price: 800,
            sellPrice: 3200,
            isNomihodai: false,
            minStock: 2
          }
        ]
        setProducts(sampleData)
      }
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error)
      alert('データの読み込みに失敗しました。アプリを再起動してください。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // データ保存（商品が変更されるたび）
  useEffect(() => {
    if (!isLoading && products.length >= 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
        console.log('💾 データを保存しました:', products.length, '件')
      } catch (error) {
        console.error('❌ データ保存エラー:', error)
        alert('データの保存に失敗しました。ブラウザの容量を確認してください。')
      }
    }
  }, [products, isLoading])

  // 商品追加
  const addProduct = (newProduct) => {
    const product = {
      ...newProduct,
      id: Date.now(),
      stock: parseInt(newProduct.stock) || 0,
      price: parseInt(newProduct.price) || 0,
      sellPrice: parseInt(newProduct.sellPrice) || 0,
      minStock: parseInt(newProduct.minStock) || 0,
      isNomihodai: newProduct.isNomihodai || false
    }
    
    setProducts(prev => [...prev, product])
    setShowAddForm(false)
    
    // 成功メッセージ
    console.log('✅ 商品を追加しました:', product.name)
  }

  // 在庫更新
  const updateStock = (id, change) => {
    setProducts(prev => prev.map(product => {
      if (product.id === id) {
        const newStock = Math.max(0, product.stock + change)
        console.log(`📦 ${product.name}: ${product.stock} → ${newStock}`)
        return { ...product, stock: newStock }
      }
      return product
    }))
  }

  // 商品削除
  const deleteProduct = (id) => {
    const product = products.find(p => p.id === id)
    if (product && window.confirm(`「${product.name}」を削除しますか？`)) {
      setProducts(prev => prev.filter(p => p.id !== id))
      console.log('🗑️ 商品を削除しました:', product.name)
    }
  }

  // 再入荷
  const restockProduct = (id) => {
    setProducts(prev => prev.map(product => {
      if (product.id === id) {
        const restockAmount = product.minStock * 2 || 10
        console.log(`🚚 ${product.name}を再入荷: +${restockAmount}`)
        return { ...product, stock: product.stock + restockAmount }
      }
      return product
    }))
  }

  // フィルター・ソート・検索
  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCategory === 'all' || product.category === filterCategory)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'stock':
          return a.stock - b.stock
        case 'profit':
          return (b.sellPrice - b.price) - (a.sellPrice - a.price)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  // 統計計算
  const stats = {
    totalValue: products.reduce((sum, p) => sum + (p.stock * p.price), 0),
    totalProfit: products.reduce((sum, p) => sum + (p.stock * (p.sellPrice - p.price)), 0),
    nomihodaiCount: products.filter(p => p.isNomihodai).length,
    lowStockCount: products.filter(p => p.stock <= p.minStock).length
  }

  // カテゴリ一覧
  const categories = ['all', ...new Set(products.map(p => p.category))]

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-message">
          <h2>📱 在庫管理アプリ</h2>
          <p>データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍺 在庫管理アプリ</h1>
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-label">在庫価値</span>
            <span className="stat-value">¥{stats.totalValue.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">想定利益</span>
            <span className="stat-value profit">¥{stats.totalProfit.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">飲み放題</span>
            <span className="stat-value">{stats.nomihodaiCount}品目</span>
          </div>
          {stats.lowStockCount > 0 && (
            <div className="stat alert">
              <span className="stat-label">要補充</span>
              <span className="stat-value warning">{stats.lowStockCount}品目</span>
            </div>
          )}
        </div>
      </header>

      <div className="controls">
        <button 
          className="add-button"
          onClick={() => setShowAddForm(true)}
        >
          ➕ 商品追加
        </button>
        
        <input
          type="text"
          className="search-input"
          placeholder="🔍 商品を検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? '📋 全カテゴリ' : `🏷️ ${cat}`}
            </option>
          ))}
        </select>
        
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">📝 名前順</option>
          <option value="stock">📦 在庫順</option>
          <option value="profit">💰 利益順</option>
        </select>
      </div>

      {showAddForm && (
        <AddProductForm 
          onAdd={addProduct}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="product-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h3>商品がありません</h3>
            <p>➕ 商品追加ボタンから商品を登録してください</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onUpdateStock={updateStock}
              onDelete={deleteProduct}
              onRestock={restockProduct}
            />
          ))
        )}
      </div>

      <footer className="app-footer">
        <p>💾 データは自動保存されます | 📱 PWAアプリとしてインストール可能</p>
      </footer>
    </div>
  )
}

// 商品追加フォーム
function AddProductForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: '',
    price: '',
    sellPrice: '',
    minStock: '5',
    isNomihodai: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.category) {
      alert('商品名とカテゴリは必須です')
      return
    }
    onAdd(formData)
  }

  return (
    <div className="modal-overlay">
      <form className="add-form" onSubmit={handleSubmit}>
        <h3>➕ 新商品追加</h3>
        
        <input
          type="text"
          placeholder="商品名（必須）"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        
        <input
          type="text"
          placeholder="カテゴリ（ビール、焼酎等）"
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          required
        />
        
        <div className="form-row">
          <input
            type="number"
            placeholder="初期在庫"
            value={formData.stock}
            onChange={(e) => setFormData({...formData, stock: e.target.value})}
          />
          <input
            type="number"
            placeholder="仕入価格"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
          />
        </div>
        
        <div className="form-row">
          <input
            type="number"
            placeholder="販売価格"
            value={formData.sellPrice}
            onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
          />
          <input
            type="number"
            placeholder="最小在庫"
            value={formData.minStock}
            onChange={(e) => setFormData({...formData, minStock: e.target.value})}
          />
        </div>
        
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.isNomihodai}
            onChange={(e) => setFormData({...formData, isNomihodai: e.target.checked})}
          />
          🍻 飲み放題対象
        </label>
        
        <div className="form-buttons">
          <button type="submit" className="submit-button">
            ✅ 追加
          </button>
          <button type="button" onClick={onCancel} className="cancel-button">
            ❌ キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}

// 商品カード
function ProductCard({ product, onUpdateStock, onDelete, onRestock }) {
  const profit = product.sellPrice - product.price
  const profitRate = product.price > 0 ? (profit / product.price * 100) : 0
  const isLowStock = product.stock <= product.minStock
  const isOutOfStock = product.stock === 0

  return (
    <div className={`product-card ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
      <div className="product-header">
        <h3>{product.name}</h3>
        <span className="category-tag">{product.category}</span>
        {product.isNomihodai && <span className="nomihodai-tag">🍻</span>}
      </div>
      
      <div className="product-info">
        <div className="stock-section">
          <div className="stock-display">
            <span className="stock-number">{product.stock}</span>
            <span className="stock-unit">個</span>
            {isOutOfStock && <span className="out-badge">完売</span>}
            {isLowStock && !isOutOfStock && <span className="low-badge">少</span>}
          </div>
          
          <div className="stock-buttons">
            <button onClick={() => onUpdateStock(product.id, -1)}>➖</button>
            <button onClick={() => onUpdateStock(product.id, 1)}>➕</button>
          </div>
        </div>
        
        <div className="price-section">
          <div>仕入: ¥{product.price}</div>
          <div>販売: ¥{product.sellPrice}</div>
          <div className={`profit ${profitRate > 200 ? 'high' : profitRate > 100 ? 'medium' : 'low'}`}>
            利益: ¥{profit} ({profitRate.toFixed(0)}%)
          </div>
        </div>
      </div>
      
      <div className="product-actions">
        {isOutOfStock && (
          <button className="restock-button" onClick={() => onRestock(product.id)}>
            🚚 再入荷
          </button>
        )}
        <button className="delete-button" onClick={() => onDelete(product.id)}>
          🗑️ 削除
        </button>
      </div>
    </div>
  )
}

export default App