
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendEmail } from "@/lib/emailService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, 1000)
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 40) {
      return NextResponse.json(
        { error: "Please enter a valid RideMate username." },
        { status: 400 }
      );
    }

    const emailHash = createHash("sha256")
      .update(email)
      .digest("hex");

    const limitRef = adminDb
      .collection("accountDeletionRequestLimits")
      .doc(emailHash);

    const limitSnapshot = await limitRef.get();

    if (limitSnapshot.exists) {
      const lastRequest = limitSnapshot.data()?.lastRequestAt;

      if (lastRequest?.toMillis) {
        const elapsed =
          Date.now() - lastRequest.toMillis();

        if (elapsed < 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            {
              error:
                "A request was recently submitted using this email. Please try again after 24 hours.",
            },
            { status: 429 }
          );
        }
      }
    }

    const rawToken = randomBytes(32).toString("hex");

    const tokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const requestRef = adminDb
      .collection("accountDeletionRequests")
      .doc();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
    }

    const verificationUrl =
      `${appUrl.replace(/\/$/, "")}/api/request-account-deletion/verify?token=${rawToken}&id=${requestRef.id}`;

    await adminDb.runTransaction(async (transaction) => {
      const freshLimit = await transaction.get(limitRef);

      if (freshLimit.exists) {
        const lastRequest = freshLimit.data()?.lastRequestAt;

        if (
          lastRequest?.toMillis &&
          Date.now() - lastRequest.toMillis() <
            24 * 60 * 60 * 1000
        ) {
          throw new Error("REQUEST_LIMIT");
        }
      }

      transaction.set(requestRef, {
        email,
        username,
        reason,
        tokenHash,
        status: "awaiting_email_verification",
        source: "external_web",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + 30 * 60 * 1000)
        ),
      });

      transaction.set(limitRef, {
        lastRequestAt: FieldValue.serverTimestamp(),
      });
    });

    try {
      await sendEmail({
        to: email,
        subject: "Verify your RideMate account deletion request",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>RideMate account deletion request</h2>
            <p>We received a request to delete the RideMate account associated with this email address.</p>
            <p>To verify that you own this email address, click below:</p>
            <p>
              <a href="${verificationUrl}"
                 style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px">
                Verify email address
              </a>
            </p>
            <p>This link expires in 30 minutes.</p>
            <p>Verifying your email does not immediately delete your RideMate account. It only confirms your email address and allows the request to proceed for further verification.</p>
            <p>If you did not make this request, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      await requestRef.delete();

      console.error("Verification email failed:", emailError);

      return NextResponse.json(
        { error: "Unable to send the verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "A verification link has been sent to the email address provided.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "REQUEST_LIMIT"
    ) {
      return NextResponse.json(
        { error: "Please wait 24 hours before submitting another request." },
        { status: 429 }
      );
    }

    console.error("Account deletion request error:", error);

    return NextResponse.json(
      { error: "Unable to submit your request. Please try again later." },
      { status: 500 }
    );
  }
}
