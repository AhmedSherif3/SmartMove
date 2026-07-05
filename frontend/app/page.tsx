"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/auth/session";
import { GuestHome } from "@/components/guest/GuestHome";

export default function Home() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getAuthSession()));
  }, []);

  return <GuestHome isAuthenticated={authed} />;
}
