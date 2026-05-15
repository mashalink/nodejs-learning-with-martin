import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../lib/features/cart/cartSlice";
import productsReducer from "../lib/features/products/productsSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      products: productsReducer,
      cart: cartReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
