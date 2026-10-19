import { useMemo } from "react";
import { APIProvider, AdvancedMarker, Map, Polygon } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_ZONE_MAP_ID } from "astro:env/client";
import { useColorScheme } from "./useColorScheme";

const BOUNDARY_COLOR = "#f59e0b";

interface Props {
	name: string;
	lang: string;
	position: google.maps.LatLngLiteral;
	boundary?: string[];
}

function decodePath(encoded: string) {
	const path: google.maps.LatLngLiteral[] = [];
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

function getBounds(points: google.maps.LatLngLiteral[]) {
	const lats = points.map(({ lat }) => lat);
	const lngs = points.map(({ lng }) => lng);
	return {
		north: Math.max(...lats),
		south: Math.min(...lats),
		east: Math.max(...lngs),
		west: Math.min(...lngs),
		padding: 48,
	};
}

export default function ZoneMap({ name, lang, position, boundary }: Props) {
	const colorScheme = useColorScheme();
	const polygons = useMemo(() => (boundary ?? []).map(decodePath), [boundary]);
	const camera = useMemo(
		() =>
			polygons.length
				? { defaultBounds: getBounds([position, ...polygons.flat()]) }
				: { defaultCenter: position, defaultZoom: 15 },
		[position, polygons],
	);

	return (
		<APIProvider apiKey={GOOGLE_MAPS_API_KEY ?? ""} language={lang} region="MX">
			<Map
				className="rounded-box aspect-square w-full overflow-hidden sm:aspect-video"
				mapId={GOOGLE_MAPS_ZONE_MAP_ID}
				colorScheme={colorScheme}
				mapTypeId="hybrid"
				{...camera}
				gestureHandling="cooperative"
			>
				{polygons.map((path, i) => (
					<Polygon
						key={i}
						paths={[path]}
						strokeColor={BOUNDARY_COLOR}
						strokeWeight={2}
						fillColor={BOUNDARY_COLOR}
						fillOpacity={0.15}
						clickable={false}
					/>
				))}
				<AdvancedMarker position={position} title={name} />
			</Map>
		</APIProvider>
	);
}
