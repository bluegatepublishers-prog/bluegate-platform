import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      schoolName,
      teacherName,
      designation,
      mobile,
      email,
      state,
      city,
      address,
      message,
      book,
    } = body;

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

      <p><strong>Book:</strong> ${book.title}</p>
      <p><strong>Class:</strong> ${book.class}</p>
      <p><strong>Subject:</strong> ${book.subject}</p>
      <p><strong>Series:</strong> ${book.series}</p>

      <hr/>

      <h3>School Details</h3>

      <p><strong>School Name:</strong> ${schoolName}</p>
      <p><strong>Teacher:</strong> ${teacherName}</p>
      <p><strong>Designation:</strong> ${designation}</p>

      <p><strong>Mobile:</strong> ${mobile}</p>

      <p><strong>Email:</strong> ${email}</p>

      <p><strong>State:</strong> ${state}</p>

      <p><strong>City:</strong> ${city}</p>

      <p><strong>Address:</strong> ${address}</p>

      <hr/>

      <h3>Message</h3>

      <p>${message}</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "bluegatepublishers@gmail.com",
      subject: `Inspection Copy Request - ${book.title}`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Request submitted successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send request.",
      },
      {
        status: 500,
      }
    );
  }
}