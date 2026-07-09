import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, schoolName, email, phone, subject, message } = body;

    if (process.env.DATABASE_URL) {
      await (prisma as any).contactMessage.create({
        data: {
          name: name || "",
          schoolName: schoolName || null,
          email: email || "",
          phone: phone || null,
          subject: subject || null,
          message: message || "",
          status: "NEW",
        },
      });
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "bluegatepublishers@gmail.com",
        subject: `Contact Message - ${subject || "General"}`,
        html: `
          <h2>Contact Message</h2>
          <p><strong>Name:</strong> ${name || ""}</p>
          <p><strong>School:</strong> ${schoolName || ""}</p>
          <p><strong>Email:</strong> ${email || ""}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
          <p><strong>Subject:</strong> ${subject || ""}</p>
          <hr />
          <p>${message || ""}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to send message." },
      { status: 500 }
    );
  }
}