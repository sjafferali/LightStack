import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden rounded-2xl border border-[#2c2c2e] bg-[#1c1c1e] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2c2c2e] px-6 py-5">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="border-none bg-transparent px-2 text-2xl text-[#8e8e93] cursor-pointer hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="max-h-[calc(80vh-70px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
