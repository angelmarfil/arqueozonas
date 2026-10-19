import { useSyncExternalStore } from "react";
import { ColorScheme } from "@vis.gl/react-google-maps";

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

function getSnapshot() {
	return getComputedStyle(document.documentElement).colorScheme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT;
}

function getServerSnapshot() {
	return ColorScheme.LIGHT;
}

export function useColorScheme() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
