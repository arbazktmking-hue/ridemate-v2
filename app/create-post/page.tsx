"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

const MAX_VIDEO_DURATION = 30; // seconds

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;

const IMAGE_QUALITY = 0.82;

/* =========================================================
   HELPER: FORMAT FILE SIZE
========================================================= */

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

/* =========================================================
   HELPER: COMPRESS IMAGE
========================================================= */

async function compressImage(
  file: File
): Promise<File> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.onload = () => {
        try {
          let width =
            image.naturalWidth;

          let height =
            image.naturalHeight;

          /*
           * Resize large images while
           * keeping their original aspect ratio.
           */

          if (
            width >
              MAX_IMAGE_WIDTH ||
            height >
              MAX_IMAGE_HEIGHT
          ) {
            const widthRatio =
              MAX_IMAGE_WIDTH /
              width;

            const heightRatio =
              MAX_IMAGE_HEIGHT /
              height;

            const ratio =
              Math.min(
                widthRatio,
                heightRatio
              );

            width = Math.round(
              width * ratio
            );

            height = Math.round(
              height * ratio
            );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            width;

          canvas.height =
            height;

          const context =
            canvas.getContext(
              "2d"
            );

          if (!context) {
            throw new Error(
              "Could not create image canvas."
            );
          }

          /*
           * Better image scaling.
           */

          context.imageSmoothingEnabled =
            true;

          context.imageSmoothingQuality =
            "high";

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          /*
           * Convert to JPEG.
           *
           * This significantly reduces
           * large phone-camera images.
           */

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(
                objectUrl
              );

              if (!blob) {
                reject(
                  new Error(
                    "Image compression failed."
                  )
                );

                return;
              }

              const compressedFile =
                new File(
                  [
                    blob,
                  ],
                  file.name.replace(
                    /\.[^/.]+$/,
                    ""
                  ) + ".jpg",
                  {
                    type:
                      "image/jpeg",
                    lastModified:
                      Date.now(),
                  }
                );

              resolve(
                compressedFile
              );
            },
            "image/jpeg",
            IMAGE_QUALITY
          );
        } catch (error) {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Could not read selected image."
          )
        );
      };

      image.src =
        objectUrl;
    }
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CreatePostPage() {
  const router =
    useRouter();

  const [
    caption,
    setCaption,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    processingText,
    setProcessingText,
  ] = useState("");

  const [
    videoDuration,
    setVideoDuration,
  ] = useState<number | null>(
    null
  );

  const [
    originalFileSize,
    setOriginalFileSize,
  ] = useState(0);

  const [
    optimizedFileSize,
    setOptimizedFileSize,
  ] = useState<number | null>(
    null
  );

  /*
   * Used to clean up preview URLs.
   */

  const previewUrlRef =
    useRef<string | null>(
      null
    );

  /* =========================================================
     CLEAN PREVIEW URL
  ========================================================= */

  useEffect(() => {
    return () => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     SELECT FILE
  ========================================================= */

  const handleFileChange =
    async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }

      /*
       * Reset previous information.
       */

      setVideoDuration(null);

      setOptimizedFileSize(
        null
      );

      setOriginalFileSize(
        file.size
      );

      /*
       * Clean previous preview URL.
       */

      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );

        previewUrlRef.current =
          null;
      }

      /* =====================================================
         VIDEO VALIDATION
      ===================================================== */

      if (
        file.type.startsWith(
          "video/"
        )
      ) {
        const video =
          document.createElement(
            "video"
          );

        const videoUrl =
          URL.createObjectURL(
            file
          );

        video.preload =
          "metadata";

        video.onloadedmetadata =
          () => {
            URL.revokeObjectURL(
              videoUrl
            );

            const duration =
              video.duration;

            setVideoDuration(
              duration
            );

            if (
              !Number.isFinite(
                duration
              )
            ) {
              alert(
                "Could not determine video duration. Please select another video."
              );

              setSelectedFile(
                null
              );

              setOriginalFileSize(
                0
              );

              e.target.value =
                "";

              return;
            }

            /*
             * HARD 30 SECOND LIMIT
             */

            if (
              duration >
              MAX_VIDEO_DURATION
            ) {
              alert(
                `Video is too long.\n\nMaximum allowed duration is ${MAX_VIDEO_DURATION} seconds.`
              );

              setSelectedFile(
                null
              );

              setVideoDuration(
                null
              );

              setOriginalFileSize(
                0
              );

              e.target.value =
                "";

              return;
            }

            /*
             * Valid video.
             */

            previewUrlRef.current =
              URL.createObjectURL(
                file
              );

            setSelectedFile(
              file
            );
          };

        video.onerror =
          () => {
            URL.revokeObjectURL(
              videoUrl
            );

            alert(
              "Unable to read this video. Please select another video."
            );

            setSelectedFile(
              null
            );

            setOriginalFileSize(
              0
            );

            e.target.value =
              "";
          };

        video.src =
          videoUrl;

        return;
      }

      /* =====================================================
         IMAGE
      ===================================================== */

      if (
        file.type.startsWith(
          "image/"
        )
      ) {
        try {
          setProcessing(
            true
          );

          setProcessingText(
            "Optimizing image..."
          );

          const compressed =
            await compressImage(
              file
            );

          setSelectedFile(
            compressed
          );

          setOptimizedFileSize(
            compressed.size
          );

          previewUrlRef.current =
            URL.createObjectURL(
              compressed
            );
        } catch (error) {
          console.error(
            "Image compression error:",
            error
          );

          alert(
            "Unable to process this image. Please try another image."
          );

          setSelectedFile(
            null
          );
        } finally {
          setProcessing(
            false
          );

          setProcessingText(
            ""
          );
        }

        return;
      }

      /*
       * Unsupported format.
       */

      alert(
        "Please select a photo or video."
      );

      setSelectedFile(
        null
      );

      setOriginalFileSize(
        0
      );

      e.target.value =
        "";
    };

  /* =========================================================
     CREATE POST
  ========================================================= */

  const createPost =
    async () => {
      try {
        console.log(
          "POST BUTTON CLICKED"
        );

        const currentUser =
          JSON.parse(
            localStorage.getItem(
              "ridemateUser"
            ) || "{}"
          );

        if (!currentUser.name) {
          alert(
            "No logged in user"
          );

          return;
        }

        if (!selectedFile) {
          alert(
            "Please select a photo or video."
          );

          return;
        }

        /*
         * Double-check video duration
         * before upload.
         */

        if (
          selectedFile.type.startsWith(
            "video/"
          ) &&
          videoDuration !== null &&
          videoDuration >
            MAX_VIDEO_DURATION
        ) {
          alert(
            `Video cannot be longer than ${MAX_VIDEO_DURATION} seconds.`
          );

          return;
        }

        setUploading(
          true
        );

        console.log(
          "Current RideMate user:",
          currentUser
        );

        console.log(
          "Firebase user:",
          auth.currentUser
        );

        /* =====================================================
           FILE NAME
        ===================================================== */

        const fileName =
          `${Date.now()}_${selectedFile.name}`;

        /* =====================================================
           STORAGE
        ===================================================== */

        const storage =
          getStorage(app);

        const storageRef =
          ref(
            storage,
            `feedPosts/${currentUser.uid}/${fileName}`
          );

        /* =====================================================
           UPLOAD
        ===================================================== */

        console.log(
          "Uploading file:",
          selectedFile.name
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

            /*
             * Helps browsers/CDNs cache
             * the media instead of repeatedly
             * treating it as a fresh resource.
             */

            cacheControl:
              "public,max-age=31536000,immutable",
          }
        );

        /* =====================================================
           DOWNLOAD URL
        ===================================================== */

        const mediaUrl =
          await getDownloadURL(
            storageRef
          );

        console.log(
          "Upload successful:",
          mediaUrl
        );

        /* =====================================================
           SAVE POST
        ===================================================== */

        await addDoc(
          collection(
            db,
            "feedPosts"
          ),
          {
            userName:
              currentUser.name,

            userImage:
              currentUser.image ||
              "",

            fileName:
              selectedFile.name,

            mediaType:
              selectedFile.type,

            mediaUrl:
              mediaUrl,

            caption:
              caption.trim(),

            likes:
              0,

            likedBy:
              [],

            comments:
              [],

            createdAt:
              Date.now(),
          }
        );

        console.log(
          "Post saved successfully"
        );

        alert(
          "Post created 🔥"
        );

        router.push(
          "/home"
        );
      } catch (error) {
        console.error(
          "Error creating post:",
          error
        );

        alert(
          "Error uploading post. Please try again."
        );
      } finally {
        setUploading(
          false
        );
      }
    };

  /* =========================================================
     PREVIEW URL
  ========================================================= */

  const previewUrl =
    selectedFile &&
    previewUrlRef.current
      ? previewUrlRef.current
      : "";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-black text-white pt-28 px-6">
      <div className="max-w-4xl mx-auto">

        {/* ===================================================
            TITLE
        =================================================== */}

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Create Post
        </h1>

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

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">

                <p className="text-green-500 font-bold">
                  Selected:
                </p>

                {selectedFile.type.startsWith(
                  "video/"
                ) &&
                  videoDuration !==
                    null && (
                    <span className="text-sm font-bold text-orange-400">
                      {videoDuration.toFixed(
                        1
                      )}s / 30s
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

                {optimizedFileSize !==
                    null &&
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
                  alt="Preview"
                  className="
                    max-h-96
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
                  className="
                    max-h-96
                    w-full
                    rounded-2xl
                    bg-black
                  "
                />
              )}

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
              focus:border-orange-500
              disabled:opacity-50
            "
          />

          {/* =================================================
              POST BUTTON
          ================================================= */}

          <button
            onClick={
              createPost
            }
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