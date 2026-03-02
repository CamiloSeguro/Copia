import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { router } from "./app/routes";

import { TicketProvider } from "./app/ticketContext";
import { LoansProvider } from "./app/loansContext";

import { CatalogProvider } from "./app/catalogContext";
import { mockResources } from "./data/mockResources";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <CatalogProvider seedResources={mockResources}>
        <TicketProvider>
          <LoansProvider>
            <RouterProvider router={router} />
          </LoansProvider>
        </TicketProvider>
      </CatalogProvider>
    </AuthProvider>
  </React.StrictMode>
);