import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthPage } from "@/components/AuthPage";
const mocks = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), navigate: vi.fn() }));
vi.mock("@/components/Logo", () => ({ Logo: () => null }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("authentication without a challenge", () => {
  for (const mode of ["login", "signup"] as const) {
    it(`submits ${mode} with email and password only`, async () => {
      render(<AuthPage />);
      if (mode === "signup") fireEvent.click(screen.getByRole("tab", { name: "Sign up" }));
      fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "qa@example.com" } });
      fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: "QaTest123!" } });
      if (mode === "signup") fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "QaTest123!" } });
      fireEvent.submit(screen.getByLabelText(/^Email/).closest("form")!);
      await waitFor(() => expect(mocks[mode]).toHaveBeenCalledWith("qa@example.com", "QaTest123!"));
      await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
      expect(document.querySelector('iframe')).toBeNull();
    });
  }
});
