import { useEffect, useMemo } from "react";
import type * as Leaflet from "leaflet";
import type { MapLabels } from "../i18n/utils";
import { MapFrame, satelliteLayer, streetsLayer, useLeafletMap, type LatLng } from "./MapFrame";

const BOUNDARY_COLOR = "#f59e0b";
const PIN_ICON =
	'<svg viewBox="0 0 24 24" width="36" height="36" class="text-primary drop-shadow-md"><path fill="currentColor" stroke="white" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>';

interface Props {
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

function pinIcon(L: typeof Leaflet) {
	return L.divIcon({ className: "", html: PIN_ICON, iconSize: [36, 36], iconAnchor: [18, 34] });
}

export default function ZoneMap({ name, position, boundary, labels }: Props) {
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
			L.marker(position, { icon: pinIcon(L), title: name }),
		]).addTo(map);

		if (polygons.length) map.fitBounds(L.latLngBounds([position, ...polygons.flat()]), { padding: [48, 48] });
		else map.setView(position, 15);

		return () => {
			layers.remove();
			satellite.remove();
			streets.remove();
			features.remove();
		};
	}, [leaflet, labels, name, position, polygons]);

	return <MapFrame map={leafletMap} className="rounded-box aspect-square w-full sm:aspect-video" />;
}
