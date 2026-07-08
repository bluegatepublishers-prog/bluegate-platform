type Props = {
  title: string;
  subtitle: string;
};

export default function SectionTitle({
  title,
  subtitle,
}: Props) {
  return (
    <div className="text-center mb-16">
      <p className="text-blue-600 font-semibold uppercase tracking-[3px]">
        {subtitle}
      </p>

      <h2 className="mt-4 text-5xl font-bold text-slate-800">
        {title}
      </h2>
    </div>
  );
}