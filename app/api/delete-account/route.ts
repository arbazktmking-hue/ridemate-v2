
import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  Query,
  type DocumentReference,
} from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  adminStorage,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

async function deleteQuery(query: Query) {
  const snapshot = await query.get();

  for (let i = 0; i < snapshot.docs.length; i += 400) {
    const batch = adminDb.batch();
    const chunk = snapshot.docs.slice(i, i + 400);

    chunk.forEach((document) => batch.delete(document.ref));

    await batch.commit();
  }

  return snapshot.docs.length;
}

export async function POST(request: NextRequest) {
  let deletionStage = "authentication";
  let deletionOperationRef: DocumentReference | null = null;

  try {
    // 1. Verify the Firebase authentication token.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    // Require recent authentication for account deletion.
    const authAge = Math.floor(Date.now() / 1000) - decoded.auth_time;

    if (authAge > 5 * 60) {
      return NextResponse.json(
        { error: "Please sign in again before deleting your account." },
        { status: 401 }
      );
    }
// Track the account deletion operation.
const operationRef = adminDb
  .collection("accountDeletionOperations")
  .doc(uid);

// Make the operation reference available to the catch block.
deletionOperationRef = operationRef;

deletionStage = "starting deletion operation";

await adminDb.runTransaction(async (transaction) => {
  const operationSnapshot = await transaction.get(operationRef);

  if (!operationSnapshot.exists) {
    transaction.set(operationRef, {
      uid,
      status: "in_progress",
      currentStage: "starting deletion",
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    const operationData = operationSnapshot.data();

    if (operationData?.status === "completed") {
      throw new Error("DELETION_ALREADY_COMPLETED");
    }

    transaction.update(operationRef, {
      status: "in_progress",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
});

// Update the deletion operation's current cleanup stage.
const updateDeletionStage = async (stage: string) => {
  deletionStage = stage;

  if (!deletionOperationRef) {
    throw new Error("DELETION_OPERATION_REFERENCE_MISSING");
  }

  await deletionOperationRef.update({
    currentStage: stage,
    updatedAt: FieldValue.serverTimestamp(),
  });
};
    // 2. Read the user's profile before deleting it.
    await updateDeletionStage("reading user profile");
    const userRef = adminDb.collection("users").doc(uid);
    const userSnapshot = await userRef.get();

    const userData = userSnapshot.exists
      ? userSnapshot.data() || {}
      : {};

    // 3. Find trips owned by this user.
    await updateDeletionStage("finding owned trips");
    const ownedTrips = await adminDb
      .collection("trips")
      .where("uid", "==", uid)
      .get();

    const tripIds = ownedTrips.docs.map((trip) => trip.id);

    // 4. Delete the user's feed posts and their associated comments.
    deletionStage = "deleting feed posts and comments";
    const ownedPosts = await adminDb
      .collection("feedPosts")
      .where("userId", "==", uid)
      .get();

    for (const post of ownedPosts.docs) {
      await deleteQuery(
        adminDb.collection("comments").where("postId", "==", post.id)
      );
    }

    await deleteQuery(
      adminDb.collection("comments").where("userId", "==", uid)
    );

    for (let i = 0; i < ownedPosts.docs.length; i += 400) {
      const batch = adminDb.batch();

      ownedPosts.docs.slice(i, i + 400).forEach((post) => {
        batch.delete(post.ref);
      });

      await batch.commit();
    }
    // 5. Remove the deleted user's likes, saves and comments
    // from posts belonging to other users.
    deletionStage = "cleaning feed post engagement";

    const allFeedPosts = await adminDb
      .collection("feedPosts")
      .get();

    for (const postDoc of allFeedPosts.docs) {
      await adminDb.runTransaction(async (transaction) => {
        const freshSnapshot = await transaction.get(postDoc.ref);

        if (!freshSnapshot.exists) {
          return;
        }

        const postData = freshSnapshot.data() || {};

        const likedBy: string[] = Array.isArray(postData.likedBy)
          ? postData.likedBy
          : [];

        const savedBy: string[] = Array.isArray(postData.savedBy)
          ? postData.savedBy
          : [];

        const comments = Array.isArray(postData.comments)
          ? postData.comments
          : [];

        const wasLiked = likedBy.includes(uid);
        const wasSaved = savedBy.includes(uid);

        const updatedComments = comments.filter(
          (comment: any) => comment?.userId !== uid
        );

        const updates: Record<string, any> = {};

        // Remove the user's like and reduce the count.
        if (wasLiked) {
          updates.likedBy = likedBy.filter(
            (userId) => userId !== uid
          );

          const currentLikes =
            typeof postData.likes === "number"
              ? postData.likes
              : 0;

          updates.likes = Math.max(0, currentLikes - 1);
        }

        // Remove the user's saved-post reference.
        if (wasSaved) {
          updates.savedBy = savedBy.filter(
            (userId) => userId !== uid
          );
        }

        // Remove only comments written by this user.
        if (updatedComments.length !== comments.length) {
          updates.comments = updatedComments;
        }

        // Update only posts that actually need cleanup.
        if (Object.keys(updates).length > 0) {
          transaction.update(postDoc.ref, updates);
        }
      });
    }
    // 6. Delete ride requests linked by verified Firebase UIDs.
    deletionStage = "deleting ride requests";
    await deleteQuery(
      adminDb.collection("rideRequests").where("requesterUid", "==", uid)
    );

    await deleteQuery(
      adminDb.collection("rideRequests").where("tripOwnerUid", "==", uid)
    );

    // Also remove requests associated with trips owned by this user.
    for (const tripId of tripIds) {
      await deleteQuery(
        adminDb.collection("rideRequests").where("tripId", "==", tripId)
      );
    }

    // 7. Delete saved trips and feedback belonging to this user.
    deletionStage = "deleting saved trips and feedback";
    await deleteQuery(
      adminDb.collection("savedTrips").where("userUid", "==", uid)
    );
// Also remove other users' saved records for trips
// owned by the account being deleted.
for (const tripId of tripIds) {
  await deleteQuery(
    adminDb.collection("savedTrips").where("tripId", "==", tripId)
  );
}
    await deleteQuery(
      adminDb.collection("feedback").where("userId", "==", uid)
    );

    // 8. Delete reviews written by or about this user.
    deletionStage = "deleting ride reviews";
    await deleteQuery(
      adminDb.collection("rideReviews").where("riderUid", "==", uid)
    );

    await deleteQuery(
      adminDb.collection("rideReviews").where("reviewerUid", "==", uid)
    );
// Delete Crew Chat messages sent or received by this user.
deletionStage = "deleting Crew Chat messages";

await deleteQuery(
  adminDb.collection("messages").where("senderUid", "==", uid)
);

await deleteQuery(
  adminDb.collection("messages").where("receiverUid", "==", uid)
);
    // 9. Delete notifications linked to this user's UID.
    deletionStage = "deleting notifications";
    await deleteQuery(
      adminDb.collection("notifications").where("recipientUid", "==", uid)
    );

    await deleteQuery(
      adminDb.collection("notifications").where("actorUid", "==", uid)
    );

    await deleteQuery(
      adminDb.collection("notifications").where("userUid", "==", uid)
    );
// Also delete older notifications addressed by username.
const normalizedUsername =
  typeof userData.username === "string"
    ? userData.username.trim()
    : "";

if (normalizedUsername) {
  await deleteQuery(
    adminDb
      .collection("notifications")
      .where("user", "==", normalizedUsername)
  );
}
    // 10. Remove this user from follow relationships.
    deletionStage = "deleting follow relationships";
    await deleteQuery(
      adminDb.collection("follows").where("followerUid", "==", uid)
    );

    await deleteQuery(
      adminDb.collection("follows").where("followingUid", "==", uid)
    );

        // 11. Preserve shared trip chats and remove references to this user.
    deletionStage = "cleaning shared trip chats";

    const chatRefs = new Map<
      string,
      FirebaseFirestore.DocumentReference
    >();

    const participantChats = await adminDb
      .collection("tripChats")
      .where("participants", "array-contains", uid)
      .get();

    const ownerChats = await adminDb
      .collection("tripChats")
      .where("ownerUid", "==", uid)
      .get();

    const completionChats = await adminDb
      .collection("tripChats")
      .where("completionPillionUid", "==", uid)
      .get();

    const reviewedChats = await adminDb
      .collection("tripChats")
      .where("reviewedUsers", "array-contains", uid)
      .get();

    [
      ...participantChats.docs,
      ...ownerChats.docs,
      ...completionChats.docs,
      ...reviewedChats.docs,
    ].forEach((chat) => {
      chatRefs.set(chat.id, chat.ref);
    });

    for (const chatRef of chatRefs.values()) {
      const chatSnapshot = await chatRef.get();

      if (!chatSnapshot.exists) continue;

      const chat = chatSnapshot.data() || {};

      const participants: string[] = Array.isArray(chat.participants)
        ? chat.participants
        : [];

      const participantNames: string[] = Array.isArray(chat.participantNames)
        ? chat.participantNames
        : [];

      const removedIndexes = participants
        .map((participant, index) =>
          participant === uid ? index : -1
        )
        .filter((index) => index !== -1);

      const updatedParticipants = participants.filter(
        (participant) => participant !== uid
      );

      const updatedNames = participantNames.filter(
        (_, index) => !removedIndexes.includes(index)
      );

      const updatedMessages = Array.isArray(chat.messages)
        ? chat.messages.filter(
            (message: any) => message?.senderUid !== uid
          )
        : [];

      const updatedReviewedUsers = Array.isArray(chat.reviewedUsers)
        ? chat.reviewedUsers.filter(
            (reviewedUid: string) => reviewedUid !== uid
          )
        : [];

      const updates: Record<string, any> = {
        participants: updatedParticipants,
        participantNames: updatedNames,
        messages: updatedMessages,
        reviewedUsers: updatedReviewedUsers,
      };

      // If this user was the chat owner, retain the shared chat
      // but remove their account identity.
      if (chat.ownerUid === uid) {
        updates.ownerUid = null;
        updates.owner = "Deleted user";
      }

      // Remove this user's completion and location information
      // if they were selected as the pillion.

// Clear completion GPS and verification records if the
// deleted user was either the trip owner or selected pillion.
if (
  chat.ownerUid === uid ||
  chat.completionPillionUid === uid
) {
  updates.completionPillionUid = FieldValue.delete();
  updates.completionPillionName = FieldValue.delete();
  updates.completionPillionConfirmed = FieldValue.delete();

  updates.completionPillionLatitude = FieldValue.delete();
  updates.completionPillionLongitude = FieldValue.delete();
  updates.completionPillionAccuracy = FieldValue.delete();
  updates.completionPillionDistanceKm = FieldValue.delete();

  updates.completionRequested = false;
  updates.completionRequestedAt = FieldValue.delete();

  updates.completionRiderLatitude = FieldValue.delete();
  updates.completionRiderLongitude = FieldValue.delete();
  updates.completionRiderAccuracy = FieldValue.delete();
  updates.completionRiderDistanceKm = FieldValue.delete();
  updates.completionRiderPillionDistanceMeters = FieldValue.delete();

  updates.completionVerified = false;
  updates.completionVerifiedAt = FieldValue.delete();
}

      await chatRef.update(updates);
    }

    // Also clean trip documents where this user was the selected pillion.
    deletionStage = "cleaning trip completion records";

    const pillionTrips = await adminDb
      .collection("trips")
      .where("completionPillionUid", "==", uid)
      .get();

    for (const trip of pillionTrips.docs) {
      await trip.ref.update({
        completionPillionUid: FieldValue.delete(),
        completionPillionName: FieldValue.delete(),
        completionPillionConfirmed: FieldValue.delete(),
        completionPillionLatitude: FieldValue.delete(),
        completionPillionLongitude: FieldValue.delete(),
        completionPillionAccuracy: FieldValue.delete(),
        completionPillionDistanceKm: FieldValue.delete(),

        // Clear verification and GPS details associated with
        // this completion request.
        completionRequested: false,
        completionRiderLatitude: FieldValue.delete(),
        completionRiderLongitude: FieldValue.delete(),
        completionRiderAccuracy: FieldValue.delete(),
        completionRiderDistanceKm: FieldValue.delete(),
        completionRiderPillionDistanceMeters: FieldValue.delete(),
        completionVerified: false,
        completionVerifiedAt: FieldValue.delete(),
      });
    }
// Remove this user's comments and likes from other riders' trips.
deletionStage = "cleaning trip comments and likes";

const allTripsSnapshot = await adminDb
  .collection("trips")
  .get();

for (const tripDoc of allTripsSnapshot.docs) {
  await adminDb.runTransaction(async (transaction) => {
    const freshSnapshot = await transaction.get(tripDoc.ref);

    if (!freshSnapshot.exists) {
      return;
    }

    const tripData = freshSnapshot.data() || {};

    const comments = Array.isArray(tripData.comments)
      ? tripData.comments
      : [];

    const likedBy = Array.isArray(tripData.likedBy)
      ? tripData.likedBy
      : [];

    // Remove comments written by this user.
    const updatedComments = comments.filter(
      (comment: any) => comment?.userId !== uid
    );

    // Check whether this user liked the trip.
    const userLikedThisTrip = likedBy.includes(uid);

    const updates: Record<string, any> = {};

    if (updatedComments.length !== comments.length) {
      updates.comments = updatedComments;
    }

    // Remove the like and decrement the count only once.
    if (userLikedThisTrip) {
      updates.likedBy = likedBy.filter(
        (likedUid: string) => likedUid !== uid
      );

      updates.likes = Math.max(
        0,
        (Number(tripData.likes) || 0) - 1
      );
    }

    // Update only when cleanup is required.
    if (Object.keys(updates).length > 0) {
      transaction.update(tripDoc.ref, updates);
    }
  });
}

    // 12. Delete trips owned by this user.
    deletionStage = "deleting owned trips";
    for (let i = 0; i < ownedTrips.docs.length; i += 400) {
      const batch = adminDb.batch();

      ownedTrips.docs.slice(i, i + 400).forEach((trip) => {
        batch.delete(trip.ref);
      });

      await batch.commit();
    }

    // 13. Delete the user's profile pictures.
    deletionStage = "deleting profile pictures and feed media";
await adminStorage
  .bucket()
  .deleteFiles({ prefix: `profilePictures/${uid}/` });

// Delete the user's feed photos and videos.
await adminStorage
  .bucket()
  .deleteFiles({ prefix: `feedPosts/${uid}/` });

    // 14. Delete username registry records using Firebase UID.
deletionStage = "deleting username registry record";

await deleteQuery(
  adminDb
    .collection("usernames")
    .where("uid", "==", uid)
);

// Delete the user's Firestore profile.
deletionStage = "deleting Firestore user profile";

if (userSnapshot.exists) {
  await userRef.delete();
}


    // Mark Firestore and Storage cleanup as complete.
    await updateDeletionStage("cleanup_complete");

    await deletionOperationRef.update({
      status: "cleanup_complete",
      cleanupCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Record that Firebase Authentication deletion is starting.
    await deletionOperationRef.update({
      status: "finalization_pending",
      currentStage: "deleting Firebase Authentication account",
      authDeletionStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await updateDeletionStage(
      "deleting Firebase Authentication account"
    );

    // Delete the Firebase Authentication account.
    // If it is already absent, treat that as successful deletion.
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError: any) {
      if (authError?.code !== "auth/user-not-found") {
        throw authError;
      }

      console.log(
        "Firebase Authentication account was already deleted:",
        uid
      );
    }

    // Authentication deletion has succeeded.
    // Try to record final completion, but do not report deletion
    // as failed if only this final status update fails.
    try {
      await deletionOperationRef.update({
        status: "completed",
        currentStage: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (finalStatusError) {
      console.error(
        "Account was deleted, but final operation status could not be updated:",
        finalStatusError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account deletion completed.",
    });


} catch (error) {
  console.error(
    `Account deletion failed during stage: ${deletionStage}`,
    error
  );

  const errorMessage =
    error instanceof Error
      ? error.message.slice(0, 500)
      : "Unknown error";

  // Record the failure if an operation was already created.
  // Never overwrite an operation that is already completed.
  if (
    deletionOperationRef &&
    !(error instanceof Error &&
      error.message === "DELETION_ALREADY_COMPLETED")
  ) {
    try {
      const isFinalizationStage =
        deletionStage ===
        "deleting Firebase Authentication account";

      await deletionOperationRef.update({
        status: isFinalizationStage
          ? "finalization_pending"
          : "failed",
        failedStage: deletionStage,
        failureMessage: errorMessage,
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (operationUpdateError) {
      console.error(
        "Unable to update deletion operation status:",
        operationUpdateError
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Account deletion could not be completed. Please contact support.",
    },
    { status: 500 }
  );
}
}
