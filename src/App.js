import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Home, Grid, ShoppingBag, ShoppingCart, MessageCircle, 
  CheckCircle, X, Mail, Phone, MapPin, User, ChevronRight, 
  TrendingUp, Box, FileText, AlertCircle, Info, Search, ExternalLink
} from 'lucide-react';

// =========================================================================
// ⚠️ REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL ⚠️
// =========================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkZQzAG71GoP95dagt1Rt82syXs9jiPbO5pE8qX-uD0ivuAcZ5cwQesFlxMAaLzEe9Ww/exec";

const StoreContext = createContext();

const CATEGORIES =[
  "Health & Beauty", "Men's", "Women's", "Kids", 
  "Smart Gadgets", "Electronics", "Global"
];

// Fallback data while Google Sheets is loading
const initialSettings = {
  storeName: "Dokan Bazar",
  logoUrl: "", 
  whatsapp: "01922071761",
  address: "Islampur, Dhamrai, Dhaka",
  phone: "01922071761",
  bkash: "01922071761",
  nagad: "01850592153",
  heroImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
  categoryImages: {},
  social: {},
  terms: "1. All sales are final unless product is defective.\n2. Delivery times are estimates.",
  privacy: "We do not share your data with third parties.",
  refund: "Refunds are processed within 7-10 business days.",
  shipping: "Inside Dhaka: 24-48 Hours\nOutside Dhaka: 3-5 Business Days",
  disclaimer: "Product images are for illustrative purposes only and may slightly differ from the actual product."
};

// Safe JSON parser to prevent crashes
const safeJsonParse = (key, defaultVal) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

export default function App() {
  const [products, setProducts] = useState(() => safeJsonParse('dk_products',[]));
  const [cart, setCart] = useState(() => safeJsonParse('dk_cart',[]));
  const [myOrderIds, setMyOrderIds] = useState(() => safeJsonParse('dk_my_order_ids', []));
  const [orders, setOrders] = useState(() => safeJsonParse('dk_orders', []));
  const [settings, setSettings] = useState(() => {
    const savedSettings = safeJsonParse('dk_settings', null);
    return savedSettings ? { ...initialSettings, ...savedSettings } : initialSettings;
  });
  
  const [view, setView] = useState('home'); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [policyType, setPolicyType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [toast, setToast] = useState(null); 
  const [modal, setModal] = useState(null); 

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const showModal = (title, content) => setModal({ title, content });

  // 1. FETCH DATA FROM GOOGLE SHEETS (WITH 15 MINUTE CACHING)
  useEffect(() => {
    if(GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE") return;

    const CACHE_EXPIRY_MS = 15 * 60 * 1000; 
    const lastFetchTime = localStorage.getItem('dk_last_fetch_time');
    const now = Date.now();
    const localProducts = safeJsonParse('dk_products',[]);

    if (lastFetchTime && (now - parseInt(lastFetchTime)) < CACHE_EXPIRY_MS && localProducts.length > 0) {
      return; 
    }

    fetch(`${GOOGLE_SCRIPT_URL}?action=getData`)
      .then(res => res.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
        if (data.products) {
          const formattedProducts = data.products.map(p => ({
            ...p,
            colors: typeof p.colors === 'string' ? p.colors.split(',').map(c=>c.trim()).filter(Boolean) : (p.colors ||[])
          }));
          setProducts(formattedProducts);
          localStorage.setItem('dk_last_fetch_time', Date.now().toString());
        }
      })
      .catch(err => console.error("Error fetching data:", err));
  },[]);

  // 2. FETCH USER'S ORDERS STATUS (WITH 3 MINUTE CACHING)
  useEffect(() => {
    const fetchOrders = async () => {
      const savedIds = safeJsonParse('dk_my_order_ids',[]);
      if (savedIds.length === 0 || GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE") return;

      const ORDER_CACHE_MS = 3 * 60 * 1000; 
      const lastOrderFetch = localStorage.getItem('dk_last_order_fetch');
      const now = Date.now();

      if (lastOrderFetch && (now - parseInt(lastOrderFetch)) < ORDER_CACHE_MS) return;

      try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getMyOrders&ids=${savedIds.join(',')}`);
        const data = await res.json();
        if(data.orders) {
          setOrders(prev => {
            const currentOrders = Array.isArray(prev) ? prev :[];
            const fetchedIds = data.orders.map(o => String(o.id));
            const unSyncedOrders = currentOrders.filter(o => !fetchedIds.includes(String(o.id)));
            return [...data.orders, ...unSyncedOrders];
          });
          localStorage.setItem('dk_last_order_fetch', Date.now().toString());
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };
    fetchOrders();
  },[]);

  // SAVE DATA LOCALLY ON EVERY CHANGE
  useEffect(() => { localStorage.setItem('dk_products', JSON.stringify(products)); },[products]);
  useEffect(() => { localStorage.setItem('dk_cart', JSON.stringify(cart)); },[cart]);
  useEffect(() => { localStorage.setItem('dk_my_order_ids', JSON.stringify(myOrderIds)); },[myOrderIds]);
  useEffect(() => { localStorage.setItem('dk_orders', JSON.stringify(orders)); },[orders]); 
  useEffect(() => { localStorage.setItem('dk_settings', JSON.stringify(settings)); }, [settings]);

  const navigate = (newView, payload = null) => {
    window.scrollTo(0, 0);
    if (payload) setActiveCategory(payload);
    setView(newView);
  };

  const addToCart = (product, selectedColor = null) => {
    const cartItemId = selectedColor ? `${product.id}-${selectedColor}` : `${product.id}`;
    const currentCart = Array.isArray(cart) ? cart :[];
    const existing = currentCart.find(item => item.cartItemId === cartItemId);
    
    if (existing) {
      setCart(currentCart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...currentCart, { ...product, cartItemId, selectedColor, qty: 1 }]);
    }
    showToast("Added to cart successfully!");
  };

  const updateCartQty = (cartItemId, delta) => {
    const currentCart = Array.isArray(cart) ? cart :[];
    const newCart = currentCart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + delta } : item).filter(i => i.qty > 0);
    setCart(newCart);
  };

  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const executeSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (searchQuery.trim() !== '') navigate('products', 'All');
    }
  };

  const contextValue = {
    settings, products, cart, setCart, orders, setOrders, myOrderIds, setMyOrderIds,
    addToCart, updateCartQty, navigate, view, activeCategory, setActiveCategory,
    setPolicyType, policyType, showToast, showModal,
    selectedProduct, setSelectedProduct, searchQuery, setSearchQuery
  };

  return (
    <StoreContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-16 md:pb-0 relative">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('home')}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName} className="h-8 md:h-10 object-contain" />
              ) : (
                <>
                  <div className="bg-orange-500 p-1.5 md:p-2 rounded-lg"><ShoppingBag className="text-white w-4 h-4 md:w-5 md:h-5" /></div>
                  <h1 className="text-lg md:text-2xl font-bold text-orange-600 tracking-tight block">{settings.storeName}</h1>
                </>
              )}
            </div>
            <div className="hidden md:flex gap-6 font-medium text-gray-600">
              <button onClick={() => navigate('home')} className={`hover:text-orange-500 transition ${view==='home'?'text-orange-500':''}`}>Home</button>
              <button onClick={() => navigate('category')} className={`hover:text-orange-500 transition ${view==='category'?'text-orange-500':''}`}>Categories</button>
              <button onClick={() => navigate('products', 'All')} className={`hover:text-orange-500 transition ${view==='products'?'text-orange-500':''}`}>All Products</button>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4 absolute left-3 text-gray-400 cursor-pointer" onClick={executeSearch} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={executeSearch}
                  className="w-24 sm:w-48 md:w-56 pl-8 md:pl-9 pr-3 py-1.5 md:py-2 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-xs md:text-sm transition"
                />
              </div>
              <button onClick={() => navigate('cart')} className="relative p-1.5 md:p-2 text-gray-600 hover:text-orange-500 transition shrink-0">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                {Array.isArray(cart) && cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] md:text-[10px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center shadow-sm">
                    {cart.reduce((a,c) => a + c.qty, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-4 md:py-6 min-h-[80vh]">
          {view === 'home' && <HomeView />}
          {view === 'category' && <CategoryView />}
          {view === 'products' && <ProductListView />}
          {view === 'product_detail' && <ProductDetailView />}
          {view === 'cart' && <CartView />}
          {view === 'checkout' && <CheckoutView />}
          {view === 'policy' && <PolicyView />}
        </main>

        <footer className="bg-white border-t border-gray-200 mt-8 md:mt-12 pb-20 md:pb-6">
          <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-gray-600">
            <div className="md:col-span-1">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{settings.storeName}</h3>
              <p className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-orange-500"/> {settings.address}</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500"/> {settings.phone}</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Policies</h3>
              <ul className="space-y-2">
                <li><button onClick={() => { setPolicyType('terms'); navigate('policy'); }} className="hover:text-orange-500 transition">Terms & Conditions</button></li>
                <li><button onClick={() => { setPolicyType('privacy'); navigate('policy'); }} className="hover:text-orange-500 transition">Privacy Policy</button></li>
                <li><button onClick={() => { setPolicyType('refund'); navigate('policy'); }} className="hover:text-orange-500 transition">Refund Policy</button></li>
                <li><button onClick={() => { setPolicyType('shipping'); navigate('policy'); }} className="hover:text-orange-500 transition">Shipping & Delivery</button></li>
                <li><button onClick={() => { setPolicyType('disclaimer'); navigate('policy'); }} className="hover:text-orange-500 transition">Disclaimer</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><button onClick={() => navigate('home')} className="hover:text-orange-500 transition">Home</button></li>
                <li><button onClick={() => navigate('category')} className="hover:text-orange-500 transition">Categories</button></li>
                <li><button onClick={() => navigate('products', 'All')} className="hover:text-orange-500 transition">All Products</button></li>
              </ul>
            </div>
          </div>
        </footer>

        <a href={`https://wa.me/+88${settings.whatsapp}`} target="_blank" rel="noreferrer" className="fixed bottom-20 right-4 md:bottom-8 md:right-8 bg-[#25D366] text-white p-3 md:p-3.5 rounded-full shadow-lg hover:scale-110 transition-transform z-40 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
        </a>

        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-14 z-50 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] pb-safe">
          <NavBtn icon={<Home/>} label="Home" active={view === 'home'} onClick={() => navigate('home')} />
          <NavBtn icon={<Grid/>} label="Categories" active={view === 'category'} onClick={() => navigate('category')} />
          <NavBtn icon={<Box/>} label="Products" active={view === 'products'} onClick={() => navigate('products', 'All')} />
          <NavBtn icon={<ShoppingCart/>} label="Cart" active={view === 'cart'} onClick={() => navigate('cart')} badge={Array.isArray(cart) ? cart.reduce((a,c) => a + c.qty, 0) : 0} />
        </nav>

        {/* ⚠️ CENTERED TOAST NOTIFICATION SO IT'S HIGHLY VISIBLE ON MOBILE */}
        {toast && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-top-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl text-white font-medium text-sm border ${toast.type === 'error' ? 'bg-red-600 border-red-500' : 'bg-gray-900 border-gray-800'}`}>
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0"/> : <CheckCircle className="w-5 h-5 text-orange-400 shrink-0"/>}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Info className="text-orange-500"/> {modal.title}</h3>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
              </div>
              <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{modal.content}</div>
              <button onClick={() => setModal(null)} className="w-full mt-6 bg-orange-500 text-white py-2.5 rounded-xl font-medium hover:bg-orange-600 transition">Got it</button>
            </div>
          </div>
        )}
      </div>
    </StoreContext.Provider>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center w-full h-full justify-center space-y-1 ${active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
      <div className="relative">
        {icon && React.cloneElement(icon, { className: 'w-5 h-5' })}
        {badge > 0 && <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{badge}</span>}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function ProductCard({ product }) {
  const { addToCart, setSelectedProduct, navigate, showToast } = useContext(StoreContext); 
  const handleCardClick = () => { setSelectedProduct(product); navigate('product_detail'); };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (product.colors && product.colors.length > 0) {
      setSelectedProduct(product); navigate('product_detail');
      showToast("দয়া করে একটি কালার সিলেক্ট করুন", "info");
    } else addToCart(product);
  };

  return (
    <div onClick={handleCardClick} className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-sm transition-all duration-300 relative flex flex-col cursor-pointer h-full">
      <div className="w-full aspect-square overflow-hidden bg-gray-50 relative">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-gray-800 text-[8px] md:text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold shadow-sm">
          🔥 {product.sold} Sold
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {product.colors.slice(0, 3).map(c => (
              <span key={c} className="w-2.5 h-2.5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c.toLowerCase() === 'white' ? '#fff' : c.toLowerCase() === 'black' ? '#000' : c.toLowerCase() === 'navy' ? '#000080' : c.toLowerCase() === 'silver' ? '#C0C0C0' : c.toLowerCase() }} title={c}></span>
            ))}
            {product.colors.length > 3 && <span className="text-[8px] font-bold bg-white/80 px-1 rounded">+{product.colors.length - 3}</span>}
          </div>
        )}
      </div>
      <div className="p-2 md:p-3 flex flex-col flex-grow">
        <span className="text-[8px] md:text-[9px] text-orange-500 font-bold uppercase tracking-wider">{product.category}</span>
        <h3 className="font-semibold text-gray-800 text-[10px] sm:text-xs line-clamp-2 mt-0.5 leading-tight">{product.title}</h3>
        <p className="text-gray-900 font-black mt-1 text-xs sm:text-sm">৳ {product.price}</p>
        <div className="mt-auto pt-1.5 md:pt-2">
          <button type="button" onClick={handleQuickAdd} className="w-full bg-gray-900 hover:bg-orange-500 text-white py-1.5 rounded text-[9px] sm:text-[10px] font-bold transition flex justify-center items-center gap-1 shadow-sm">
            <ShoppingCart className="w-3 h-3 md:w-3.5 md:h-3.5" /> {(product.colors && product.colors.length > 0) ? 'Select' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetailView() {
  const { selectedProduct, addToCart, navigate, showToast } = useContext(StoreContext);
  const[selectedColor, setSelectedColor] = useState(''); 

  if (!selectedProduct) return (<div className="text-center py-20 text-gray-500">No product selected.</div>);

  const handleAction = (actionType) => {
    if (selectedProduct.colors && selectedProduct.colors.length > 0 && !selectedColor) {
      showToast("দয়া করে একটি কালার সিলেক্ট করুন", "error"); return;
    }
    addToCart(selectedProduct, selectedColor);
    if (actionType === 'order') navigate('checkout');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-4 md:p-6 rounded-2xl border shadow-sm animate-in fade-in duration-300">
      <button onClick={() => navigate('home')} className="mb-4 md:mb-6 flex items-center gap-1.5 text-gray-500 hover:text-orange-500 transition font-bold text-sm w-fit"><ChevronRight className="w-4 h-4 rotate-180" /> Back</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 aspect-square max-w-md mx-auto w-full">
          <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-start">
          <span className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1.5">{selectedProduct.category}</span>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight">{selectedProduct.title}</h1>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-3xl font-black text-orange-600">৳ {selectedProduct.price}</p>
            <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> In Stock</span>
          </div>
          {selectedProduct.colors && selectedProduct.colors.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">Select Color <span className="text-red-500">*</span></h3>
              <div className="flex flex-wrap gap-2.5">
                {selectedProduct.colors.map(color => (
                  <button key={color} onClick={() => setSelectedColor(color)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${selectedColor === color ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button type="button" onClick={() => handleAction('cart')} className="flex-1 bg-gray-900 text-white py-3 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-sm text-sm"><ShoppingCart className="w-4 h-4" /> Add to Cart</button>
            <button type="button" onClick={() => handleAction('order')} className="flex-1 bg-orange-500 text-white py-3 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-sm text-sm"><ShoppingBag className="w-4 h-4" /> Order Now</button>
          </div>
          <div className="text-gray-600 border-t border-gray-100 pt-5 mt-auto">
            <h3 className="text-sm font-bold text-gray-800 mb-1.5">Product Description</h3>
            <p className="whitespace-pre-line leading-relaxed text-xs md:text-sm line-clamp-6 hover:line-clamp-none transition-all">{selectedProduct.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeView() {
  const { products, settings, navigate } = useContext(StoreContext);
  const safeProducts = Array.isArray(products) ? products : [];
  const trending = [...safeProducts].sort((a,b) => b.sold - a.sold).slice(0, 8); 
  const homeCategories =["Smart Gadgets", "Health & Beauty", "Men's"];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col-reverse md:flex-row items-center justify-between gap-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="w-full md:w-3/5 space-y-3 md:space-y-4 relative z-10 text-center md:text-left pt-2 md:pt-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black leading-snug tracking-tight text-white">
            সারা বিশ্বের সেরা ও ট্রেন্ডি সব ইউনিক প্রোডাক্ট পাচ্ছেন <span className="text-orange-400">{settings.storeName}</span>-এ
          </h2>
          <button onClick={() => navigate('products', 'All')} className="bg-orange-500 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold mt-2 hover:bg-orange-600 transition shadow-lg shadow-orange-500/30 inline-block text-xs md:text-sm">Shop Collection</button>
        </div>
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 relative z-10 mx-auto md:mx-0">
          <img src={settings.heroImage} alt="Banner" className="w-full h-full object-cover rounded-xl md:rounded-2xl shadow-xl transform md:rotate-2 hover:rotate-0 transition duration-500 border border-white/10 bg-gray-800" />
        </div>
      </div>

      <section>
        <div className="mb-3 md:mb-4">
          <h3 className="text-[10px] md:text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">{settings.storeName} Specials</h3>
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-1 md:p-1.5 rounded-md"><TrendingUp className="text-orange-600 w-4 h-4 md:w-5 md:h-5" /></div>
            <h2 className="text-lg md:text-2xl font-bold text-gray-800">Trending Now</h2>
          </div>
        </div>
        {safeProducts.length === 0 ? (
           <p className="text-gray-500 text-center text-sm py-4">Loading products...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4">
            {trending.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {homeCategories.map(cat => {
        const catProducts = safeProducts.filter(p => p.category === cat).slice(0, 5); 
        if(catProducts.length === 0) return null;
        return (
          <section key={cat} className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
              <h3 className="text-base md:text-xl font-bold text-gray-800">{cat}</h3>
              <button onClick={() => navigate('products', cat)} className="text-orange-500 font-bold text-xs md:text-sm flex items-center hover:text-orange-600 transition">View More <ChevronRight className="w-3.5 h-3.5 ml-1"/></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4">
              {catProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )
      })}
    </div>
  );
}

function CategoryView() {
  const { products, settings, navigate } = useContext(StoreContext);
  const safeProducts = Array.isArray(products) ? products :[];
  
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2"><Grid className="text-orange-500 w-5 h-5"/> Browse Categories</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map(cat => {
          const count = safeProducts.filter(p => p.category === cat).length;
          const bgImage = settings.categoryImages?.[cat] || "https://images.unsplash.com/photo-1555529771-835f59bfc50c?w=500&q=80"; 
          return (
            <div key={cat} onClick={() => navigate('products', cat)} className="relative rounded-2xl overflow-hidden hover:shadow-xl cursor-pointer transition-all flex flex-col items-center justify-center min-h-[100px] md:min-h-[140px] group bg-gray-800">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${bgImage})` }} />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors"></div>
              <div className="relative z-10 text-center p-3 md:p-4">
                <h3 className="text-sm md:text-lg font-bold text-white tracking-wide">{cat}</h3>
                <p className="text-[9px] md:text-xs text-orange-300 mt-1 font-medium">{count} Products</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

function ProductListView() {
  const { products, activeCategory, setActiveCategory, searchQuery } = useContext(StoreContext);
  const safeProducts = Array.isArray(products) ? products :[];
  
  const filtered = safeProducts.filter(p => {
    const matchCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-xl md:rounded-2xl border shadow-sm">
        <h2 className="text-base md:text-xl font-bold text-gray-800 line-clamp-1 text-center sm:text-left">
          {searchQuery ? `Search: "${searchQuery}"` : `${activeCategory} Products`}
        </h2>
        <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="w-full sm:w-auto border border-gray-200 text-gray-700 font-medium rounded-lg p-2 focus:ring-orange-500 bg-gray-50 outline-none text-xs md:text-sm">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 md:py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Box className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-3 text-gray-300"/>
          <p className="text-sm md:text-lg">No products found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function CartView() {
  const { cart, updateCartQty, navigate, orders, myOrderIds } = useContext(StoreContext);
  const[activeTab, setActiveTab] = useState('cart'); 

  const safeCart = Array.isArray(cart) ? cart :[];
  const safeOrders = Array.isArray(orders) ? orders :[];
  const safeMyOrderIds = Array.isArray(myOrderIds) ? myOrderIds :[];

  const subtotal = safeCart.reduce((a,c) => a + (c.price * c.qty), 0);
  const userOrders = safeOrders.filter(o => safeMyOrderIds.includes(String(o.id)));

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="bg-white p-1.5 md:p-2 rounded-xl border shadow-sm flex gap-2">
        <button onClick={() => setActiveTab('cart')} className={`flex-1 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === 'cart' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}>
          <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4"/> Cart ({safeCart.reduce((a,c)=>a+c.qty,0)})
        </button>
        <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === 'orders' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}>
          <FileText className="w-3.5 h-3.5 md:w-4 md:h-4"/> My Orders {userOrders.length > 0 && `(${userOrders.length})`}
        </button>
      </div>

      {activeTab === 'cart' ? (
        safeCart.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center bg-white rounded-2xl border border-dashed">
            <div className="bg-gray-50 p-4 rounded-full mb-3"><ShoppingCart className="w-10 h-10 text-gray-300" /></div>
            <h2 className="text-lg font-bold text-gray-700 mb-1.5">Your cart is empty</h2>
            <button onClick={() => navigate('products', 'All')} className="mt-3 bg-gray-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-orange-500 transition shadow-sm text-xs">Start Shopping</button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {safeCart.map(item => (
                <div key={item.cartItemId} className="flex gap-3 bg-white border rounded-xl p-3 items-center shadow-sm hover:shadow-md transition">
                  <img src={item.image} alt={item.title} className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover bg-gray-50 border border-gray-100" />
                  <div className="flex-grow">
                    <h4 className="font-bold text-gray-800 text-xs md:text-sm line-clamp-1">{item.title}</h4>
                    {item.selectedColor && <p className="text-orange-600 font-bold text-[9px] md:text-[10px] mt-0.5 bg-orange-50 inline-block px-1.5 py-0.5 rounded">Color: {item.selectedColor}</p>}
                    <p className="text-gray-900 font-black mt-1 text-xs md:text-sm">৳ {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 bg-gray-50 border rounded-lg p-1">
                    <button onClick={() => updateCartQty(item.cartItemId, -1)} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white rounded shadow-sm font-bold text-gray-600 hover:text-orange-500 text-sm">-</button>
                    <span className="w-4 text-center font-bold text-gray-800 text-xs">{item.qty}</span>
                    <button onClick={() => updateCartQty(item.cartItemId, 1)} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-white rounded shadow-sm font-bold text-gray-600 hover:text-orange-500 text-sm">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
              <div className="text-center md:text-left">
                <p className="text-gray-500 font-medium text-xs md:text-sm">Subtotal</p>
                <p className="text-2xl md:text-3xl font-black text-gray-900 mt-0.5">৳ {subtotal}</p>
              </div>
              <button onClick={() => navigate('checkout')} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition transform hover:scale-[1.02] text-sm">
                Proceed to Checkout <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </>
        )
      ) : (
        /* MY ORDERS VIEW */
        userOrders.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center bg-white rounded-2xl border border-dashed">
            <div className="bg-gray-50 p-4 rounded-full mb-3"><FileText className="w-10 h-10 text-gray-300" /></div>
            <h2 className="text-lg font-bold text-gray-700 mb-1.5">No orders yet</h2>
            <p className="text-xs text-gray-500">Orders you placed recently will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map(order => (
              <div key={order.id} className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-black text-gray-900 text-sm md:text-base">Order #{order.id}</h4>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{order.date}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                    order.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    order.status === 'Confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    order.status === 'Shipped' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {(() => {
                    try {
                      const itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                      return itemsList.map((i, idx) => (
                        <div key={idx} className="flex justify-between py-1">
                          <span>{i.qty}x {i.title} {i.selectedColor && `(${i.selectedColor})`}</span>
                          <span className="font-bold text-gray-800">৳{i.price * i.qty}</span>
                        </div>
                      ));
                    } catch(e) {
                      return <span className="text-red-400">Loading items...</span>;
                    }
                  })()}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-medium text-gray-500">Total</span>
                  <span className="font-black text-orange-600 text-base">৳{order.total}</span>
                </div>
                
                {order.trackingLink && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-800 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Track Parcel</span>
                    <a href={order.trackingLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1 rounded-md transition shadow-sm">
                      View Tracking
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function CheckoutView() {
  const { cart, settings, navigate, setCart, orders, setOrders, showToast, myOrderIds, setMyOrderIds } = useContext(StoreContext);
  const[district, setDistrict] = useState("");
  const[thana, setThana] = useState("");
  const[paymentMethod, setPaymentMethod] = useState("COD");
  const[txId, setTxId] = useState("");
  const[senderNum, setSenderNum] = useState("");
  const[isSuccess, setIsSuccess] = useState(false);
  const[orderId, setOrderId] = useState("");

  const safeCart = Array.isArray(cart) ? cart :[];
  const subtotal = safeCart.reduce((a,c) => a + (c.price * c.qty), 0);
  const isInsideDhaka = district.trim().toLowerCase() === "dhaka";
  const shippingCost = district ? (isInsideDhaka ? 70 : 120) : 0;
  const total = subtotal + shippingCost;

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      
      // RELAXED PHONE VALIDATION: Clean up spaces, dashes, +88 etc to prevent silent fails
      let phone = formData.get('phone') || '';
      phone = phone.replace(/[^0-9]/g, ''); // Extract only numbers
      
      if (phone.length !== 11) {
        showToast("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন", "error"); 
        return;
      }
      if (!district.trim() || !thana.trim()) {
        showToast("অনুগ্রহ করে জেলা এবং থানার নাম দিন", "error"); 
        return;
      }
      if (paymentMethod !== "COD" && (!txId.trim() || !senderNum.trim())) {
        showToast("TrxID এবং Sender Number দেওয়া বাধ্যতামূলক", "error"); 
        return;
      }
      
      const newId = Math.floor(Math.random() * 1000000).toString();
      const newOrder = {
        action: "createOrder",
        id: newId,
        date: new Date().toLocaleString(),
        name: formData.get('name'),
        phone: phone, // Save the cleaned phone number
        address: formData.get('address'),
        district, thana,
        items: JSON.stringify(safeCart),
        subtotal, shippingCost, total,
        paymentMethod, txId, senderNum,
        status: 'Pending',
        trackingLink: ''
      };

      // Ensure state variables are valid arrays before spreading
      const currentMyOrderIds = Array.isArray(myOrderIds) ? myOrderIds :[];
      const currentOrders = Array.isArray(orders) ? orders : [];

      setMyOrderIds([newId, ...currentMyOrderIds]);
      setOrderId(newId);
      setOrders([newOrder, ...currentOrders]);
      
      setIsSuccess(true);
      setCart([]);
      window.scrollTo(0,0);

      if(GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE") {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(newOrder)
        }).catch(err => console.error("Error submitting order:", err));
      }
    } catch(err) {
      console.error("Submit Error:", err);
      showToast("কোথাও একটি সমস্যা হয়েছে, আবার চেষ্টা করুন", "error");
    }
  };

  if (isSuccess) return (
    <div className="text-center py-16 flex flex-col items-center bg-white rounded-2xl border shadow-sm max-w-xl mx-auto animate-in zoom-in duration-500 px-4">
      <div className="bg-green-100 p-4 rounded-full mb-4"><CheckCircle className="w-16 h-16 text-green-500" /></div>
      <h2 className="text-2xl font-black text-gray-800 mb-2">Order Confirmed!</h2>
      <p className="text-gray-600 mb-2 text-sm">Your Order ID is <strong className="text-gray-900 bg-gray-100 px-2 py-1 rounded">#{orderId}</strong></p>
      <p className="text-gray-500 mb-6 max-w-sm text-xs md:text-sm">Thank you for choosing {settings.storeName}. Track your order status in the "My Orders" tab inside your Cart.</p>
      <div className="flex gap-2 w-full max-w-xs justify-center">
        <button onClick={() => { setIsSuccess(false); navigate('home'); }} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-xs">Go Home</button>
        <button onClick={() => { setIsSuccess(false); navigate('cart'); }} className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-orange-500 transition shadow-md text-xs">My Orders</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
      <div className="lg:col-span-2 space-y-4 md:space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b pb-3"><MapPin className="text-orange-500 w-5 h-5"/> Shipping Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label><input name="name" required type="text" className="w-full rounded-lg p-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm" placeholder="আপনার নাম" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone Number (11 Digits)</label><input name="phone" required type="tel" className="w-full rounded-lg p-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm" placeholder="01XXXXXXXXX" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Full Address (House, Road, Area)</label><textarea name="address" required className="w-full rounded-lg p-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm" rows="2" placeholder="বিস্তারিত ঠিকানা লিখুন..."></textarea></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">District (জেলা)</label><input required type="text" value={district} onChange={(e)=>setDistrict(e.target.value)} className="w-full rounded-lg p-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm" placeholder="e.g. Dhaka" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Thana / Upazila (থানা)</label><input required type="text" value={thana} onChange={(e)=>setThana(e.target.value)} className="w-full rounded-lg p-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition text-sm" placeholder="e.g. Mirpur" /></div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b pb-3">💳 Payment Options</h3>
          <div className="space-y-2.5">
            {["COD", "bKash", "Nagad"].map(method => (
              <label key={method} className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === method ? 'border-orange-500 bg-orange-50 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`}>
                <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={()=>setPaymentMethod(method)} className="w-4 h-4 text-orange-500 focus:ring-orange-500" />
                <span className="ml-3 font-bold text-gray-800 text-sm">{method === "COD" ? "Cash on Delivery" : `Manual ${method}`}</span>
              </label>
            ))}
          </div>

          {(paymentMethod === "bKash" || paymentMethod === "Nagad") && (
            <div className="mt-4 p-4 bg-gray-900 rounded-xl space-y-3 text-white animate-in slide-in-from-top-2">
              <p className="text-xs text-gray-300">Send <strong className="text-sm text-white">৳{total}</strong> to our {paymentMethod} Personal number:<br/>
                <span className="text-xl font-black text-orange-400 tracking-wider mt-1 block">{paymentMethod === "bKash" ? settings.bkash : settings.nagad}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1">Sender Number</label><input type="text" value={senderNum} onChange={e=>setSenderNum(e.target.value)} required placeholder="Your number" className="w-full rounded-lg p-2 border-none bg-gray-800 text-white focus:ring-2 focus:ring-orange-500 outline-none placeholder-gray-500 text-xs" /></div>
                <div><label className="block text-[10px] font-medium text-gray-400 mb-1">Transaction ID</label><input type="text" value={txId} onChange={e=>setTxId(e.target.value)} required placeholder="e.g. 8G5X7Y2Z" className="w-full rounded-lg p-2 border-none bg-gray-800 text-white focus:ring-2 focus:ring-orange-500 outline-none uppercase placeholder-gray-500 text-xs" /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm h-fit sticky top-20">
        <h3 className="text-lg font-bold mb-4 border-b pb-3">Order Summary</h3>
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
          {safeCart.map(item => (
            <div key={item.cartItemId} className="flex justify-between text-xs md:text-sm">
              <span className="text-gray-600 pr-3 font-medium">
                {item.qty}x <span className="line-clamp-1 inline">{item.title}</span> 
                {item.selectedColor && <span className="text-orange-500 font-bold ml-1">({item.selectedColor})</span>}
              </span>
              <span className="font-bold text-gray-800 shrink-0">৳{item.price * item.qty}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-xs md:text-sm border-t border-dashed border-gray-200 pt-4">
          <div className="flex justify-between text-gray-500 font-medium"><span>Subtotal</span><span className="text-gray-800">৳{subtotal}</span></div>
          <div className="flex justify-between text-gray-500 font-medium">
            <span>Shipping {district ? (isInsideDhaka ? "(Inside Dhaka)" : "(Outside Dhaka)") : ""}</span>
            <span className="text-gray-800">৳{shippingCost}</span>
          </div>
          <div className="flex justify-between font-black text-lg text-gray-900 border-t border-gray-100 pt-3 mt-3"><span>Total</span><span className="text-orange-600">৳{total}</span></div>
        </div>
        
        <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold mt-5 shadow-lg transition transform active:scale-95 text-sm md:text-base">Place Order</button>

        <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-xs font-medium space-y-1.5 leading-relaxed">
          <p className="flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/> ঢাকার ভিতরে হলে ২দিন, ঢাকার বাহিরে হলে ৩দিন সময় লাগবে।</p>
          <p className="flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/> পণ্য ভালো করে দেখে ডেলিভারি ম্যান এর কাছ থেকে বুঝে নিবেন।</p>
          <p className="flex items-start gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/> নিতে না চাইলে শুধু ডেলিভারির টাকা দিয়ে ডেলিভারি ম্যান থাকা অবস্থায় পণ্য ফিরত দিবেন।</p>
        </div>
      </div>
    </form>
  );
}

function PolicyView() {
  const { settings, policyType } = useContext(StoreContext);
  const titles = { 
    terms: "Terms & Conditions", 
    privacy: "Privacy Policy", 
    refund: "Refund Policy",
    shipping: "Shipping & Delivery",
    disclaimer: "Disclaimer"
  };
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-2xl border shadow-sm">
      <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 pb-3 border-b">{titles[policyType]}</h1>
      <p className="whitespace-pre-wrap text-gray-600 leading-relaxed text-sm md:text-base">{settings[policyType]}</p>
    </div>
  );
}