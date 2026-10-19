import { useSyncExternalStore } from "react";

export type ColorScheme = "light" | "dark";

function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
	const media = matchMedia("(prefers-color-scheme: dark)");
	media.addEventListener("change", onChange);
	return () => {
		observer.disconnect();
		media.removeEventListener("change", onChange);
	};
}

function getSnapshot(): ColorScheme {
	return getComputedStyle(document.documentElement).colorScheme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): ColorScheme {
	return "light";
}

export function useColorScheme() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
