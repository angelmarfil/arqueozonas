import { useEffect, useMemo } from "react";
import type * as Leaflet from "leaflet";
import type { MapLabels } from "../i18n/utils";
import { KIND_PATHS, MapFrame, satelliteLayer, streetsLayer, useLeafletMap, type LatLng, type PlaceKind } from "./MapFrame";

const BOUNDARY_COLOR = "#f59e0b";
const PIN_COLORS: Record<PlaceKind, string> = {
	site: "text-primary",
	museum: "text-secondary",
};

interface Props {
	kind: PlaceKind;
	name: string;
	position: LatLng;
	boundary?: string[];
	labels: MapLabels;
}

function decodePath(encoded: string) {
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

function pinIcon(L: typeof Leaflet, kind: PlaceKind) {
	return L.divIcon({
		className: "",
		html: `<svg viewBox="0 0 24 24" width="40" height="40" class="${PIN_COLORS[kind]} drop-shadow-md"><path fill="currentColor" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><g transform="translate(7.5 4.5) scale(0.375)" style="color:white">${KIND_PATHS[kind]}</g></svg>`,
		iconSize: [40, 40],
		iconAnchor: [20, 37],
	});
}

export default function ZoneMap({ kind, name, position, boundary, labels }: Props) {
	const leafletMap = useLeafletMap(labels);
	const { leaflet } = leafletMap;
	const polygons = useMemo(() => (boundary ?? []).map(decodePath), [boundary]);

	useEffect(() => {
		if (!leaflet) return;
		const { L, map } = leaflet;
		const satellite = satelliteLayer(L).addTo(map);
		const streets = streetsLayer(L);
		const layers = L.control.layers({ [labels.satellite]: satellite, [labels.streets]: streets }).addTo(map);
		const features = L.layerGroup([
			...polygons.map((path) =>
				L.polygon(path, {
					color: BOUNDARY_COLOR,
					weight: 2,
					fillColor: BOUNDARY_COLOR,
					fillOpacity: 0.15,
					interactive: false,
				}),
			),
			L.marker(position, { icon: pinIcon(L, kind), title: name }),
		]).addTo(map);

		if (polygons.length) map.fitBounds(L.latLngBounds([position, ...polygons.flat()]), { padding: [48, 48] });
		else map.setView(position, 15);

		return () => {
			layers.remove();
			satellite.remove();
			streets.remove();
			features.remove();
		};
	}, [leaflet, labels, kind, name, position, polygons]);

	return <MapFrame map={leafletMap} className="rounded-box aspect-square w-full sm:aspect-video" />;
}
