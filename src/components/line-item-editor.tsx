"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export type Division = "HOME_THEATER" | "ACOUSTICS";

export interface LineItem {
  key: string;
  name: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  gstRate: number;
  itemId: string | null;
  notes: string;
  division: Division;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hsnCode: string | null;
  gstRate: number;
  unitPrice: number;
  unit?: string;
  brand?: string | null;
  division?: string;
  category: { name: string };
  subCategory?: { name: string } | null;
}

let keyCounter = 0;
export function nextLineItemKey() {
  return `li-${++keyCounter}`;
}

export function emptyLineItem(division: Division = "HOME_THEATER"): LineItem {
  return { key: nextLineItemKey(), name: "", description: "", hsnCode: "", quantity: 1, unit: "No", unitPrice: 0, discount: 0, gstRate: 18, itemId: null, notes: "", division };
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface LineItemEditorProps {
  lineItems: LineItem[];
  setLineItems: (items: LineItem[]) => void;
  allItems: CatalogItem[];
}

export function LineItemEditor({ lineItems, setLineItems, allItems }: LineItemEditorProps) {
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);
  const [itemSearchValues, setItemSearchValues] = useState<Record<number, string>>({});
  const [newItemDivision, setNewItemDivision] = useState<Division>("HOME_THEATER");

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem(newItemDivision)]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const moveLineItem = (idx: number, direction: "up" | "down") => {
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= lineItems.length) return;
    const updated = [...lineItems];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setLineItems(updated);
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number | null) => {
    const updated = [...lineItems];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  const selectItemForLine = (idx: number, item: CatalogItem) => {
    const updated = [...lineItems];
    updated[idx] = {
      ...updated[idx],
      name: item.name,
      description: item.description || "",
      hsnCode: item.hsnCode || "",
      unitPrice: item.unitPrice,
      gstRate: item.gstRate,
      unit: item.unit || "No",
      itemId: item.id,
      division: newItemDivision,
    };
    setLineItems(updated);
    setActiveAutocomplete(null);
    setItemSearchValues({});
  };

  const getFilteredItems = (searchVal: string, division: Division) => {
    if (searchVal.length < 1) return [];
    const lower = searchVal.toLowerCase();
    return allItems.filter(
      (item) => (item.division || "HOME_THEATER") === division &&
        (item.name.toLowerCase().includes(lower) || item.code.toLowerCase().includes(lower))
    ).slice(0, 8);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold">Line Items</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="newItemDivision"
                checked={newItemDivision === "HOME_THEATER"}
                onChange={() => setNewItemDivision("HOME_THEATER")}
                className="accent-primary"
              />
              <span className="text-sm font-medium">Home Theater</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="newItemDivision"
                checked={newItemDivision === "ACOUSTICS"}
                onChange={() => setNewItemDivision("ACOUSTICS")}
                className="accent-primary"
              />
              <span className="text-sm font-medium">Acoustics</span>
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_60px_100px_55px_80px_55px_100px_36px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Item Name</span>
        <span>Qty</span>
        <span>Unit Price</span>
        <span>Disc %</span>
        <span>Disc Amt</span>
        <span>GST %</span>
        <span>Total</span>
        <span></span>
        <span></span>
      </div>
      {lineItems.map((li, idx) => (
        <div key={li.key} className="space-y-1">
          <div className="grid grid-cols-[1fr_60px_100px_55px_80px_55px_100px_36px_40px] gap-2 items-start">
            <div className="relative">
              <Input
                placeholder="Type to search items..."
                value={activeAutocomplete === idx ? (itemSearchValues[idx] ?? li.name) : li.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemSearchValues({ ...itemSearchValues, [idx]: val });
                  setActiveAutocomplete(idx);
                  updateLineItem(idx, "name", val);
                  updateLineItem(idx, "itemId", null);
                  updateLineItem(idx, "description", "");
                  updateLineItem(idx, "hsnCode", "");
                }}
                onFocus={() => setActiveAutocomplete(idx)}
                onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
              />
              {activeAutocomplete === idx && getFilteredItems(itemSearchValues[idx] ?? li.name, newItemDivision).length > 0 && (
                <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-xl max-h-60 overflow-y-auto">
                  {getFilteredItems(itemSearchValues[idx] ?? li.name, newItemDivision).map((item) => (
                    <button
                      key={item.id}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent border-b border-border/30 last:border-0"
                      onMouseDown={(e) => { e.preventDefault(); selectItemForLine(idx, item); }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-1.5">({item.code})</span>
                        </div>
                        <span className="text-primary font-medium ml-2 shrink-0">{formatINR(item.unitPrice)}</span>
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                        {item.brand && <span>{item.brand}</span>}
                        <span>{item.category.name}</span>
                        {item.subCategory && <span>{item.subCategory.name}</span>}
                        <span>GST: {item.gstRate}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              type="number"
              min={1}
              value={li.quantity || ""}
              onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
              className="text-center"
            />
            <Input
              type="number"
              value={li.unitPrice || ""}
              onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={li.discount || ""}
              onChange={(e) => updateLineItem(idx, "discount", parseFloat(e.target.value) || 0)}
              className="text-center"
            />
            <div className="h-9 flex items-center px-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
              {(li.discount || 0) > 0 ? formatINR(li.quantity * li.unitPrice * (li.discount || 0) / 100) : "—"}
            </div>
            <Input
              type="number"
              value={li.gstRate || ""}
              onChange={(e) => updateLineItem(idx, "gstRate", parseFloat(e.target.value) || 0)}
              className="text-center"
            />
            <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md text-sm font-medium">
              {formatINR(li.quantity * li.unitPrice * (1 - (li.discount || 0) / 100))}
            </div>
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-[18px] w-9 hover:text-primary"
                onClick={() => moveLineItem(idx, "up")}
                disabled={idx === 0}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-[18px] w-9 hover:text-primary"
                onClick={() => moveLineItem(idx, "down")}
                disabled={idx === lineItems.length - 1}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:text-destructive"
              onClick={() => removeLineItem(idx)}
              disabled={lineItems.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {li.hsnCode && (
            <p className="text-[10px] text-muted-foreground pl-1">HSN: {li.hsnCode}</p>
          )}
        </div>
      ))}
    </div>
  );
}
