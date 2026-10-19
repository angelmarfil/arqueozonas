import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type * as Leaflet from "leaflet";
import Supercluster from "supercluster";
import type { MapLabels } from "../i18n/utils";
import { MapFrame, streetsLayer, useLeafletMap, type LatLng } from "./MapFrame";

const MIN_SPAN = 0.5;
const CARD_WIDTH = 288;

export interface MapSite {
	id: string;
	name: string;
	href: string;
	position: LatLng;
	cover?: string;
	isOpen?: boolean;
}

interface Props {
	sites: MapSite[];
	labels: MapLabels;
	closeIcon?: ReactNode;
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

function siteIcon(L: typeof Leaflet) {
	return L.divIcon({
		className: "",
		html: '<span class="bg-primary block size-4 rounded-full border-2 border-white shadow-md"></span>',
		iconSize: [16, 16],
	});
}

function clusterIcon(L: typeof Leaflet, count: number) {
	return L.divIcon({
		className: "",
		html: `<span class="bg-primary text-primary-content ring-primary/30 grid size-9 place-items-center rounded-full text-xs font-bold shadow-md ring-4">${count}</span>`,
		iconSize: [36, 36],
	});
}

export default function ClusteredMap({ sites, labels, closeIcon }: Props) {
	const leafletMap = useLeafletMap(labels);
	const { leaflet } = leafletMap;
	const [sitePopup, setSitePopup] = useState<SitePopup>();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = sites.find(({ id }) => id === selectedId);

	useEffect(() => {
		if (!leaflet) return;
		const { L, map } = leaflet;
		const streets = streetsLayer(L).addTo(map);
		const markers = L.layerGroup().addTo(map);
		const index = new Supercluster<MapSite>({ radius: 60, maxZoom: 16 }).load(
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
					const { cluster_id, point_count } = properties;
					L.marker([lat, lng], { icon: clusterIcon(L, point_count), zIndexOffset: 1000 + point_count })
						.on("click", () => map.flyTo([lat, lng], index.getClusterExpansionZoom(cluster_id)))
						.addTo(markers);
				} else {
					L.marker([lat, lng], { icon: siteIcon(L), title: properties.name })
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
			streets.remove();
			setSitePopup(undefined);
		};
	}, [leaflet, sites]);

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
		<MapFrame map={leafletMap} className="rounded-box h-[75svh] min-h-96 w-full">
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
								<h3 className="card-title text-base leading-snug">{selected.name}</h3>
								<button
									type="button"
									className="btn btn-ghost btn-sm btn-circle -mt-1 -mr-2 shrink-0"
									aria-label={labels.close}
									onClick={() => setSelectedId(null)}
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
					</div>,
					sitePopup.content,
				)}
		</MapFrame>
	);
}
