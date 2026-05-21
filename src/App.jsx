
import React, { useEffect, useState } from "react";

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border rounded-xl shadow-sm ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const Button = ({ children, className = "", variant, size = "md", ...props }) => {
  const variants = {
    outline: "border bg-white hover:bg-gray-100",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    ghost: "hover:bg-gray-100"
  };

  const sizes = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-2"
  };

  return (
    <button
      className={`rounded-lg transition ${variants[variant] || "bg-black text-white hover:opacity-90"} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={`border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 ${className}`}
    {...props}
  />
);

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [editingId, setEditingId] = useState(null);

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

  const resetForm = () => {
    setName("");
    setQuantity(1);
    setEditingId(null);
  };

  const getCategory = (itemName) => {
    const n = itemName.toLowerCase().trim();
    const words = n.split(/\s+/);

    const categories = {
      "Dairy 🥛": ["milk", "curd", "cheese", "butter", "yogurt", "paneer", "cream", "ghee"],
      "Staples 🌾": ["rice", "wheat", "flour", "sugar", "salt", "oil", "atta", "maida", "poha", "oats", "rava", "bread"],
      "Pulses 🫘": ["dal", "lentil", "gram", "chana", "rajma", "moong", "toor", "urad"],
      "Vegetables 🥦": ["tomato", "onion", "potato", "spinach", "cabbage", "carrot", "beans", "capsicum", "broccoli", "cauliflower"],
      "Fruits 🍎": ["apple", "banana", "mango", "orange", "grapes", "watermelon", "papaya", "pineapple", "kiwi"],
      "Snacks 🍪": ["chips", "biscuit", "cookies", "chocolate", "snack"],
      "Beverages ☕": ["tea", "coffee", "juice", "cola"]
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (n.includes(keyword) || words.some((word) => word.includes(keyword))) {
          return category;
        }
      }
    }

    return "Other 🍽️";
  };

  const inferUnit = (qty, name) => {
    const n = name.toLowerCase();
    const isLiquid = /(milk|oil|water|juice|curd|tea|coffee)/.test(n);

    const q = Number(qty) || 1;

    if (q < 50) return isLiquid ? "L" : "kg";
    return isLiquid ? "ml" : "g";
  };

  const addOrUpdateItem = () => {
    if (!name.trim()) return;

    const qty = Number(quantity) || 1;
    const normalized = name.toLowerCase().trim();

    setItems((prev) => {
      if (editingId) {
        return prev.map((it) =>
          it.id === editingId
            ? { ...it, name, quantity: qty, unit: inferUnit(qty, name), category: getCategory(name) }
            : it
        );
      }

      const existing = prev.find(
        (it) => it.name.toLowerCase().trim() === normalized
      );

      if (existing) {
        return prev.map((it) =>
          it.id === existing.id
            ? { ...it, quantity: it.quantity + qty, unit: inferUnit(it.quantity + qty, it.name) }
            : it
        );
      }

      const newItem = {
        id: Date.now(),
        name,
        category: getCategory(name),
        quantity: qty,
        unit: inferUnit(qty, name),
        purchased: false
      };

      return [...prev, newItem];
    });

    resetForm();
  };

  const editItem = (item) => {
    setName(item.name);
    setQuantity(Number(item.quantity));
    setEditingId(item.id);
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

  const togglePurchased = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, purchased: !it.purchased } : it))
    );
  };

  const clearAll = () => setItems([]);

  const filteredItems = items
    .filter((item) => (search.trim() === "" ? true : item.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => a.purchased - b.purchased);

  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Kitchen 👨‍🍳</h1>

        <Button variant="outline" onClick={() => setShowCart(!showCart)} className="relative">
          🛒
          {totalCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full px-1">
              {totalCount}
            </span>
          )}
        </Button>
      </div>

      <div className="p-3 max-w-4xl mx-auto space-y-4">
        {lastDeleted && (
          <div className="flex items-center justify-between bg-gray-100 border rounded-lg px-3 py-2">
            <span className="text-sm">Item deleted</span>
            <Button size="sm" variant="outline" onClick={undoDelete}>Undo</Button>
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3">
              {editingId ? "Edit Item" : "Add Item"}
            </h2>

            <div className="flex gap-2 items-center">
              <Input
                placeholder="e.g. Milk, Rice, Tomato"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-16"
              />

              <Button onClick={addOrUpdateItem} className="bg-green-600 text-white hover:bg-green-700">
                {editingId ? "✏️" : "➕"}
              </Button>
            </div>

            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3"
            />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">🛒 Shopping List</h2>

          {showCart && (
            <div className="space-y-3">
              <div className="flex justify-end">
                {items.length > 0 && (
                  <Button size="sm" variant="destructive" onClick={clearAll}>Clear</Button>
                )}
              </div>

              {items.length === 0 && <p className="text-sm text-gray-500">Cart is empty 🛒</p>}

              {Object.keys(grouped).map((cat) => (
                <Card key={cat}>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm mb-2">{cat}</h3>

                    <div className="space-y-2">
                      {grouped[cat].map((item) => (
                        <div key={item.id} className="flex justify-between items-center border rounded p-2">
                          <span className={`text-sm ${item.purchased ? "line-through opacity-60" : ""}`}>
                            {item.name} ({item.quantity})
                          </span>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => editItem(item)}>✏️</Button>
                            <Button size="sm" onClick={() => togglePurchased(item.id)}>✔</Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>🗑️</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
