"use client";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  children: React.ReactNode;
}

export default function ConfirmDialog({
  message,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  function handleClick() {
    const ok = window.confirm(message);

    if (ok) {
      onConfirm();
    }
  }

  return (
    <span
      onClick={handleClick}
      className="cursor-pointer"
    >
      {children}
    </span>
  );
}