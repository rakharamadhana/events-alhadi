"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { updateProfile, uploadProfilePhoto } from "@/app/actions/auth";

type ProfileUser = {
  name: string;
  email: string;
  profileImageUrl: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  gender: string | null;
  birthYear: number | null;
  bio: string | null;
};

type ProfileFormProps = {
  user: ProfileUser;
  labels: {
    changePhoto: string;
    photoHelp: string;
    displayName: string;
    phone: string;
    city: string;
    country: string;
    gender: string;
    birthYear: string;
    notes: string;
    optional: string;
    notesPlaceholder: string;
    saveProfile: string;
    saving: string;
    photoUpdated: string;
    profileUpdated: string;
    photoUploadError: string;
    profileUpdateError: string;
  };
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function ProfileForm({ user, labels }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isChinese = labels.gender === "性別";

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await uploadProfilePhoto(formData);
      if (result.success) {
        setProfileImageUrl(result.profileImageUrl ?? null);
        setMessage(labels.photoUpdated);
        router.refresh();
      } else {
        setError(result.error ?? labels.photoUploadError);
      }
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        setMessage(labels.profileUpdated);
        router.refresh();
      } else {
        setError(result.error ?? labels.profileUpdateError);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-2xl sm:p-8">
      <div className="flex flex-col gap-5 border-b border-gray-700 pb-6 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 text-2xl font-black text-emerald-400">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">{initials(user.name)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="mt-1 truncate text-sm text-gray-400">{user.email}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <PhotoIcon className="h-4 w-4" />
            {labels.changePhoto}
          </button>
          <p className="mt-2 text-xs text-gray-400">{labels.photoHelp}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.currentTarget));
        }}
        key={`${user.name}-${user.phone ?? ""}-${user.city ?? ""}-${user.country ?? ""}-${user.gender ?? ""}-${user.birthYear ?? ""}-${user.bio ?? ""}`}
        className="mt-6 space-y-5"
      >
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            {message}
          </div>
        )}

        <input type="hidden" name="profileImageUrl" value={profileImageUrl ?? ""} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.displayName}</span>
            <input
              name="name"
              required
              minLength={2}
              defaultValue={user.name}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.phone}</span>
            <input
              name="phone"
              defaultValue={user.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
              placeholder={labels.optional}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.city}</span>
            <input
              name="city"
              defaultValue={user.city ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
              placeholder={labels.optional}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.country}</span>
            <input
              name="country"
              defaultValue={user.country ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
              placeholder={labels.optional}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.gender}</span>
            <select
              name="gender"
              defaultValue={user.gender ?? ""}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 cursor-pointer"
            >
              <option value="">{isChinese ? "請選擇" : "Select Gender"} ({labels.optional})</option>
              <option value="Male">{isChinese ? "男" : "Male"}</option>
              <option value="Female">{isChinese ? "女" : "Female"}</option>
              <option value="Prefer not to say">{isChinese ? "不便透露" : "Prefer not to say"}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {isChinese ? "出生日期" : "Date of Birth"}
            </span>
            <input
              name="birthYear"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              defaultValue={user.birthYear ? `${user.birthYear}-01-01` : ""}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500 cursor-pointer"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{labels.notes}</span>
          <textarea
            name="bio"
            rows={4}
            defaultValue={user.bio ?? ""}
            className="mt-1 w-full resize-y rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
            placeholder={labels.notesPlaceholder}
          />
        </label>

        {/* Optional demographic disclaimer */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-3.5 flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
          <InformationCircleIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-300">
              {isChinese ? "個人資訊宣告" : "Demographic Disclaimer"}
            </p>
            <p className="mt-1 text-gray-400/90">
              {isChinese
                ? "所有資訊均為選填。您所提供的資訊將用於建立去識別化的描述性人口統計統計。"
                : "All information is optional. The information given is used to make descriptive demographics."}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-gray-900 transition hover:bg-emerald-400 disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {isPending ? labels.saving : labels.saveProfile}
        </button>
      </form>
    </div>
  );
}
