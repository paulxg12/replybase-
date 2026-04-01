"use client";

import type { ButtonHTMLAttributes } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@replybase/ui";

export const AlertDialog = Dialog;
export const AlertDialogContent = DialogContent;
export const AlertDialogDescription = DialogDescription;
export const AlertDialogTitle = DialogTitle;

type AlertButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function AlertDialogAction({
  className,
  type = "button",
  ...props
}: AlertButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 ${className ?? ""}`}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  type = "button",
  ...props
}: AlertButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md border border-surface-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted ${className ?? ""}`}
      {...props}
    />
  );
}
