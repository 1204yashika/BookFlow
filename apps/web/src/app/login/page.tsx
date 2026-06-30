import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui", maxWidth: 360 }}>
      <h1>Log in to BookFlow</h1>
      <form
        action={async (formData) => {
          "use server";
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/",
          });
        }}
      >
        <input name="email" type="email" placeholder="owner@glow.test"
          style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }} />
        <input name="password" type="password" placeholder="password123"
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }} />
        <button type="submit" style={{ padding: "8px 16px" }}>Log in</button>
      </form>
    </main>
  );
}