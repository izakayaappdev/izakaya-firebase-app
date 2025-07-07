import React, { useState, useEffect } from 'react';

// 新商品追加タブ（商品コード非表示・簡潔版）
function AddProductTab({ 
  onAddProduct,
  generateProductCode, 
  addToast,
  products,
  allProducts  // ✅ 検索用：自分の商品 + マスター商品
}) {
  // generateProductCode が undefined の場合のフォールバック関数
  const fallbackGenerateProductCode = () => {
    const searchProducts = allProducts || products || [];
    const existingCodes = searchProducts
      .map(p => p.productCode)
      .filter(code => code && code.startsWith('PROD'))
      .map(code => {
        const num = parseInt(code.replace('PROD', ''));
        return isNaN(num) ? 0 : num;
      });
    
    const maxNum = Math.max(0, ...existingCodes);
    return `PROD${String(maxNum + 1).padStart(3, '0')}`;
  };

  const safeGenerateProductCode = generateProductCode || fallbackGenerateProductCode;
  const [newProduct, setNewProduct] = useState({
    name: '',
    manufacturer: '',
    category: 'ビール',
    stock: '',
    minStock: '',
    description: '',
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
      // ✅ allProducts（自分の商品 + マスター商品）から検索
      const searchProducts = allProducts || products || [];
      const searchResults = searchProducts.filter(product => 
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
    const searchProducts = allProducts || products || [];
    const duplicateProduct = searchProducts.find(product => 
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
        // ✅ 安全な商品コード生成
        productCode: safeGenerateProductCode(),
        cost: 0, // 仕入値は設定しない
        price: 0, // 販売価格は設定しない
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0,
        volume: parseFloat(newProduct.volume) || 0,
        profit: 0, // 価格設定なしなので利益も0
        profitRate: 0, // 価格設定なしなので利益率も0
        isActive: true // デフォルトでアクティブ
      };

      const result = await onAddProduct(productData);  // ← onAddProduct に変更
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

  return (
    <div className="add-product-section">
      <h2>新商品追加</h2>
      <p className="form-note">
        登録されていない商品もご登録できます！
      </p>
      
      <form onSubmit={handleSubmit} className="add-product-form">
        <div className="add-product-form-grid">{/* 商品名入力（サジェスト機能付き） */}
          <div className="add-product-form-group">
            <label className="add-product-form-label">商品名 *</label>
            <div className="add-product-name-input-container">
              <input
                type="text"
                className="add-product-form-input"
                value={newProduct.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="例：スーパードライ"
                required
                autoComplete="off"
              />
              
              {/* サジェスト表示 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="add-product-suggestions-dropdown">
                  {suggestions.map(product => (
                    <div 
                      key={product.id} 
                      className="add-product-suggestion-item"
                      onClick={() => selectFromSuggestion(product)}
                    >
                      <div className="add-product-suggestion-main">
                        <strong>{product.name}</strong>
                        {product.manufacturer && <span> - {product.manufacturer}</span>}
                      </div>
                      <div className="add-product-suggestion-details">
                        <span className="add-product-category-badge">{product.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="add-product-form-group">
            <label className="add-product-form-label">メーカー</label>
            <input
              type="text"
              className="add-product-form-input"
              value={newProduct.manufacturer}
              onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
              placeholder="例：アサヒビール"
            />
          </div>

          <div className="add-product-form-group">
            <label className="add-product-form-label">カテゴリ *</label>
            <select
              className="add-product-form-select"
              value={newProduct.category}
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              required
            >
              <option value="ビール">ビール</option>
              <option value="カクテル・チューハイ">カクテル・チューハイ</option>
              <option value="日本酒">日本酒</option>
              <option value="焼酎">焼酎</option>
              <option value="ウイスキー・ブランデー">ウイスキー・ブランデー</option>
              <option value="ワイン">ワイン</option>
              <option value="シャンパン・スパークリング">シャンパン・スパークリング</option>
              <option value="泡盛">泡盛</option>
              <option value="ソフトドリンク">ソフトドリンク</option>
              <option value="ノンアルコール">ノンアルコール</option>
            </select>
          </div>

          {/* 容量設定 */}
          <div className="add-product-form-group">
            <label className="add-product-form-label">容量</label>
            <div className="add-product-volume-input-row">
              <input
                type="number"
                className="add-product-form-input"
                value={newProduct.volume}
                onChange={(e) => setNewProduct({...newProduct, volume: e.target.value})}
                placeholder="例：350"
              />
              <select
                className="add-product-form-select"
                value={newProduct.volumeUnit}
                onChange={(e) => setNewProduct({...newProduct, volumeUnit: e.target.value})}
              >
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>

          <div className="add-product-form-group">
            <label className="add-product-form-label">現在在庫</label>
            <input
              type="number"
              className="add-product-form-input"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
              placeholder="例：80"
            />
          </div>

          <div className="add-product-form-group">
            <label className="add-product-form-label">最小在庫</label>
            <input
              type="number"
              className="add-product-form-input"
              value={newProduct.minStock}
              onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
              placeholder="例：20"
            />
          </div>

          <div className="add-product-form-group add-product-full-width">
            <label className="add-product-form-label">商品説明</label>
            <textarea
              className="add-product-form-textarea"
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
              placeholder="例：キリッとした辛口。夏におすすめ"
              rows="3"
            />
          </div>

          {/* 飲み放題対象チェックボックス（中央寄せ） */}
          <div className="add-product-checkbox-group add-product-checkbox-center">
            <label className="add-product-checkbox-label">
              <input
                type="checkbox"
                className="add-product-checkbox-input"
                checked={newProduct.isNomihodai}
                onChange={(e) => setNewProduct({...newProduct, isNomihodai: e.target.checked})}
              />
              飲み放題対象
            </label>
          </div>
        </div>

        <div className="add-product-form-actions">
          <button type="button" onClick={resetForm} className="add-product-cancel-button">
            リセット
          </button>
          <button type="submit" className="add-product-submit-button">
            商品追加
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProductTab;