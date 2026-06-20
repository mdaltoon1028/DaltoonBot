import React from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: "fa" | "en";
}

export default function ConfirmationModal({ isOpen, message, onConfirm, onCancel, lang }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#111827] border border-[#1f2937] p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4">
        <p className="text-white text-sm font-medium leading-relaxed">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#1f2937] hover:bg-[#2d3748] text-gray-300 rounded-lg text-xs font-semibold transition"
          >
            {lang === "fa" ? "انصراف" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
          >
            {lang === "fa" ? "تایید" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
