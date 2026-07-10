import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

type InspectionPayload = {
  requestId?: unknown;
  schoolName?: unknown;
  teacherName?: unknown;
  designation?: unknown;
  mobile?: unknown;
  email?: unknown;
  state?: unknown;
  city?: unknown;
  address?: unknown;
  message?: unknown;
  consent?: unknown;
  book?: {
    id?: unknown;
    title?: unknown;
    class?: unknown;
    subject?: unknown;
    series?: unknown;
  };
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InspectionPayload;

    const {
      requestId,
      consent,
    } = body;

    const schoolName = text(body.schoolName);
    const teacherName = text(body.teacherName);
    const designation = text(body.designation);
    const mobile = text(body.mobile);
    const email = text(body.email).toLowerCase();
    const state = text(body.state);
    const city = text(body.city);
    const address = text(body.address);
    const message = text(body.message);
    const bookId = text(body.book?.id);
    const bookTitle = text(body.book?.title);
    const bookClass = text(body.book?.class);
    const bookSubject = text(body.book?.subject);
    const bookSeries = text(body.book?.series);
    const id = text(requestId);

    const missingFields = [
      ["requestId", id],
      ["schoolName", schoolName],
      ["teacherName", teacherName],
      ["designation", designation],
      ["mobile", mobile],
      ["email", email],
      ["state", state],
      ["city", city],
      ["address", address],
      ["book.title", bookTitle],
      ["book.class", bookClass],
      ["book.subject", bookSubject],
    ].filter(([, value]) => !value).map(([field]) => field);

    if (missingFields.length > 0 || consent !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            consent !== true
              ? "Please confirm that you represent a school or institution."
              : `Missing required fields: ${missingFields.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (id.length > 100) {
      return NextResponse.json(
        { success: false, message: "Invalid request identifier." },
        { status: 400 }
      );
    }

    let inspectionRequest;

    try {
      inspectionRequest = await prisma.inspectionRequest.upsert({
        where: { id },
        update: {},
        create: {
          id,
          schoolName,
          teacherName,
          designation,
          mobile,
          email,
          state,
          city,
          address,
          message: message || null,
          bookId: bookId || null,
          bookTitle,
          bookClass,
          bookSubject,
          bookSeries: bookSeries || null,
        },
      });
    } catch (error) {
      console.error("Inspection request database save failed:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Unable to save your request. Please try again later.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const html = `
      <h2>New Inspection Copy Request</h2>

      <hr/>

      <h3>Book Details</h3>

      <p><strong>Book:</strong> ${escapeHtml(inspectionRequest.bookTitle)}</p>
      <p><strong>Class:</strong> ${escapeHtml(inspectionRequest.bookClass)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(inspectionRequest.bookSubject)}</p>
      <p><strong>Series:</strong> ${escapeHtml(inspectionRequest.bookSeries ?? "")}</p>

      <hr/>

      <h3>School Details</h3>

      <p><strong>School Name:</strong> ${escapeHtml(inspectionRequest.schoolName)}</p>
      <p><strong>Teacher:</strong> ${escapeHtml(inspectionRequest.teacherName)}</p>
      <p><strong>Designation:</strong> ${escapeHtml(inspectionRequest.designation)}</p>

      <p><strong>Mobile:</strong> ${escapeHtml(inspectionRequest.mobile)}</p>

      <p><strong>Email:</strong> ${escapeHtml(inspectionRequest.email)}</p>

      <p><strong>State:</strong> ${escapeHtml(inspectionRequest.state)}</p>

      <p><strong>City:</strong> ${escapeHtml(inspectionRequest.city)}</p>

      <p><strong>Address:</strong> ${escapeHtml(inspectionRequest.address)}</p>

      <hr/>

      <h3>Message</h3>

      <p>${escapeHtml(inspectionRequest.message ?? "")}</p>
    `;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "bluegatepublishers@gmail.com",
        subject: `Inspection Copy Request - ${inspectionRequest.bookTitle}`,
        html,
      });
    } catch (error) {
      console.error("Inspection request email notification failed:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Your request was saved, but the email notification could not be sent. Please contact Bluegate Publishers if your request is urgent.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Request submitted successfully.",
    });
  } catch (error) {
    console.error("Inspection request processing failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process your request. Please check the form and try again.",
      },
      {
        status: 500,
      }
    );
  }
}
