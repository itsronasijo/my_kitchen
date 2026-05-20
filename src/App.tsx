import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function KitchenTracker() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("kitchen-cart");
    if (saved) setItems(JSON.parse(saved));
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
      "Pulses 🫘": ["dal", "lentil", "gram", "green gram", "black gram", "chana", "rajma", "moong", "toor", "urad"],
      "Vegetables 🥦": ["tomato", "onion", "potato", "spinach", "palak", "cabbage", "carrot", "beans", "capsicum", "broccoli", "cauliflower"],
      "Fruits 🍎": ["apple", "banana", "mango", "orange", "grapes", "watermelon", "papaya", "pineapple", "kiwi"],
      "Snacks 🍪": ["chips", "biscuit", "cookies", "namkeen", "chocolate", "snack"],
      "Beverages ☕": ["tea", "coffee", "juice", "cola"]
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (
          n.includes(keyword) ||
          words.some((word) => {
            const cleanWord = word.replace(/[^a-z]/g, "");
            return (
              cleanWord.includes(keyword) ||
              keyword.includes(cleanWord) ||
              cleanWord.startsWith(keyword.slice(0, 3))
            );
          })
        ) {
          return category;
        }
      }
    }

    return "Other 🍽️";
  };

  const inferUnit = (qty, name) => {
    const n = name.toLowerCase();
    const isLiquid = /(milk|oil|water|juice|curd|tea|coffee)/.test(n);

    if (qty < 50) return isLiquid ? "l" : "kg";
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
            ? {
                ...it,
                name,
                quantity: qty,
                unit: inferUnit(qty, name),
                category: getCategory(name)
              }
            : it
        );
      }

      const existing = prev.find(
        (it) => it.name.toLowerCase().trim() === normalized
      );

      if (existing) {
        return prev.map((it) => {
          if (it.id !== existing.id) return it;

          const newQty = it.quantity + qty;

          return {
            ...it,
            quantity: newQty,
            unit: inferUnit(newQty, it.name)
          };
        });
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
    setQuantity(item.quantity);
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
      prev.map((it) =>
        it.id === id ? { ...it, purchased: !it.purchased } : it
      )
    );
  };

  const clearAll = () => {
    setItems([]);
  };

  const filteredItems = [...items]
    .filter((item) =>
      search.trim() === ""
        ? true
        : item.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.purchased - b.purchased);

  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background border-b p-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Kitchen 👨‍🍳</h1>

        <Button
          variant="outline"
          onClick={() => setShowCart(!showCart)}
          className="relative"
        >
          🛒
          {totalCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full px-1">
              {totalCount}
            </span>
          )}
        </Button>
      </div>

      <div className="p-3 max-w-4xl mx-auto space-y-4">
        {lastDeleted && (
          <div className="flex items-center justify-between bg-muted border rounded-lg px-3 py-2">
            <span className="text-sm">Item deleted</span>
            <Button size="sm" variant="outline" onClick={undoDelete}>
              Undo
            </Button>
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
                className="flex-1"
              />

              <Input
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-16"
              />

              <Button
                onClick={addOrUpdateItem}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {editingId ? "✏️" : "➕"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Duplicate items auto-merge • Smart units • Category detection
            </p>

            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3"
            />
          </CardContent>
        </Card>

        <div>
          <button
            onClick={() => setShowCart((prev) => !prev)}
            className="flex items-center gap-2 mb-3"
          >
            <h2 className="text-lg font-semibold cursor-pointer">
              🛒 Shopping List
            </h2>
          </button>

          {showCart && (
            <div className="space-y-3">
              <div className="flex justify-end">
                {items.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={clearAll}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Cart is empty 🛒
                </p>
              )}

              {Object.keys(grouped).map((cat) => (
                <Card key={cat}>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm mb-2">{cat}</h3>

                    <div className="space-y-2">
                      {grouped[cat].map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center border rounded p-2"
                        >
                          <span
                            className={`text-sm ${
                              item.purchased
                                ? "line-through opacity-60"
                                : ""
                            }`}
                          >
                            {item.name} ({item.quantity})
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => editItem(item)}
                            >
                              ✏️
                            </Button>

                            <Button
                              size="sm"
                              className="h-8 px-2 bg-green-600 text-white hover:bg-green-700"
                              onClick={() => togglePurchased(item.id)}
                            >
                              ✔
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => deleteItem(item.id)}
                            >
                              🗑️
                            </Button>
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
