import Link from "next/link";

export default function TopBar() {
  return (
    <div className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-sm">

        {/* Contact Info */}

        <div className="flex items-center gap-6">

          <span>📞 011-40516236</span>

          <span>📱 +91 9667665710</span>

          <span>📍 Nehru Place, New Delhi</span>

        </div>

        {/* Quick Links */}

        <div className="flex items-center gap-6">

          <Link
            href="/catalogue/Bluegate-Catalogue.pdf"
            target="_blank"
            className="transition hover:text-yellow-300"
          >
            Download Catalogue
          </Link>

          <Link
            href="/contact"
            className="transition hover:text-yellow-300"
          >
            Contact Us
          </Link>

        </div>

      </div>
    </div>
  );
}
