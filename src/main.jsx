import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GuestDataProvider } from "./context/GuestDataContext.jsx";
import { SpotsProvider } from "./context/SpotsContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpotsProvider>
      <AuthProvider>
        <GuestDataProvider>
          <App />
        </GuestDataProvider>
      </AuthProvider>
    </SpotsProvider>
  </StrictMode>
);
