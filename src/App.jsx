import React, { useEffect, useState } from "react";

/* -------------------- PWA NOTE --------------------
  You ALSO need these files in /public for full PWA:
  1. manifest.json
  2. sw.js (service worker)
--------------------------------------------------- */

const Card = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur border border-white/40 rounded-2xl shadow-lg ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const Button = ({ children, className = "", variant, size = "md", ...props }) => {
  const variants = {
    outline: "border border-green-200 bg-white hover:bg-green-50 text-green-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    ghost: "hover:bg-gray-100 text-gray-600"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-3"
  };

  return (
    <button
      className={`rounded-xl transition-all active:scale-95 shadow-sm ${variants[variant] || "bg-green-600 text-white hover:bg-green-700"} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={`border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 bg-white/90 ${className}`}
    {...props}
  />
);

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kitchen-cart");
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load storage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kitchen-cart", JSON.stringify(items));
  }, [items]);

  /* ---------------- PWA SERVICE WORKER ---------------- */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(console.error);
      });
    }
  }, []);

  /* -------- INSTALL PROMPT HANDLER -------- */
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const resetForm = () => {
    setName("");
    setQuantity(1);
    setUnit("kg");
    setEditingId(null);
  };

  const categories = {
    "Dairy 🥛": ["milk", "curd", "cheese", "butter", "paneer"],
    "Staples 🌾": ["rice", "flour", "sugar", "salt", "oil", "atta"],
    "Vegetables 🥦": ["tomato", "onion", "potato", "carrot", "broccoli", "spinach", "cabbage", "cauliflower", "beans", "peas", "capsicum", "cucumber", "garlic", "ginger"],
    "Fruits 🍎": ["apple", "banana", "orange", "mango"],
    "Bakery 🧁": ["cake", "biscuit", "bread", "bun", "cookies"],
    "Egg & Meat 🍳": ["egg","eggs","chicken","fish","mutton","beef","prawns","meat","sausage"],
    "Snacks 🍪": ["chips", "nachos", "popcorn"],
    "Beverages ☕": ["tea", "coffee", "juice"],
    "Stationery ✏️": ["pen", "pencil", "eraser", "notebook", "book", "marker", "highlighter", "paper", "scale", "stapler"]
  };

  const getCategory = (itemName) => {
    const n = normalizeText(itemName);

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        const k = normalizeText(keyword);

        if (n === k) return category;
        if (n.includes(k) || k.includes(n)) return category;
      }
    }

    return "Other 🍽️";
  };

  useEffect(() => {
    setItems((prev) => prev.map((it) => ({ ...it, category: getCategory(it.name) })));
  }, []);

  const unitOptions = ["kg", "g", "L", "ml", "packet", "pcs", "dozen"];

  const normalizeText = (text) => text.toLowerCase().replace(/\s+/g, "").trim();

  const isFuzzyMatch = (itemName, searchText) => {
    const item = normalizeText(itemName);
    const searchValue = normalizeText(searchText);
    if (item.includes(searchValue)) return true;
    let matches = 0;
    for (let i = 0; i < searchValue.length; i++) {
      if (item.includes(searchValue[i])) matches++;
    }
    return matches >= Math.max(2, searchValue.length - 1);
  };

  const addOrUpdateItem = () => {
    if (!name.trim()) return;
    const qty = Number(quantity) || 1;

    setItems((prev) => {
      if (editingId) {
        return prev.map((it) => it.id === editingId ? { ...it, name, quantity: qty, unit, category: getCategory(name) } : it);
      }

      const existing = prev.find((it) => normalizeText(it.name) === normalizeText(name));
      if (existing) {
        return prev.map((it) => it.id === existing.id ? { ...it, quantity: it.quantity + qty, unit } : it);
      }

      return [...prev, { id: Date.now(), name, quantity: qty, unit, purchased: false, category: getCategory(name) }];
    });

    resetForm();
    setSearch("");
    setShowCart(false);
  };

  const deleteItem = (id) => {
    const deleted = items.find((it) => it.id === id);
    setLastDeleted(deleted);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const undoDelete = () => {
    if (!lastDeleted) return;
    setItems((prev) => [...prev, lastDeleted]);
    setLastDeleted(null);
  };

  const editItem = (item) => {
    setName(item.name);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setEditingId(item.id);
  };

  const clearAll = () => setItems([]);

  const filteredItems = (() => {
    const q = search.trim();
    if (!q) return items;

    const norm = normalizeText(q);
    const exact = items.filter((item) => normalizeText(item.name) === norm);
    if (exact.length > 0) return exact;

    return items.filter((item) => {
      const name = normalizeText(item.name);
      return name.includes(norm) || name.startsWith(norm);
    });
  })().sort((a,b)=>a.purchased-b.purchased);

  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 text-gray-900">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-extrabold">🛒 QuickCart</h1>
        <p className="text-xs opacity-90">Your smart grocery companion</p>

        {deferredPrompt && (
          <div className="mt-2">
            <Button size="sm" onClick={installApp}>📱 Install App</Button>
          </div>
        )}
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* Hero */}
        <div className="rounded-3xl bg-white/70 backdrop-blur p-5 shadow-md border">
          <h2 className="text-xl font-bold text-green-700">Smart Grocery Tracker</h2>
          <p className="text-sm text-gray-600">Now installable as an app 📱</p>
        </div>

        {/* Input */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Item name" value={name} onChange={(e)=>{setName(e.target.value);setSearch("");setSearchMessage("");setShowCart(false);}} />
              <Input type="number" className="w-20" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
              <select className="border rounded-xl px-3 py-2 text-sm" value={unit} onChange={(e)=>setUnit(e.target.value)}>
                {unitOptions.map(u=><option key={u}>{u}</option>)}
              </select>
              <Button onClick={addOrUpdateItem}>Add</Button>
            </div>

            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e)=>{setSearch(e.target.value);setSearchMessage("");}}
              onKeyDown={(e)=>{
                if(e.key==="Enter"){
                  const q=search.trim();
                  if(!q){setShowCart(true);return;}
                  const has=items.some(it=>it.name.toLowerCase().includes(q.toLowerCase()));
                  if(!has){setSearchMessage("No item found 🔍");setShowCart(false);}else{setSearchMessage("");setShowCart(true);}
                }
              }}
            />

            {searchMessage && <p className="text-sm text-yellow-600">{searchMessage}</p>}
          </CardContent>
        </Card>

        {/* Cart Toggle */}
        <div className="flex justify-between items-center bg-white shadow-md rounded-2xl p-4 border cursor-pointer" onClick={()=>setShowCart(!showCart)}>
          <div>
            <h2 className="font-bold text-green-700">Shopping List</h2>
            <p className="text-xs text-gray-500">Tap to view items</p>
          </div>
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">{items.length}</span>
        </div>

        {/* List */}
        {showCart && (
          <div className="space-y-4">
            {Object.keys(grouped).map(cat=> (
              <Card key={cat}>
                <CardContent className="p-4">
                  <h3 className="font-bold text-green-700 mb-2">{cat}</h3>
                  {grouped[cat].map(item=> (
                    <div key={item.id} className="flex justify-between border-b py-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={()=>editItem(item)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={()=>deleteItem(item.id)}>Del</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
