import React, { useState, useEffect } from 'react';
import { 
  Package, Boxes, Plus, Minus, AlertTriangle, CheckCircle2, 
  Search, Download, RefreshCw, Filter, ShieldCheck, Sun, Zap, FileSpreadsheet
} from 'lucide-react';
import { formatCurrency } from '../utils/format.js';

export default function ManagerInventoryTracker({ isTa = false }) {
  const initialItems = [
    {
      id: 'INV-MOD-550',
      name: '550W Mono PERC Half-Cut Solar Panels',
      nameTa: '550W மோனோ பெர்க் சோலார் பேனல்கள்',
      category: 'panels',
      stock: 148,
      minStock: 40,
      unitPrice: 10450,
      unit: isTa ? 'பேனல்கள்' : 'Panels',
      location: 'Rack A-1 (Main Bay)'
    },
    {
      id: 'INV-INV-3KW',
      name: '3kW Single Phase On-Grid String Inverter',
      nameTa: '3kW ஆன்-கிரிட் சோலார் இன்வெர்ட்டர்',
      category: 'inverters',
      stock: 12,
      minStock: 5,
      unitPrice: 28500,
      unit: isTa ? 'எண்ணிக்கை' : 'Units',
      location: 'Sec B-2 (Inverter Bay)'
    },
    {
      id: 'INV-INV-5KW',
      name: '5kW Single Phase On-Grid Inverter',
      nameTa: '5kW ஆன்-கிரிட் இன்வெர்ட்டர்',
      category: 'inverters',
      stock: 7,
      minStock: 4,
      unitPrice: 38900,
      unit: isTa ? 'எண்ணிக்கை' : 'Units',
      location: 'Sec B-2 (Inverter Bay)'
    },
    {
      id: 'INV-INV-10KW',
      name: '10kW Three Phase Commercial Inverter',
      nameTa: '10kW முப்பட்டை வணிக இன்வெர்ட்டர்',
      category: 'inverters',
      stock: 3,
      minStock: 3,
      unitPrice: 68000,
      unit: isTa ? 'எண்ணிக்கை' : 'Units',
      location: 'Sec B-3'
    },
    {
      id: 'INV-ACDC-BOX',
      name: 'ACDB / DCDB Weatherproof Protection Enclosure',
      nameTa: 'ACDB / DCDB பாதுகாப்பு பெட்டிகள்',
      category: 'electricals',
      stock: 28,
      minStock: 10,
      unitPrice: 3200,
      unit: isTa ? 'பெட்டிகள்' : 'Boxes',
      location: 'Shelf C-1'
    },
    {
      id: 'INV-CBL-4MM',
      name: '4 sq.mm UV-Resistant DC Solar Cable (100m Roll)',
      nameTa: '4 மிமீ DC சோலார் கேபிள் (100மீ ரோல்)',
      category: 'electricals',
      stock: 18,
      minStock: 6,
      unitPrice: 4200,
      unit: isTa ? 'ரோல்கள்' : 'Rolls',
      location: 'Drum Bay D'
    },
    {
      id: 'INV-ERTH-KIT',
      name: 'Dual Chemical Copper Earthing Electrode Kit',
      nameTa: 'இரட்டை கெமிக்கல் எர்த்திங் கிட்',
      category: 'electricals',
      stock: 22,
      minStock: 8,
      unitPrice: 2400,
      unit: isTa ? 'கிட்கள்' : 'Kits',
      location: 'Ground Bay E'
    },
    {
      id: 'INV-MMS-ALUM',
      name: 'Anodized Aluminum Module Mounting Structure (MMS)',
      nameTa: 'அலுமினியம் பேனல் மவுண்டிங் கட்டமைப்பு',
      category: 'structures',
      stock: 16,
      minStock: 6,
      unitPrice: 8500,
      unit: isTa ? 'செட்கள்' : 'Sets',
      location: 'Yard MMS-1'
    },
    {
      id: 'INV-NET-MTR',
      name: 'Bi-Directional Net-Generation Smart Meter (TNEB Approved)',
      nameTa: 'TNEB அங்கீகரிக்கப்பட்ட நெட்-மீட்டர்',
      category: 'meters',
      stock: 9,
      minStock: 5,
      unitPrice: 6200,
      unit: isTa ? 'மீட்டர்கள்' : 'Meters',
      location: 'Vault M-1'
    },
    {
      id: 'INV-IOT-DGL',
      name: 'Wi-Fi Smart Cloud Monitoring IoT Dongle',
      nameTa: 'வைஃபை ஸ்மார்ட் IoT டாங்கிள்',
      category: 'meters',
      stock: 15,
      minStock: 5,
      unitPrice: 2100,
      unit: isTa ? 'டாங்கிள்கள்' : 'Dongles',
      location: 'Shelf C-2'
    }
  ];

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mrs_solar_inventory');
      return saved ? JSON.parse(saved) : initialItems;
    } catch {
      return initialItems;
    }
  });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [tempQty, setTempQty] = useState('');

  // Persist whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('mrs_solar_inventory', JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  const updateStock = (id, delta) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = Math.max(0, item.stock + delta);
        return { ...item, stock: next };
      }
      return item;
    }));
  };

  const setStockDirect = (id, newQty) => {
    const parsed = parseInt(newQty, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, stock: parsed } : item));
    }
    setEditingId(null);
  };

  const filteredItems = items.filter(item => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.nameTa?.toLowerCase().includes(search.toLowerCase()) ||
                          item.id.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalValuation = items.reduce((sum, item) => sum + (item.stock * item.unitPrice), 0);
  const lowStockCount = items.filter(item => item.stock <= item.minStock).length;

  const handleExportCSV = () => {
    const headers = 'Item ID,Item Name,Category,Quantity,Unit,Unit Price,Total Value,Location\n';
    const rows = items.map(i => 
      `"${i.id}","${i.name}","${i.category}",${i.stock},"${i.unit}",${i.unitPrice},${i.stock * i.unitPrice},"${i.location}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MRS_Solar_Inventory_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER WITH VALUATION STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTa ? 'மொத்த பொருட்கள்' : 'Total SKU Count'}</span>
            <Boxes className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{items.length}</p>
          <span className="text-[10px] text-teal-600 font-semibold">{isTa ? 'செயலில் உள்ள சரக்கு' : 'Active Items'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTa ? 'குறைந்த இருப்பு எச்சரிக்கை' : 'Low Stock Alerts'}</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>
            {lowStockCount}
          </p>
          <span className="text-[10px] text-slate-400 font-semibold">{isTa ? 'மறுஆர்டர் செய்ய வேண்டும்' : 'Below Min Threshold'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTa ? 'கிடங்கு சோலார் பேனல்கள்' : 'Mono PERC In-Stock'}</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {items.find(i => i.id === 'INV-MOD-550')?.stock || 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">~{Math.round(((items.find(i => i.id === 'INV-MOD-550')?.stock || 0) * 550) / 1000)} kW Capacity</span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 shadow-sm">
          <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">{isTa ? 'மொத்த சரக்கு மதிப்பு' : 'Inventory Valuation'}</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-teal-700 dark:text-teal-300">
            {formatCurrency(totalValuation, false)}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">{isTa ? 'நேரடி மொத்த விலை' : 'Real-Time Total Value'}</span>
        </div>

      </div>

      {/* FILTER & ACTION TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTa ? 'பொருட்கள் அல்லது குறியீட்டைத் தேடுங்கள்...' : 'Search components or SKU...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Category Filter Pills & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'panels', 'inverters', 'electricals', 'meters'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                categoryFilter === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? (isTa ? 'அனைத்தும்' : 'All') : cat}
            </button>
          ))}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isTa ? 'CSV ஏற்றுமதி' : 'Export CSV'}</span>
          </button>
        </div>

      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">{isTa ? 'பொருள் & குறியீடு' : 'Item & SKU'}</th>
                <th className="py-3 px-3">{isTa ? 'வகை' : 'Category'}</th>
                <th className="py-3 px-3">{isTa ? 'கிடங்கு இருப்பிடம்' : 'Warehouse Bin'}</th>
                <th className="py-3 px-3 text-right">{isTa ? 'விலை' : 'Unit Price'}</th>
                <th className="py-3 px-4 text-center">{isTa ? 'இருப்பு அளவு' : 'In Stock'}</th>
                <th className="py-3 px-4 text-right">{isTa ? 'மொத்த மதிப்பு' : 'Total Value'}</th>
                <th className="py-3 px-4 text-center">{isTa ? 'மாற்றங்கள் (+ / -)' : 'Quick Adjust'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const isLow = item.stock <= item.minStock;
                const isCritical = item.stock === 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Item Name & SKU */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                        <span>{isTa ? item.nameTa : item.name}</span>
                        {isLow && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            Low
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                        {item.category}
                      </span>
                    </td>

                    {/* Warehouse Bin */}
                    <td className="py-3.5 px-3 text-slate-500 text-[11px] font-mono">
                      {item.location}
                    </td>

                    {/* Unit Price */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrency(item.unitPrice, false)}
                    </td>

                    {/* In Stock Qty */}
                    <td className="py-3.5 px-4 text-center">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            value={tempQty}
                            onChange={(e) => setTempQty(e.target.value)}
                            className="w-16 bg-slate-100 dark:bg-slate-800 border border-teal-500 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setStockDirect(item.id, tempQty)}
                            className="p-1 rounded bg-teal-600 text-white text-[10px] font-bold"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => { setEditingId(item.id); setTempQty(String(item.stock)); }}
                          className="cursor-pointer group flex flex-col items-center"
                          title="Click to edit quantity directly"
                        >
                          <span className={`text-base font-black font-mono ${
                            isCritical ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-slate-800 dark:text-white'
                          }`}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-teal-600">{item.unit}</span>
                        </div>
                      )}
                    </td>

                    {/* Total Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-800 dark:text-white">
                      {formatCurrency(item.stock * item.unitPrice, false)}
                    </td>

                    {/* Quick Adjust Buttons (+ / -) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, -1)}
                          disabled={item.stock <= 0}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white flex items-center justify-center font-black transition-colors disabled:opacity-40"
                          title="Decrease by 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1 text-[11px] font-bold text-slate-500 font-mono">±1</span>
                        <button
                          type="button"
                          onClick={() => updateStock(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center font-black transition-colors shadow-sm"
                          title="Increase by 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
