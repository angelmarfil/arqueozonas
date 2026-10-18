import { useState, type CSSProperties } from "react";
import { LightGallery } from "@lightgallery/react";
import Thumbnail from "@lightgallery/react/plugins/thumbnail";
import Zoom from "@lightgallery/react/plugins/zoom";
import Autoplay from "@lightgallery/react/plugins/autoplay";
import { LIGHTGALLERY_LICENSE_KEY } from "astro:env/client";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-thumbnail.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-autoplay.css";
import "./InlineGallery.css";

const SPEED = 400;
const SLIDE_INTERVAL = 5000;

export interface Slide {
	src: string;
	thumb: string;
	downloadUrl: string;
	alt: string;
	lgSize: string;
	credit?: string;
}

interface Props {
	slides: Slide[];
}

export default function InlineGallery({ slides }: Props) {
	const [container, setContainer] = useState<HTMLElement | null>(null);

	return (
		<>
			<div
				ref={setContainer}
				className="rounded-box relative aspect-3/4 w-full overflow-hidden sm:aspect-video"
				style={{ "--lg-autoplay-duration": `${SPEED + SLIDE_INTERVAL}ms` } as CSSProperties}
			/>
			{container && (
				<LightGallery
					container={container}
					open
					closable={false}
					showMaximizeIcon
					licenseKey={LIGHTGALLERY_LICENSE_KEY}
					plugins={[Thumbnail, Zoom, Autoplay]}
					speed={SPEED}
					autoplay={{ slideShowAutoplay: true, slideShowInterval: SLIDE_INTERVAL }}
					slides={slides.map(({ credit, ...slide }) => ({
						...slide,
						caption: (
							<>
								<h4>{slide.alt}</h4>
								{credit && <p>{credit}</p>}
							</>
						),
					}))}
				/>
			)}
		</>
	);
}
