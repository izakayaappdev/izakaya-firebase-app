import React, { useState, useEffect } from 'react';

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

// 新商品追加タブ（サジェスト機能付き）
function AddProductTab({ 
  addProduct, 
  generateProductCode, 
  addToast,
  products
}) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    stock: '',
    minStock: '',
    description: '',
    productCode: '',
    volume: '',
    volumeUnit: 'ml',
    isNomihodai: false,
    isMaster: false
  });

  // サジェスト機能の状態
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const resetForm = () => {
    setNewProduct({
      name: '',
      manufacturer: '',
      category: 'ビール',
      stock: '',
      minStock: '',
      description: '',
      productCode: '',
      volume: '',
      volumeUnit: 'ml',
      isNomihodai: false,
      isMaster: false
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // 商品名入力時のサジェスト検索
  const handleNameChange = (value) => {
    setNewProduct({...newProduct, name: value});
    
    if (value.trim().length >= 2) {
      // 類似商品を検索（商品名とメーカー名から）
      const searchResults = products.filter(product => 
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        (product.manufacturer && product.manufacturer.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5); // 最大5件
      
      setSuggestions(searchResults);
      setShowSuggestions(searchResults.length > 0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // サジェストから商品情報をコピー（価格情報除く）
  const selectFromSuggestion = (product) => {
    setNewProduct({
      name: product.name,
      manufacturer: product.manufacturer || '',
      category: product.category,
      stock: '',
      minStock: product.minStock.toString(),
      description: product.description || '',
      productCode: '', // 新しい商品コードを生成
      volume: product.volume?.toString() || '',
      volumeUnit: product.volumeUnit || 'ml',
      isNomihodai: product.isNomihodai || false,
      isMaster: false
    });
    setShowSuggestions(false);
    setSuggestions([]);
    addToast('商品情報をコピーしました', 'info');
  };

  // サジェスト以外の場所をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.name-input-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name.trim()) {
      addToast('商品名は必須です', 'error');
      return;
    }

    // 重複チェック
    const duplicateProduct = products.find(product => 
      product.name.toLowerCase() === newProduct.name.toLowerCase() &&
      product.manufacturer?.toLowerCase() === newProduct.manufacturer.toLowerCase()
    );

    if (duplicateProduct) {
      if (!window.confirm(`類似商品「${duplicateProduct.name}」が既に存在します。それでも追加しますか？`)) {
        return;
      }
    }

    try {
      const productData = {
        ...newProduct,
        cost: 0, // 仕入値は設定しない
        price: 0, // 販売価格は設定しない
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        volume: parseFloat(newProduct.volume) || 0,
        profit: 0, // 価格設定なしなので利益も0
        profitRate: 0, // 価格設定なしなので利益率も0
        isActive: true // デフォルトでアクティブ
      };

      const result = await addProduct(productData);
      if (result.success) {
        addToast(`${newProduct.name}を追加しました！`, 'success');
        resetForm();
      } else {
        addToast(result.error || '商品の保存に失敗しました', 'error');
      }
    } catch (error) {
      console.error('商品の保存に失敗しました:', error);
      addToast('商品の保存に失敗しました', 'error');
    }
  };

  const handleGenerateProductCode = () => {
    const autoCode = generateProductCode();
    setNewProduct({...newProduct, productCode: autoCode});
  };

  return (
    <div className="add-product-section">
      <h2>新商品追加</h2>
      <p className="form-note">
        ℹ️ 追加された商品は管理者の確認後、他の店舗でも利用可能になります
      </p>
      
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          {/* 商品名入力（サジェスト機能付き） */}
          <div className="form-group">
            <label>商品名 *</label>
            <div className="name-input-container">
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="例：スーパードライ"
                required
                autoComplete="off"
              />
              
              {/* サジェスト表示 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map(product => (
                    <div 
                      key={product.id} 
                      className="suggestion-item"
                      onClick={() => selectFromSuggestion(product)}
                    >
                      <div className="suggestion-main">
                        <strong>{product.name}</strong>
                        {product.manufacturer && <span> - {product.manufacturer}</span>}
                      </div>
                      <div className="suggestion-details">
                        <span className="category-badge">{product.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <label>商品コード</label>
            <div className="product-code-input">
              <input
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
            <label>容量</label>
            <input
              type="number"
              value={newProduct.volume}
              onChange={(e) => setNewProduct({...newProduct, volume: e.target.value})}
              placeholder="例：350"
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label>容量単位</label>
            <select
              value={newProduct.volumeUnit}
              onChange={(e) => setNewProduct({...newProduct, volumeUnit: e.target.value})}
            >
              <option value="ml">ml</option>
              <option value="L">L</option>
            </select>
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
            リセット
          </button>
          <button type="submit" className="submit-button">
            商品追加
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProductTab;