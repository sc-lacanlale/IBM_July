"use client";

type Handler = (payload?: string) => void;
type LabelHandler = (label: string) => void;
type VoidHandler = () => void;
type BoolHandler = (listening: boolean) => void;

const describeHandlers = new Set<Handler>();
const enrollHandlers = new Set<LabelHandler>();
const voiceToggleHandlers = new Set<VoidHandler>();
const voiceStateHandlers = new Set<BoolHandler>();
let voiceListening = false;

export function onDescribeRequested(handler: Handler): () => void {
  describeHandlers.add(handler);
  return () => describeHandlers.delete(handler);
}

export function requestDescribe(payload?: string): boolean {
  if (describeHandlers.size === 0) return false;
  describeHandlers.forEach((h) => h(payload));
  return true;
}

export function onEnrollRequested(handler: LabelHandler): () => void {
  enrollHandlers.add(handler);
  return () => enrollHandlers.delete(handler);
}

export function requestEnroll(label: string): boolean {
  if (enrollHandlers.size === 0) return false;
  enrollHandlers.forEach((h) => h(label));
  return true;
}

export function onVoiceToggle(handler: VoidHandler): () => void {
  voiceToggleHandlers.add(handler);
  return () => voiceToggleHandlers.delete(handler);
}

export function requestVoiceToggle(): void {
  voiceToggleHandlers.forEach((h) => h());
}

export function onVoiceListening(handler: BoolHandler): () => void {
  voiceStateHandlers.add(handler);
  handler(voiceListening);
  return () => voiceStateHandlers.delete(handler);
}

export function setVoiceListening(listening: boolean): void {
  voiceListening = listening;
  voiceStateHandlers.forEach((h) => h(listening));
}

export function getVoiceListening(): boolean {
  return voiceListening;
}
