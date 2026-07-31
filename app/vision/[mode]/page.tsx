import { ModeShell } from "@/features/vision/ModeShell";
import { getMode, type ModeId } from "@/features/vision/modes";
import { notFound } from "next/navigation";

const IDS: ModeId[] = ["outdoor", "indoor", "social", "study", "cooking"];

export function generateStaticParams() {
  return IDS.map((id) => ({ mode: id }));
}

export default function VisionModePage({
  params,
}: {
  params: { mode: string };
}) {
  if (!IDS.includes(params.mode as ModeId)) notFound();
  const mode = getMode(params.mode as ModeId);
  return <ModeShell mode={mode} />;
}
