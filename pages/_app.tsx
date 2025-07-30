import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "../contexts/AuthContext";
import Nav from "../components/Nav";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Nav />
      <main className="pt-16">
        <Component {...pageProps} />
      </main>
    </AuthProvider>
  );
}
