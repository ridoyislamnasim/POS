"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Camera, Lock, Save, AlertCircle, Eye, EyeOff, Trash2 } from "lucide-react";
import { useProfile, useUpdateProfile, useChangePassword } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileUrl } from "@/lib/api";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHeader } from "@/components/ui";

export default function ProfilePage() {
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  // Newly-picked image (base64) waiting to be saved, and a flag for remove.
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name);
      setImageDataUrl(null);
      setRemoveImage(false);
    }
  }, [profileQuery.data]);

  const savedImageUrl = removeImage
    ? null
    : imageDataUrl ?? profileQuery.data?.imageUrl ?? null;
  const avatarSrc = fileUrl(savedImageUrl);

  const initials = (profileQuery.data?.name ?? name ?? "U")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file afterwards.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError(null, "Please select an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toastError(null, "Image must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageDataUrl(dataUrl);
      setRemoveImage(false);
    };
    reader.onerror = () => toastError(null, "Could not read the image file");
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageDataUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveProfile() {
    try {
      const imageUrl = imageDataUrl
        ? imageDataUrl
        : removeImage
          ? null
          : undefined;
      await updateProfile.mutateAsync({
        name: name.trim() || undefined,
        imageUrl,
      });
      toastSuccess("Profile updated");
      setImageDataUrl(null);
      setRemoveImage(false);
      void profileQuery.refetch();
    } catch (e) {
      toastError(e, "Could not save profile");
    }
  }

  function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess("Password changed successfully");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => setPasswordSuccess(""), 3000);
        },
        onError: (e) => {
          const err = e as Error & { code?: string };
          setPasswordError(err.code === "FORBIDDEN"
            ? "Current password is incorrect"
            : "Could not change password");
        },
      },
    );
  }

  if (profileQuery.isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (profileQuery.isError) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-muted-foreground">Failed to load profile</p>
            <Button variant="outline" className="mt-4" onClick={() => void profileQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const data = profileQuery.data;

  return (
    <AppShell>
      <PageHeader title="Profile" description="Manage your account information and password" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <div className="rounded-md border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile Information</h2>
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Profile photo"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Change photo"
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/80"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <div>
                <p className="text-sm font-medium">{data?.name}</p>
                <p className="text-xs text-muted-foreground">{data?.email}</p>
              </div>
            </div>

            {(imageDataUrl || removeImage) && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {imageDataUrl
                    ? "New photo selected — Save Profile to apply."
                    : "Photo will be removed when you save."}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={!imageDataUrl && removeImage}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            )}

            <div>
              <span className="text-sm font-medium">Name</span>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <span className="text-sm font-medium">Email</span>
              <Input value={data?.email ?? ""} disabled className="mt-1 opacity-60" />
            </div>
            <div>
              <span className="text-sm font-medium">Locale</span>
              <Input value={data?.locale ?? ""} disabled className="mt-1 opacity-60" />
            </div>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-md border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Security</h2>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-primary underline"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            <Lock className="h-4 w-4" />
            {showPasswordForm ? "Hide password form" : "Change Password"}
          </button>

          {showPasswordForm && (
            <div className="mt-4 grid gap-3">
              <div>
                <span className="text-sm font-medium">Current Password</span>
                <div className="relative mt-1">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
<div>
                <span className="text-sm font-medium">New Password</span>
                <div className="relative mt-1">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
<div>
                <span className="text-sm font-medium">Confirm New Password</span>
                <div className="relative mt-1">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-600">{passwordSuccess}</p>
              )}
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={changePassword.isPending}
                variant="secondary"
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing…
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
