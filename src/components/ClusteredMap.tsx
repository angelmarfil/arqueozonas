import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
	APIProvider,
	AdvancedMarker,
	AdvancedMarkerAnchorPoint,
	Map,
	useMap,
	useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GENERAL_MAP_ID } from "astro:env/client";
import { useColorScheme } from "./useColorScheme";

const MIN_SPAN = 0.5;

export interface MapSite {
	id: string;
	name: string;
	href: string;
	position: google.maps.LatLngLiteral;
	cover?: string;
	isOpen?: boolean;
}

export interface MapLabels {
	open: string;
	closed: string;
	details: string;
	close: string;
}

interface Props {
	sites: MapSite[];
	lang: string;
	labels: MapLabels;
	closeIcon?: ReactNode;
}

function expand(min: number, max: number) {
	const extra = Math.max(0, MIN_SPAN - (max - min)) / 2;
	return [min - extra, max + extra];
}

function getBounds(sites: MapSite[]) {
	const lats = sites.map(({ position }) => position.lat);
	const lngs = sites.map(({ position }) => position.lng);
	const [south, north] = expand(Math.min(...lats), Math.max(...lats));
	const [west, east] = expand(Math.min(...lngs), Math.max(...lngs));
	return { north, south, east, west, padding: 48 };
}

const clusterRenderer = (markerLibrary: google.maps.MarkerLibrary): Renderer => ({
	render: ({ count, position }) => {
		const content = document.createElement("div");
		content.className =
			"bg-primary text-primary-content ring-primary/30 grid size-9 place-items-center rounded-full text-xs font-bold shadow-md ring-4";
		content.textContent = String(count);
		return new markerLibrary.AdvancedMarkerElement({ position, content, zIndex: 1000 + count });
	},
});

interface SiteMarkerProps {
	site: MapSite;
	onClick: (id: string) => void;
	setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => void;
}

function SiteMarker({ site, onClick, setMarkerRef }: SiteMarkerProps) {
	const ref = useCallback(
		(marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, site.id),
		[setMarkerRef, site.id],
	);

	return (
		<AdvancedMarker
			position={site.position}
			title={site.name}
			ref={ref}
			anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
			onClick={() => onClick(site.id)}
		>
			<span className="bg-primary block size-4 rounded-full border-2 border-white shadow-md" />
		</AdvancedMarker>
	);
}

function ClusteredMarkers({ sites, labels, closeIcon }: Omit<Props, "lang">) {
	const map = useMap();
	const markerLibrary = useMapsLibrary("marker");
	const [markers, setMarkers] = useState<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = sites.find(({ id }) => id === selectedId);

	const clusterer = useMemo(
		() => map && markerLibrary && new MarkerClusterer({ map, renderer: clusterRenderer(markerLibrary) }),
		[map, markerLibrary],
	);

	useEffect(() => {
		if (!clusterer) return;
		clusterer.clearMarkers();
		clusterer.addMarkers(Object.values(markers));
	}, [clusterer, markers]);

	useEffect(() => () => clusterer?.setMap(null), [clusterer]);

	const closeButtonRef = useCallback((button: HTMLButtonElement | null) => {
		if (!button) return;
		const close = () => setSelectedId(null);
		button.addEventListener("click", close);
		return () => button.removeEventListener("click", close);
	}, []);

	useEffect(() => {
		if (!selectedId) return;
		const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId(null);
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [selectedId]);

	const setMarkerRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
		setMarkers((current) => {
			if (Boolean(marker) === id in current) return current;
			if (marker) return { ...current, [id]: marker };
			const { [id]: _, ...rest } = current;
			return rest;
		});
	}, []);

	return (
		<>
			{sites.map((site) => (
				<SiteMarker key={site.id} site={site} onClick={setSelectedId} setMarkerRef={setMarkerRef} />
			))}
			{selected && (
				<AdvancedMarker
					position={selected.position}
					anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM_CENTER}
					zIndex={2000}
					clickable
				>
					<div className="card bg-base-100 text-base-content mb-4 w-72 shadow-xl">
						{selected.cover && (
							<figure>
								<img src={selected.cover} alt="" loading="lazy" className="aspect-video w-full object-cover" />
							</figure>
						)}
						<div className="card-body gap-3 p-4">
							<div className="flex items-start justify-between gap-2">
								<h3 className="card-title text-base leading-snug">{selected.name}</h3>
								<button
									type="button"
									className="btn btn-ghost btn-sm btn-circle -mt-1 -mr-2 shrink-0"
									aria-label={labels.close}
									ref={closeButtonRef}
								>
									{closeIcon}
								</button>
							</div>
							{selected.isOpen !== undefined && (
								<span className={`badge badge-soft badge-sm ${selected.isOpen ? "badge-success" : "badge-error"}`}>
									{selected.isOpen ? labels.open : labels.closed}
								</span>
							)}
							<a href={selected.href} className="btn btn-primary btn-sm btn-block">
								{labels.details}
							</a>
						</div>
					</div>
				</AdvancedMarker>
			)}
		</>
	);
}

export default function ClusteredMap({ sites, lang, labels, closeIcon }: Props) {
	const colorScheme = useColorScheme();
	const defaultBounds = useMemo(() => getBounds(sites), [sites]);

	return (
		<APIProvider apiKey={GOOGLE_MAPS_API_KEY ?? ""} language={lang} region="MX">
			<Map
				className="rounded-box h-[75svh] min-h-96 w-full overflow-hidden"
				mapId={GOOGLE_MAPS_GENERAL_MAP_ID}
				colorScheme={colorScheme}
				defaultBounds={defaultBounds}
				gestureHandling="cooperative"
				disableDefaultUI
				zoomControl
				fullscreenControl
			>
				<ClusteredMarkers sites={sites} labels={labels} closeIcon={closeIcon} />
			</Map>
		</APIProvider>
	);
}
