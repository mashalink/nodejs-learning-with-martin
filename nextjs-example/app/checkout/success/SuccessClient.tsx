"use client";

import { cartCleared } from "@/lib/features/cart/cartSlice";
import { useAppDispatch } from "@/lib/hooks";
import { useEffect } from "react";

export default function SuccessClient() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(cartCleared());
  }, [dispatch]);
  return null;
}
