import { Outlet } from "react-router-dom";
import { PasswordModal } from "./PasswordModal";
import { Toast } from "./Toast";
import { usePdf } from "../store/PdfContext";

export function Layout() {
  const { bytes } = usePdf();
  return (
    <div className={bytes ? "h-dvh overflow-hidden" : "min-h-dvh"}>
      <Outlet />
      <Toast />
      <PasswordModal />
    </div>
  );
}
