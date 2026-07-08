type Props = {
  title: string;
  description: string;
};

export default function FeatureCard({
  title,
  description,
}: Props) {
  return (
    <div className="card p-8">
      <div className="h-16 w-16 rounded-2xl bg-blue-100 mb-6" />

      <h3 className="text-2xl font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-4 text-gray-600 leading-7">
        {description}
      </p>
    </div>
  );
}