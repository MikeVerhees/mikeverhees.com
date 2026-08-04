import { author, contactLinks, siteTitle, siteUrl } from "@/lib/site";

export default function JsonLd() {
	const githubUrl = contactLinks.find((link) => link.label === "GitHub")?.href;

	const data = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Person",
				name: author.name,
				url: author.url,
				email: `mailto:${author.email}`,
				jobTitle: "Software Developer",
				worksFor: {
					"@type": "Organization",
					name: "OrcaGroup",
					url: "https://www.orcagroup.com/",
				},
				sameAs: githubUrl ? [githubUrl] : undefined,
			},
			{
				"@type": "WebSite",
				name: siteTitle,
				url: siteUrl,
			},
		],
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	);
}
