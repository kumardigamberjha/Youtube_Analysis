import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import Nav from "../components/Nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className={`${inter.variable} font-sans`}>
        <Nav />
        <main className="pt-16">
          <Component {...pageProps} />
        </main>
      </div>
    </AuthProvider>
  );
}
