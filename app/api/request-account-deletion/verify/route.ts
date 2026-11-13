
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function verificationPage(token: string, id: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Confirm RideMate Email</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #09090b;
            color: white;
            font-family: Arial, sans-serif;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            max-width: 460px;
            width: 100%;
            padding: 32px;
            border: 1px solid #27272a;
            border-radius: 16px;
            background: #18181b;
            text-align: center;
          }
          p {
            color: #d4d4d8;
            line-height: 1.6;
          }
          button {
            margin-top: 16px;
            padding: 13px 22px;
            background: #dc2626;
            color: white;
            border: 0;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <main class="card">
          <h1>Confirm your email</h1>
          <p>
            Click the button below to confirm that you requested
            deletion of your RideMate account.
          </p>
          <p>
            This will verify your email and submit your request
            for further account verification. It will not
            immediately delete your account.
          </p>
          <form method="POST">
            <input type="hidden" name="token" value="${token}" />
            <input type="hidden" name="id" value="${id}" />
            <button type="submit">Confirm Email Verification</button>
          </form>
        </main>
      </body>
    </html>
  `;
}

function resultPage(title: string, message: string, status: number) {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #09090b;
            color: white;
            font-family: Arial, sans-serif;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            max-width: 460px;
            width: 100%;
            padding: 32px;
            border: 1px solid #27272a;
            border-radius: 16px;
            background: #18181b;
            text-align: center;
          }
          p { color: #d4d4d8; line-height: 1.6; }
          a {
            display: inline-block;
            margin-top: 16px;
            padding: 12px 20px;
            background: #dc2626;
            color: white;
            text-decoration: none;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <main class="card">
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="https://www.ridemate.fun">Return to RideMate</a>
        </main>
      </body>
    </html>
    `,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

// Opening the email link only displays the confirmation page.
// It does not verify or change the deletion request.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token = searchParams.get("token") || "";
  const id = searchParams.get("id") || "";

  if (
    !/^[a-f0-9]{64}$/i.test(token) ||
    !/^[a-zA-Z0-9]+$/.test(id)
  ) {
    return resultPage(
      "Invalid link",
      "This verification link is invalid.",
      400
    );
  }

  return new NextResponse(verificationPage(token, id), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Only an explicit button submission verifies the request.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const token = String(formData.get("token") || "");
    const id = String(formData.get("id") || "");

    if (
      !/^[a-f0-9]{64}$/i.test(token) ||
      !/^[a-zA-Z0-9]+$/.test(id)
    ) {
      return resultPage(
        "Invalid link",
        "This verification link is invalid.",
        400
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const requestRef = adminDb
      .collection("accountDeletionRequests")
      .doc(id);

    const requestSnapshot = await requestRef.get();

    if (!requestSnapshot.exists) {
      return resultPage(
        "Request unavailable",
        "This request is invalid or has expired.",
        400
      );
    }

    const data = requestSnapshot.data();

    if (
      data?.status !== "awaiting_email_verification" ||
      data?.tokenHash !== tokenHash
    ) {
      return resultPage(
        "Link unavailable",
        "This link is invalid or has already been used.",
        400
      );
    }

    if (
      !data.expiresAt ||
      typeof data.expiresAt.toMillis !== "function" ||
      data.expiresAt.toMillis() < Date.now()
    ) {
      await requestRef.update({
        status: "verification_expired",
        tokenHash: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return resultPage(
        "Link expired",
        "This verification link has expired. Please submit a new request.",
        400
      );
    }

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const requestedUsername =
      typeof data.username === "string"
        ? data.username.trim().toLowerCase()
        : "";

    if (!email || !requestedUsername) {
      return resultPage(
        "Unable to verify",
        "We could not verify this account request. Please contact RideMate support.",
        400
      );
    }

    // Match the verified email to a real Firebase Authentication account.
    const firebaseAccount = await adminAuth.getUserByEmail(email);

    // Match the submitted username to that account's Firestore profile.
    const userRef = adminDb
      .collection("users")
      .doc(firebaseAccount.uid);

    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return resultPage(
        "Unable to verify",
        "We could not verify this account request. Please contact RideMate support.",
        400
      );
    }

    const userData = userSnapshot.data();

    const storedEmail =
      typeof userData?.email === "string"
        ? userData.email.trim().toLowerCase()
        : "";

    const storedUsername =
      typeof userData?.username === "string"
        ? userData.username.trim().toLowerCase()
        : typeof userData?.name === "string"
          ? userData.name.trim().toLowerCase()
          : "";

    if (
      storedEmail !== email ||
      storedUsername !== requestedUsername
    ) {
      return resultPage(
        "Unable to verify",
        "We could not verify this account request. Please contact RideMate support.",
        400
      );
    }

    // Recheck the request inside a transaction to prevent link reuse.
    await adminDb.runTransaction(async (transaction) => {
      const freshSnapshot = await transaction.get(requestRef);

      if (!freshSnapshot.exists) {
        throw new Error("REQUEST_UNAVAILABLE");
      }

      const freshData = freshSnapshot.data();

      if (
        freshData?.status !== "awaiting_email_verification" ||
        freshData?.tokenHash !== tokenHash ||
        !freshData.expiresAt ||
        freshData.expiresAt.toMillis() < Date.now()
      ) {
        throw new Error("REQUEST_UNAVAILABLE");
      }

      transaction.update(requestRef, {
        status: "email_verified_pending_review",
        verifiedUid: firebaseAccount.uid,
        tokenHash: FieldValue.delete(),
        emailVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return resultPage(
      "Email verified",
      "Your email and RideMate account details have been verified. Your deletion request is now pending further review. Your account has not been deleted.",
      200
    );
  } catch (error) {
    console.error(
      "Account deletion verification error:",
      error
    );

    return resultPage(
      "Unable to complete verification",
      "We could not complete your request. The link may have expired or the account details may not match. Please contact RideMate support if you need help.",
      400
    );
  }
}
