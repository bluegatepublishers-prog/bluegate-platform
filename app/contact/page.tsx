import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F8FBFF]">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#083A75] to-[#0B5ED7] py-24 text-white">
        <div className="container-custom">
          <h1 className="text-5xl md:text-6xl font-bold">
            Contact Bluegate Publishers
          </h1>

          <p className="mt-6 max-w-3xl text-xl text-blue-100">
            We&rsquo;d love to hear from you. Contact us for school partnerships,
            catalogues, publishing enquiries and educational solutions.
          </p>
          <p className="mt-4 text-sm text-blue-100/90">
            Contact submissions are sent by email only and are not saved to an admin inbox.
          </p>
        </div>
      </section>

      {/* Contact Section */}

      <section className="container-custom py-20">

        <div className="grid gap-10 lg:grid-cols-2">

          {/* LEFT */}

          <div className="space-y-8">

            {/* Address */}

            <div className="rounded-3xl bg-white p-8 shadow-lg">

              <h2 className="mb-6 text-3xl font-bold text-[#083A75]">
                Contact Information
              </h2>

              <div className="space-y-6">

                <div>
                  <h3 className="font-semibold text-blue-700">
                    📍 Office Address
                  </h3>

                  <p className="mt-2 leading-7 text-gray-600">
                    Bluegate Publishers
                    <br />
                    Office No. 56,
                    <br />
                    Deepak Building,
                    <br />
                    Nehru Place,
                    <br />
                    New Delhi - 110019
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-700">
                    ☎ Landline
                  </h3>

                  <p className="mt-2 text-gray-600">
                    011-40516236
                    <br />
                    011-40114245
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-700">
                    📱 Mobile
                  </h3>

                  <p className="mt-2 text-gray-600">
                    +91 9667665710
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-700">
                    ✉ Email
                  </h3>

                  <p className="mt-2 text-gray-600">
                    bluegatepublishers@gmail.com
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-700">
                    🕒 Office Hours
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Monday – Saturday
                    <br />
                    10:00 AM – 6:30 PM
                  </p>
                </div>

              </div>

            </div>

            {/* Google Map */}

            <div className="overflow-hidden rounded-3xl shadow-lg bg-white p-2">

              <iframe
                title="Bluegate Publishers Location"
                src="https://maps.google.com/maps?q=Deepak%20Building%20Nehru%20Place%20New%20Delhi%20110019&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="350"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>

            </div>

          </div>

          {/* RIGHT */}

          <div className="rounded-3xl bg-white p-10 shadow-lg">

            <h2 className="mb-8 text-3xl font-bold text-[#083A75]">
              Send an Enquiry
            </h2>

            <p className="mb-6 text-sm leading-6 text-slate-600">
              Messages are sent by email only. We do not store them in an admin inbox.
            </p>

            <ContactForm />

          </div>

        </div>

      </section>

    </main>
  );
}