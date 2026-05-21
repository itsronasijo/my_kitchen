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
  const [unit, setUnit] = useState("kg");
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");

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
    setUnit("kg");
    setEditingId(null);
  };

  const categories = {
    "Dairy 🥛": ["milk", "curd", "cheese", "butter", "paneer"],
    "Staples 🌾": ["rice", "flour", "sugar", "salt", "oil", "atta"],
    "Vegetables 🥦": ["tomato", "onion", "potato", "carrot"],
    "Fruits 🍎": ["apple", "banana", "orange", "mango"],
    "Bakery 🧁": ["cake", "biscuit", "bread", "bun", "cookies"],
    "Egg & Meat 🍳": [
      "egg",
      "eggs",
      "chicken",
      "fish",
      "mutton",
      "beef",
      "prawns",
      "meat",
      "sausage"
    ],
    "Snacks 🍪": ["chips", "nachos", "popcorn"],
    "Beverages ☕": ["tea", "coffee", "juice"]
  };

  const getCategory = (itemName) => {
    const n = itemName.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => n.includes(keyword))) {
        return category;
      }
    }

    return "Other 🍽️";
  };

  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        category: getCategory(it.name)
      }))
    );
  }, []);

  const unitOptions = ["kg", "g", "L", "ml", "packet", "pcs", "dozen"];

  const normalizeText = (text) =>
    text.toLowerCase().replace(/\s+/g, "").trim();

  const isFuzzyMatch = (itemName, searchText) => {
    const item = normalizeText(itemName);
    const searchValue = normalizeText(searchText);

    if (item.includes(searchValue)) return true;

    let matches = 0;

    for (let i = 0; i < searchValue.length; i++) {
      if (item.includes(searchValue[i])) {
        matches++;
      }
    }

    return matches >= Math.max(2, searchValue.length - 1);
  };

  const addOrUpdateItem = () => {
    if (!name.trim()) return;

    const qty = Number(quantity) || 1;

    setItems((prev) => {
      if (editingId) {
        return prev.map((it) =>
          it.id === editingId
            ? { ...it, name, quantity: qty, unit, category: getCategory(name) }
            : it
        );
      }

      const existing = prev.find(
        (it) => it.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        return prev.map((it) =>
          it.id === existing.id
            ? { ...it, quantity: it.quantity + qty, unit }
            : it
        );
      }

      return [
        ...prev,
        {
          id: Date.now(),
          name,
          quantity: qty,
          unit,
          purchased: false,
          category: getCategory(name)
        }
      ];
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

  const togglePurchased = (id) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, purchased: !it.purchased } : it
      )
    );
  };

  const clearAll = () => setItems([]);

  const filteredItems = (() => {
    const q = search.trim();

    if (q === "") return items;

    const norm = normalizeText(q);

    const exact = items.filter(
      (item) => normalizeText(item.name) === norm
    );

    if (exact.length > 0) return exact;

    const related = items.filter((item) => {
      const name = normalizeText(item.name);

      return (
        name.includes(norm) ||
        name.startsWith(norm) ||
        (() => {
          let score = 0;
          for (let i = 0; i < norm.length; i++) {
            if (name.includes(norm[i])) score++;
          }
          return score >= Math.max(2, Math.floor(norm.length / 2));
        })()
      );
    });

    return related;
  })().sort((a, b) => a.purchased - b.purchased);

  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b p-3">
        <h1 className="text-2xl font-extrabold text-green-700">KartMate 🛒</h1>
        <p className="text-xs text-gray-500">Never forget groceries again</p>
      </div>

      <div className="p-3 max-w-4xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-3xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Smart Grocery Reminder</h2>
          <p className="text-sm opacity-90 leading-relaxed">
            Add items whenever you remember them and access your shopping list anytime.
          </p>
        </div>

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

            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="e.g. Milk, Rice, Tomato"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSearch("");
                  setSearchMessage("");
                  setShowCart(false);
                }}
              />

              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20"
              />

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              <Button onClick={addOrUpdateItem}>➕</Button>
            </div>

            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const query = search.trim();

                  if (!query) {
                    setShowCart(true);
                    setSearchMessage("");
                    return;
                  }

                  const hasMatch = items.some((item) => {
                    const name = item.name.toLowerCase();
                    const q = query.toLowerCase();

                    return (
                      name === q ||
                      name.includes(q) ||
                      isFuzzyMatch(item.name, query)
                    );
                  });

                  if (!hasMatch) {
                    setSearchMessage(`No item found for "${query}" 🔍`);
                    setShowCart(false);
                  } else {
                    setSearchMessage("");
                    setShowCart(true);
                  }
                }
              }}
              className="mt-3"
            />

            {searchMessage && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
                {searchMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <div
          className="flex items-center justify-between mb-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 cursor-pointer hover:bg-green-100 transition"
          onClick={() => {
            setShowCart(!showCart);
            setSearch("");
            setSearchMessage("");
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-green-700">🛒 Shopping List</h2>
            <p className="text-xs text-gray-500">
              Tap here to {showCart ? "hide" : "view"} your shopping items
            </p>
          </div>

          <span className="bg-green-600 text-white text-sm rounded-full px-3 py-1 font-semibold">
            {items.length}
          </span>
        </div>

        {showCart && (
          <div className="space-y-3">
            <div className="flex justify-end">
              {items.length > 0 && (
                <Button size="sm" variant="destructive" onClick={clearAll}>Clear</Button>
              )}
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-500">Cart is empty 🛒</p>
            )}

            {Object.keys(grouped).map((cat) => (
              <Card key={cat}>
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm mb-2">{cat}</h3>
                  <div className="space-y-3">
                    {grouped[cat].map((item) => (
                      <div key={item.id} className="rounded-2xl border p-4 shadow-sm">
                        <div className="flex justify-between">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} {item.unit}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => editItem(item)}>✏️</Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>🗑️</Button>
                          </div>
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
  );
}
