"use client";

import { useEffect, useState } from "react";
import { AppScreen, TanawButton, BottomNav } from "@/shared/components";
import {
  listObjects,
  saveObject,
  removeObject,
  type TaughtObject,
} from "@/services/storage";
import { speak } from "@/services/speech";

export default function TeachPage() {
  const [objects, setObjects] = useState<TaughtObject[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    setObjects(await listObjects());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSave() {
    if (!name.trim()) return;
    await saveObject({ name: name.trim(), note: note.trim() || undefined });
    setName("");
    setNote("");
    await refresh();
    void speak(`Naitala: ${name.trim()}`);
  }

  return (
    <AppScreen className="safe-pb">
      <div className="mx-3 mt-2 flex flex-1 flex-col rounded-card bg-tanaw-cream p-5">
        <h1 className="font-display text-3xl text-black">Teach My World</h1>
        <p className="mt-2 text-tanaw-muted">
          Name objects around you. Stored on this device for future guidance.
        </p>

        <label className="mt-6 block font-body text-lg" htmlFor="obj-name">
          Object name
        </label>
        <input
          id="obj-name"
          className="mt-1 min-h-touch w-full rounded-tile border-2 border-black/10 bg-white px-4 text-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="mt-4 block font-body text-lg" htmlFor="obj-note">
          Note (optional)
        </label>
        <input
          id="obj-note"
          className="mt-1 min-h-touch w-full rounded-tile border-2 border-black/10 bg-white px-4 text-lg"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <TanawButton className="mt-4 w-full" onClick={() => void onSave()}>
          Save locally
        </TanawButton>

        <ul className="mt-6 space-y-3" aria-label="Taught objects">
          {objects.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-tile bg-white px-4 py-3"
            >
              <div>
                <p className="font-body text-lg">{o.name}</p>
                {o.note ? (
                  <p className="text-sm text-tanaw-muted">{o.note}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="min-h-touch px-3 text-tanaw-danger"
                onClick={() => void removeObject(o.id).then(refresh)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <BottomNav
        items={[
          {
            href: "/vision/view/",
            label: "View",
            iconSrc: "/assets/icons/eye.png",
          },
          {
            href: "/vision/",
            label: "Home",
            iconSrc: "/assets/icons/home.png",
            active: true,
          },
          {
            href: "/vision/video-call/",
            label: "Video Call",
            iconSrc: "/assets/icons/video-call.svg",
          },
        ]}
      />
    </AppScreen>
  );
}
