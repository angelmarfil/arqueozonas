import { useEffect, useRef, useState, type ReactNode } from "react";
import type * as Leaflet from "leaflet";
import type { MapLabels } from "../i18n/utils";
import { useColorScheme } from "./useColorScheme";
import "leaflet/dist/leaflet.css";

type LeafletModule = typeof Leaflet;

export interface LatLng {
	lat: number;
	lng: number;
}

export type PlaceKind = "site" | "museum";

export const KIND_COLORS: Record<PlaceKind, string> = {
	site: "bg-primary text-primary-content",
	museum: "bg-secondary text-secondary-content",
};

export const KIND_PATHS: Record<PlaceKind, string> = {
	site: '<path fill="currentColor" d="M12.8 3.44c-.38-.5-1.22-.5-1.6 0l-9 12a.996.996 0 0 0 .39 1.51l9 4a.98.98 0 0 0 .82 0l9-4a.996.996 0 0 0 .39-1.51zm-.8 15.5V5.71l7.45 9.93L12 18.95Z"/>',
	museum:
		'<path fill="currentColor" d="m21.49 7.13l-9-5a.99.99 0 0 0-.97 0l-9.01 5C2.19 7.31 2 7.64 2 8v2c0 .55.45 1 1 1h2v7H3c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h18c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-2v-7h2c.55 0 1-.45 1-1V8a1 1 0 0 0-.51-.87M9 18H7v-7h2zm4 0h-2v-7h2zm-1-9c-.83 0-1.5-.67-1.5-1.5S11.17 6 12 6s1.5.67 1.5 1.5S12.83 9 12 9m5 9h-2v-7h2z"/>',
};

export function kindIcon(kind: PlaceKind, className: string) {
	return `<svg viewBox="0 0 24 24" class="${className}" aria-hidden="true">${KIND_PATHS[kind]}</svg>`;
}

export function decodePath(encoded: string) {
	const path: LatLng[] = [];
	const coordinate = [0, 0];
	let index = 0;
	while (index < encoded.length) {
		for (let axis = 0; axis < 2; axis++) {
			let result = 0;
			let shift = 0;
			let byte: number;
			do {
				byte = encoded.charCodeAt(index++) - 63;
				result |= (byte & 0x1f) << shift;
				shift += 5;
			} while (byte >= 0x20);
			coordinate[axis] += result & 1 ? ~(result >> 1) : result >> 1;
		}
		path.push({ lat: coordinate[0] / 1e5, lng: coordinate[1] / 1e5 });
	}
	return path;
}

export interface LeafletMap {
	L: LeafletModule;
	map: Leaflet.Map;
}

const STREETS_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const STREETS_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PLACES_URL =
	"https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const IMAGERY_ATTRIBUTION = "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const FULLSCREEN_ICON =
	'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>';
const HINT_DURATION = 1500;

async function loadLeaflet() {
	const module: LeafletModule & { default?: LeafletModule } = await import("leaflet");
	return module.default ?? module;
}

export function streetsLayer(L: LeafletModule) {
	return L.tileLayer(STREETS_URL, { attribution: STREETS_ATTRIBUTION, maxZoom: 19, className: "map-streets" });
}

export function satelliteLayer(L: LeafletModule) {
	return L.layerGroup([
		L.tileLayer(IMAGERY_URL, { attribution: IMAGERY_ATTRIBUTION, maxNativeZoom: 18, maxZoom: 19 }),
		L.tileLayer(PLACES_URL, { maxNativeZoom: 18, maxZoom: 19 }),
	]);
}

function fullscreenControl(L: LeafletModule, frame: HTMLElement, label: string) {
	const control = new L.Control({ position: "topright" });
	control.onAdd = () => {
		const bar = L.DomUtil.create("div", "leaflet-bar");
		const button = L.DomUtil.create("a", "", bar);
		button.href = "#";
		button.role = "button";
		button.title = label;
		button.setAttribute("aria-label", label);
		button.innerHTML = FULLSCREEN_ICON;
		L.DomEvent.disableClickPropagation(bar);
		L.DomEvent.on(button, "click", (event) => {
			L.DomEvent.preventDefault(event);
			if (document.fullscreenElement) document.exitFullscreen();
			else frame.requestFullscreen();
		});
		return bar;
	};
	return control;
}

export function useLeafletMap(labels: MapLabels) {
	const frameRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<HTMLDivElement>(null);
	const [leaflet, setLeaflet] = useState<LeafletMap>();
	const [hint, setHint] = useState({ text: "", visible: false });
	const dark = useColorScheme() === "dark";

	useEffect(() => {
		const frame = frameRef.current;
		const element = mapRef.current;
		if (!frame || !element) return;
		let map: Leaflet.Map | undefined;
		let mobile = false;
		let cancelled = false;
		let timeout: number | undefined;
		const scrollHint = labels.scrollHint.replace("{key}", navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl");
		const isFullscreen = () => document.fullscreenElement === frame;

		const showHint = (text: string) => {
			setHint({ text, visible: true });
			clearTimeout(timeout);
			timeout = window.setTimeout(() => setHint((current) => ({ ...current, visible: false })), HINT_DURATION);
		};

		const onWheel = (event: WheelEvent) => {
			if (!map) return;
			if (event.ctrlKey || event.metaKey || isFullscreen()) {
				event.preventDefault();
				map.scrollWheelZoom.enable();
			} else {
				map.scrollWheelZoom.disable();
				showHint(scrollHint);
			}
		};

		const onTouchMove = (event: TouchEvent) => {
			if (map && !map.dragging.enabled() && event.touches.length === 1) showHint(labels.touchHint);
		};

		const onFullscreenChange = () => {
			if (!map) return;
			if (isFullscreen() || !mobile) map.dragging.enable();
			else map.dragging.disable();
			map.invalidateSize();
		};

		loadLeaflet().then((L) => {
			if (cancelled) return;
			mobile = L.Browser.mobile;
			map = L.map(element, { zoomControl: false, scrollWheelZoom: false, dragging: !mobile });
			L.control.zoom({ zoomInTitle: labels.zoomIn, zoomOutTitle: labels.zoomOut }).addTo(map);
			if (document.fullscreenEnabled) fullscreenControl(L, frame, labels.fullscreen).addTo(map);
			setLeaflet({ L, map });
		});

		frame.addEventListener("wheel", onWheel, { capture: true, passive: false });
		frame.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("fullscreenchange", onFullscreenChange);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
			frame.removeEventListener("wheel", onWheel, { capture: true });
			frame.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			map?.remove();
			setLeaflet(undefined);
		};
	}, [labels]);

	return { frameRef, mapRef, leaflet, hint, dark };
}

interface MapFrameProps {
	map: ReturnType<typeof useLeafletMap>;
	label: string;
	className?: string;
	children?: ReactNode;
}

export function MapFrame({ map, label, className = "", children }: MapFrameProps) {
	return (
		<div
			ref={map.frameRef}
			role="region"
			aria-label={label}
			className={`relative isolate overflow-hidden ${map.dark ? "map-dark" : ""} ${className}`}
		>
			<div ref={map.mapRef} className="size-full" />
			<div
				aria-hidden="true"
				className={`pointer-events-none absolute inset-0 z-1001 grid place-items-center bg-black/50 p-6 text-center text-lg font-medium text-white transition-opacity duration-300 ${map.hint.visible ? "opacity-100" : "opacity-0"}`}
			>
				{map.hint.text}
			</div>
			{children}
		</div>
	);
}
