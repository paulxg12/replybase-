"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

type MenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export function DropdownMenu({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <MenuContext.Provider
      value={{
        open,
        setOpen: (next) => onOpenChange?.(next),
      }}
    >
      <div className="relative inline-block">{children}</div>
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactElement;
}) {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    return children;
  }

  if (asChild && isValidElement(children)) {
    const existingOnClick = (children.props as { onClick?: () => void }).onClick;
    return cloneElement(children as any, {
      onClick: () => {
        existingOnClick?.();
        ctx.setOpen(!ctx.open);
      },
    } as any);
  }

  return (
    <button type="button" onClick={() => ctx.setOpen(!ctx.open)}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
}: HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }) {
  const ctx = useContext(MenuContext);
  if (!ctx?.open) {
    return null;
  }

  return (
    <div
      className={`absolute right-0 z-50 mt-2 w-80 rounded-md border border-surface-border bg-white p-1 shadow-lg ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
}: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(MenuContext);

  return (
    <div
      className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-surface-muted ${className ?? ""}`}
      onClick={(event) => {
        onClick?.(event);
        ctx?.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  children,
  className,
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-2 py-1.5 text-sm font-semibold ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`my-1 h-px bg-surface-border ${className ?? ""}`} />;
}
