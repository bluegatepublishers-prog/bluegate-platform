import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { parseContactSubmission } from "@/lib/contact-validation";

export async function POST(req: Request) {
  try {
    const parsed = await parseContactSubmission(req);

    if (!parsed.ok) {
      if (parsed.status === 503) {
        console.error("Contact email configuration is unavailable.");
      }

      return NextResponse.json(
        { success: false, message: parsed.message, errors: parsed.errors ?? {} },
        { status: parsed.status }
      );
    }

    const { name, schoolName, email, phone, subject, message } = parsed.data;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Contact email configuration is unavailable.");
      return NextResponse.json(
        {
          success: false,
          message: "Email delivery is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "bluegatepublishers@gmail.com",
        subject: `Contact Message - ${subject || "General"}`,
        html: `
          <h2>Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>School:</strong> ${schoolName || ""}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
          <p><strong>Subject:</strong> ${subject || "General"}</p>
          <hr />
          <p>${message}</p>
        `,
      });
    } catch {
      console.error("Contact email delivery failed.");
      return NextResponse.json(
        {
          success: false,
          message: "We could not send your message right now. Please try again later.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: "Your message was sent by email." });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to process your request." },
      { status: 400 }
    );
  }
}