import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type * as Leaflet from "leaflet";
import Supercluster from "supercluster";
import type { MapLabels } from "../i18n/utils";
import { KIND_COLORS, MapFrame, decodePath, kindIcon, streetsLayer, useLeafletMap, type LatLng, type PlaceKind } from "./MapFrame";

const MIN_SPAN = 0.5;
const CARD_WIDTH = 288;
const KINDS: PlaceKind[] = ["site", "museum"];
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

interface Props {
	sites: MapSite[];
	trainRoute: string[];
	labels: MapLabels;
	closeIcon?: ReactNode;
	trainIcon?: ReactNode;
	visitorsIcon?: ReactNode;
}

interface SitePopup {
	popup: Leaflet.Popup;
	content: HTMLElement;
}

function expand(min: number, max: number) {
	const extra = Math.max(0, MIN_SPAN - (max - min)) / 2;
	return [min - extra, max + extra];
}

function getBounds(sites: MapSite[]): Leaflet.LatLngBoundsLiteral {
	const lats = sites.map(({ position }) => position.lat);
	const lngs = sites.map(({ position }) => position.lng);
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

export default function ClusteredMap({ sites, trainRoute, labels, closeIcon, trainIcon, visitorsIcon }: Props) {
	const leafletMap = useLeafletMap(labels);
	const { leaflet } = leafletMap;
	const [sitePopup, setSitePopup] = useState<SitePopup>();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = sites.find(({ id }) => id === selectedId);

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
		map.fitBounds(getBounds(sites), { padding: [48, 48] });
		render();
		setSitePopup({ popup, content });

		return () => {
			map.off("moveend", render);
			popup.remove();
			markers.remove();
			route.remove();
			map.attributionControl.removeAttribution(attribution);
			streets.remove();
			setSitePopup(undefined);
		};
	}, [leaflet, sites, trainRoute, labels]);

	useEffect(() => {
		if (!leaflet || !sitePopup) return;
		const { popup } = sitePopup;
		if (!selected) {
			popup.remove();
			return;
		}
		popup.setLatLng(selected.position);
		if (!popup.isOpen()) popup.openOn(leaflet.map);
		popup.update();
	}, [leaflet, sitePopup, selected]);

	useEffect(() => {
		if (!selectedId) return;
		const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId(null);
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [selectedId]);

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
									<p className="text-base-content/60 text-sm">{selected.state}</p>
								</div>
								<button
									type="button"
									className="btn btn-ghost btn-sm btn-circle -mt-1 -mr-2 shrink-0"
									aria-label={labels.close}
									onClick={() => setSelectedId(null)}
								>
									{closeIcon}
								</button>
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
											{trainIcon}
											{labels.mayaTrain}
										</span>
									)}
								</div>
							)}
							{selected.visitors && (
								<p className="text-base-content/70 flex items-center gap-1.5 text-sm">
									{visitorsIcon}
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
		</MapFrame>
	);
}
