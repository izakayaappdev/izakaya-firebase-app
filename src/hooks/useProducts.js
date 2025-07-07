import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// 管理者UID（固定）
const ADMIN_UID = 'slK7PLeu3lMnP5vE2MqytkKhiW13';

export const useProducts = (user) => {
  const [products, setProducts] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]); // マスター商品用
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // productsRef をuseEffect外で定義（userがある場合のみ）
  const productsRef = user?.uid ? collection(db, 'users', user.uid, 'products') : null;
  const masterProductsRef = collection(db, 'users', ADMIN_UID, 'products');

  // マスター商品を含む全商品（検索用）
  const allProducts = [...products, ...masterProducts];

  // 商品コード自動採番
  const generateProductCode = () => {
    const existingCodes = allProducts
      .map(p => p.productCode)
      .filter(code => code && code.startsWith('PROD'))
      .map(code => {
        const num = parseInt(code.replace('PROD', ''));
        return isNaN(num) ? 0 : num;
      });
    
    const maxNum = Math.max(0, ...existingCodes);
    return `PROD${String(maxNum + 1).padStart(3, '0')}`;
  };

  // 商品コード重複チェック
  const isProductCodeDuplicate = (productCode, excludeId = null) => {
    return allProducts.some(p => 
      p.productCode === productCode && p.id !== excludeId
    );
  };

  // 自分の商品のリアルタイム同期
  useEffect(() => {
    if (!user?.uid || !productsRef) {
      setProducts([]);
      return;
    }

    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // クライアントサイドでソート
        productsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setProducts(productsData);
        setError(null);
      },
      (error) => {
        console.error('自分の商品同期エラー:', error);
        setError(error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // マスター商品のリアルタイム同期
  useEffect(() => {
    const q = query(masterProductsRef);
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const masterData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // isMaster が true の商品のみ取得
          if (data.isMaster === true) {
            masterData.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        // クライアントサイドでソート
        masterData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMasterProducts(masterData);
        setLoading(false);
      },
      (error) => {
        console.error('マスター商品同期エラー:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 商品追加
  const addProduct = async (productData) => {
    if (!user?.uid || !productsRef) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      // 商品コードが指定されていない場合は自動生成
      const productCode = productData.productCode || generateProductCode();
      
      // 商品コード重複チェック
      if (isProductCodeDuplicate(productCode)) {
        return { success: false, error: '商品コードが重複しています' };
      }

      const newProduct = {
        ...productData,
        productCode,
        stock: Number(productData.stock || 0),
        cost: Number(productData.cost || 0),
        price: Number(productData.price || 0),
        minStock: Number(productData.minStock || 0),
        volume: Number(productData.volume || 0),
        volumeUnit: productData.volumeUnit || 'ml',
        profit: Number(productData.profit || 0),
        profitRate: Number(productData.profitRate || 0),
        isMaster: Boolean(productData.isMaster || false),
        isPopular: Boolean(productData.isPopular || false),
        isActive: Boolean(productData.isActive !== false), // デフォルトtrue
        isNomihodai: Boolean(productData.isNomihodai || false),
        addedBy: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(productsRef, newProduct);
      return { success: true };
    } catch (error) {
      console.error('商品追加エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 商品更新
  const updateProduct = async (productId, updateData) => {
    if (!user?.uid) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      // 商品コードが変更される場合は重複チェック
      if (updateData.productCode && isProductCodeDuplicate(updateData.productCode, productId)) {
        return { success: false, error: '商品コードが重複しています' };
      }

      const productDoc = doc(db, 'users', user.uid, 'products', productId);
      const processedData = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // 数値フィールドの処理
      if (updateData.volume !== undefined) {
        processedData.volume = Number(updateData.volume);
      }
      if (updateData.stock !== undefined) {
        processedData.stock = Number(updateData.stock);
      }
      if (updateData.cost !== undefined) {
        processedData.cost = Number(updateData.cost);
      }
      if (updateData.price !== undefined) {
        processedData.price = Number(updateData.price);
      }
      if (updateData.minStock !== undefined) {
        processedData.minStock = Number(updateData.minStock);
      }

      await updateDoc(productDoc, processedData);
      return { success: true };
    } catch (error) {
      console.error('商品更新エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 商品削除
  const deleteProduct = async (productId) => {
    if (!user?.uid) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    try {
      const productDoc = doc(db, 'users', user.uid, 'products', productId);
      await deleteDoc(productDoc);
      return { success: true };
    } catch (error) {
      console.error('商品削除エラー:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 在庫更新（専用関数）
  const updateStock = async (productId, stockChange) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, error: '商品が見つかりません' };
    }

    const newStock = Math.max(0, (product.stock || 0) + stockChange);
    return await updateProduct(productId, { stock: newStock });
  };

  return {
    products,
    masterProducts,
    allProducts, // 検索用：自分の商品 + マスター商品
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    generateProductCode,
    isProductCodeDuplicate
  };
};