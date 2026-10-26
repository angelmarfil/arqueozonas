import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type * as Leaflet from "leaflet";
import Supercluster from "supercluster";
import type { MapLabels } from "../i18n/utils";
import { KIND_COLORS, KIND_PATHS, MapFrame, decodePath, kindIcon, streetsLayer, useLeafletMap, type LatLng, type PlaceKind } from "./MapFrame";

const MIN_SPAN = 0.5;
const CARD_WIDTH = 288;
const KINDS: PlaceKind[] = ["site", "museum"];
const STATION_LOGO_ZOOM = 9;
const NO_STATIONS: MapStation[] = [];
const CLOSE_PATH =
	'<path fill="currentColor" d="m7.76 14.83l-2.83 2.83l1.41 1.41l2.83-2.83l2.12-2.12l.71-.71l.71.71l1.41 1.42l3.54 3.53l1.41-1.41l-3.53-3.54l-1.42-1.41l-.71-.71l5.66-5.66l-1.41-1.41L12 10.59L6.34 4.93L4.93 6.34L10.59 12l-.71.71z"/>';
const VISITORS_PATH =
	'<path fill="currentColor" d="M10 13H8c-2.76 0-5 2.24-5 5v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-2.76-2.24-5-5-5m-5 5c0-1.65 1.35-3 3-3h2c1.65 0 3 1.35 3 3zm7.73-11.49c-.08-.22-.19-.42-.3-.62v-.01c-.69-1.14-1.93-1.89-3.42-1.89c-2.28 0-4 1.72-4 4s1.72 4 4 4c1.49 0 2.73-.74 3.42-1.89v-.01c.12-.2.22-.4.3-.62c.02-.06.03-.12.05-.18c.06-.17.11-.34.15-.52c.05-.25.07-.51.07-.78s-.03-.53-.07-.78c-.03-.18-.09-.35-.15-.52c-.02-.06-.03-.12-.05-.18M9 10c-1.18 0-2-.82-2-2s.82-2 2-2s2 .82 2 2s-.82 2-2 2m6 0q-.165 0-.33-.03c-.22.66-.56 1.27-.98 1.81c.41.13.84.22 1.31.22c2.28 0 4-1.72 4-4s-1.72-4-4-4c-.47 0-.9.09-1.31.22c.43.53.76 1.14.98 1.81c.11-.01.21-.03.33-.03c1.18 0 2 .82 2 2s-.82 2-2 2m1 3h-1.11c.6.58 1.08 1.27 1.44 2.03C17.83 15.2 19 16.46 19 18h-2v1c0 .35-.07.69-.18 1H20c.55 0 1-.45 1-1v-1c0-2.76-2.24-5-5-5"/>';
const TRAIN_SOURCE = "https://www.datos.gob.mx/dataset/red_ferroviaria_nacional";

export interface MapSite {
	id: string;
	kind: PlaceKind;
	name: string;
	state: string;
	href: string;
	position: LatLng;
	cover?: string;
	isOpen?: boolean;
	hasMayaTrain?: boolean;
	type?: string;
	visitors?: string;
}

export interface MapStation {
	id: string;
	name: string;
	state: string;
	href: string;
	position: LatLng;
	logo: string;
	section: string;
	color: string;
}

interface Props {
	sites: MapSite[];
	stations?: MapStation[];
	trainRoute: string[];
	labels: MapLabels;
}

interface SitePopup {
	popup: Leaflet.Popup;
	content: HTMLElement;
}

function expand(min: number, max: number) {
	const extra = Math.max(0, MIN_SPAN - (max - min)) / 2;
	return [min - extra, max + extra];
}

function getBounds(places: { position: LatLng }[]): Leaflet.LatLngBoundsLiteral {
	const lats = places.map(({ position }) => position.lat);
	const lngs = places.map(({ position }) => position.lng);
	const [south, north] = expand(Math.min(...lats), Math.max(...lats));
	const [west, east] = expand(Math.min(...lngs), Math.max(...lngs));
	return [
		[south, west],
		[north, east],
	];
}

function placeIcon(L: typeof Leaflet, kind: PlaceKind) {
	return L.divIcon({
		className: "",
		html: `<span class="${KIND_COLORS[kind]} grid size-7 place-items-center rounded-full border-2 border-white shadow-md">${kindIcon(kind, "size-4")}</span>`,
		iconSize: [28, 28],
	});
}

function stationIcon(L: typeof Leaflet, { logo, color }: MapStation, detailed: boolean) {
	if (detailed) {
		return L.divIcon({
			className: "",
			html: `<img src="${logo}" alt="" class="size-8 rounded-lg bg-white shadow-md" />`,
			iconSize: [32, 32],
		});
	}
	return L.divIcon({
		className: "",
		html: `<span class="block size-3.5 rounded-full border-[3px] bg-white shadow-sm" style="border-color:${color}"></span>`,
		iconSize: [14, 14],
	});
}

function SvgIcon({ paths, className }: { paths: string; className: string }) {
	return <svg viewBox="0 0 24 24" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths }} />;
}

function clusterColors(count: number, museums: number) {
	if (museums === 0) return "bg-primary text-primary-content ring-primary/30";
	if (museums === count) return "bg-secondary text-secondary-content ring-secondary/30";
	return "bg-neutral text-neutral-content ring-neutral/30";
}

function clusterIcon(L: typeof Leaflet, count: number, museums: number) {
	return L.divIcon({
		className: "",
		html: `<span class="${clusterColors(count, museums)} grid size-9 place-items-center rounded-full text-xs font-bold shadow-md ring-4">${count}</span>`,
		iconSize: [36, 36],
	});
}

export default function ClusteredMap({ sites, stations = NO_STATIONS, trainRoute, labels }: Props) {
	const leafletMap = useLeafletMap(labels);
	const { leaflet } = leafletMap;
	const [sitePopup, setSitePopup] = useState<SitePopup>();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = sites.find(({ id }) => id === selectedId);
	const selectedStation = stations.find(({ id }) => id === selectedId);
	const selectedPosition = (selected ?? selectedStation)?.position;

	useEffect(() => {
		if (!leaflet) return;
		const { L, map } = leaflet;
		const streets = streetsLayer(L).addTo(map);
		const paths = trainRoute.map(decodePath);
		const route = L.layerGroup([
			...paths.map((path) => L.polyline(path, { className: "map-train-casing", weight: 6, interactive: false })),
			...paths.map((path) => L.polyline(path, { className: "map-train-route", weight: 3, interactive: false })),
		]).addTo(map);
		const attribution = `${labels.mayaTrainRoute}: <a href="${TRAIN_SOURCE}">ARTF</a> (CC BY 4.0)`;
		if (paths.length) map.attributionControl.addAttribution(attribution);
		const stationMarkers = stations.map((station) =>
			L.marker(station.position, { icon: stationIcon(L, station, false), title: station.name, zIndexOffset: 500 }).on("click", () =>
				setSelectedId(station.id),
			),
		);
		const stationLayer = L.layerGroup(stationMarkers).addTo(map);
		let detailedStations = false;
		const renderStations = () => {
			const detailed = map.getZoom() >= STATION_LOGO_ZOOM;
			if (detailed === detailedStations) return;
			detailedStations = detailed;
			stationMarkers.forEach((marker, index) => marker.setIcon(stationIcon(L, stations[index], detailed)));
		};
		const markers = L.layerGroup().addTo(map);
		const index = new Supercluster<MapSite, { museums: number }>({
			radius: 60,
			maxZoom: 16,
			map: ({ kind }) => ({ museums: kind === "museum" ? 1 : 0 }),
			reduce: (total, { museums }) => {
				total.museums += museums;
			},
		}).load(
			sites.map((site) => ({
				type: "Feature",
				geometry: { type: "Point", coordinates: [site.position.lng, site.position.lat] },
				properties: site,
			})),
		);

		const render = () => {
			const bounds = map.getBounds();
			const features = index.getClusters(
				[bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
				Math.round(map.getZoom()),
			);
			markers.clearLayers();
			for (const { geometry, properties } of features) {
				const [lng, lat] = geometry.coordinates;
				if ("cluster" in properties) {
					const { cluster_id, point_count, museums } = properties;
					L.marker([lat, lng], { icon: clusterIcon(L, point_count, museums), zIndexOffset: 1000 + point_count })
						.on("click", () => map.flyTo([lat, lng], index.getClusterExpansionZoom(cluster_id)))
						.addTo(markers)
						.getElement()
						?.setAttribute("aria-label", labels.cluster.replace("{count}", String(point_count)));
				} else {
					L.marker([lat, lng], { icon: placeIcon(L, properties.kind), title: properties.name })
						.on("click", () => setSelectedId(properties.id))
						.addTo(markers);
				}
			}
		};

		const content = document.createElement("div");
		const popup = L.popup({
			className: "map-card",
			closeButton: false,
			minWidth: CARD_WIDTH,
			maxWidth: CARD_WIDTH,
			autoPanPadding: [16, 16],
		}).setContent(content);
		popup.on("remove", () => setSelectedId(null));

		map.on("moveend", render);
		map.on("zoomend", renderStations);
		map.fitBounds(getBounds([...sites, ...stations]), { padding: [48, 48] });
		render();
		renderStations();
		setSitePopup({ popup, content });

		return () => {
			map.off("moveend", render);
			map.off("zoomend", renderStations);
			popup.remove();
			markers.remove();
			stationLayer.remove();
			route.remove();
			map.attributionControl.removeAttribution(attribution);
			streets.remove();
			setSitePopup(undefined);
		};
	}, [leaflet, sites, stations, trainRoute, labels]);

	useEffect(() => {
		if (!leaflet || !sitePopup) return;
		const { popup } = sitePopup;
		if (!selectedPosition) {
			popup.remove();
			return;
		}
		popup.setLatLng(selectedPosition);
		if (!popup.isOpen()) popup.openOn(leaflet.map);
		popup.update();
	}, [leaflet, sitePopup, selectedPosition]);

	useEffect(() => {
		if (!selectedId) return;
		const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId(null);
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [selectedId]);

	const closeButton = (
		<button
			type="button"
			className="btn btn-ghost btn-sm btn-circle -mt-1 -mr-2 shrink-0"
			aria-label={labels.close}
			onClick={() => setSelectedId(null)}
		>
			<SvgIcon paths={CLOSE_PATH} className="size-5" />
		</button>
	);

	return (
		<MapFrame map={leafletMap} label={labels.label} className="rounded-box h-[75svh] min-h-96 w-full">
			<ul
				aria-label={labels.legend}
				className="bg-base-100/90 text-base-content rounded-box absolute bottom-2 left-2 z-1000 flex flex-col gap-1.5 p-2 text-xs shadow-sm"
			>
				{KINDS.map((kind) => (
					<li key={kind} className="flex items-center gap-2">
						<span
							className={`${KIND_COLORS[kind]} grid size-5 place-items-center rounded-full`}
							dangerouslySetInnerHTML={{ __html: kindIcon(kind, "size-3") }}
						/>
						{kind === "museum" ? labels.museums : labels.sites}
					</li>
				))}
				{trainRoute.length > 0 && (
					<li className="flex items-center gap-2">
						<span className="grid size-5 place-items-center">
							<span className="bg-accent ring-base-100 h-1 w-5 rounded-full ring-2" />
						</span>
						{labels.mayaTrainRoute}
					</li>
				)}
				{stations.length > 0 && (
					<li className="flex items-center gap-2">
						<span className="grid size-5 place-items-center">
							<span className="border-accent size-3.5 rounded-full border-[3px] bg-white" />
						</span>
						{labels.stations}
					</li>
				)}
			</ul>
			{sitePopup &&
				selected &&
				createPortal(
					<div className="card bg-base-100 text-base-content w-72 shadow-xl">
						{selected.cover && (
							<figure>
								<img src={selected.cover} alt="" loading="lazy" className="aspect-video w-full object-cover" />
							</figure>
						)}
						<div className="card-body gap-3 p-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<h3 className="card-title text-base leading-snug">{selected.name}</h3>
									<p className="text-base-content/70 text-sm">{selected.state}</p>
								</div>
								{closeButton}
							</div>
							{(selected.type || selected.isOpen !== undefined || selected.hasMayaTrain) && (
								<div className="flex flex-wrap gap-1.5">
									{selected.type && <span className="badge badge-soft badge-primary badge-sm">{selected.type}</span>}
									{selected.isOpen !== undefined && (
										<span className={`badge badge-soft badge-sm ${selected.isOpen ? "badge-success" : "badge-error"}`}>
											{selected.isOpen ? labels.open : labels.closed}
										</span>
									)}
									{selected.hasMayaTrain && (
										<span className="badge badge-soft badge-info badge-sm">
											<SvgIcon paths={KIND_PATHS.station} className="size-3.5" />
											{labels.mayaTrain}
										</span>
									)}
								</div>
							)}
							{selected.visitors && (
								<p className="text-base-content/70 flex items-center gap-1.5 text-sm">
									<SvgIcon paths={VISITORS_PATH} className="text-base-content/50 size-4 shrink-0" />
									{selected.visitors}
								</p>
							)}
							<a href={selected.href} className="btn btn-primary btn-sm btn-block">
								{selected.kind === "museum" ? labels.museumDetails : labels.details}
							</a>
						</div>
					</div>,
					sitePopup.content,
				)}
			{sitePopup &&
				selectedStation &&
				createPortal(
					<div className="card bg-base-100 text-base-content w-72 shadow-xl">
						<div className="card-body gap-3 p-4">
							<div className="flex items-start gap-3">
								<img src={selectedStation.logo} alt="" className="size-14 shrink-0 rounded-xl" />
								<div className="min-w-0 flex-1">
									<h3 className="card-title text-base leading-snug">{selectedStation.name}</h3>
									<p className="text-base-content/70 text-sm">{selectedStation.state}</p>
								</div>
								{closeButton}
							</div>
							<div className="flex flex-wrap gap-1.5">
								<span className="badge badge-soft badge-sm">
									<span className="size-2 rounded-full" style={{ backgroundColor: selectedStation.color }} />
									{selectedStation.section}
								</span>
							</div>
							<a href={selectedStation.href} className="btn btn-accent btn-sm btn-block">
								{labels.stationDetails}
							</a>
						</div>
					</div>,
					sitePopup.content,
				)}
		</MapFrame>
	);
}
