import { siteTitle, siteUrl } from "@/lib/site";

export default function JsonLd() {
	const data = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Person",
				name: "Mike Verhees",
				url: siteUrl,
				email: "mailto:mail@mikeverhees.com",
				jobTitle: "Software Developer",
				worksFor: {
					"@type": "Organization",
					name: "OrcaGroup",
					url: "https://www.orcagroup.com/",
				},
				sameAs: ["https://github.com/mikeverhees"],
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
