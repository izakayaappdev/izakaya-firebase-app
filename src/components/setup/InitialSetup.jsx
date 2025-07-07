import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useProducts } from '../../hooks/useProducts';
import '../../styles/InitialSetup.css';

function InitialSetup({ onComplete }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addProduct } = useProducts();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [shopInfo, setShopInfo] = useState({
    shopName: '',
    address: '',
    phone: ''
  });
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [masterProducts, setMasterProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // ビール用の状態
  const [showBeerContainerSelection, setShowBeerContainerSelection] = useState(false);
  const [selectedBeerContainers, setSelectedBeerContainers] = useState([]);
  const [currentBeerContainerIndex, setCurrentBeerContainerIndex] = useState(0);
  
  // 商品選択用の状態
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const categories = [
    'ビール', 'カクテル・チューハイ', '日本酒', '焼酎', 
    'ウイスキー・ブランデー', 'ワイン', 'シャンパン・スパークリング', 
    '泡盛', 'ソフトドリンク', 'ノンアルコール'
  ];

  // マスター商品を取得（定番商品のみ）
  const fetchMasterProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsQuery = query(
        collection(db, 'users', 'izakaya.app.dev@gmail.com', 'products'),
        where('isMaster', '==', true),
        where('isPopular', '==', true)
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const products = {};
      
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        const category = productData.category;
        
        if (!products[category]) {
          products[category] = [];
        }
        products[category].push(productData);
      });
      
      setMasterProducts(products);
      console.log('📦 マスター商品取得完了:', Object.keys(products).length, 'カテゴリー');
      
      if (Object.keys(products).length === 0) {
        addToast('マスター商品が見つかりません。管理者にお問い合わせください。', 'warning');
      } else {
        addToast(`${Object.keys(products).length}カテゴリーの商品を読み込みました`, 'success');
      }
      
    } catch (error) {
      console.error('マスター商品取得エラー:', error);
      addToast('商品データの読み込みに失敗しました', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMasterProducts();
    }
  }, [user]);

  // Step 1: お店情報の処理
  const handleShopInfoSubmit = (e) => {
    e.preventDefault();
    if (!shopInfo.shopName.trim()) {
      addToast('店名は必須です', 'error');
      return;
    }
    setCurrentStep(2);
    addToast('お店情報を保存しました', 'success');
  };

  // Step 2: カテゴリー選択の処理
  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCategorySubmit = () => {
    if (selectedCategories.length === 0) {
      if (window.confirm('商品を選択せずに設定を完了しますか？\n後で手動で商品を追加できます。')) {
        handleSetupComplete();
        return;
      }
      return;
    }
    setCurrentStep(3);
    setCurrentCategoryIndex(0);
    addToast(`${selectedCategories.length}カテゴリーを選択しました`, 'success');
  };

  // 商品選択の処理（修正版）
  const handleProductToggle = (productIndex) => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    console.log('🔄 商品選択:', currentCategory, productIndex);
    
    setSelectedProducts(prev => {
      const newState = {
        ...prev,
        [currentCategory]: {
          ...prev[currentCategory],
          [productIndex]: !prev[currentCategory]?.[productIndex]
        }
      };
      console.log('📋 選択状態更新:', newState);
      return newState;
    });
  };

  // ビール商品選択の処理（修正版）
  const handleBeerProductToggle = (productIndex) => {
    const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
    const categoryKey = `ビール_${currentContainer}`;
    console.log('🍺 ビール商品選択:', categoryKey, productIndex);
    
    setSelectedProducts(prev => {
      const newState = {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [productIndex]: !prev[categoryKey]?.[productIndex]
        }
      };
      console.log('🍺 ビール選択状態更新:', newState);
      return newState;
    });
  };

  const handleNextCategory = () => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    
    if (currentCategory === 'ビール') {
      setShowBeerContainerSelection(true);
      return;
    }
    
    proceedToNextCategory();
  };

  const proceedToNextCategory = () => {
    if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    } else {
      handleSetupComplete();
    }
  };

  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
    } else {
      setCurrentStep(2);
    }
  };

  const handleSkipCategory = () => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    setSelectedProducts(prev => ({
      ...prev,
      [currentCategory]: {}
    }));
    addToast(`${currentCategory}をスキップしました`, 'info');
    proceedToNextCategory();
  };

  // ビール容器選択の処理
  const handleBeerContainerToggle = (container) => {
    setSelectedBeerContainers(prev => 
      prev.includes(container) 
        ? prev.filter(c => c !== container)
        : [...prev, container]
    );
  };

  const handleBeerContainerSubmit = () => {
    if (selectedBeerContainers.length === 0) {
      addToast('容器を選択してください', 'error');
      return;
    }
    setShowBeerContainerSelection(false);
    setCurrentBeerContainerIndex(0);
    addToast(`ビール容器を選択しました: ${selectedBeerContainers.join('、')}`, 'success');
  };

  const handleNextBeerContainer = () => {
    if (currentBeerContainerIndex < selectedBeerContainers.length - 1) {
      setCurrentBeerContainerIndex(prev => prev + 1);
    } else {
      proceedToNextCategory();
    }
  };

  const handlePrevBeerContainer = () => {
    if (currentBeerContainerIndex > 0) {
      setCurrentBeerContainerIndex(prev => prev - 1);
    } else {
      setShowBeerContainerSelection(true);
    }
  };

  const handleSkipBeerContainer = () => {
    const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
    const categoryKey = `ビール_${currentContainer}`;
    setSelectedProducts(prev => ({
      ...prev,
      [categoryKey]: {}
    }));
    addToast(`${currentContainer}をスキップしました`, 'info');
    handleNextBeerContainer();
  };

  // 設定完了の処理
  const handleSetupComplete = async () => {
    try {
      setLoading(true);
      
      let totalSelected = 0;
      
      for (const [categoryKey, products] of Object.entries(selectedProducts)) {
        for (const [productIndex, isSelected] of Object.entries(products)) {
          if (isSelected) {
            let productData;
            
            if (categoryKey.startsWith('ビール_')) {
              const container = categoryKey.replace('ビール_', '');
              const beerProducts = masterProducts['ビール'] || [];
              productData = beerProducts.find(p => p.container === container && beerProducts.indexOf(p) == productIndex);
            } else {
              const categoryProducts = masterProducts[categoryKey] || [];
              productData = categoryProducts[parseInt(productIndex)];
            }
            
            if (productData) {
              const newProduct = {
                ...productData,
                stock: 0,
                minStock: 0,
                isMaster: true
              };
              
              await addProduct(newProduct);
              totalSelected++;
            }
          }
        }
      }
      
      addToast(`初期設定が完了しました！${totalSelected}商品を追加しました`, 'success');
      
      const profileData = {
        ...shopInfo,
        setupCompleted: true,
        setupDate: new Date().toISOString()
      };
      
      onComplete(profileData);
      
    } catch (error) {
      console.error('設定完了エラー:', error);
      addToast('設定の保存に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🔄 商品データを読み込み中...</h1>
            <p>管理者が設定した定番商品を取得しています</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: お店情報入力
  if (currentStep === 1) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🏪 お店情報入力</h1>
            <p>お店の基本情報を入力してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '33%'}}></div>
            </div>
          </div>

          <form onSubmit={handleShopInfoSubmit} className="setup-form">
            <div className="form-group">
              <label>店名 *</label>
              <input
                type="text"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo(prev => ({...prev, shopName: e.target.value}))}
                placeholder="例：居酒屋○○"
                required
              />
            </div>

            <div className="form-group">
              <label>住所</label>
              <input
                type="text"
                value={shopInfo.address}
                onChange={(e) => setShopInfo(prev => ({...prev, address: e.target.value}))}
                placeholder="例：佐賀県唐津市..."
              />
            </div>

            <div className="form-group">
              <label>電話番号</label>
              <input
                type="tel"
                value={shopInfo.phone}
                onChange={(e) => setShopInfo(prev => ({...prev, phone: e.target.value}))}
                placeholder="例：0955-xx-xxxx"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="next-button">
                次へ：カテゴリー選択
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: カテゴリー選択
  if (currentStep === 2) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>📋 カテゴリー選択</h1>
            <p>お店で扱う商品カテゴリーを選択してください（複数選択可）</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '66%'}}></div>
            </div>
          </div>

          <div className="category-selection">
            <div className="category-grid">
              {categories.map(category => {
                const productCount = masterProducts[category]?.length || 0;
                return (
                  <div 
                    key={category}
                    className={`category-card ${selectedCategories.includes(category) ? 'selected' : ''} ${productCount === 0 ? 'disabled' : ''}`}
                    onClick={() => productCount > 0 && handleCategoryToggle(category)}
                  >
                    <div className="category-header">
                      <h3>{category}</h3>
                      <div className="category-check">
                        {productCount === 0 ? '❌' : selectedCategories.includes(category) ? '✅' : '⭕'}
                      </div>
                    </div>
                    <div className="category-info">
                      <p>{productCount}品目</p>
                      {productCount === 0 && (
                        <small>商品なし</small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="category-shortcuts">
              <button 
                onClick={() => setSelectedCategories(categories.slice(0, 4))}
                className="shortcut-button"
              >
                人気4カテゴリー選択
              </button>
              <button 
                onClick={() => setSelectedCategories([...categories])}
                className="shortcut-button"
              >
                全カテゴリー選択
              </button>
              <button 
                onClick={() => setSelectedCategories([])}
                className="shortcut-button clear"
              >
                全クリア
              </button>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleCategorySubmit}
                className="next-button"
              >
                {selectedCategories.length === 0 ? 
                  '商品選択をスキップして完了' : 
                  `次へ：商品選択（${selectedCategories.length}カテゴリー）`
                }
              </button>
              
              <button 
                onClick={() => setCurrentStep(1)} 
                className="back-button"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 商品選択
  if (currentStep === 3) {
    if (currentCategoryIndex >= selectedCategories.length) {
      console.error('currentCategoryIndex out of range:', currentCategoryIndex, selectedCategories.length);
      return null;
    }

    const currentCategory = selectedCategories[currentCategoryIndex];
    const isLastCategory = currentCategoryIndex === selectedCategories.length - 1;

    // ビール容器選択画面
    if (showBeerContainerSelection && currentCategory === 'ビール') {
      const containers = [
        { name: '生樽', emoji: '🍺', description: '生ビールサーバー用', detail: '10L・19L樽' },
        { name: '瓶', emoji: '🍾', description: '瓶ビール', detail: '中瓶・大瓶' },
        { name: '缶', emoji: '🥫', description: '缶ビール', detail: '350ml・500ml' }
      ];

      return (
        <div className="initial-setup">
          <div className="setup-container">
            <div className="setup-header">
              <h1>🍺 ビール容器選択</h1>
              <p>お店で提供するビールの形態を選択してください（複数選択可）</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '100%'}}></div>
              </div>
            </div>

            <div className="beer-container-selection">
              <div className="container-options">
                {containers.map(container => (
                  <div 
                    key={container.name}
                    className={`beer-container-card ${
                      selectedBeerContainers.includes(container.name) ? 'selected' : ''
                    }`}
                    onClick={() => handleBeerContainerToggle(container.name)}
                  >
                    <div className="container-emoji">{container.emoji}</div>
                    <div className="container-info">
                      <h3>{container.name}</h3>
                      <p className="container-description">{container.description}</p>
                      <small className="container-detail">{container.detail}</small>
                    </div>
                    <div className="container-check">
                      {selectedBeerContainers.includes(container.name) ? '✅' : '⭕'}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="selection-info">
                <p>選択中: {selectedBeerContainers.length > 0 ? selectedBeerContainers.join('、') : 'なし'}</p>
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleBeerContainerSubmit}
                className="next-button"
                disabled={selectedBeerContainers.length === 0}
              >
                次へ：ビール商品選択 ({selectedBeerContainers.length}種類)
              </button>
              
              <button 
                onClick={handleSkipCategory}
                className="skip-button"
              >
                ビールをスキップ
              </button>
              
              <button 
                onClick={handlePrevCategory}
                className="back-button"
              >
                カテゴリー選択に戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ビール商品選択画面（容器別）
    if (currentCategory === 'ビール' && selectedBeerContainers.length > 0) {
      if (currentBeerContainerIndex >= selectedBeerContainers.length) {
        console.error('currentBeerContainerIndex out of range:', currentBeerContainerIndex, selectedBeerContainers.length);
        return null;
      }

      const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
      const allBeerProducts = masterProducts['ビール'] || [];
      const currentProducts = allBeerProducts.filter(product => 
        product.container === currentContainer
      );
      const categoryKey = `ビール_${currentContainer}`;
      const isLastContainer = currentBeerContainerIndex === selectedBeerContainers.length - 1;

      return (
        <div className="initial-setup">
          <div className="setup-container">
            <div className="setup-header">
              <h1>🍺 {currentContainer}ビール選択 ({currentBeerContainerIndex + 1}/{selectedBeerContainers.length})</h1>
              <p>{currentContainer}で提供するビールを選択してください</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '100%'}}></div>
              </div>
            </div>

            <div className="product-selection">
              <div className="products-grid">
                {currentProducts.map((product, index) => {
                  const originalIndex = allBeerProducts.findIndex(p => 
                    p.name === product.name && p.container === product.container
                  );
                  
                  return (
                    <div 
                      key={`${product.name}-${originalIndex}`}
                      className={`product-card selectable ${
                        selectedProducts[categoryKey]?.[originalIndex] ? 'selected' : ''
                      }`}
                      onClick={() => handleBeerProductToggle(originalIndex)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="product-check">
                        {selectedProducts[categoryKey]?.[originalIndex] ? '✅' : '⭕'}
                      </div>
                      <h4>{product.name}</h4>
                      <p className="manufacturer">{product.manufacturer}</p>
                      {product.description && (
                        <p className="description">{product.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleNextBeerContainer}
                className="next-button"
                disabled={loading}
              >
                {loading ? '設定中...' : 
                 isLastContainer ? 
                   (isLastCategory ? '設定完了' : '次のカテゴリー') : 
                   '次の容器'
                }
              </button>

              <button 
                onClick={handleSkipBeerContainer}
                className="skip-button"
              >
                この容器をスキップ
              </button>
              
              <button 
                onClick={handlePrevBeerContainer}
                className="back-button"
              >
                {currentBeerContainerIndex === 0 ? '容器選択に戻る' : '前の容器'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 通常のカテゴリー商品選択画面
    const currentProducts = masterProducts[currentCategory] || [];

    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍶 {currentCategory}選択 ({currentCategoryIndex + 1}/{selectedCategories.length})</h1>
            <p>{currentCategory}から必要な商品を選択してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="product-selection">
            <div className="products-grid">
              {currentProducts.map((product, index) => (
                <div 
                  key={`${product.name}-${index}`}
                  className={`product-card selectable ${
                    selectedProducts[currentCategory]?.[index] ? 'selected' : ''
                  }`}
                  onClick={() => handleProductToggle(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="product-check">
                    {selectedProducts[currentCategory]?.[index] ? '✅' : '⭕'}
                  </div>
                  <h4>{product.name}</h4>
                  <p className="manufacturer">{product.manufacturer}</p>
                  {product.description && (
                    <p className="description">{product.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button 
              onClick={handleNextCategory}
              className="next-button"
              disabled={loading}
            >
              {loading ? '設定中...' : 
               isLastCategory ? '設定完了' : '次のカテゴリー'}
            </button>

            <button 
              onClick={handleSkipCategory}
              className="skip-button"
            >
              このカテゴリーをスキップ
            </button>
            
            <button 
              onClick={handlePrevCategory}
              className="back-button"
            >
              {currentCategoryIndex === 0 ? 'カテゴリー選択に戻る' : '前のカテゴリー'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default InitialSetup;