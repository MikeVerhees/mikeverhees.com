import Image from "next/image";
import { contactLinks } from "@/lib/site";

export default function Footer() {
	return (
		<footer className="p-4">
			{contactLinks.map((link) => (
				<a key={link.label} href={link.href} className="mr-2 inline-block">
					<Image
						src={link.icon}
						className="icon inline-block"
						alt={link.label}
						height={24}
						width={24}
					/>
				</a>
			))}
		</footer>
	);
}
