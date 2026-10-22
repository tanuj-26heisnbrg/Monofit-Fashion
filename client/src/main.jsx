import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <App />
          <Toaster position="top-center" toastOptions={{ style: { borderRadius: 0, background: "#000", color: "#fff" } }} />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>,
);
