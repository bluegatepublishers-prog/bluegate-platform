import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Download,
  BookOpen,
  GraduationCap,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20 bg-gradient-to-br from-slate-900 via-slate-950 to-[#071B3A] text-white">

      <div className="mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-4">

          {/* Company */}

          <div>

            <Link
              href="/"
              className="flex items-center gap-4"
            >

              <Image
                src="/logos/logo.png"
                alt="Bluegate Publishers"
                width={60}
                height={60}
              />

              <div>

                <h2 className="text-3xl font-bold">
                  Bluegate
                </h2>

                <p className="text-blue-200">
                  Publishers
                </p>

              </div>

            </Link>

            <p className="mt-6 leading-8 text-slate-300">
              Bluegate Publishers is committed to delivering
              innovative educational resources, curriculum
              books and teacher support solutions that inspire
              curiosity, creativity and lifelong learning.
            </p>

            <Link
              href="/catalogue/Bluegate-Catalogue.pdf"
              target="_blank"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700"
            >

              <Download size={18} />

              Download Catalogue

            </Link>

          </div>

          {/* Quick Links */}

          <div>

            <h3 className="mb-6 text-xl font-semibold">
              Quick Links
            </h3>

            <ul className="space-y-4 text-slate-300">

              <li><Link href="/" className="hover:text-white">Home</Link></li>

              <li><Link href="/about" className="hover:text-white">About Us</Link></li>

              <li><Link href="/books" className="hover:text-white">Books</Link></li>

              <li><Link href="/school-solutions" className="hover:text-white">School Solutions</Link></li>

              <li><Link href="/teacher-hub" className="hover:text-white">Teacher Hub</Link></li>

              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>

            </ul>

          </div>

          {/* Explore Books */}

          <div>

            <h3 className="mb-6 text-xl font-semibold">
              Explore Books
            </h3>

            <ul className="space-y-4 text-slate-300">

              <li className="flex items-center gap-2">

                <BookOpen
                  size={16}
                  className="text-blue-400"
                />

                Nursery to UKG

              </li>

              <li className="flex items-center gap-2">

                <BookOpen
                  size={16}
                  className="text-blue-400"
                />

                Primary (I–V)

              </li>

              <li className="flex items-center gap-2">

                <BookOpen
                  size={16}
                  className="text-blue-400"
                />

                Middle (VI–VIII)

              </li>

              <li className="flex items-center gap-2">

                <BookOpen
                  size={16}
                  className="text-blue-400"
                />

                Secondary (IX–X)

              </li>

              <li className="flex items-center gap-2">

                <GraduationCap
                  size={16}
                  className="text-blue-400"
                />

                Senior Secondary

              </li>

              <li className="flex items-center gap-2">

                <GraduationCap
                  size={16}
                  className="text-blue-400"
                />

                AI & Skill Education

              </li>

            </ul>

          </div>

          {/* Contact */}

          <div>

            <h3 className="mb-6 text-xl font-semibold">
              Contact Information
            </h3>

            <div className="space-y-6">

              <div className="flex gap-4">

                <MapPin
                  className="mt-1 text-yellow-400"
                  size={20}
                />

                <div className="text-slate-300 leading-7">

                  Office 56, Deepak Building

                  <br />

                  Nehru Place

                  <br />

                  New Delhi – 110019

                </div>

              </div>

              <div className="flex gap-4">

                <Phone
                  className="text-yellow-400"
                  size={20}
                />

                <div className="text-slate-300">

                  011-40516236

                  <br />

                  011-40114245

                  <br />

                  +91 9667665710

                </div>

              </div>

              <div className="flex gap-4">

                <Mail
                  className="text-yellow-400"
                  size={20}
                />

                <div className="text-slate-300">

                  bluegatepublishers@gmail.com

                </div>

              </div>

            </div>

          </div>

        </div>

        <div className="my-14 h-px bg-slate-700" />
                {/* Bottom Footer */}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          {/* Copyright */}

          <div>

            <p className="text-slate-300">
              © {new Date().getFullYear()}{" "}
              <span className="font-semibold text-white">
                Bluegate Publishers
              </span>
              . All Rights Reserved.
            </p>

            <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-400">

              <Link
                href="/privacy-policy"
                className="transition hover:text-white"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                className="transition hover:text-white"
              >
                Terms & Conditions
              </Link>

              <Link
                href="/contact"
                className="transition hover:text-white"
              >
                Contact
              </Link>

            </div>

          </div>

          {/* Social Media */}

          <div className="flex items-center gap-4">

            <a
              href="#"
              aria-label="Facebook"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:border-blue-500 hover:bg-blue-600"
            >
              <Facebook size={20} />
            </a>

            <a
              href="#"
              aria-label="Instagram"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:border-pink-500 hover:bg-pink-600"
            >
              <Instagram size={20} />
            </a>

            <a
              href="#"
              aria-label="LinkedIn"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:border-sky-500 hover:bg-sky-600"
            >
              <Linkedin size={20} />
            </a>

            <a
              href="#"
              aria-label="YouTube"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition hover:border-red-500 hover:bg-red-600"
            >
              <Youtube size={20} />
            </a>

          </div>

        </div>

        {/* Bottom Message */}

        <div className="mt-12 rounded-3xl border border-slate-700 bg-white/5 p-6 text-center">

          <h3 className="text-xl font-semibold text-white">
            Inspiring Minds • Empowering Teachers • Transforming Education
          </h3>

          <p className="mt-3 text-slate-400">
            Bluegate Publishers is dedicated to creating high-quality
            educational resources that nurture curiosity, critical
            thinking, creativity and lifelong learning for every child.
          </p>

        </div>

      </div>

    </footer>
  );
}