"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDoc,
  collection,
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, auth, app } from "../firebase";

/* =========================================================
   SETTINGS
========================================================= */

const MAX_VIDEO_DURATION = 30;

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;

const IMAGE_QUALITY = 0.82;

/* =========================================================
   HELPER: FORMAT FILE SIZE
========================================================= */

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* =========================================================
   HELPER: LOAD IMAGE
========================================================= */

async function loadImage(
  file: File
): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup?: () => void;
}> {
  /*
   * First try createImageBitmap.
   */

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);

      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => {
            bitmap.close();
          },
        };
      }
    } catch (error) {
      console.warn(
        "createImageBitmap failed, using browser image fallback:",
        error
      );
    }
  }

  /*
   * Fallback:
   * FileReader + Image.
   */

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image data."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Could not read selected image."));
    };

    reader.onabort = () => {
      reject(new Error("Image reading was cancelled."));
    };

    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error("Image has invalid dimensions."));
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      reject(new Error("Browser could not decode this image."));
    };

    img.src = dataUrl;
  });

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

/* =========================================================
   HELPER: COMPRESS IMAGE
========================================================= */

async function compressImage(file: File): Promise<File> {
  if (!file) {
    throw new Error("No image selected.");
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image.");
  }

  if (file.size <= 0) {
    throw new Error("Selected image is empty.");
  }

  const {
    source,
    width: originalWidth,
    height: originalHeight,
    cleanup,
  } = await loadImage(file);

  try {
    let width = originalWidth;
    let height = originalHeight;

    /*
     * Keep aspect ratio while limiting
     * maximum dimensions.
     */

    if (
      width > MAX_IMAGE_WIDTH ||
      height > MAX_IMAGE_HEIGHT
    ) {
      const widthRatio = MAX_IMAGE_WIDTH / width;
      const heightRatio = MAX_IMAGE_HEIGHT / height;

      const ratio = Math.min(
        widthRatio,
        heightRatio
      );

      width = Math.max(
        1,
        Math.round(width * ratio)
      );

      height = Math.max(
        1,
        Math.round(height * ratio)
      );
    }

    /*
     * Create canvas.
     */

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error("Could not create image canvas.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    /*
     * Draw image.
     */

    context.drawImage(
      source,
      0,
      0,
      width,
      height
    );

    /*
     * Convert to JPEG.
     */

    const blob = await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          (result) => {
            resolve(result);
          },
          "image/jpeg",
          IMAGE_QUALITY
        );
      }
    );

    if (!blob) {
      console.warn(
        "Canvas compression failed. Using original image."
      );

      return file;
    }

    if (blob.size <= 0) {
      console.warn(
        "Compressed image is empty. Using original image."
      );

      return file;
    }

    /*
     * Generate clean JPEG filename.
     */

    const baseName = file.name.replace(
      /\.[^/.]+$/,
      ""
    );

    const compressedFile = new File(
      [blob],
      `${baseName}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );

    /*
     * Never replace an image with a larger file.
     */

    if (compressedFile.size >= file.size) {
      console.log(
        "Compressed file is not smaller. Keeping original."
      );

      return file;
    }

    return compressedFile;
  } finally {
    if (cleanup) {
      cleanup();
    }
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CreatePostPage() {
  const router = useRouter();

  /* =======================================================
     STATE
  ======================================================= */

  const [caption, setCaption] = useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [processingText, setProcessingText] =
    useState("");

  const [videoDuration, setVideoDuration] =
    useState<number | null>(null);

  const [originalFileSize, setOriginalFileSize] =
    useState(0);

  const [optimizedFileSize, setOptimizedFileSize] =
    useState<number | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const previewUrlRef =
    useRef<string | null>(null);

  /* =======================================================
     CLEAN PREVIEW URL
  ======================================================= */

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );

        previewUrlRef.current = null;
      }
    };
  }, []);

  /* =======================================================
     CREATE PREVIEW URL
  ======================================================= */

  const createPreviewUrl = (file: File) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    const url = URL.createObjectURL(file);

    previewUrlRef.current = url;

    setPreviewUrl(url);

    return url;
  };

  /* =======================================================
     CLEAR SELECTED FILE
  ======================================================= */

  const clearSelectedFile = (
    input?: HTMLInputElement
  ) => {
    setSelectedFile(null);
    setVideoDuration(null);
    setOriginalFileSize(0);
    setOptimizedFileSize(null);
    setPreviewUrl("");

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current = null;
    }

    if (input) {
      input.value = "";
    }
  };

  /* =======================================================
     SELECT FILE
  ======================================================= */

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Reset previous file.
     */

    setSelectedFile(null);
    setVideoDuration(null);
    setOptimizedFileSize(null);
    setOriginalFileSize(file.size);
    setPreviewUrl("");

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current = null;
    }

    /* =====================================================
       VIDEO
    ===================================================== */

    if (file.type.startsWith("video/")) {
      const video =
        document.createElement("video");

      const videoUrl =
        URL.createObjectURL(file);

      video.preload = "metadata";

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(videoUrl);

        const duration = video.duration;

        setVideoDuration(duration);

        if (!Number.isFinite(duration)) {
          alert(
            "Could not determine video duration. Please select another video."
          );

          clearSelectedFile(e.target);
          return;
        }

        if (duration > MAX_VIDEO_DURATION) {
          alert(
            `Video is too long.\n\nMaximum allowed duration is ${MAX_VIDEO_DURATION} seconds.`
          );

          clearSelectedFile(e.target);
          return;
        }

        /*
         * Valid video.
         */

        setSelectedFile(file);
        createPreviewUrl(file);
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);

        alert(
          "Unable to read this video. Please select another video."
        );

        clearSelectedFile(e.target);
      };

      video.src = videoUrl;

      return;
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    if (file.type.startsWith("image/")) {
      try {
        setProcessing(true);
        setProcessingText(
          "Optimizing image..."
        );

        const compressed =
          await compressImage(file);

        setSelectedFile(compressed);

        setOptimizedFileSize(
          compressed.size
        );

        createPreviewUrl(compressed);
      } catch (error) {
        console.error(
          "Image processing error:",
          error
        );

        /*
         * Use original image as fallback.
         */

        try {
          setSelectedFile(file);

          setOptimizedFileSize(
            file.size
          );

          createPreviewUrl(file);
        } catch (fallbackError) {
          console.error(
            "Original image fallback failed:",
            fallbackError
          );

          alert(
            "Unable to process this image. Please try another image."
          );

          clearSelectedFile(e.target);
        }
      } finally {
        setProcessing(false);
        setProcessingText("");
      }

      return;
    }

    /* =====================================================
       UNSUPPORTED FILE
    ===================================================== */

    alert(
      "Please select a photo or video."
    );

    clearSelectedFile(e.target);
  };

  /* =========================================================
     CREATE POST
  ========================================================= */

  const createPost = async () => {
    if (uploading || processing) {
      return;
    }

    try {
      console.log(
        "POST BUTTON CLICKED"
      );

      /* =====================================================
         GET CURRENT USER
      ===================================================== */

      const storedUser =
        localStorage.getItem(
          "ridemateUser"
        );

      const currentUser = storedUser
        ? JSON.parse(storedUser)
        : {};

      /*
       * Firebase Auth is the source of truth
       * for the UID.
       */

      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {
        alert(
          "Your login session has expired. Please log in again."
        );

        return;
      }

      if (!currentUser.name) {
        alert(
          "Unable to find your RideMate profile. Please log in again."
        );

        return;
      }

      /* =====================================================
         VALIDATE MEDIA
      ===================================================== */

      if (!selectedFile) {
        alert(
          "Please select a photo or video."
        );

        return;
      }

      /*
       * Check video duration one more time
       * before uploading.
       */

      if (
        selectedFile.type.startsWith("video/") &&
        videoDuration !== null &&
        videoDuration > MAX_VIDEO_DURATION
      ) {
        alert(
          `Video cannot be longer than ${MAX_VIDEO_DURATION} seconds.`
        );

        return;
      }

      /* =====================================================
         START UPLOAD
      ===================================================== */

      setUploading(true);

      console.log(
        "Current RideMate user:",
        currentUser
      );

      console.log(
        "Firebase user:",
        firebaseUser
      );

      /* =====================================================
         SAFE FILE NAME
      ===================================================== */

      const safeFileName =
        selectedFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      const fileName =
        `${Date.now()}_${safeFileName}`;

      /* =====================================================
         FIREBASE STORAGE
      ===================================================== */

      const storage =
        getStorage(app);

      const storageRef =
        ref(
          storage,
          `feedPosts/${firebaseUser.uid}/${fileName}`
        );

      /* =====================================================
         UPLOAD MEDIA
      ===================================================== */

      console.log(
        "Uploading file:",
        selectedFile.name
      );

      console.log(
        "Upload type:",
        selectedFile.type
      );

      console.log(
        "Upload size:",
        formatFileSize(
          selectedFile.size
        )
      );

      await uploadBytes(
        storageRef,
        selectedFile,
        {
          contentType:
            selectedFile.type,

          cacheControl:
            "public,max-age=31536000,immutable",
        }
      );

      console.log(
        "Media upload successful."
      );

      /* =====================================================
         GET DOWNLOAD URL
      ===================================================== */

      const mediaUrl =
        await getDownloadURL(
          storageRef
        );

      console.log(
        "Media URL:",
        mediaUrl
      );

      /* =====================================================
         SAVE FEED POST
         
         IMPORTANT:
         This collection is ONLY for HOME FEED posts.
         It is intentionally separate from trips.
      ===================================================== */

      const postData = {
        /*
         * User identity
         */

        userId:
          firebaseUser.uid,

        userName:
          currentUser.name,

        userImage:
          currentUser.image || "",

        /*
         * Media
         */

        fileName:
          selectedFile.name,

        mediaType:
          selectedFile.type,

        mediaUrl:
          mediaUrl,

        /*
         * Caption
         */

        caption:
          caption.trim(),

        /*
         * Social Feed data
         *
         * These arrays are intentionally kept
         * ready for:
         *
         * - likes
         * - Instagram-style comments
         * - saves
         * - sharing
         */

        likes: 0,

        likedBy: [],

        comments: [],

        savedBy: [],

        shares: 0,

        /*
         * Feed ordering
         */

        createdAt:
          Date.now(),

        updatedAt:
          Date.now(),
      };

      await addDoc(
        collection(
          db,
          "feedPosts"
        ),
        postData
      );

      console.log(
        "Feed post saved successfully:",
        postData
      );

      /* =====================================================
         SUCCESS
      ===================================================== */

      alert(
        "Post created 🔥"
      );

      /*
       * Return to Home Feed.
       */

      router.push("/home");

      router.refresh();
    } catch (error: any) {
      console.error(
        "Error creating post:",
        error
      );

      console.error(
        "Firebase error code:",
        error?.code
      );

      console.error(
        "Firebase error message:",
        error?.message
      );

      alert(
        error?.message
          ? `Error uploading post:\n\n${error.message}`
          : "Error uploading post. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-black text-white pt-28 px-6 pb-16">
      <div className="max-w-4xl mx-auto">

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-5xl font-black text-orange-500">
            Create Post
          </h1>

          <button
            type="button"
            onClick={() =>
              router.push("/home")
            }
            disabled={uploading || processing}
            className="
              px-5
              py-3
              rounded-xl
              bg-zinc-800
              hover:bg-zinc-700
              transition
              font-semibold
              disabled:opacity-50
            "
          >
            Cancel
          </button>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-8">

          {/* =================================================
              MEDIA
          ================================================= */}

          <h2 className="text-2xl font-bold mb-2">
            Add Photo or Video
          </h2>

          <p className="text-zinc-400 mb-6">
            Share your moments from the road
          </p>

          <input
            type="file"
            accept="image/*,video/*"
            disabled={
              uploading ||
              processing
            }
            onChange={
              handleFileChange
            }
            className="
              w-full
              p-4
              rounded-xl
              bg-zinc-800
              cursor-pointer
              disabled:opacity-50
            "
          />

          {/* =================================================
              VIDEO LIMIT NOTICE
          ================================================= */}

          <div
            className="
              mt-4
              rounded-xl
              border
              border-zinc-800
              bg-black/40
              p-4
            "
          >
            <p className="text-sm text-zinc-300">
              🎥 Videos are limited to{" "}
              <span className="font-bold text-orange-500">
                30 seconds
              </span>{" "}
              maximum.
            </p>

            <p className="text-xs text-zinc-500 mt-1">
              Images are automatically optimized
              before upload to keep RideMate fast.
            </p>
          </div>

          {/* =================================================
              PROCESSING
          ================================================= */}

          {processing && (
            <div
              className="
                mt-5
                flex
                items-center
                gap-3
                rounded-xl
                bg-black
                border
                border-zinc-800
                p-4
              "
            >
              <div
                className="
                  w-5
                  h-5
                  border-2
                  border-zinc-700
                  border-t-orange-500
                  rounded-full
                  animate-spin
                "
              />

              <p className="text-orange-400 font-semibold">
                {processingText}
              </p>
            </div>
          )}

          {/* =================================================
              FILE PREVIEW
          ================================================= */}

          {selectedFile && (
            <div className="mt-6">

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-2
                  mb-3
                "
              >
                <p className="text-green-500 font-bold">
                  Selected:
                </p>

                {selectedFile.type.startsWith(
                  "video/"
                ) &&
                  videoDuration !== null && (
                    <span className="text-sm font-bold text-orange-400">
                      {videoDuration.toFixed(1)}s /{" "}
                      {MAX_VIDEO_DURATION}s
                    </span>
                  )}
              </div>

              <p className="mb-4 break-all">
                {selectedFile.name}
              </p>

              {/* =================================================
                  FILE SIZE
              ================================================= */}

              <div
                className="
                  mb-4
                  text-sm
                  text-zinc-400
                  flex
                  flex-wrap
                  gap-x-5
                  gap-y-1
                "
              >
                <span>
                  Size:{" "}
                  <strong className="text-white">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </strong>
                </span>

                {optimizedFileSize !== null &&
                  optimizedFileSize <
                    originalFileSize && (
                    <span className="text-green-400">
                      Optimized from{" "}
                      {formatFileSize(
                        originalFileSize
                      )}
                    </span>
                  )}
              </div>

              {/* =================================================
                  IMAGE PREVIEW
              ================================================= */}

              {selectedFile.type.startsWith(
                "image/"
              ) ? (
                <img
                  src={previewUrl}
                  alt="Post preview"
                  className="
                    max-h-[600px]
                    w-full
                    object-contain
                    rounded-2xl
                    bg-black
                  "
                />
              ) : (
                /* =================================================
                   VIDEO PREVIEW
                ================================================= */

                <video
                  src={previewUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className="
                    max-h-[600px]
                    w-full
                    rounded-2xl
                    bg-black
                  "
                />
              )}

              {/* =================================================
                  REMOVE MEDIA
              ================================================= */}

              <button
                type="button"
                onClick={() =>
                  clearSelectedFile()
                }
                disabled={
                  uploading ||
                  processing
                }
                className="
                  mt-4
                  text-sm
                  text-red-400
                  hover:text-red-300
                  font-semibold
                  disabled:opacity-50
                "
              >
                Remove selected media
              </button>

            </div>
          )}

          {/* =================================================
              CAPTION
          ================================================= */}

          <h2 className="text-2xl font-bold mt-8 mb-2">
            Write a caption
          </h2>

          <textarea
            value={caption}
            onChange={(e) =>
              setCaption(
                e.target.value
              )
            }
            disabled={
              uploading ||
              processing
            }
            placeholder="Share something about this ride..."
            className="
              w-full
              h-32
              p-4
              rounded-xl
              bg-black
              border
              border-zinc-700
              mt-3
              outline-none
              resize-none
              focus:border-orange-500
              disabled:opacity-50
            "
          />

          {/* =================================================
              POST BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={createPost}
            disabled={
              uploading ||
              processing ||
              !selectedFile
            }
            className="
              w-full
              mt-8
              bg-orange-500
              py-5
              rounded-2xl
              text-2xl
              font-black
              hover:bg-orange-400
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {processing
              ? "Optimizing... ⚙️"
              : uploading
              ? "Uploading... ⏳"
              : "Post 🚀"}
          </button>

        </div>
      </div>
    </main>
  );
}