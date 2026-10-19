import boxicons from "@iconify-json/boxicons/icons.json" with { type: "json" };
import { defaultLang, ui } from "../i18n/ui.ts";

const element = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });
const text = (value) => ({ type: "text", value });

const SECTIONS = {
	description: { icon: "info-circle" },
	history: { icon: "book-open" },
	hours: { icon: "clock", visit: 0 },
	fees: { icon: "ticket", visit: 1 },
	location: { icon: "map", visit: 2 },
	access: { icon: "car", visit: 3 },
	important: { icon: "alert-circle", visit: 4 },
	contact: { icon: "phone", visit: 5 },
};

const VISIT_ICON = "compass";

const icon = (name, className) => {
	const { body } = boxicons.icons[name];
	const shapes = [...body.matchAll(/<(\w+)([^>]*)\/>/g)].map(([, tagName, attributes]) =>
		element(tagName, Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]))),
	);
	return element(
		"svg",
		{
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: `0 0 ${boxicons.width} ${boxicons.height}`,
			className,
			ariaHidden: "true",
		},
		shapes,
	);
};

const withIcon = (iconName, children, className) =>
	iconName ? [icon(iconName, className), ...children] : children;

const article = (sections) =>
	element(
		"div",
		{
			className: [
				"prose",
				"max-w-[65ch]",
				"text-pretty",
				"prose-p:leading-relaxed",
				"prose-headings:tracking-tight",
				"prose-h2:flex",
				"prose-h2:items-center",
				"prose-h2:gap-2",
				"[&>h2:first-child]:mt-0",
			],
		},
		sections.flatMap(({ heading, icon: iconName, children }) => [
			{ ...heading, children: withIcon(iconName, heading.children, ["size-6", "shrink-0", "text-base-content/50"]) },
			...children,
		]),
	);

const visitPanel = (label, sections) =>
	element(
		"aside",
		{ className: ["rounded-box", "bg-base-200", "p-6", "self-start", "max-lg:order-first", "lg:sticky", "lg:top-22"] },
		[
			element("h2", { className: ["flex", "items-center", "gap-2", "text-lg", "font-bold", "tracking-tight"] }, [
				icon(VISIT_ICON, ["size-5", "shrink-0", "text-base-content/60"]),
				text(label),
			]),
			element(
				"div",
				{ className: ["mt-2", "divide-y", "divide-base-300"] },
				sections.map(({ label, icon: iconName, children }) =>
					element("section", { className: ["flex", "gap-3", "py-4", "last:pb-0"] }, [
						icon(iconName, ["size-5", "shrink-0", "text-base-content/60"]),
						element("div", { className: ["min-w-0", "flex-1"] }, [
							element("h3", { className: ["text-sm", "font-semibold"] }, [text(label)]),
							element(
								"div",
								{ className: ["prose", "prose-sm", "mt-1", "text-pretty", "prose-p:my-1", "prose-p:leading-relaxed"] },
								children,
							),
						]),
					]),
				),
			),
		],
	);

const siteSections = (lang) => ({
	name: "site-sections",
	after(root, ctx) {
		const intro = [];
		const sections = [];
		for (const node of root.children) {
			if (node.type === "element" && node.tagName === "h2") {
				sections.push({ heading: node, label: ctx.textContent(node), ...SECTIONS[node.properties?.id], children: [] });
			} else (sections.at(-1)?.children ?? intro).push(node);
		}
		if (sections.length === 0) return;

		const readingSections = sections.filter(({ visit }) => visit === undefined);
		const visitSections = sections.filter(({ visit }) => visit !== undefined).sort((a, b) => a.visit - b.visit);
		const visitLabel = (ui[lang] ?? ui[defaultLang])["site.section.visit"];

		ctx.replaceNode(root, {
			...root,
			children: [
				...intro,
				element(
					"div",
					{
						className: [
							"grid",
							"gap-10",
							...(readingSections.length > 0 && visitSections.length > 0 ? ["lg:grid-cols-[minmax(0,1fr)_20rem]", "lg:gap-12"] : []),
						],
					},
					[
						...(readingSections.length > 0 ? [article(readingSections)] : []),
						...(visitSections.length > 0 ? [visitPanel(visitLabel, visitSections)] : []),
					],
				),
			],
		});
	},
});

export default ({ fileURL }) => {
	const match = fileURL?.pathname.match(/\/src\/data\/(?:sites|museums)\/(\w+)\//);
	return match ? siteSections(match[1]) : false;
};
