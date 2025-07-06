import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// 管理者メールアドレス
const ADMIN_EMAIL = 'izakaya.app.dev@gmail.com';

// カテゴリー順序（人気・需要順）
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

// 初期設定フローコンポーネント
function InitialSetup({ user, onComplete, addToast }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [masterProducts, setMasterProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Step 1: お店情報
  const [shopInfo, setShopInfo] = useState({
    shopName: '',
    address: '',
    phone: ''
  });
  
  // Step 2: カテゴリー選択
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Step 3: 商品選択（新フロー）
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [showBeerContainerSelection, setShowBeerContainerSelection] = useState(false);
  const [selectedBeerContainers, setSelectedBeerContainers] = useState([]);
  const [currentBeerContainerIndex, setCurrentBeerContainerIndex] = useState(0);

  // 管理者マスター商品を取得
  const fetchMasterProducts = async () => {
    setLoadingProducts(true);
    try {
      // 管理者のUIDを取得する必要があるが、簡易的に管理者のproductsを全取得
      // 実際にはadmin権限で全ユーザーのマスター商品を取得する必要がある
      // ここでは現在のユーザーのマスター商品を取得（テスト用）
      
      const productsRef = collection(db, 'users', user.uid, 'products');
      const q = query(productsRef, where('isMaster', '==', true));
      const querySnapshot = await getDocs(q);
      
      const products = {};
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        const category = product.category;
        
        if (!products[category]) {
          products[category] = [];
        }
        products[category].push(product);
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

  // コンポーネントマウント時にマスター商品を取得
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

  // Step 3: 商品選択の処理（新フロー）
  const handleProductToggle = (productIndex) => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    setSelectedProducts(prev => ({
      ...prev,
      [currentCategory]: {
        ...prev[currentCategory],
        [productIndex]: !prev[currentCategory]?.[productIndex]
      }
    }));
  };

  const handleNextCategory = () => {
    const currentCategory = selectedCategories[currentCategoryIndex];
    
    // ビールカテゴリーの場合、容器選択へ
    if (currentCategory === 'ビール') {
      setShowBeerContainerSelection(true);
      return;
    }
    
    // 通常の次のカテゴリーへの処理
    proceedToNextCategory();
  };

  const proceedToNextCategory = () => {
    if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    } else {
      // 最後のカテゴリーなら完了
      handleSetupComplete();
    }
  };

  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
    } else {
      // 最初のカテゴリーならカテゴリー選択に戻る
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
    setCurrentBeerContainerIndex(0);
    setShowBeerContainerSelection(false);
    // ビール商品選択画面を表示するため、showBeerContainerSelectionをfalseにするだけ
    addToast(`${selectedBeerContainers.length}種類の容器を選択しました`, 'success');
  };

  const handleBeerProductToggle = (productIndex) => {
    const currentContainer = selectedBeerContainers[currentBeerContainerIndex];
    const categoryKey = `ビール_${currentContainer}`;
    
    setSelectedProducts(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [productIndex]: !prev[categoryKey]?.[productIndex]
      }
    }));
  };

  const handleNextBeerContainer = () => {
    if (currentBeerContainerIndex < selectedBeerContainers.length - 1) {
      setCurrentBeerContainerIndex(prev => prev + 1);
    } else {
      // 全ての容器選択完了、次のカテゴリーへ
      proceedToNextCategory();
    }
  };

  const handlePrevBeerContainer = () => {
    if (currentBeerContainerIndex > 0) {
      setCurrentBeerContainerIndex(prev => prev - 1);
    } else {
      // 容器選択に戻る
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
    addToast(`${currentContainer}ビールをスキップしました`, 'info');
    handleNextBeerContainer();
  };

  // 最終完了処理
  const handleSetupComplete = async () => {
    setLoading(true);
    try {
      // 選択された商品を準備
      const productsToAdd = [];
      selectedCategories.forEach(category => {
        if (category === 'ビール') {
          // ビールの場合は容器別に処理
          selectedBeerContainers.forEach(container => {
            const categoryKey = `ビール_${container}`;
            const containerSelection = selectedProducts[categoryKey] || {};
            
            masterProducts['ビール']?.forEach((product, index) => {
              if (containerSelection[index] && product.container === container) {
                productsToAdd.push({
                  ...product,
                  category: 'ビール',
                  stock: 0,
                  minStock: 0,
                  profit: (product.price || 0) - (product.cost || 0),
                  profitRate: (product.price && product.cost) ? 
                    (((product.price - product.cost) / product.price) * 100) : 0,
                  isMaster: true,
                  isNomihodai: false,
                  addedBy: user.email,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            });
          });
        } else {
          // ビール以外の通常処理
          const categorySelection = selectedProducts[category] || {};
          masterProducts[category]?.forEach((product, index) => {
            if (categorySelection[index]) {
              productsToAdd.push({
                ...product,
                category,
                stock: 0,
                minStock: 0,
                profit: (product.price || 0) - (product.cost || 0),
                profitRate: (product.price && product.cost) ? 
                  (((product.price - product.cost) / product.price) * 100) : 0,
                isMaster: true,
                isNomihodai: false,
                addedBy: user.email,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          });
        }
      });

      console.log(`📦 追加予定商品: ${productsToAdd.length}品目`);

      const setupData = {
        shopName: shopInfo.shopName,
        address: shopInfo.address,
        phone: shopInfo.phone,
        selectedCategories,
        selectedProducts: productsToAdd
      };

      await onComplete(setupData);
      
    } catch (error) {
      console.error('初期設定エラー:', error);
      addToast(`設定の保存に失敗しました: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: お店情報入力
  if (currentStep === 1) {
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🏪 お店情報を入力</h1>
            <p>まずは基本的なお店の情報を教えてください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '33%'}}></div>
            </div>
          </div>

          <form onSubmit={handleShopInfoSubmit} className="setup-form">
            <div className="form-group">
              <label htmlFor="shopName">店名 *</label>
              <input
                id="shopName"
                type="text"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo({...shopInfo, shopName: e.target.value})}
                placeholder="例：居酒屋 さが風"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">住所</label>
              <input
                id="address"
                type="text"
                value={shopInfo.address}
                onChange={(e) => setShopInfo({...shopInfo, address: e.target.value})}
                placeholder="例：佐賀県唐津市..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">電話番号</label>
              <input
                id="phone"
                type="tel"
                value={shopInfo.phone}
                onChange={(e) => setShopInfo({...shopInfo, phone: e.target.value})}
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
    if (loadingProducts) {
      return (
        <div className="initial-setup">
          <div className="setup-container">
            <div className="setup-header">
              <h1>🔄 商品データ読み込み中...</h1>
              <p>管理者マスターから商品情報を取得しています</p>
              <div className="progress-bar">
                <div className="progress" style={{width: '66%'}}></div>
              </div>
            </div>
            <div className="loading-message">
              <p>しばらくお待ちください...</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="initial-setup">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🍺 カテゴリー選択</h1>
            <p>お店で扱う商品カテゴリーを選択してください（複数選択可）</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '66%'}}></div>
            </div>
          </div>

          <div className="category-grid">
            {categories.map((category, index) => {
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
    );
  }

  // Step 3: 商品選択（新フロー - 1カテゴリーずつ）
  if (currentStep === 3) {
    // selectedCategoriesの範囲チェック
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
                ビール商品選択へ ({selectedBeerContainers.length}種類)
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
      // 選択した容器の商品のみフィルタリング
      const currentProducts = allBeerProducts.filter(product => 
        product.container === currentContainer
      );
      const categoryKey = `ビール_${currentContainer}`;

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
                  // 元の配列でのインデックスを取得
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
                 currentBeerContainerIndex === selectedBeerContainers.length - 1 ? 
                 (isLastCategory ? '設定完了' : '次のカテゴリー') : 
                 '次の容器'}
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
            <h1>🍶 商品選択 ({currentCategoryIndex + 1}/{selectedCategories.length})</h1>
            <p>{currentCategory}から必要な商品を選択してください</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="product-selection">
            <div className="products-grid">
              {currentProducts.map((product, index) => (
                <div 
                  key={index}
                  className={`product-card selectable ${
                    selectedProducts[currentCategory]?.[index] ? 'selected' : ''
                  }`}
                  onClick={() => handleProductToggle(index)}
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