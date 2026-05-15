import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  // Supabase returns `numeric` as a string to preserve precision — coerce
  // with Number(price) at the render site.
  price: string;
  category_id: string;
  image_url: string | null;
  status: "active" | "archived";
  stock_quantity: number;
  reorder_threshold: number;
  supplier: string;
  created_at: string;
  updated_at: string;
};

type Status = "idle" | "loading" | "succeeded" | "failed";

type ProductsState = {
  items: Product[];
  status: Status;
  error: string | null;
  selectedId: string | null;
};

const initialState: ProductsState = {
  items: [],
  status: "idle",
  error: null,
  selectedId: null,
};

export const fetchProducts = createAsyncThunk<Product[]>(
  "products/fetch",
  async () => {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Failed to load products");
    return res.json();
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    productSelected(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    productDeselected(state) {
      state.selectedId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchProducts.fulfilled,
        (state, action: PayloadAction<Product[]>) => {
          state.status = "succeeded";
          state.items = action.payload;
        }
      )
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { productSelected, productDeselected } = productsSlice.actions;
export default productsSlice.reducer;
