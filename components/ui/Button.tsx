type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "outline";
};

export default function Button({
  children,
  variant = "primary",
}: ButtonProps) {
  return (
    <button
      className={
        variant === "primary"
          ? "btn-primary"
          : "rounded-xl border border-blue-700 px-6 py-3 text-blue-700 hover:bg-blue-50"
      }
    >
      {children}
    </button>
  );
}