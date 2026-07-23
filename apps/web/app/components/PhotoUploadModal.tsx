"use client";

import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { compressProfilePhotoForUpload } from "../lib/imageCompression";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpload: (file: File) => Promise<void>;
  hasExistingPhoto?: boolean;
  onPhotoRemove?: () => Promise<void>;
  isLoading?: boolean;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  onPhotoUpload,
  hasExistingPhoto = false,
  onPhotoRemove,
  isLoading = false,
}: PhotoUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">("idle");

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) {
      setError("Only JPEG, PNG, WEBP, or HEIC images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setSelectedFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl || !croppedAreaPixels || uploading) return;

    setUploading(true);
    setError(null);

    try {
      setPhase("compressing");
      const croppedFile = await cropImageFile(previewUrl, croppedAreaPixels);
      const compressedFile = await compressProfilePhotoForUpload(croppedFile);

      setPhase("uploading");
      await onPhotoUpload(compressedFile);

      resetSelection();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setPhase("idle");
    }
  };

  const handleRemove = async () => {
    if (!hasExistingPhoto || !onPhotoRemove) return;

    setRemoving(true);
    setError(null);

    try {
      await onPhotoRemove();
      resetSelection();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed. Try again.");
    } finally {
      setRemoving(false);
    }
  };

  const handleCancel = () => {
    resetSelection();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="photo-upload-modal-overlay" role="dialog" aria-modal="true">
      <div className="photo-upload-modal">
        <div className="photo-upload-header">
          <h2>Upload Photo</h2>
          <button className="close-button" type="button" onClick={handleCancel} aria-label="Close">×</button>
        </div>

        <div className="photo-upload-content">
          {!previewUrl ? (
            <div className="photo-upload-input-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="photo-input"
                aria-label="Choose photo"
              />
              <div className="photo-upload-placeholder">
                <div className="upload-icon">📷</div>
                <p>Choose a photo from your device</p>
                <p className="upload-hint">JPG, PNG, WEBP or HEIC (max 5MB)</p>
              </div>
            </div>
          ) : (
            <div className="photo-crop-container">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="cover"
              />
              <div className="photo-crop-controls">
                <div className="zoom-control">
                  <label htmlFor="zoom-slider">Zoom</label>
                  <input
                    id="zoom-slider"
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {error && <div className="photo-upload-error">{error}</div>}
        </div>

        <div className="photo-upload-footer">
          {!previewUrl && hasExistingPhoto && onPhotoRemove ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || removing || isLoading}
              className="btn-danger"
            >
              {removing ? "Removing..." : "Remove Photo"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleCancel}
            disabled={uploading || removing || isLoading}
            className="btn-secondary"
          >
            Cancel
          </button>
          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing || isLoading}
              className="btn-primary"
            >
              Choose Photo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || removing || isLoading || !croppedAreaPixels}
              className="btn-primary"
            >
              {phase === "compressing"
                ? "Compressing..."
                : uploading || isLoading
                  ? "Uploading..."
                  : "Upload Photo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

async function cropImageFile(
  previewUrl: string,
  croppedAreaPixels: Area,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = previewUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size,
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }

        const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
        resolve(file);
      }, "image/jpeg", 0.95);
    };
    image.onerror = () => reject(new Error("Failed to load image"));
  });
}
