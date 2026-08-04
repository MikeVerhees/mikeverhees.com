import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Footer from "@/components/Footer";
import { author, siteDescription, siteTitle, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: siteTitle,
		template: `%s | ${siteTitle}`,
	},
	description: siteDescription,
	authors: [{ name: author.name, url: author.url }],
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		title: siteTitle,
		description: siteDescription,
		siteName: siteTitle,
		locale: "en_US",
	},
	twitter: {
		card: "summary",
		title: siteTitle,
		description: siteDescription,
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<a href="#skip" className="sr-only">
					Skip to main content
				</a>

				<header className="flex items-center gap-2 border-b border-dashed border-gray-20 p-4">
					<Link href="/" className="font-bold no-underline">
						{siteTitle}
					</Link>
				</header>

				<main id="skip" className="p-4">
					{children}
				</main>

				<Footer />
			</body>
		</html>
	);
}
