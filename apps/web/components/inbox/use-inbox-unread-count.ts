"use client";

import { useEffect, useState } from "react";
import { subscribeInboxUnreadCount } from "./inbox-live";

export function useInboxUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeInboxUnreadCount(setCount), []);

  return count;
}
