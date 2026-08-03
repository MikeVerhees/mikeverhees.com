import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Page Not Found",
};

export default function NotFound() {
	return (
		<>
			<h1 className="text-2xl font-bold">Content not found.</h1>
			<p>
				Go <Link href="/">home</Link>.
			</p>
		</>
	);
}
