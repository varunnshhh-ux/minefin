import React, { useMemo, useRef, useState } from 'react';
import { Edit2, FileSpreadsheet, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { parseTransactionsCsv } from '../lib/csv';
import { DEFAULT_CATEGORIES, formatCurrency, formatDisplayDate, getTodayISO } from '../lib/format';
import type {
  CsvPreviewRow,
  Transaction,
  TransactionInput,
  TransactionKind,
} from '../types/finance';

interface TransactionsViewProps {
  transactions: Transaction[];
  currency: string;
  loading: boolean;
  onAdd: (input: TransactionInput) => Promise<void>;
  onUpdate: (id: string, input: TransactionInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkImport: (rows: TransactionInput[]) => Promise<{ inserted: number }>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  currency,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  onBulkImport,
}) => {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [txDate, setTxDate] = useState(getTodayISO());
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | TransactionKind>('all');

  // CSV Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[] | null>(null);
  const [csvHeaderError, setCsvHeaderError] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    for (const tx of transactions) {
      if (tx.category) set.add(tx.category);
    }
    if (category) set.add(category);
    return Array.from(set);
  }, [transactions, category]);

  const existingHashes = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.import_hash) set.add(tx.import_hash);
    }
    return set;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterKind !== 'all' && tx.kind !== filterKind) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filterKind, searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setKind('expense');
    setAmount('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setTxDate(getTodayISO());
    setDescription('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be greater than 0.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (!txDate) {
      setFormError('Date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: TransactionInput = {
        kind,
        amount: Math.round(parsedAmount * 100) / 100,
        category: category.trim(),
        description: description.trim(),
        tx_date: txDate,
      };
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onAdd(payload);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingId(tx.id);
    setKind(tx.kind);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setTxDate(tx.tx_date);
    setDescription(tx.description);
    setFormError(null);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCsvMessage(null);
    setCsvHeaderError(null);
    if (!file) return;

    const text = await file.text();
    const result = parseTransactionsCsv(text, existingHashes);
    if (result.headerError) {
      setCsvHeaderError(result.headerError);
      setCsvRows(null);
    } else {
      setCsvRows(result.rows);
    }
    e.target.value = '';
  };

  const validImportableRows = useMemo(
    () => (csvRows ?? []).filter((r) => r.isValid && !r.isDuplicate),
    [csvRows]
  );

  const handleConfirmImport = async () => {
    if (validImportableRows.length === 0) return;
    setCsvImporting(true);
    setCsvMessage(null);
    try {
      const payload: TransactionInput[] = validImportableRows.map((r) => ({
        kind: r.kind,
        amount: r.amount,
        category: r.category,
        description: r.description,
        tx_date: r.tx_date,
        import_hash: r.import_hash,
      }));
      const res = await onBulkImport(payload);
      setCsvMessage(`Imported ${res.inserted} new transaction(s).`);
      setCsvRows(null);
    } catch (err) {
      setCsvHeaderError(err instanceof Error ? err.message : 'CSV import failed.');
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Entry / Edit Form */}
        <div className="block-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-earth-900">
              {editingId ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-earth-700 hover:text-earth-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          {formError && (
            <div className="mb-3 p-2.5 bg-red-50 border-2 border-red-300 rounded text-xs text-red-800">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 bg-parchment-200 border-2 border-parchment-300 rounded-md">
              <button
                type="button"
                onClick={() => setKind('expense')}
                className={`py-1.5 text-xs font-bold rounded ${
                  kind === 'expense' ? 'bg-amber-700 text-white' : 'text-earth-700'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setKind('income')}
                className={`py-1.5 text-xs font-bold rounded ${
                  kind === 'income' ? 'bg-forest-600 text-white' : 'text-earth-700'
                }`}
              >
                Income
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150.00"
                className="pixel-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="pixel-input"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="pixel-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lunch at cafe"
                className="pixel-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="pixel-btn-primary w-full">
              <Plus className="w-4 h-4" />
              {submitting ? 'Saving...' : editingId ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </form>
        </div>

        {/* CSV Import Card & Transaction List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="block-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-forest-600" />
                <div>
                  <h2 className="text-base font-bold text-earth-900">Import CSV</h2>
                  <p className="text-xs text-earth-700">
                    Columns: <code>date, description, category, type, amount</code> (YYYY-MM-DD,
                    income/expense)
                  </p>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pixel-btn-secondary text-xs"
                >
                  <Upload className="w-4 h-4" />
                  Choose CSV File
                </button>
              </div>
            </div>

            {csvHeaderError && (
              <div className="mt-3 p-3 bg-red-50 border-2 border-red-300 rounded text-xs text-red-800">
                {csvHeaderError}
              </div>
            )}

            {csvMessage && (
              <div className="mt-3 p-3 bg-forest-50 border-2 border-forest-500 rounded text-xs text-forest-800 font-medium">
                {csvMessage}
              </div>
            )}

            {csvRows && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-earth-800">
                    Preview: {validImportableRows.length} ready to import ·{' '}
                    {csvRows.filter((r) => r.isDuplicate).length} duplicate(s) ·{' '}
                    {csvRows.filter((r) => !r.isValid).length} invalid
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCsvRows(null)}
                      className="pixel-btn-secondary text-xs py-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={csvImporting || validImportableRows.length === 0}
                      onClick={handleConfirmImport}
                      className="pixel-btn-primary text-xs py-1.5"
                    >
                      {csvImporting
                        ? 'Importing...'
                        : `Confirm Import (${validImportableRows.length})`}
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-auto border-2 border-parchment-300 rounded-md bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-parchment-200 text-earth-800 sticky top-0">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-parchment-200">
                      {csvRows.map((row) => (
                        <tr
                          key={`${row.rowNumber}-${row.import_hash}`}
                          className={!row.isValid ? 'bg-red-50/70' : row.isDuplicate ? 'bg-amber-50/60' : ''}
                        >
                          <td className="p-2 text-earth-700">{row.rowNumber}</td>
                          <td className="p-2">{row.tx_date}</td>
                          <td className="p-2">{row.description}</td>
                          <td className="p-2">{row.category}</td>
                          <td className="p-2 capitalize">{row.kind}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(row.amount, currency)}
                          </td>
                          <td className="p-2">
                            {!row.isValid ? (
                              <span className="text-red-700 font-semibold">{row.error}</span>
                            ) : row.isDuplicate ? (
                              <span className="text-amber-700 font-semibold">Duplicate skipped</span>
                            ) : (
                              <span className="text-forest-700 font-semibold">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Saved Transactions Table */}
          <div className="block-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-earth-900">
                Saved Transactions ({filteredTransactions.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-earth-700/60 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="pixel-input pl-8 py-1.5 text-xs w-44"
                  />
                </div>
                <select
                  value={filterKind}
                  onChange={(e) => setFilterKind(e.target.value as 'all' | TransactionKind)}
                  className="pixel-input py-1.5 text-xs w-auto"
                >
                  <option value="all">All types</option>
                  <option value="expense">Expenses</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            {loading && transactions.length === 0 ? (
              <p className="text-sm text-earth-700 py-8 text-center">Loading transactions...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-sm text-earth-700 py-8 text-center border-2 border-dashed border-parchment-300 rounded-md">
                No transactions match your filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b-2 border-parchment-300 text-xs uppercase text-earth-700">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-parchment-200">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-parchment-100/60">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-earth-700">
                          {formatDisplayDate(tx.tx_date)}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-earth-900">{tx.description}</td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-block px-2 py-0.5 text-xs bg-parchment-200 border border-parchment-300 rounded">
                            {tx.category}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right font-bold whitespace-nowrap ${
                            tx.kind === 'income' ? 'text-forest-700' : 'text-earth-900'
                          }`}
                        >
                          {tx.kind === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleEditClick(tx)}
                            className="p-1 text-earth-700 hover:text-forest-700 mr-1"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(tx.id)}
                            className="p-1 text-earth-700 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
