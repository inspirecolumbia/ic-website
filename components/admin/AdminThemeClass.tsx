"use client";

import { useEffect } from "react";

// Dialog/AlertDialog/Select/DropdownMenu portal their content straight to
// document.body, bypassing the admin layout's own DOM subtree, so the
// admin-theme token overrides have to live on body itself to reach them.
export default function AdminThemeClass() {
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => {
      document.body.classList.remove("admin-theme");
    };
  }, []);

  return null;
}
