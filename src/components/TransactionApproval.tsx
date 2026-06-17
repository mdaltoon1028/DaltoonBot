import React, { useState } from "react";
import { Transaction } from "../types";
import { Language, translations } from "../locales";
import { 
  Check, 
  X, 
  Clock, 
  Eye, 
  Filter, 
  DollarSign, 
  AlertCircle, 
  CreditCard 
} from "lucide-react";

interface TransactionApprovalProps {
  transactions: Transaction[];
  approveTransaction: (id: string) => void;
  rejectTransaction: (id: string) => void;
  lang: Language;
}

export default function TransactionApproval({
  transactions,
  approveTransaction,
  rejectTransaction,
  lang
}: TransactionApprovalProps) {
  const t = translations[lang];
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(tx => {
    if (filterStatus === "all") return true;
    return tx.status === filterStatus;
  });

  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div id="transactions-tab" className="space-y-6">
      {/* Filtering Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-medium text-lg text-white">{t.manualReceiptsTitle}</h3>
          <p className="text-xs text-gray-400">{t.manualReceiptsDesc}</p>
        </div>

        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-lg border border-[#1f2937] self-start sm:self-auto">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition ${
                filterStatus === status 
                  ? "bg-indigo-600 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {status === "all" ? t.filterAll : 
               status === "pending" ? t.filterPending : 
               status === "approved" ? t.filterApproved : t.filterRejected}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: list + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction log table */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-slate-900 border-b border-[#1f2937]">
                <tr>
                  <th className="px-5 py-3">{t.tableColTxId}</th>
                  <th className="px-5 py-3">{t.tableColUser}</th>
                  <th className="px-5 py-3">{t.tableColAmount}</th>
                  <th className="px-5 py-3">{t.tableColDate}</th>
                  <th className="px-5 py-3">{t.tableColStatus}</th>
                  <th className="px-5 py-3 text-right">{t.tableColActionsTx}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                      {t.noInvoicesFound}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-4 font-mono text-xs font-semibold">{tx.id}</td>
                      <td className="px-5 py-4">
                        <div className="text-white font-medium text-sm">@{tx.username}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {tx.userId}</div>
                      </td>
                      <td className="px-5 py-4 font-display font-semibold text-emerald-400">
                        {tx.amount.toLocaleString()} {lang === "fa" ? "تومان" : "Toman"}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400">
                        {new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${getStatusBadge(tx.status)}`}>
                          {tx.status === "pending" ? t.filterPending : tx.status === "approved" ? t.filterApproved : t.filterRejected}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t.viewSlipBtn}
                        </button>

                        {tx.status === "pending" && (
                          <>
                            <button
                              onClick={() => approveTransaction(tx.id)}
                              className="p-1 px-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-xs transition inline-flex items-center gap-0.5 cursor-pointer"
                              title="Approve & Credit Balance"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {t.approveBtn}
                            </button>
                            <button
                              onClick={() => rejectTransaction(tx.id)}
                              className="p-1 px-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded text-xs transition inline-flex items-center gap-0.5 cursor-pointer"
                              title="Reject Receipt"
                            >
                              <X className="w-3.5 h-3.5" />
                              {t.rejectBtn}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank Slip Receipt Preview Container */}
        <div className="bg-[#111827] border border-[#1f2937] p-5 rounded-xl flex flex-col justify-between h-fit space-y-4">
          <div className="space-y-4">
            <h3 className="font-display font-medium text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              {t.analyzerTitle}
            </h3>
            <p className="text-xs text-gray-400">{t.analyzerDesc}</p>

            {selectedTx ? (
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 p-4 space-y-4">
                <div className={`w-full aspect-video rounded-md relative ${selectedTx.receiptImage} flex items-center justify-center text-white overflow-hidden p-4`}>
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-xs"></div>
                  <div className="z-10 text-center space-y-1 font-mono text-xs">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.bankReportHeader}</p>
                    <p className="text-xl font-bold font-display text-emerald-400">{selectedTx.amount.toLocaleString()} {lang === "fa" ? "تومان" : "TOMAN"}</p>
                    <p className="text-[10px]">Reference: 90281-39482</p>
                    <p className="text-[10px]">Recipient Card: 6037-xxxx-xxxx-8848</p>
                    <div className="pt-2">
                      <span className="px-2 py-0.5 rounded bg-black/50 text-[9px] uppercase border border-slate-700">
                        {t.digitalVerificationSlip}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-2 pt-2 text-gray-400">
                  <div className="flex justify-between">
                    <span>{t.analyzerDepositor}:</span>
                    <span className="text-white font-medium">@{selectedTx.username} (ID: {selectedTx.userId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.analyzerCreditAmount}:</span>
                    <span className="text-emerald-400 font-semibold font-display">{selectedTx.amount.toLocaleString()} {lang === "fa" ? "تومان" : "Tomans"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.analyzerReportingDate}:</span>
                    <span>{new Date(selectedTx.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.analyzerDescription}:</span>
                    <span className="text-gray-300 font-mono text-[10px]">{selectedTx.description || "N/A"}</span>
                  </div>
                </div>

                {selectedTx.status === "pending" && (
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        approveTransaction(selectedTx.id);
                        setSelectedTx(null);
                      }}
                      className="inline-flex justify-center items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> {t.approveSlipBtn}
                    </button>
                    <button
                      onClick={() => {
                        rejectTransaction(selectedTx.id);
                        setSelectedTx(null);
                      }}
                      className="inline-flex justify-center items-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> {t.rejectSlipBtn}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[#1f2937] rounded-lg p-10 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-2">
                <Clock className="w-8 h-8 text-slate-600 animate-pulse" />
                <p>{t.selectInvoicePlaceholder}</p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/80 text-xs text-amber-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.guidelinesNotice}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
