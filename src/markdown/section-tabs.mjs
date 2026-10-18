const element = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });

const sectionTabs = {
	name: "section-tabs",
	after(root, ctx) {
		const intro = [];
		const sections = [];
		for (const node of root.children) {
			if (node.type === "element" && node.tagName === "h2") sections.push({ heading: node, children: [] });
			else (sections.at(-1)?.children ?? intro).push(node);
		}
		if (sections.length < 2) return;

		ctx.replaceNode(root, {
			...root,
			children: [
				...intro,
				element(
					"div",
					{ role: "tablist", className: ["tabs", "tabs-lift", "tabs-sm", "sm:tabs-md", "not-prose"] },
					sections.flatMap(({ heading, children }, index) => [
						element("input", {
							type: "radio",
							name: "site-sections",
							className: ["tab"],
							ariaLabel: ctx.textContent(heading),
							checked: index === 0,
						}),
						element("div", { className: ["tab-content", "border-base-300", "bg-base-100", "p-6"] }, [
							element("div", { className: ["prose", "max-w-none"] }, [
								{ ...heading, properties: { ...heading.properties, className: ["sr-only"] } },
								...children,
							]),
						]),
					]),
				),
			],
		});
	},
};

export default ({ fileURL }) => fileURL?.pathname.includes("/src/data/sites/") && sectionTabs;
